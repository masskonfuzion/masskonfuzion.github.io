// Quadtree-based Collision Manager
// Perhaps if we want to get fancier in the future, we can make a Collision Manager Interface, and
// then have Collision Manager instances that implement the interface using different underlying
// mechanisms, like BSP, Spatial Hash, etc.
function CollisionManager() {
    GameObject.call(this);
    // The collision manager has a pool of collision objects.
    this.colliders = {};    // The key of the dict will be the object ID of the object this collision component belongs to
    this.objectIDToAssign = -1;  // probably belongs in the base class.

    // The CollisionManager owns the quadtree. It also holds references to registered collision components,
    // so that in each frame, the CollisionManager can pass colliders into the quadtree
    this.quadTree = null;
}

CollisionManager.prototype = Object.create(GameObject.prototype);
CollisionManager.prototype.constructor = CollisionManager;

CollisionManager.prototype.initialize = function(initialRect) {
    // Initialize a QuadTree, starting at level/depth 0
    // NOTE: The max # of levels in the quadtree is defined in quadtree.js
    this.quadTree = new QuadTree(0, initialRect); // width/height should match canvas width/height (maybe just use the canvas object?)
};

CollisionManager.prototype.addCollider = function(collider) {
    this.objectIDToAssign += 1;
    collider.objectID = this.objectIDToAssign;
    this.colliders[this.objectIDToAssign] = collider;
};

CollisionManager.prototype.removeCollider = function(id) {
    if (id in this.colliders && this.colliders.hasOwnProperty(id)) {
        delete(this.colliders[id]);
        //console.log("Removed collider # " + id + " from CollisionManager.colliders");
    } else {
        //throw new Error("Attempted to remove from CollisionManager.colliders an item (id # " + id + " that does not exist");
        //console.log("Attempted to remove from CollisionManager.colliders an item (id # " + id + " that does not exist. TODO investigate how this is happening (maybe quadtree insertion problems?)");
    }
};

CollisionManager.prototype.update = function(dt_s, configObj) {

    this.quadTree.clear();

    // Populate the quadtree
    for (var collKey in this.colliders) {
        if (this.colliders.hasOwnProperty(collKey)) {
            var collObj = this.colliders[collKey];
            this.quadTree.insert(collObj);
        }
    }

    // For each collider, query the quadtree to determine which other objects it could be colliding with
    var potentialCollisions = {};   // key will be an identifier, e.g. "ObjA|ObjB"; val will be a dict with {"objA": objectRefA, "objB": objectRefB}

    for (var collKey in this.colliders) {
        if (this.colliders.hasOwnProperty(collKey)) {
            var collObj = this.colliders[collKey];
            var candidates = [];
            // TODO - change this code to retrieve all colliders near a fixed point (say, the center of the node). That will save on unnecessary iterations 
            this.quadTree.retrieve(candidates, collObj);

            var collObjUniqueID = collObj.parentObj.constructor.name + collObj.objectID.toString();             // ensure the ID is a string
            for (var candidate of candidates) {
                var candidateUniqueID = candidate.parentObj.constructor.name + candidate.objectID.toString();   // ensure the ID is a string

                // Use the "conditional ? value_if_true : value_if_false" ternary syntax
                var collisionUniqueKey = collObjUniqueID < candidateUniqueID ? collObjUniqueID + "|" + candidateUniqueID : candidateUniqueID + "|" + collObjUniqueID;

                if (!potentialCollisions.hasOwnProperty(collisionUniqueKey)) {
                    potentialCollisions[collisionUniqueKey] = {"objA": collObj, "objB": candidate};
                }
            }
        }
    }

    // Finally, evaluate potential collisions
    for (var key in potentialCollisions) {
        if (potentialCollisions.hasOwnProperty(key)) {
            // determine whether to add this object pair to the final potential collision set
            if (this.isColliding(potentialCollisions[key]["objA"], potentialCollisions[key]["objB"])) {
                //console.log("Collision detected!");
                // Enqueue a collision event message for the GameLogic object to handle
                var collisionMsg = { "topic": "CollisionEvent",
                                     "colliderA": potentialCollisions[key]["objA"],
                                     "colliderB": potentialCollisions[key]["objB"]
                                   };
                this.parentObj.messageQueue.enqueue(collisionMsg);
            }
        }
    }
};

