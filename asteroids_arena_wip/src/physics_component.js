function PhysicsComponentVerlet() {
    GameObjectComponent.call(this);

    this.currPos = vec2.create();
    this.prevPos = vec2.create();
    this.acceleration = vec2.create();
    this.angle = 0.0;
    this.angleVec = vec2.fromValues(1.0, 0.0);  // v[0] = cos(theta); v[1] = sin(theta)
    this.angularVel = 0.0;
}

PhysicsComponentVerlet.prototype = Object.create(GameObjectComponent.prototype);
PhysicsComponentVerlet.prototype.constructor = PhysicsComponentVerlet;

// Run verlet integration. Note that this does just enough for particle simulation (we're treating the spaceship as a particle)
// The timestep, dt_s, is in seconds
PhysicsComponentVerlet.prototype.update = function(dt_s, config = null) {

    var posTmp = vec2.clone(this.currPos);

    // currPos += (currPos - prevPos) + (acceleration * dt_s * dt_s)

    var integrationTerm = vec2.create();
    vec2.sub(integrationTerm, this.currPos, this.prevPos);                                  // currPos - prevPos
    vec2.scaleAndAdd(integrationTerm, integrationTerm, this.acceleration, dt_s * dt_s);     // (currPos - prevPos) + (accel * dt_s * dt_s)
    vec2.add(this.currPos, this.currPos, integrationTerm);

    vec2.copy(this.prevPos, posTmp);

    this.angle = (this.angle + this.angularVel * dt_s) % 360;       // We'll store angle in degrees
    this.angleVec[0] = Math.cos( glMatrix.toRadian(this.angle) );
    this.angleVec[1] = Math.sin( glMatrix.toRadian(this.angle) );
}

PhysicsComponentVerlet.prototype.setPosition = function(x, y) {
    // Set both current and previous pos, so that the update() function does not obtain velocity
    vec2.set(this.currPos, x, y);
    vec2.set(this.prevPos, x, y);
}

// Set the particle's position and initial velocity
// Use vel to fabricate a prevPos
PhysicsComponentVerlet.prototype.setPosAndVel = function(posX, posY, velX, velY, dt_s) {
    // We'll scale velocity by dt (should be a fixed dt)
    vec2.set(this.currPos, posX, posY);
    vec2.set(this.prevPos, posX - velX*dt_s, posY - velY*dt_s);
}

// Set linear acceleration
PhysicsComponentVerlet.prototype.setAcceleration = function(x, y) {
    vec2.set(this.acceleration, x, y);
}

