// Global scope
var CollisionComponentTypeEnum = { "circle": 0,
                                   "aabb": 1,
                                   "lineseg": 2,
                                   "group": 3,
                                   "plane": 4,
                                   "polygon": 5
                                 };


//================================================================================
//Plane
//================================================================================
function CollisionComponentPlane() {
    GameObjectComponent.call(this);
    this.type = CollisionComponentTypeEnum.plane;

    this.d = vec2.create();     // Direction of the plane
    this.n = vec2.create();     // Surface normal
}


// Compute a plane (point and normal) from two points in 2D space
// n is computed so that n = [0,1] if d = [1,0] (i.e. +90 deg rotation)
// (where d = ptB - ptA)
CollisionComponentPlane.prototype.createFromPoints = function(ptA, ptB) {
    // Compute d (direction)
    vec2.sub(this.d, ptB, ptA);
    vec2.normalize(this.d, this.d);

    // Compute n (normal) -- +90 deg rotation
    // Use the shortcut - [1,0] rotates to [0,1]; [0,1] rotates to [-1,0]; [-1,0] rotates to [0,-1]
    // n is normalized already, because we're simply rotating an already normalized vector
    vec2.set(this.n, -this.d[1], this.d[0])
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
}

CollisionComponentAABB.prototype = Object.create(GameObjectComponent.prototype);
CollisionComponentAABB.prototype.constructor = CollisionComponentAABB;


// NVM make setMinPt, getMinPt, and some other functions part of a CollisionComponent base class
CollisionComponentAABB.prototype.setMinPt = function(x, y) {
    this.minPt[0] = x;
    this.minPt[1] = y;
};

CollisionComponentAABB.prototype.setMaxPt = function(x, y) {
    this.maxPt[0] = x;
    this.maxPt[1] = y;
};

CollisionComponentAABB.prototype.getMinPt = function() {
    return vec2.clone(this.minPt);
};

CollisionComponentAABB.prototype.getMaxPt = function() {
    return vec2.clone(this.maxPt);
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
    canvasContext.strokeStyle = "red";  // NVM don't hardcode strokeStyle
    canvasContext.lineWidth = 1;
    canvasContext.strokeRect(this.center[0] - width/2, this.center[1] - height/2, width, height)
};