// Return true if objA and objB are colliding with each other.
// This function does not compute contact/restitution information
CollisionManager.prototype.isColliding = function(objA, objB) {
    // NOTE: add to isColliding() as necessary

    // AABB-AABB
    if (objA.type == CollisionComponentTypeEnum.aabb && objB.type == CollisionComponentTypeEnum.aabb) {
        return this.isColliding_AABB_AABB(objA, objB);
    }

    // LineSeg-AABB
    if (objA.type == CollisionComponentTypeEnum.aabb && objB.type == CollisionComponentTypeEnum.lineseg) {
        return this.isColliding_AABB_LineSeg(objA, objB);
    }

    if (objA.type == CollisionComponentTypeEnum.lineseg && objB.type == CollisionComponentTypeEnum.aabb) {
        return this.isColliding_AABB_LineSeg(objB, objA);
    }

    // Segment-Segment
    if (objA.type == CollisionComponentTypeEnum.lineseg && objB.type == CollisionComponentTypeEnum.lineseg) {
        return this.isColliding_LineSeg_LineSeg(objA, objB);
    }

    // Polygon-Polygon
    if (objA.type == CollisionComponentTypeEnum.polygon && objB.type == CollisionComponentTypeEnum.polygon) {
        return this.isColliding_Polygon_Polygon(objA, objB);
    }

    // Polygon-Segment
    if (objA.type == CollisionComponentTypeEnum.polygon && objB.type == CollisionComponentTypeEnum.lineseg) {
        return this.isColliding_LineSeg_Polygon(objB, objA);
    }

    if (objA.type == CollisionComponentTypeEnum.lineseg && objB.type == CollisionComponentTypeEnum.polygon) {
        return this.isColliding_LineSeg_Polygon(objA, objB);
    }

    // Circle-Polygon
    if (objA.type == CollisionComponentTypeEnum.polygon && objB.type == CollisionComponentTypeEnum.circle) {
        return this.isColliding_Circle_Polygon(objB, objA);
    }

    if (objA.type == CollisionComponentTypeEnum.circle && objB.type == CollisionComponentTypeEnum.polygon) {
        return this.isColliding_Circle_Polygon(objA, objB);
    }

};


CollisionManager.prototype.isColliding_AABB_AABB = function(objA, objB) {
    if (objA.maxPt[0] < objB.minPt[0] || objA.minPt[0] > objB.maxPt[0]) {
        return false;
    }

    if (objA.maxPt[1] < objB.minPt[1] || objA.minPt[1] > objB.maxPt[1]) {
        return false;
    }

    return true;
};


// Return true if the given aabb and line segment intersect; false otherwise
CollisionManager.prototype.isColliding_AABB_LineSeg = function(box, seg) {
    // Implementing a hacked up intersection test
    // This function is good only for boolean true/false testing.

    var segMidPt = vec2.create();
    vec2.set(segMidPt, (seg.sPt[0] + seg.ePt[0]) * 0.5, (seg.sPt[1] + seg.ePt[1]) * 0.5);

    var segHalfVec = vec2.create();
    vec2.sub(segHalfVec, seg.ePt, segMidPt);    // A half-length vector from the midpoint to the endpoint

    // Translate the box and the segment to the origin (i.e. move the segment midpoint by the amounts of the box center's position. This effectively treats the box center as though it's the origin, and the segment midpoint is translated relative to that origin)
    vec2.sub(segMidPt, segMidPt, box.center);

    if ( Math.abs(segMidPt[0]) > box.extents[0] + Math.abs(segHalfVec[0]) )
        return false;

    if ( Math.abs(segMidPt[1]) > box.extents[1] + Math.abs(segHalfVec[1]) )
        return false;

    // If we're here, then by process of elimination, the segment and box are intersecting
    return true;
};


// Return true 2 line segments are intersecting; false otherwise
CollisionManager.prototype.isColliding_LineSeg_LineSeg = function(objA, objB) {    // Given 2 line segments, where objA contains points A,B, and objB contains points C,D, the algorithm is as follows:
    var v1 = vec2.create();
    var v2 = vec2.create();
    var n = vec2.create();

    // First, compute n perpendicular to CD (objB's vector)
    vec2.sub(n, objB.ePt, objB.sPt);
    vec2.set(n, -n[1], n[0]);   // This is equivalent to rotating +90 deg (e.g. [1,0] -> [0, 1]; and [0,1] -> [-1, 0])
    vec2.normalize(n, n);

    vec2.sub(v1, objB.sPt, objA.sPt);   // v1 = C - A
    vec2.sub(v2, objA.ePt, objA.sPt);   // v2 = B - A

    // Compute the paramater, t, on the line segment given by L(t) = A + t(B - A).
    // if 0 <= t <= 1, then the segments are intersecting (and t can be used to compute the intersection)
    var t = vec2.dot(n, v1) / vec2.dot(n, v2);

    return (t >= 0 && t <= 1);

};

