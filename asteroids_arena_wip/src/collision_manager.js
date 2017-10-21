// Quadtree-based Collision Manager
// Perhaps if we want to get fancier in the future, we can make a Collision Manager Interface, and
// then have Collision Manager instances that implement the interface using different underlying
// mechanisms, like BSP, Spatial Hash, etc.
function CollisionManager() {
    GameObject.call(this);
    // The collision manager has a pool of collision objects.
    this.colliders = {};    // The key of the dict will be the object ID of the object this collision component belongs to
    this.objectIDToAssign = -1;  // probably belongs in the base class.

    this.quadTree = null;
}

CollisionManager.prototype = Object.create(GameObject.prototype);
CollisionManager.prototype.constructor = CollisionManager;

CollisionManager.prototype.initialize = function(initialRect) {
    // Initialize a QuadTree, starting at level/depth 0
    // NOTE: The max # of levels in the quadtree is defined in quadtree.js
    this.quadTree = new QuadTree(0, initialRect); // width/height should match canvas width/height (maybe just use the canvas object?)
}

CollisionManager.prototype.addCollider = function(collider) {
    this.objectIDToAssign += 1;
    collider.objectID = this.objectIDToAssign;
    this.colliders[this.objectIDToAssign] = collider;
}

CollisionManager.prototype.removeCollider = function(id) {
    if (id in this.colliders && this.colliders.hasOwnProperty(id)) {
        delete(this.colliders[id]);
    } else {
        // NOTE: might not want to keep this log message long-term, but during development/testing, it's ok
        console.log("Attempted to remove from CollisionManager.colliders an item that does not exist");
    }
}

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
                console.log("Collision detected!");
                // Enqueue a message to the gameLogic object with information about the collision, for the gameLogic to decide how to respond
                var collisionMsg = { "topic": "CollisionEvent",
                                     "colliderA": potentialCollisions[key]["objA"],
                                     "colliderB": potentialCollisions[key]["objB"]
                                   };
                gameLogic.messageQueue.enqueue(collisionMsg);
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
}


CollisionManager.prototype.isColliding_AABB_AABB = function(objA, objB) {
    if (objA.maxPt[0] < objB.minPt[0] || objA.minPt[0] > objB.maxPt[0]) {
        return false;
    }

    if (objA.maxPt[1] < objB.minPt[1] || objA.minPt[1] > objB.maxPt[1]) {
        return false;
    }

    return true;
};
