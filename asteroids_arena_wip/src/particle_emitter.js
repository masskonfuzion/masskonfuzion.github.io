/** Particle Emitter

Particle Emitters register with a Particle System (a.k.a. Particle Engine). A System can have multiple emitters (e.g. multiple ships can emit to the the "thrust smoke" System)
Particle System has a fixed-length array of Particle objects
Emitters "emit" Particles by writing info to Particles, initializing their values (e.g. velocity, launch angle, start/end colors, time to live, etc.)
The Particle System simulates the Particles' decay

ParticleEmitters have to issue requests, of the Particle System, to add particles

NOTE: This class can be a game object component -- e.g., a spaceship will have the particle emitter. Yeah. I just decided that right now. You, reading this, will have no idea when "now" is. But I've been working on this game for over a week. So, yeah. :-D.
ParticleEmitter should be thought of as a Particle System Controller. A spaceship can use the ParticleEmitter differently, depending on which gun/launcher it has equipped.

TODO decide: Should the ParticleEmitter actually be a ParticleManager, i.e., also responsible for destroying Particles?
**/

function ParticleEmitter(myID = "") {
    // Inherit GameObject properties, includinga components dict
    GameObject.call(this);

    this.registeredPS = null;           // A reference to the particle system this emitter will write to

    this.launchDir = vec2.create();     // should be a normalized vector
    this.minLaunchVelMult = 0.0;        // Minimum velocity magnitude multiplier
    this.maxLaunchVelMult = 0.0;        // Maximum velocity magnitude multiplier
    this.minLaunchAngle = 0.0;          // Minimum launch angle offset (relative to launchDir, in degrees)
    this.maxLaunchAngle = 0.0;          // Maximum launch angle offset (relative to launchDir, in degrees)
    this.position = vec2.create();
    this.emitterID = myID;              // a unique identifier for this emitter

    // If configured to use colors for particles (instead of images), particle emitter will
    // select a color in between min and max (if autoExpire is true, then the Particle's starting
    // color will be based on how far between minTTL and maxTTL its starting TTL is)
    this.minColor = [0, 0, 0];          // "Minimum" color values
    this.maxColor = [0, 0, 0];          // "Maximum" color values

    this.minTTL = 0.0;  // seconds
    this.maxTTL = 0.0;

    this.rateLimit = 0.0;           // In seconds
    this.lastEmitTS = 0.0;;         // Last emit timestamp, in seconds

    this.enabled = false;
}

ParticleEmitter.prototype = Object.create(GameObject.prototype);
ParticleEmitter.prototype.constructor = ParticleEmitter;

ParticleEmitter.prototype.registerParticleSystem = function(particleSys) {
    this.registeredPS = particleSys;
};

// We want to be able to emit from one or more "emit points", e.g. multiple thrusters or multiple guns/missile launchers -- should guns/missiles be treated as particles? (if so, should missiles have logic, e.g. homing missiles? Should this game even have missiles?)

