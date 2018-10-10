/** Particle System
*/

function ParticleSystem(ctorFunc=null) {
    GameObject.call(this);

    this.particles = [];
    this.lastUsedIndex = -1;
    this.collisionMgrRef = null;

    this.particleCtor = null;
    if (ctorFunc === null) {
        this.particleCtor = Particle;
    } else {
        this.particleCtor = ctorFunc;
    }

}

ParticleSystem.prototype = Object.create(GameObject.prototype);
ParticleSystem.prototype.constructor = ParticleSystem;

ParticleSystem.prototype.initialize = function(numParticles) {
    console.assert(this.particles.length === 0);

    for (var i = 0; i < numParticles; i++) {
        //this.particles.push(new Particle());
        this.particles.push(new this.particleCtor());
    }
};

// Return next available non-alive Particle that can be used
// Wrap back to beginning if the end of the list is reached
// Return null if you've looped through the particle array a certain number of times and not found a usable particle
ParticleSystem.prototype.getNextUsableParticle = function(maxLoops = 3) {
    var i = (this.lastUsedIndex + 1) % this.particles.length;

    while (this.particles[i].alive) {
        i = (i + 1) % this.particles.length;
        if (i == this.lastUsedIndex) {
            // If we're here, then every asteroid in the pool is currently active
            return null;
        }
    }

    this.lastUsedIndex = i;
    return this.particles[i];

};


ParticleSystem.prototype.draw = function(canvasContext) {
    // Draw each alive Particle
    for (var particle of this.particles) {
        if (particle.alive) {
            particle.draw(canvasContext);
        }
    }
};


ParticleSystem.prototype.update = function(dt_s, config = null) {
    var transfer = config ? config : {};    // ternary: transfer = config if config exists already; else, transfer is an empty object
    transfer["collisionMgrRef"] = this.collisionMgrRef;

    for (var particle of this.particles) {
        particle.update(dt_s, transfer);
    }
};
