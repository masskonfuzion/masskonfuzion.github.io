function Bullet () {
    // Inherit Particle, which in turn inherits GameObject 
    Particle.call(this);

    this.addComponent("physics", new PhysicsComponentVerlet());
    // TODO enable the sprite rendering component. Make it possible for the gun's bullet emitter to set the image to be used by a particular bullet object in the bullet object pool. (right now, by not using the sprite component, we'll use the default Particle render comp, which is a circle). 
    //// Each bullet can reference a particular image file for its rendering(e.g. small, medium, or large). The BulletManager will control all bullets
    //this.addComponent("render", new RenderComponentSprite());
    this.addComponent("collision", new CollisionComponentAABB());

    this.hitPower = 1;
    this.autoExpire = false;    // override the Particle's autoExpire property
}

Bullet.prototype = Object.create(Particle.prototype);
Bullet.prototype.constructor = Bullet;

Bullet.prototype.update = function(dt_s, config = null) {
    if (this.alive) {
        for (var compName in this.components) {
            if (this.components.hasOwnProperty(compName)) {
                this.components[compName].update(dt_s);
            }
        }
    }
}