// Get the "next available particle" in the system, and initialize it
// If getNextUsableParticle() fails, then this function should fail silently (at most, log to console)
ParticleEmitter.prototype.emitParticle = function(dt_s, config = null) {
    // TODO update emitParticle to take in the type of particle to emit (or, e.g., info about how to initialize the particle. Use the Transfer Object pattern -- the object will contain config info re: particles with sprite rendering vs other type of rendering)
    var particle = this.registeredPS.getNextUsableParticle();

    if (particle) {
        // Initialize the particle direction by copying from the emitter's direction property
        var particleDir = vec2.clone(this.launchDir);

        // Compute an angle offset by which to rotate the base particle direction
        var angleOffset = Math.floor(Math.random() * (this.maxLaunchAngle - this.minLaunchAngle)) + this.minLaunchAngle;

        // Compute the rotation matrix to apply the desired rotational offset to the launch dir
        var angleOffsetMatrix = mat2.create();
        mat2.fromRotation( angleOffsetMatrix, glMatrix.toRadian(angleOffset) );

        // Apply the rotation
        vec2.transformMat2(particleDir, particleDir, angleOffsetMatrix);
        vec2.normalize(particleDir, particleDir);   // normalize, just in case

        // Compute a launch velocity (don't use Math.floor() because we want floating point results
        var launchVelMag = Math.random() * (this.maxLaunchVelMult - this.minLaunchVelMult) + this.minLaunchVelMult;
        var launchVel = vec2.create();
        vec2.scale(launchVel, particleDir, launchVelMag);

        // Now, set the properties of the particle
        var physComp = particle.components["physics"];
        physComp.setPosAndVel(this.position[0], this.position[1], launchVel[0], launchVel[1], dt_s);
        // NOTE: We're not using particle angles here (but we could if we wanted to)

        particle.alive = true;
        particle.emitterID = this.emitterID;
        
        // Compute a TTL
        var ttl = 0.0;
        if (particle.autoExpire) {
            ttl = Math.random() * (this.maxTTL - this.minTTL) + this.minTTL;
            particle.ttl = ttl;
        }

        if (config) 
        {
            if (config.hasOwnProperty("renderCompType")) {
                if (config["renderCompType"] == "image") {
                    // For now, we're only using static sprites
                    particle.components["render"].imgObj = config["imageRef"];
                }
                // TODO handle other render comp types (maybe animated sprite?)
                // TODO also add a case to allow the config obj to specify a color, rather than image? Or should color & image be mutually exclusive? So many design considerations...
            } else {
                this.setRandomParticleColor(particle);
            }

            if (config.hasOwnProperty("bannedLocations")) {
                // Prevent particle from spawning within "radius" units of "position"
                var correctedPos = vec2.create();
                var offsetAngle = 0;    // degrees
                var offsetVec = vec2.create();
                
                var emitterPosIsValid = true;
                for (var bannedLoc of config["bannedLocations"]) {
                    emitterPosIsValid = vec2.squaredDistance(this.position, bannedLoc["position"]) > bannedLoc["radius"]*bannedLoc["radius"];
                    if (!emitterPosIsValid) {
                        break;
                    }
                }


                while (!emitterPosIsValid) {
                    if (offsetAngle >= 360) {
                        // If we've gone in a full circle and still not found a valid spawn location, give up and use the original (TODO maybe try some different methods?)
                        break;  // out of while loop
                    }

                    vec2.set(offsetVec, Math.cos(glMatrix.toRadian(offsetAngle)), Math.sin(glMatrix.toRadian(offsetAngle)));

                    vec2.copy(correctedPos, this.position);
                    vec2.scaleAndAdd(correctedPos, correctedPos, offsetVec, 36);    // TODO don't hardcode the scale amount -- include an "offset" amount, maybe in the config object; i.e. we should set the correctedPos one time, and test it against all bannedLocations

                    for (var bannedLoc of config["bannedLocations"]) {
                        emitterPosIsValid = vec2.squaredDistance(correctedPos, bannedLoc["position"]) <= bannedLoc["radius"]*bannedLoc["radius"];
                        if (!emitterPosIsValid) {
                            offsetAngle += 45;
                            break;  // out of for loop
                        }
                    }

                    // If we get here and emitterPosIsValid == true, then we can call setPosAndVel on the particle's physics component, with our corrected position
                    if (emitterPosIsValid) {
                        physComp.setPosAndVel(correctedPos[0], correctedPos[1], launchVel[0], launchVel[1], dt_s);
                        break;  // out of while loop
                    }
                }

            }

            // Do any "post-processing" using any funcCalls defined in the config object
            if (config.hasOwnProperty("funcCalls")) {
                for (funcCallDef of config["funcCalls"]) {
                    // apply() takes in a list and applies the items as params to the function (similar to *args in Python)
                    // Passing null into params is equivalent to calling func()
                    funcCallDef["func"].apply(particle, funcCallDef["params"]);
                }
            }

        } else {
            // Default, if no config object, is to use colors.
            this.setRandomParticleColor(particle);
        }

        // Note: we are able to add collision objects to the collision manager at this point, because the particles being managed by this emitter are already fully formed objects
        if ("collision" in particle.components) {
            // Get a reference to the GameLogic object's collision manager via my registered particle system's collisionMgrRef property
            // NOTE: This assumes that we've registered to this emitter a particle system that has a non-null collisionMgrRef
            var collMgr = this.registeredPS.collisionMgrRef;
            particle.components["collision"].update(0);     // Do a trivial update to make the collider compute its size and such
            collMgr.addCollider(particle.components["collision"]);
        }

    } else {
        console.log("Unable to satisfy getNextUsableParticle call!");
    }
};

// Set the color of the Particle's render component
// (this only works if the render component is something we can set the color of, e.g., circle, square -- primitive shapes
ParticleEmitter.prototype.setRandomParticleColor = function(particle) {
    var pct = 0.0;
    if (particle.autoExpire) {
        pct = (particle.ttl - this.minTTL) / (this.maxTTL - this.minTTL);
    } else {
        pct = Math.random();
    }
    var r = this.minColor[0] + (this.maxColor[0] - this.minColor[0]) * pct;
    var g = this.minColor[1] + (this.maxColor[1] - this.minColor[1]) * pct;
    var b = this.minColor[2] + (this.maxColor[2] - this.minColor[2]) * pct;

    particle.components["render"].setColor(r, g, b);
    
};

