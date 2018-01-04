function Asteroid () {
    // Inherit Particle, which in turn inherits GameObject 
    Particle.call(this);

    this.addComponent("physics", new PhysicsComponentVerlet());
    this.addComponent("render", new RenderComponentSprite());       // Each asteroid can be a particular size (e.g. small, medium, or large). The AsteroidManager will control all asteroids
    this.addComponent("collision", new CollisionComponentAABB());

    // NOTE: Because Asteroid derives from Particle, we're actually overriding the components that a Particle normally "ships" with.
    // TODO -- rework this Asteroid-as-a-subclass-of-Particle design; it's confusing

    this.hitPoints = 1;
    this.size = 2;  // Sizes are: 2=large, 1=medium, 0=small
    this.autoExpire = false;    // override the Particle's autoExpire property
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
