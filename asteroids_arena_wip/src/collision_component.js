// Global scope
var CollisionComponentTypeEnum = { "circle": 0,
                                   "aabb": 1
                                 };

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

CollisionComponentAABB.prototype.getWidth = function() {
    return this.maxPt[0] - this.minPt[0];
};

CollisionComponentAABB.prototype.getHeight = function() {
    return this.maxPt[1] - this.minPt[1];
};

CollisionComponentAABB.prototype.draw = function(canvasContext) {
    var width = this.getWidth();
    var height = this.getHeight();
    canvasContext.strokeStyle = "yellow";
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


    // TODO possibly remove the computeBoundaries function
    //this.computeBoundaries();

};

CollisionComponentAABB.prototype.setCenter = function(x, y) {
    this.center[0] = x;
    this.center[1] = y;
};

CollisionComponentAABB.prototype.setExtents = function(x, y) {
    this.extents[0] = x;
    this.extents[1] = y;
};


//CollisionComponentAABB.prototype.computeBoundaries = function() {
//    this.setMinPt(this.center[0] - renderComp.getWidth() / 2, this.center[1] - renderComp.getHeight() / 2)
//    this.setMaxPt(this.center[0] + renderComp.getWidth() / 2, this.center[1] + renderComp.getHeight() / 2)
//}
