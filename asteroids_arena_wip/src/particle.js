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

    // TODO delete: DEBUGGING
    //if (this.components.hasOwnProperty("collision")) {
    //    this.components["collision"].draw(canvasContext);
    //}
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
                this.disable(config);
            }
        }
    }
};


// Disable particle
Particle.prototype.disable = function(transfer = null) {
    // TODO delete debug
    //if (this.constructor.name != "Particle") {
    //    console.log("Disabling particle (alive = " + this.alive + ")", this);
    //}

    this.alive = false;

    // Check if this particle has a collision component, and if so, if the collision component has an objectID > -1.
    if("collision" in this.components && this.components.hasOwnProperty("collision")) {
        var myCollider = this.components["collision"];
        // If so, then also check if the transfer object has a collision manager reference that was passed in (i.e. collision mgr belongs to game logic)
        if (transfer && transfer.hasOwnProperty("collisionMgrRef")) {
            var collMgr = transfer["collisionMgrRef"];
            collMgr.removeCollider(myCollider.objectID);
        } else {
            throw new Error("Attempting to disable particle with collision component, but no collision manager is available");
        }
    }
}
