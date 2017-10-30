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


// Split the given node 4 subnodes (i.e., populate this node's children
QuadTree.prototype.split = function() {
    var subWidth = Math.floor(this.bounds.width / 2);
    var subHeight = Math.floor(this.bounds.height / 2);

    this.nodes[0] = new QuadTree(this.level + 1, { "x": this.bounds.x + subWidth, "y": this.bounds.y, "width": subWidth, "height": subHeight});
    this.nodes[1] = new QuadTree(this.level + 1, { "x": this.bounds.x, "y": this.bounds.y, "width": subWidth, "height": subHeight});
    this.nodes[2] = new QuadTree(this.level + 1, { "x": this.bounds.x, "y": this.bounds.y + subHeight, "width": subWidth, "height": subHeight});
    this.nodes[3] = new QuadTree(this.level + 1, { "x": this.bounds.x + subWidth, "y": this.bounds.y + subHeight, "width": subWidth, "height": subHeight});
};


// Determine which node an object belongs in. -1 means the object does not
// completely fit within a child node and is part of the parent node
// "obj" will be an object that has an interface to get minimum and maximum x and y coordinates
QuadTree.prototype.getIndex = function(obj) {
    var index = -1;

    var midPointX = this.bounds.x + (this.bounds.width / 2);
    var midPointY = this.bounds.y + (this.bounds.height / 2);

    var objWidth = obj.maxPt[0] - obj.minPt[0];             // The code I copied this from had obj.width; but my objects don't have a width property, so I'm hacking one in
    var objHeight = obj.maxPt[1] - obj.minPt[1];

    var objX = obj.minPt[0] + Math.floor(objWidth / 2);
    var objY = obj.minPt[1] + Math.floor(objHeight / 2);

    var fullyInLeftHalf = objX + objWidth < midPointX;
    var fullyInRightHalf = objX > midPointX;
    var fullyInTopHalf = objY + objHeight < midPointY;
    var fullyInBottomHalf = objY > midPointY;

    if (fullyInLeftHalf) {
        if (fullyInTopHalf) {
            index = 1;
        } else if (fullyInBottomHalf) {
            index = 2;
        }
    } else if (fullyInRightHalf) {
        if (fullyInTopHalf) {
            index = 0;
        } else if (fullyInBottomHalf) {
            index = 3;
        }
    }
    return index;
};


// Insert the object into the QuadTree
QuadTree.prototype.insert = function(obj) {
    // If this node already has existing children, then look in them to get the index
    var index;
    if (this.nodes[0]) {
        index = this.getIndex(obj);

        // If we got a valid index in the child node, then insert the obj at that index (i.e., in the proper quadrant)
        if (index != -1) {
            this.nodes[index].insert(obj);
            return;
        }
    }

    this.gameObjs.push(obj);

    if (this.gameObjs.length > QUADTREE_MAX_OBJECTS) {
        if (this.level < QUADTREE_MAX_LEVELS)  {
            if (this.nodes[0] === null) {
                this.split();
            }

            var i = this.gameObjs.length - 1;   // Start at the end and work our way to the beginning (because pop() removes the last item from the array)
            while (i >= 0) {
                index = this.getIndex(this.gameObjs[i]);
                if (index != -1) {
                    // If we can find a subnode in which to put the given object, then put it in the subnode
                    this.nodes[index].insert(this.gameObjs.pop());   // pop() removes from the end of the array
                    i = this.gameObjs.length - 1;
                } else {
                    i--;
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
    var index = this.getIndex(queryObj);

    if (index != -1 && this.nodes[0] !== null) {
        this.nodes[index].retrieve(returnObjs, queryObj);
    }

    // If the object does not fit cleanly into this node's children, or if this node is a leaf, then add objects from this node to the return list
    for (var obj of this.gameObjs) {
        if (obj !== queryObj) {
            returnObjs.push(obj);
        }
    }
    return returnObjs;
};
