// Global scope
var CollisionComponentTypeEnum = { "circle": 0,
                                   "aabb": 1,
                                   "obb": 2,
                                   "lineseg": 3,
                                   "group": 4
                                 };


//================================================================================
//AABB
//================================================================================
function CollisionComponentAABB() {
    GameObjectComponent.call(this);
    this.type = CollisionComponentTypeEnum.aabb;

    this.center = vec2.create();

    this.extents = [0.0, 0.0];  // extents in an AABB are the half-widths along each axis

    this.minPt = vec2.create();
    this.maxPt = vec2.create();
};

CollisionComponentAABB.prototype = Object.create(GameObjectComponent.prototype);
CollisionComponentAABB.prototype.constructor = CollisionComponentAABB;

CollisionComponentAABB.prototype.setMinPt = function(x, y) {
    this.minPt[0] = x;
    this.minPt[1] = y;
};

CollisionComponentAABB.prototype.setMaxPt = function(x, y) {
    this.maxPt[0] = x;
    this.maxPt[1] = y;
};

CollisionComponentAABB.prototype.getMinPt = function() {
    return this.minPt;  // Should i return a clone of the minPt vector?
};

CollisionComponentAABB.prototype.getMaxPt = function() {
    return this.maxPt;
};

CollisionComponentAABB.prototype.getWidth = function() {
    return this.maxPt[0] - this.minPt[0];
};

CollisionComponentAABB.prototype.getHeight = function() {
    return this.maxPt[1] - this.minPt[1];
};

CollisionComponentAABB.prototype.draw = function(canvasContext) {
    var width = this.getWidth();
    var height = this.getHeight();
    canvasContext.strokeStyle = "red";
    canvasContext.lineWidth = 1;
    canvasContext.strokeRect(this.center[0] - width/2, this.center[1] - height/2, width, height)
};


// Recompute the boundaries of the AABB
CollisionComponentAABB.prototype.update = function(dt_s, obj = null) {
    // TODO instead of querying the parentObj here, have any parent obj pass in data used for refreshing the aabb in, using the obj parameter
    var renderComp = this.parentObj.components["render"];
    console.assert(renderComp !== null);

    // We get the physics component because it has the object's position. The render component does not store position
    var physicsComp = this.parentObj.components["physics"];
    console.assert(physicsComp !== null);

    // TODO again -- don't default to using a physics component to set the center here; have the parent object pass in a "config object" that has all the data necessary to recompute the AABB
    this.setCenter(physicsComp.currPos[0], physicsComp.currPos[1]);

    // Compute extents
    var ang = physicsComp.angle;    // NOTE: angle is stored in degrees
    var rotMat = mat2.create();
    mat2.fromRotation(rotMat, glMatrix.toRadian(physicsComp.angle));
    // TODO switch from hard-coding using a render component, to using a passed-in object
    var corners = [ vec2.create(), vec2.create(), vec2.create(), vec2.create() ];
    vec2.set(corners[0], -renderComp.getWidth() / 2, -renderComp.getHeight() / 2);
    vec2.set(corners[1], -renderComp.getWidth() / 2,  renderComp.getHeight() / 2);
    vec2.set(corners[2],  renderComp.getWidth() / 2,  renderComp.getHeight() / 2);
    vec2.set(corners[3],  renderComp.getWidth() / 2, -renderComp.getHeight() / 2);


    // TODO The following loop can be used to calculate min/max points, using a rectangular image (e.g. Image render component).  switch from hard-coding using a render component, to using a passed-in object (e.g., don't need to do this rotation stuff if the render geom we're computing an AABB around is a sphere)
    var maxPt = [-Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER];
    var minPt = [ Number.MAX_SAFE_INTEGER,  Number.MAX_SAFE_INTEGER];

    for (var i = 0; i < 4; i++) {
        vec2.transformMat2(corners[i], corners[i], rotMat);         // Apply rotation
        vec2.add(corners[i], corners[i], this.center);      // Translate into position

        if (corners[i][0] < minPt[0]) {
            minPt[0] = corners[i][0];
        }
        if (corners[i][0] > maxPt[0]) {
            maxPt[0] = corners[i][0];
        }
        if (corners[i][1] < minPt[1]) {
            minPt[1] = corners[i][1];
        }
        if (corners[i][1] > maxPt[1]) {
            maxPt[1] = corners[i][1];
        }
    }

    this.setMinPt(minPt[0], minPt[1]);
    this.setMaxPt(maxPt[0], maxPt[1]);

    this.setExtents((maxPt[0] - minPt[0]) * 0.5, (maxPt[1] - minPt[1]) * 0.5);
};

