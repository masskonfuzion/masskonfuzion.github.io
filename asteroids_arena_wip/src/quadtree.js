var QUADTREE_MAX_LEVELS = 8;        // Maximum quadtree depth
var QUADTREE_MAX_OBJECTS = 16;      // Maximum number of objects per quadtree node

function QuadTree(depthLevel, bounds) {
    // The current depth level of this node (root is depth 0)
    this.level = depthLevel;

    this.gameObjs = [];     // List of GameObjects in this tree node

    // Node boundaries
    this.bounds = { "x": bounds.x,
                    "y": bounds.y,
                    "width": bounds.width,
                    "height": bounds.height
                  };

    this.nodes = [null, null, null, null];
}

// Clear the quadtree (recursively)
QuadTree.prototype.clear = function() {
    // JS arrays don't have a clear(), so we'll roll our own
    var i;
    for (i = this.gameObjs.length; i > 0; i--) {
        this.gameObjs.pop();
    }

    for (i = 0; i < this.nodes.length; i++) {
        if (this.nodes[i] !== null) {
            this.nodes[i].clear();
            this.nodes[i] = null;
        }
    }
};


// Split the given node 4 subnodes
// Assuming x increasing right on screen, y increasing down on screen: quadrant 0 is top-right; 1 is top-left; 2 is bottom-left; 3 is bottom right
QuadTree.prototype.split = function() {
    var subWidth = Math.floor(this.bounds.width / 2);
    var subHeight = Math.floor(this.bounds.height / 2);

    this.nodes[0] = new QuadTree(this.level + 1, { "x": this.bounds.x + subWidth, "y": this.bounds.y, "width": subWidth, "height": subHeight});
    this.nodes[1] = new QuadTree(this.level + 1, { "x": this.bounds.x, "y": this.bounds.y, "width": subWidth, "height": subHeight});
    this.nodes[2] = new QuadTree(this.level + 1, { "x": this.bounds.x, "y": this.bounds.y + subHeight, "width": subWidth, "height": subHeight});
    this.nodes[3] = new QuadTree(this.level + 1, { "x": this.bounds.x + subWidth, "y": this.bounds.y + subHeight, "width": subWidth, "height": subHeight});
};


// Determine which node(s) an object belongs in.
// "indices" is a list of all nodes an object fits into (i.e., if an object spans multiple nodes,
// it will be placed in all of them)
// "obj" must be an object that has an interface to get minimum and maximum x and y coordinates
QuadTree.prototype.getIndices = function(obj) {
    var indices = [];

    var midPointX = this.bounds.x + (this.bounds.width / 2);
    var midPointY = this.bounds.y + (this.bounds.height / 2);

    var objHalfWidth = obj.getWidth() / 2;      // The code I copied this from had obj.width; but my objects don't have a width property, so I'm hacking one in
    var objHalfHeight = obj.getHeight() / 2;

    // TODO smarten up this objCenterX and objCenterY calculation. Use center points if we have them; else compute them
    var minPt = obj.getMinPt();
    var maxPt = obj.getMaxPt();

    var touchesQuad0 = maxPt[0] >= midPointX && minPt[1] <= midPointY;
    var touchesQuad1 = minPt[0] <= midPointX && minPt[1] <= midPointY;
    var touchesQuad2 = minPt[0] <= midPointX && maxPt[1] >= midPointY;
    var touchesQuad3 = maxPt[0] >= midPointX && maxPt[1] >= midPointY;

    if (touchesQuad0) {
        indices.push(0);
    }

    if (touchesQuad1) {
        indices.push(1);
    }

    if (touchesQuad2) {
        indices.push(2);
    }

    if (touchesQuad3) {
        indices.push(3);
    }


    return indices;
};


// Insert the object into the QuadTree
QuadTree.prototype.insert = function(obj) {
    // If this node already has existing children (i.e. has been split before), then determine which one of them to put the input obj into
    var indices;
    if (this.nodes[0]) {
        indices = this.getIndices(obj);

        for (var index of indices) {
            this.nodes[index].insert(obj);
        }
        return;
    }

    this.gameObjs.push(obj);

    if (this.gameObjs.length > QUADTREE_MAX_OBJECTS) {
        if (this.level < QUADTREE_MAX_LEVELS)  {
            if (this.nodes[0] === null) {
                this.split();
            }

            while (this.gameObjs.length > 0) {
                var objToInsert = this.gameObjs.pop();
                indices = this.getIndices(objToInsert);
                for (var index of indices) {
                    // Put the given object in the appropriate subnode(s) of this node
                    this.nodes[index].insert(objToInsert);   // pop() removes from the end of the array
                }
            }
        } else {
            var msg = "QuadTree is at maximum depth -- can't subdivide any further! Consider tweaking tree parameters or making your game generate fewer objects, hah";
            console.log(msg);
        }
    } 
    
};


// Retrieve a list of all objects, from all nodes, that could potentially collide with the given object
// Note: Pass in an array object, so that it can be populated recursively
QuadTree.prototype.retrieve = function(returnObjs, queryObj) {
    var indices = this.getIndices(queryObj);

    // If nodes[0] exists, then all 4 subnodes exist. Traverse them, looking for potential collision candidates
    if (this.nodes[0] !== null) {
        for (var index of indices) {
            this.nodes[index].retrieve(returnObjs, queryObj);
        }
    }

    // If the object does not fit cleanly into this node's children, or if this node is a leaf, then add objects from this node to the return list
    for (var obj of this.gameObjs) {
        if (obj !== queryObj) {
            returnObjs.push(obj);
        }
    }
    return returnObjs;
};
