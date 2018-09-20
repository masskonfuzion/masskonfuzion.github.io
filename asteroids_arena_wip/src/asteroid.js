function Asteroid () {
    GameObject.call(this);

    this.addComponent("physics", new PhysicsComponentVerlet());
    this.addComponent("render", new RenderComponentSprite());       // Each asteroid can be a particular size (e.g. small, medium, or large). The AsteroidManager will control all asteroids
    this.addComponent("collision", new CollisionComponentPolygon());

    this.hitPoints = 1;
    this.size = 2;  // Sizes are: 2=large, 1=medium, 0=small
    this.autoExpire = false;    // We're using particle-like properties, but we're not a particle
    this.alive = false;         // We're using particle-like properties, but we're not a particle
}

Asteroid.prototype = Object.create(Particle.prototype);
Asteroid.prototype.constructor = Asteroid;

Asteroid.prototype.update = function(dt_s, config = null) {
    if (this.alive) {
        for (var compName in this.components) {
            if (this.components.hasOwnProperty(compName)) {
                this.components[compName].update(dt_s);
            }
        }
    }
}

Asteroid.prototype.setSize = function(size) {
    this.size = size;
};

// Disable asteroid
Asteroid.prototype.disable = function(transfer = null) {
    this.alive = false;

    var myCollider = this.components["collision"];
    // Check if the transfer object has a collision manager reference that was passed in (i.e. collision mgr belongs to game logic)
    if (transfer && transfer.hasOwnProperty("collisionMgrRef")) {
        var collMgr = transfer["collisionMgrRef"];
        collMgr.removeCollider(myCollider.objectID);
    } else {
        throw new Error("Attempting to disable asteroid with collision component, but no collision manager is available");
    }
}