// Set the color of the Particle's render component
// (this only works if the render component is something we can set the color of, e.g., circle, square -- primitive shapes
ParticleEmitter.prototype.setParticleColor = function(particle, r, g, b) {
    particle.components["render"].setColor(r, g, b);
};


ParticleEmitter.prototype.setEmitterID = function(myID) {
    this.emitterID = myID;
};

ParticleEmitter.prototype.setPosition = function(posX, posY) {
    vec2.set(this.position, posX, posY);
};

ParticleEmitter.prototype.setVelocityRange = function(minMagnitude, maxMagnitude) {
    this.minLaunchVelMult = minMagnitude;
    this.maxLaunchVelMult = maxMagnitude;
};


ParticleEmitter.prototype.setLaunchDir = function(dirX, dirY) {
    vec2.set(this.launchDir, dirX, dirY);
    vec2.normalize(this.launchDir, this.launchDir);
};


ParticleEmitter.prototype.setAngleRange = function(minAng, maxAng) {
    // Angles are in degrees
    // Not sure if I want to use negative angles (e.g. min angle -10, max 10); or only non-zero (e.g. "min" is 350, "max" is 10), or use vectors (interpolate from a left-ish vector to a right-ish vector
    this.minLaunchAngle = minAng;
    this.maxLaunchAngle = maxAng;
};


ParticleEmitter.prototype.setTTLRange = function(minTTL, maxTTL) {
    // in seconds
    this.minTTL = minTTL;
    this.maxTTL = maxTTL;
};


ParticleEmitter.prototype.setMinColor = function(r, g, b) {
    this.minColor = [r, g, b];
};


ParticleEmitter.prototype.setMaxColor = function(r, g, b) {
    this.maxColor = [r, g, b];
};


ParticleEmitter.prototype.setEnabled = function() {
    this.enabled = true;
};


ParticleEmitter.prototype.setDisabled = function() {
    this.enabled = false;
};


// Set the rate limit in seconds (e.g. 0.2 means there will be a 0.2 second interval between particle emissions)
ParticleEmitter.prototype.setRateLimit = function(limit) {
    this.rateLimit = limit;
};


// Return the current time in seconds elapsed since Jan 1, 1970
ParticleEmitter.prototype.getCurrentTime = function() {
    // Divide by 1000 because Date.now() returns milliseconds)
    return Date.now() * 0.001;
};


ParticleEmitter.prototype.recordLastEmitTS = function() {
    this.lastEmitTS = this.getCurrentTime();
};


ParticleEmitter.prototype.withinRateLimit = function() {
    return this.getCurrentTime() - this.lastEmitTS >= this.rateLimit;
};


ParticleEmitter.prototype.update = function(dt_s, config = null) {
    // emit a particle
    // NOTE: the particle emitter is only responsible for putting particles into a particle system
    // the emitter is not responsible for updating the emitted particles; the particle system itself will handle that

    if (this.enabled && this.withinRateLimit()) {
        // If config obj exists, emit particles based on its contents
        if (config) {
            // Note that with multiple emitPoints, the emitter emits them all simultaneously.
            // I'm debating how to do round-robin emission (i.e., should the ParticleEmitter object be responsible for the logic of round-robin, or should the object that owns the emitter (e.g. the gun/thruster/etc)?
            // TODO or.. maybe make emitPoints optional, also with a flag: "has multiple emit points", or something. Or, maybe no flag. just, if you use emitPoints, then you get multiple points; else, you'll use the already-configured emitter position

            // use single or multiple emit points
            if (config.hasOwnProperty("emitPoints")) {
                for (var emitPoint of config["emitPoints"]) {
                    this.setPosition(emitPoint["position"][0], emitPoint["position"][1]);
                    this.setLaunchDir(emitPoint["direction"][0], emitPoint["direction"][1]);
                    this.emitParticle(dt_s, config);
                }
            } else {
                this.emitParticle(dt_s, config);
            }

            // TODO any other params to add to the config obj for the particle emitter?
        } else {
            // if there's no config obj, simply emit a particle based on originally set parameters
            // TODO -- fix this particle emission in the case where no config obj is given.  Currently, particles launched in this case have no velocity
            this.emitParticle(dt_s);
        }

        this.recordLastEmitTS();
    }
};
