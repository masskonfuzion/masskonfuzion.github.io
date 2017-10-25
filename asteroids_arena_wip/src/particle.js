/** Particle
*/

function Particle() {
    GameObject.call(this);

    this.addComponent("physics", new PhysicsComponentVerlet());
    this.addComponent("render", new RenderComponentCircle());

    // NOTE: Particles will not have a "velocity" property because they'll be simulated using position Verlet integration. The Emitter will control initial position and velocity

    this.emitterID = "";        // ID of object that fired this particle (optional)
    this.alive = false;
    this.autoExpire = true;     // By default, this particle "auto-expires" using TTL. Set to false to disable auto-expire, and force some other game logic to determine when to expire this particle
    this.ttl = 0.0;         // in seconds.
}


Particle.prototype = Object.create(GameObject.prototype);
Particle.prototype.constructor = Particle;

Particle.prototype.draw = function(canvasContext) {
    canvasContext.save();

    // Get the particle's physics component
    var physComp = this.components["physics"];

    canvasContext.translate(physComp.currPos[0], physComp.currPos[1]);
    // TODO maybe also add rotation

    // draw the render component
    this.components["render"].draw(canvasContext);
    canvasContext.restore();
};

Particle.prototype.setAutoExpire = function(tf) {
    this.autoExpire = tf;
};


Particle.prototype.update = function(dt_s, config = null) {
    if (this.alive) {
        var physComp = this.components["physics"];
        physComp.update(dt_s);

        if (this.autoExpire) {
            this.ttl -= dt_s;
            if (this.ttl < 0.0) {
                this.disable();
            }
        }
    }
};


// Disable particle
Particle.prototype.disable = function() {
    this.alive = false;

    // Check if this particle has a collision component, and if so, if the collision component has an objectID > -1.
    if("collision" in this.components && this.components.hasOwnProperty("collision")) {
        var myCollider = this.components["collision"];
        // If so, then also check if the GameLogic object has a collision manager that is managing the particle's collision component
        if (gameLogic.collisionMgr) {
            // remember, gameLogic is a global-scope var set in index.html
            var collMgr = gameLogic.collisionMgr;
            collMgr.removeCollider(myCollider.objectID);
        }
    }
}
