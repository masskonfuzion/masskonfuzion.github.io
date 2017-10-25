function Arena () {
    GameObject.call(this);

    // TODO make arena a collection of render components and collision components
    // We want the arenas to be a contained in polygonal area. The polygon can be any shape (defined by an array of segments.. Or maybe vertex/edges)
    // We also need new collision geoms - line segments

    // In this early version, the arena will simply be a rectangle. We can use AABBs for the arena's boundaries (which will be 2 vertical and 2 horizontal)
    // If we continue into later versions, we should have a general polygonal shape; maybe use the separating axis theorem
    // TODO - implement hierarchical render objects, and hierarchical collision objects (see, e.g. falldown webgl?)

    // TODO add parameters later, to control how the arena is constructed; e.g., load from files or something
    this.addComponent( "render", new RenderComponentGroup() );
    this.lineSegments = [];     // Line segment info, e.g. dir & normal

}

Arena.prototype = Object.create(GameObject.prototype);
Arena.prototype.constructor = Arena;

Arena.prototype.initialize = function () {
    var rcg = this.components["render"];

    // Add individual render components to the group
    // NOTE: I know this is verbose (I could write one-liners here, if the ctors had default params), but I want the ctors in this framework to do as _little_ as possible

    // TODO/NOTE: We're initializing the lines in "clockwise" winding (relative to the computer screen). This is so that, for any line segment in the arena's polygon, a positive rotation the direction of the line segemnt (i.e., the direction is the vector taken from startPt towards endPt) will be "inside" the polygon

    var lineTop = new RenderComponentLine();
    lineTop.setStartPt(0,0);
    lineTop.setEndPt(1280, 0);
    lineTop.setLineWidth(3);
    lineTop.setColor(0, 128, 255);
    rcg.addGroupItem(lineTop);
    this.addLineSegment(lineTop.startPt, lineTop.endPt);

    var lineRight = new RenderComponentLine();
    lineRight.setStartPt(1280,0);
    lineRight.setEndPt(1280, 720);
    lineRight.setLineWidth(3);
    lineRight.setColor(0, 128, 255);
    rcg.addGroupItem(lineRight);
    this.addLineSegment(lineRight.startPt, lineRight.endPt);
 
    // Note: "Bot" looks like the bottom, but has + coord values, because Y coordinates increase down the screen in Canvas
    var lineBot = new RenderComponentLine();
    lineBot.setStartPt(1280, 720);
    lineBot.setEndPt(0, 720);
    lineBot.setLineWidth(3);
    lineBot.setColor(0, 128, 255);
    rcg.addGroupItem(lineBot);
    this.addLineSegment(lineBot.startPt, lineBot.endPt);

    var lineLeft = new RenderComponentLine();
    lineLeft.setStartPt(0, 720);
    lineLeft.setEndPt(0, 0);
    lineLeft.setLineWidth(3);
    lineLeft.setColor(0, 128, 255);
    rcg.addGroupItem(lineLeft);
    this.addLineSegment(lineLeft.startPt, lineLeft.endPt);

};

Arena.prototype.draw = function(canvasContext) {
    this.components["render"].draw(canvasContext);
};

// A function to store line segment data for the arena.
// This function has no error checking, so it's up to the programmer to avoid adding duplicate data or doing other silly stuff
// TODO decide whether to implement a line segment collision component (to test for actual intersections/collisions with boundaries), or keep the simple objects here, to be used only for testing containment
// NOTE: the line seg collision component would work better for, e.g. AABB vs Line Segment tests, whereas the containment test would work for small particles (the smaller, the more believable)
Arena.prototype.addLineSegment = function(startPt, endPt) {
    // Compute the direction of the line segment
    var direction = vec2.create();
    vec2.sub(direction, endPt, startPt);
    vec2.normalize(direction, direction);

    // Compute a +90 deg rotation matrix
    var rotMat = mat2.create();
    mat2.fromRotation(rotMat, glMatrix.toRadian(90));

    // Apply rotation to the direction, to get the normal vector
    var normal = vec2.create();
    vec2.transformMat2(normal, direction, rotMat);


    // TODO: review code. I _believe_ I want to clone startPt here; but it may be ok to use the passed-in param
    var lineSegData = { "startPt": vec2.clone(startPt),
                        "direction": direction,
                        "normal": normal
                      };
    this.lineSegments.push(lineSegData);
};


Arena.prototype.containsPt = function(point) {
    for (var lineSeg of this.lineSegments) {
        var dirToPoint = vec2.create();
        vec2.sub(dirToPoint, point, lineSeg["startPt"]);

        vec2.normalize(dirToPoint, dirToPoint);

        if (vec2.dot(dirToPoint, lineSeg["normal"]) < 0) {
            return false;
        }
    }
    return true;
}