// Recompute the boundaries of the AABB
CollisionComponentAABB.prototype.update = function(dt_s, obj = null) {
    // NVM instead of querying the parentObj here, have any parent obj pass in data used for refreshing the aabb, using the obj parameter
    var renderComp = this.parentObj.components["render"];
    console.assert(renderComp !== null);

    // We get the physics component because it has the object's position. The render component does not store position
    var physicsComp = this.parentObj.components["physics"];
    console.assert(physicsComp !== null);

    // NVM don't default to using a physics component to set the center here; have the parent object pass in a "config object" that has all the data necessary to recompute the AABB
    this.setCenter(physicsComp.currPos[0], physicsComp.currPos[1]);

    // Compute extents
    var ang = physicsComp.angle;    // NOTE: angle is stored in degrees
    var rotMat = mat2.create();
    mat2.fromRotation(rotMat, glMatrix.toRadian(physicsComp.angle));
    // NVM switch from hard-coding using a render component, to using a passed-in object
    var corners = [ vec2.create(), vec2.create(), vec2.create(), vec2.create() ];
    vec2.set(corners[0], -renderComp.getWidth() / 2, -renderComp.getHeight() / 2);
    vec2.set(corners[1], -renderComp.getWidth() / 2,  renderComp.getHeight() / 2);
    vec2.set(corners[2],  renderComp.getWidth() / 2,  renderComp.getHeight() / 2);
    vec2.set(corners[3],  renderComp.getWidth() / 2, -renderComp.getHeight() / 2);


    // NVM The following loop can be used to calculate min/max points, using a rectangular image (e.g. Image render component).  switch from hard-coding using a render component, to using a passed-in object (e.g., don't need to do this rotation stuff if the render geom we're computing an AABB around is a sphere)
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
//Line segment
//================================================================================
function CollisionComponentLineSeg() {
    GameObjectComponent.call(this);
    this.type = CollisionComponentTypeEnum.lineseg;

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


//================================================================================
//Polygon
//================================================================================

function CollisionComponentPolygon() {
    // NOTE! Polygons depend on counter-clockwise vertex winding, assuming that the +X axis goes
    // left-to-right in the space (well, most likely, on the screen), and the +Y axis goes up
    // (bottom-to-top). i.e., in this configuration, the vertices are wound in the direction of increasing angles

    // Assumption: Polygons are convex

    GameObjectComponent.call(this);
    this.type = CollisionComponentTypeEnum.polygon;

    this.center = vec2.create();    // Center (a.k.a. position in space)
    this.points = [];   // Store points (list of glMatrix.vec2 objects)
    this.tpoints = [];  // Store transformed points
    this.normals = [];  // Store (transformed) normals (not prefixed with "t", because we'll only ever use transformed normals, calculated from transformed points)

    // Transform information can be set explicitly or copied from another source
    // TODO employ the set-explicitly-or-copy-from-another-source model for AABB transformations
    this.angle = 0.0;
    this.angleVec = vec2.fromValues(1.0, 0.0);
    // on every update, we'll compute the normals

    // Update minPt and maxPt as part of update()
    this.minPt = vec2.create();
    this.maxPt = vec2.create();
}

CollisionComponentPolygon.prototype = Object.create(GameObjectComponent.prototype);
CollisionComponentPolygon.prototype.constructor = CollisionComponentPolygon;

CollisionComponentPolygon.prototype.setCenter = function(x, y) {
    this.center[0] = x;
    this.center[1] = y;
};

CollisionComponentPolygon.prototype.setMinPt = function(x, y) {
    // NOTE: this function should not be called explicitly. It will be called during update()
    this.minPt[0] = x;
    this.minPt[1] = y;
};

CollisionComponentPolygon.prototype.setMaxPt = function(x, y) {
    // NOTE: this function should not be called explicitly. It will be called during update()
    this.maxPt[0] = x;
    this.maxPt[1] = y;
};

CollisionComponentPolygon.prototype.getMinPt = function() {
    return vec2.clone(this.minPt);
};

CollisionComponentPolygon.prototype.getMaxPt = function() {
    return vec2.clone(this.maxPt);
};

CollisionComponentPolygon.prototype.getWidth = function() {
    return this.maxPt[0] - this.minPt[0];
};

CollisionComponentPolygon.prototype.getHeight = function() {
    return this.maxPt[1] - this.minPt[1];
};
CollisionComponentPolygon.prototype.update = function(dt_s, obj = null) {
    var physicsComp = (this.parentObj && this.parentObj.components.hasOwnProperty("physics")) ? this.parentObj.components["physics"] : null;

    var ang = 0.0;
    var rotMat = mat2.create();

    if (physicsComp) {
        // If physicsComp exists, set the center of this polygon based on it; else, the programmer has to do it
        this.setCenter(physicsComp.currPos[0], physicsComp.currPos[1]);

        ang = physicsComp.angle;    // NOTE: angle is stored in degrees
        mat2.fromRotation(rotMat, glMatrix.toRadian(physicsComp.angle));
    }

    var maxPt = [-Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER];
    var minPt = [ Number.MAX_SAFE_INTEGER,  Number.MAX_SAFE_INTEGER];

    for (var i = 0; i < this.points.length; i++) {
        vec2.transformMat2(this.tpoints[i], this.points[i], rotMat);    // Apply rotation
        vec2.add(this.tpoints[i], this.tpoints[i], this.center);        // Apply translation

        // Compute min/max points
        if (this.tpoints[i][0] < minPt[0]) {
            minPt[0] = this.tpoints[i][0];
        }
        if (this.tpoints[i][0] > maxPt[0]) {
            maxPt[0] = this.tpoints[i][0];
        }
        if (this.tpoints[i][1] < minPt[1]) {
            minPt[1] = this.tpoints[i][1];
        }
        if (this.tpoints[i][1] > maxPt[1]) {
            maxPt[1] = this.tpoints[i][1];
        }

        // Compute normals
        // e.g., normals[0] = the normal of the edge formed by tpoints[0] and tpoints[1]
        var faceStartPtIdx = i;
        var faceEndPtIdx = (i + 1) % this.points.length;
        vec2.sub(this.normals[i], this.tpoints[faceStartPtIdx], this.tpoints[faceEndPtIdx]);
        vec2.set(this.normals[i], -this.normals[i][1],this.normals[i][0]);    // Poor man's +90 degree rotation in 2D: x' = -y; y' = x
        vec2.normalize(this.normals[i], this.normals[i]);
    }
    this.setMinPt(minPt[0], minPt[1]);
    this.setMaxPt(maxPt[0], maxPt[1]);
};

CollisionComponentPolygon.prototype.draw = function(canvasContext) {
    // draw polygon as a sequence of lines
    canvasContext.strokeStyle = "red";  // NVM don't hardcode strokeStyle
    canvasContext.lineWidth = 1;
    canvasContext.beginPath();

    for (var i = 0; i < this.tpoints.length; i++) {
        var j = (i + 1) % this.tpoints.length;
        canvasContext.moveTo(this.tpoints[i][0], this.tpoints[i][1]);
        canvasContext.lineTo(this.tpoints[j][0], this.tpoints[j][1]);
        canvasContext.stroke();
    }

    canvasContext.closePath();
};