CollisionComponentAABB.prototype.setCenter = function(x, y) {
    this.center[0] = x;
    this.center[1] = y;
};

CollisionComponentAABB.prototype.setExtents = function(x, y) {
    this.extents[0] = x;
    this.extents[1] = y;
};


//================================================================================
//OBB
//================================================================================
// You down wit' OBB? Yeah, you know me!
// TODO finish OBB

function CollisionComponentOBB() {
    GameObjectComponent.call(this);
    this.type = CollisionComponentTypeEnum.obb;

    this.center = vec2.create();

    this.axes = [ vec2.create(), vec2.create() ];   // axes/basis vectors for the OBB's coordinate space

    this.extents = [0.0, 0.0];  // extents in an OBB are the half-widths along each axis
}



//================================================================================
//Line segment
//================================================================================
function CollisionComponentLineSeg() {
    GameObjectComponent.call(this);
    this.type = CollisionComponentTypeEnum.lineseg;

    // TODO decide: do we want to track center/extent AND start/end points? On one hand, that could be a lot of data to store; on the other hand, we're doing that with the AABBs (storing center/extents and also min/max points)
    //this.center = vec2.create();
    //this.extents = [0.0];   // The extent in line segment is the half-width from center to each endpoint
    //// NOTE: storing a list here for consistency with the other collision component types

    // could use annoying ternary here, but eh
    this.sPt = vec2.create();
    this.ePt = vec2.create();
}

CollisionComponentLineSeg.prototype = Object.create(GameObjectComponent.prototype);
CollisionComponentLineSeg.prototype.constructor = CollisionComponentLineSeg;

CollisionComponentLineSeg.prototype.setEndPoints = function(sx, sy, ex, ey) {
    vec2.set(this.sPt, sx, sy);
    vec2.set(this.ePt, ex, ey);
};

// Some helper functions that are probably more useful in the context of inserting line segments into a quadtree (or other spatial subdivision object) than anything else
// These are candidates for incorporation into a base class for colliders
CollisionComponentLineSeg.prototype.getMaxPt = function() {
    return vec2.fromValues( Math.max(this.sPt[0], this.ePt[0]), Math.max(this.sPt[1], this.ePt[1]) );
};

CollisionComponentLineSeg.prototype.getMinPt = function() {
    return vec2.fromValues( Math.min(this.sPt[0], this.ePt[0]), Math.min(this.sPt[1], this.ePt[1]) );
};

CollisionComponentLineSeg.prototype.getWidth = function() {
    return Math.abs(this.ePt[0] - this.sPt[0]);
};

CollisionComponentLineSeg.prototype.getHeight = function() {
    return Math.abs(this.ePt[1] - this.sPt[1]);
};


//================================================================================
//Collision component group
//================================================================================

function CollisionComponentGroup() {
    GameObjectComponent.call(this);
    this.type = CollisionComponentTypeEnum.group;
    this.groupItems = [];
}

CollisionComponentGroup.prototype = Object.create(GameObjectComponent.prototype);
CollisionComponentGroup.prototype.constructor = CollisionComponentGroup;

CollisionComponentGroup.prototype.getMinPt = function() {
    var i = 0;
    if (this.groupItems) {
        var minPt = this.groupItems[i].getMinPt();

        for (i = 1; i < this.groupItems.length; i++) {
            var cmp = this.groupItems[i].getMinPt();
            minPt[0] = Math.min(minPt[0], cmp[0]);
            minPt[1] = Math.min(minPt[1], cmp[1]);
        }
        return minPt;
        
    } else {
        return vec2.create();
    }
};

CollisionComponentGroup.prototype.getMaxPt = function() {
    var i = 0;
    if (this.groupItems) {
        var maxPt = this.groupItems[i].getMaxPt();

        for (i = 1; i < this.groupItems.length; i++) {
            var cmp = this.groupItems[i].getMaxPt();
            maxPt[0] = Math.max(maxPt[0], cmp[0]);
            maxPt[1] = Math.max(maxPt[1], cmp[1]);
        }
        return maxPt;
        
    } else {
        return vec2.create();
    }
};