CollisionManager.prototype.isColliding_Circle_Polygon = function(circle, poly) {
    // TODO as of 2018-08-27 - finish this! There is no circle/sphere collision component.. So we have to make one
    var allTheNormals = new Array().concat(objA.normals, objB.normals);

    for (var normal of allTheNormals) {
        // For every normal, treat the normal as the potential separating axis; project the points of A (and B, below) onto the axis
        var tMinA = Number.MAX_VALUE;
        var tMaxA = -Number.MIN_VALUE;
        var tMinB = Number.MAX_VALUE;
        var tMaxB = -Number.MIN_VALUE;

        // Compute the locations, along the given normal, of the min and max locations of points in objA
        for (var point of objA.tpoints) {
            // point is already stored as a vector object
            // we can think of point as a 2D vector from the origin to the point's location
            // then, the location of the projection of the 2D vector ontot the axis is simply given by the dot product of the 2D vector and the axis
            // the normal is already normalized (part of the polygon's update() function)

            var t = vec2.dot(point, normal);
            if (t > tMaxA) {
                tMaxA = t;
            }
            if (t < tMinA) {
                tMinA = t;
            }
        }

        // Compute the locations, along the given normal, of the min and max locations of points in objB
        // TODO because there are no vertices in a Circle (or Sphere? -- I don't know.. Use whatever name is appropriate, once you actually create the collider type) collider, project the center down to the normal's line/plane, and then compute the extreme points of the circle from there
        for (var point of objB.tpoints) {
            var t = vec2.dot(point, normal);
            if (t > tMaxB) {
                tMaxB = t;
            }
            if (t < tMinB) {
                tMinB = t;
            }
        }

        if (tMinB > tMaxA || tMinA > tMaxB) {
            // If any separating axis is found, there can be no collision
            return false;
        }
    }

    return true;
};


CollisionManager.prototype.isColliding_Polygon_Polygon = function(objA, objB) {
    var allTheNormals = new Array().concat(objA.normals, objB.normals);

    for (var normal of allTheNormals) {
        // For every normal, treat the normal as the potential separating axis; project the points of A (and B, below) onto the axis
        var tMinA = Number.MAX_VALUE;
        var tMaxA = -Number.MIN_VALUE;
        var tMinB = Number.MAX_VALUE;
        var tMaxB = -Number.MIN_VALUE;

        // Compute the locations, along the given normal, of the min and max locations of points in objA
        for (var point of objA.tpoints) {
            // point is already stored as a vector object
            // we can think of point as a 2D vector from the origin to the point's location
            // then, the location of the projection of the 2D vector ontot the axis is simply given by the dot product of the 2D vector and the axis
            // the normal is already normalized (part of the polygon's update() function)

            var t = vec2.dot(point, normal);
            if (t > tMaxA) {
                tMaxA = t;
            }
            if (t < tMinA) {
                tMinA = t;
            }
        }

        // Compute the locations, along the given normal, of the min and max locations of points in objB
        for (var point of objB.tpoints) {
            var t = vec2.dot(point, normal);
            if (t > tMaxB) {
                tMaxB = t;
            }
            if (t < tMinB) {
                tMinB = t;
            }
        }

        if (tMinB > tMaxA || tMinA > tMaxB) {
            // If any separating axis is found, there can be no collision
            return false;
        }
    }

    return true;
};


CollisionManager.prototype.isColliding_LineSeg_Polygon = function(seg, poly) {
    // Naive approach: Intersection test of the line segment against all the line segments in the polygon
    // The polygon "line segments" are constructed on the fly; polygons are stored as points

    for (var i = 0; i < poly.tpoints.length; i++) {
        var tmpPolySeg = new CollisionComponentLineSeg();

        var j = (i + 1) % poly.tpoints.length;

        tmpPolySeg.setEndPoints(poly.tpoints[i][0], poly.tpoints[i][1], poly.tpoints[j][0], poly.tpoints[j][1]);
        if (this.isColliding_LineSeg_LineSeg(tmpPolySeg, seg)) {
            return true;
        }
    }

    return false;
};
