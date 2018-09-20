function AsteroidManager () {
    GameObject.call(this);
    // The Asteroid field is essentially a particle system
   this.lastUsedIndex = -1;

    this.asteroids = [];
    this.maxAsteroids = 0;
    this.activeAsteroids = { 2: 0, 1: 0, 0: 0};     // Dict of # of asteroids of each size
    this.initialAsteroids = 0;

    // Populate the command map (this.commandMap is part of the GameObject base class, which this Asteroid Manager derives from)
    this.commandMap["disableAndSpawnAsteroids"] = this.disableAndSpawnAsteroids;
    this.commandMap["disableAsteroids"] = this.disableAsteroids;

    this.asteroidSizeMap = { 0: "astSmall",
                             1: "astMedium",
                             2: "astLarge"
                           };

    // large asteroids are 32x32
    // medium asteroids are 16x16
    // small asteroids are 8x8
    // asteroid sizes are given as follows: this.size = 2;  // Sizes are: 2=large, 1=medium, 0=small
    // so we'll make a "halfSize" array that has the appropriate half-sizes we can looken, given the Asteroid's "size" property
    this.asteroidHalfSizes = [4, 8, 16];   // used when initializing collision components for new asteroids

    this.collisionMgrRef = null;

    // REPLACE ALL THIS NONSENSE (note: we're pretty much copying from particle_emitter.js.. But Asteroids should not be particles
    this.asteroidSpawnParams = { "minSpeed": 3.0,
                                 "maxSpeed": 9.0
                               }

}


AsteroidManager.prototype = Object.create(GameObject.prototype);
AsteroidManager.prototype.constructor = AsteroidManager;

AsteroidManager.prototype.initialize = function(initAsteroids, maxAsteroids) {
    // maxAsteroids is the maximum number of Asteroids that could be in play
    this.maxAsteroids = maxAsteroids;   // NOTE: we could also just get the length of the particle system's array; consider removing this.maxAsteroids?

    // Create pool of Asteroid objects
    for (var i = 0; i < this.maxAsteroids; i++) {
        this.asteroids.push(new Asteroid());
    }

    // Store a reference to the AsteroidManager's parent object's (i.e. gameLogic object's) collision mgr
    // Not totally necessary to do this..
    this.collisionMgrRef = this.parentObj.collisionMgr;

    // Spawn some Asteroids, taking "banned locations" into account
    var bannedLocations = this.createBannedLocationsList(70);  // The parameter is the radius from each banned location, within which asteroids cannot be spawned
    for (var i = 0; i < initAsteroids; i++) {
        // Note the "funcCalls" property - "params" is a list that, when passed into a function.apply() call, is "splatted" into individual parameters, similar to Python *args
        // funcCalls call functions using the particle (in the particle system) as the "this" reference
        var configObj = { "renderCompType": "image",
                          "imageRef": game.imgMgr.imageMap["astLarge"].imgObj,
                          "funcCalls": [ {"func": Asteroid.prototype.setSize, "params": [2]} ],
                          "bannedLocations": bannedLocations
                        };
        // Spawn an asteroid with the given config. Note that the config tells the asteroid which image to use for its render component
        // Because the images are already loaded by the ImageManager (in the GameLogic object), all we have to do is reference it
        this.spawnNewAsteroid(game.fixed_dt_s, configObj);
    }
};

AsteroidManager.prototype.update = function(dt_s, config = null) {
    var freeSpacesNeeded = this.activeAsteroids[2] * 4 + this.activeAsteroids[1] * 2 + this.activeAsteroids[0];
    // freeSpacesNeeded is like a "reservation" for the number of array slots needed to store all possible asteroids/fragments that could come from 1 asteroid
    // 4 is a magic number -- the # of asteroids that can possibly result from shooting 1 large asteroid
    var totalAsteroids = this.activeAsteroids[2] + this.activeAsteroids[1] + this.activeAsteroids[0];
    if (this.maxAsteroids - freeSpacesNeeded >= 4) {
        var bannedLocations = this.createBannedLocationsList(70);
        var configObj = { "renderCompType": "image",
                          "imageRef": game.imgMgr.imageMap["astLarge"].imgObj,
                          "funcCalls": [ {"func": Asteroid.prototype.setSize, "params": [2]} ],
                          "bannedLocations": bannedLocations
                        };
        this.spawnNewAsteroid(dt_s, configObj);
    }

    // Iterate over all asteroids and call update
    for (var asteroid of this.asteroids) {
        asteroid.update(dt_s);
    }

    // Iterate over all components of the AsteroidManager GameObject and update them
    for (var compName in this.components) {
        if (this.components.hasOwnProperty(compName)) {
            this.components[compName].update(dt_s);
        }
    }
};


AsteroidManager.prototype.resetAsteroidField = function() {
    // This fn is meant to be called after setting max/init (or maybe we should reset when we initialize? Not sure..

};

AsteroidManager.prototype.draw = function(canvasContext) {
    // Draw each alive Asteroid
    for (var asteroid of this.asteroids) {
        if (asteroid.alive) {
            asteroid.draw(canvasContext);
        }
    }
};


// disable asteroids (primarily when an asteroid leaves the arena; in other cases, e.g. collision with ship or
// bullet, disableAndSpawnAsteroids is called (which disables an asteroid, and spawns new asteroid fragments
// Note: Though disableAsteroids appears before disableAndSpawnAsteroids in the code, disableAndSpawnAsteroids was written before
// disableAsteroids, chronologically. disableAsteroids takes in a list of asteroids to disable, to stay consistent with disableAndSpawnAsteroids, 
// but looking back on it, I'm not sure why I pass in a list, and not just a single asteroid..
AsteroidManager.prototype.disableAsteroids = function(params) {
    for (var astToDisable of params.disableList) {
        // Disable asteroid
        // NOTE: Another (better?) way to particles access to the collision manager that manages their colliders is to simply give the particles a reference to the particle system they belong to
        astToDisable.disable( {"collisionMgrRef": this.collisionMgrRef} ); 
        this.activeAsteroids[astToDisable.size] -= 1;
        if (this.activeAsteroids[astToDisable.size] < 0) { throw new Error("activeAsteroids reached negative count"); }
    }
};

// Disable passed-in asteroid(s), and spawn new ones
AsteroidManager.prototype.disableAndSpawnAsteroids = function(params) {
    // params is a dict object

    // NVM figure out why I designed this function to work on a list of asteroids (when I'm passing in only 1 asteroid to disable)
    for (var astToDisable of params.disableList) {

        var spawnPoint = vec2.clone(astToDisable.components["physics"].currPos);

        // Get velocity from asteroid
        var astVel = vec2.create();
        var astVelDir = vec2.create();
        vec2.sub(astVel, astToDisable.components["physics"].currPos, astToDisable.components["physics"].prevPos);
        vec2.normalize(astVelDir, astVel);

        // Note: there should be as many launchData items as params.numToSpawn  // NVM maybe launchData should be passed in?
        // NOTE: we/re dividing the velocity multiplier by game.fixed_dt_s because in this computation, we're dealing with velocity over 1 frame; the physicsComponent's setPosAndVel function assumes we're working with velocity over a full second, so we're dividing by dt, to compensate
        // We use 25 for posMult to create an offset far enough so that the 2 newly spawned asteroid fragments aren't colliding with each other
        var launchData = [ { "ang": glMatrix.toRadian(45), "dir": vec2.create(), "velMult": 2 / game.fixed_dt_s, "posMult": 25},
                           { "ang": glMatrix.toRadian(-45), "dir": vec2.create(), "velMult": 2 / game.fixed_dt_s, "posMult": 25} ];

        // Disable asteroid
        astToDisable.disable({"collisionMgrRef": this.collisionMgrRef});
        this.activeAsteroids[astToDisable.size] -= 1;
        if (this.activeAsteroids[astToDisable.size] < 0) { throw new Error("activeAsteroids reached negative count"); }

        var bannedLocations = this.createBannedLocationsList(70);
        if (astToDisable.size > 0) {
            var newSize = astToDisable.size - 1;
            var newSizeStr = this.asteroidSizeMap[newSize];

            for (var i = 0; i < params.numToSpawn; i++) {
                // Compute launch data based on asteroid velocity
                var rotMat = mat2.create();
                mat2.fromRotation(rotMat, launchData[i]["ang"]);
                vec2.transformMat2(launchData[i]["dir"], params.fragRefDir, rotMat);    // Rotate the asteroid/bullet fragment reference dir

                var offsetVec = vec2.create();
                vec2.scale(offsetVec, launchData[i]["dir"], launchData[i]["posMult"]);

                var fragmentPos = vec2.create();
                vec2.add(fragmentPos, spawnPoint, offsetVec);

                // Given all the stuff we've just calculated, now build a configObj to pass into the spawning function
                var configObj = { "renderCompType": "image",
                                  "imageRef": game.imgMgr.imageMap[ newSizeStr ].imgObj,
                                  "funcCalls": [ { "func": Asteroid.prototype.setSize, "params": [newSize] } ],
                                  "bannedLocations": bannedLocations,
                                  "position": fragmentPos,
                                  "direction": launchData[i].dir,
                                  "speed": vec2.length(astVel) * launchData[i].velMult
                                };

                this.spawnNewAsteroid(game.fixed_dt_s, configObj);
                // Notes about the configObj:
                // Because the images are already loaded by the ImageManager (in the GameLogic object), all we have to do is reference it
                // Also note: this approach requires the ParticleSystem to be configured to create Particles with an image/sprite render component

            }
        }
    }
};


AsteroidManager.prototype.executeCommand = function(cmdMsg, params) {
    //console.log("AsteroidManager executing command");
    //console.log(cmdMsg);

    // Call function
    // Note that this command passes a "params" arg in the cmdMsg payload, where other executeCommand functions (elsewhere in this codebase) do not..
    this.commandMap[cmdMsg].call(this, params); // use call() because without it, we're losing our "this" reference (going from AsteroidManager to Object)
};


// Create a list of banned locations, to be processed by asteroid spawning functions
AsteroidManager.prototype.createBannedLocationsList = function(radius) {
    var bannedLocations = [];

    // iterate over the gameLogic object's shipDict to get the positions of ships in play
    //for (var objID of Object.getOwnPropertyNames(this.parentObj.shipDict)) {  // The long-form way to iterate?
    for (var objID in this.parentObj.shipDict) {
        var shipID = this.parentObj.shipDict[objID];

        var bannedLocItem = { "position": this.parentObj.gameObjs[shipID].components["physics"].currPos,
                              "radius": radius
                            };

        bannedLocations.push(bannedLocItem);
    }

    return bannedLocations;
};


// Spawn a new asteroid.  The parameters to this function are all vec2's
AsteroidManager.prototype.spawnNewAsteroid = function(dt_s, config) {
    // Now, set the properties of the asteroid
    var newAsteroid = this.getAvailableAsteroidFromPool();

    if (newAsteroid) {
        // Initialize the particle direction by copying from the emitter's direction property
        var asteroidDir = vec2.create();

        // Choose a random speed
        var speed = 0.0;

        // Now configure the asteroid 
        // If you're reading this function carefully, you'll notice that it takes in a configObj, and processes it as though it's optional. But it's actually required.. 
        var spawnPos = vec2.create();   // create a spawnPos var, to be populated later

        if (config) 
        {
            if (config.hasOwnProperty("position")) {
                vec2.copy(spawnPos, config["position"]);
            }
            else {
                // Select a random spawn position in the arena
                // TODO don't hardcode asteroid spawn boundaries. Use arena geometry
                vec2.set(spawnPos, Math.floor(Math.random() * 600 + 100), Math.floor(Math.random() * 250 + 100));
                while(!this.parentObj.gameObjs["arena"].containsPt(spawnPos)) {
                    vec2.set(spawnPos, Math.floor(Math.random() * 600 + 100), Math.floor(Math.random() * 250 + 100));
                }
            }

            if (config.hasOwnProperty("speed")) {
                speed = config["speed"];
            }
            else {
                speed = Math.random() * (this.asteroidSpawnParams["maxSpeed"] - this.asteroidSpawnParams["minSpeed"]) + this.asteroidSpawnParams["minSpeed"];

            }

            if (config.hasOwnProperty("direction")) {
                // Pre-condition: the direction vector passed into this function must be normalized
                vec2.copy(asteroidDir, config["direction"]);
            }
            else {
                vec2.set(asteroidDir, 1.0, 0.0);    // Start with the particle dir pointing down the +X axis

                // Compute an angle offset by which to rotate the base particle direction
                var angleOffset = Math.floor(Math.random() * 359);

                // Compute the rotation matrix to apply the desired rotational offset to the launch dir
                var angleOffsetMatrix = mat2.create();
                mat2.fromRotation( angleOffsetMatrix, glMatrix.toRadian(angleOffset) );

                // Apply the rotation
                vec2.transformMat2(asteroidDir, asteroidDir, angleOffsetMatrix);
                vec2.normalize(asteroidDir, asteroidDir);   // normalize, just in case
            }

            if (config.hasOwnProperty("renderCompType")) {
                if (config["renderCompType"] == "image") {
                    // For now, we're only using static sprites
                    // Note that in this game, the only option for Asteroids' render components is sprite
                    newAsteroid.components["render"].imgObj = config["imageRef"];
                }
                // TODO handle other render comp types (maybe animated sprite?)
            }
            else {
                throw new Error("Asteroid was created, but no render component was specified");
            }

            if (config.hasOwnProperty("bannedLocations")) {
                // Prevent asteroid from spawning within "radius" units of "position"
                
                // Verify that spawnPos is valid (not within range of banned location) -- this logic should be wrapped in a function
                var spawnPosIsValid = true;
                for (var bannedLoc of config["bannedLocations"]) {
                    spawnPosIsValid = vec2.squaredDistance(spawnPos, bannedLoc["position"]) > Math.pow(bannedLoc["radius"], 2);
                    if (!spawnPosIsValid) {
                        break;
                    }
                }

                while (!spawnPosIsValid) {
                    // Select another random position (this really should be wrapped in a function...)
                    // TODO don't hardcode the asteroid spawn boundaries. Ideally, maybe take in the arena object, and "ask it" for a valid location
                    vec2.set(spawnPos, Math.floor(Math.random() * 600 + 100), Math.floor(Math.random() * 250 + 100));
                    while(!this.parentObj.gameObjs["arena"].containsPt(spawnPos)) {
                        vec2.set(spawnPos, Math.floor(Math.random() * 600 + 100), Math.floor(Math.random() * 250 + 100));
                    }

                    spawnPosIsValid = true;
                    for (bannedLoc of config["bannedLocations"]) {
                        spawnPosIsValid = vec2.squaredDistance(spawnPos, bannedLoc["position"]) > Math.pow(bannedLoc["radius"], 2);
                        if (!spawnPosIsValid) {
                            break;
                        }
                    }
                }
            }

            // Do any "post-processing" using any funcCalls defined in the config object
            if (config.hasOwnProperty("funcCalls")) {
                for (var funcCallDef of config["funcCalls"]) {
                    // apply() takes in a list and applies the items as params to the function (similar to *args in Python)
                    // Passing null into params is equivalent to calling func()
                    funcCallDef["func"].apply(newAsteroid, funcCallDef["params"]);
                }
            }
        }
        else {

            // Throw an error if spawnNew was called with no config object. But really, we should have some kind of handling for a situation like this. E.g., reasonable defaults
            throw new Error("Asteroid spawn function was called with no configuration info.  Don't know how to construct the asteroid");
        }

        newAsteroid.alive = true;
        newAsteroid.autoExpire = false;
        this.activeAsteroids[newAsteroid.size] += 1;

        // Compute launch velocity, using speed as given/computed above
        var launchVel = vec2.create();
        vec2.scale(launchVel, asteroidDir, speed);

        // Once all configuration is done, set the asteroid's position and velocity
        var physComp = newAsteroid.components["physics"];
        physComp.setPosAndVel(spawnPos[0], spawnPos[1], launchVel[0], launchVel[1], dt_s);

        // Note: we are able to add collision objects to the collision manager at this point, because the asteroids being are already fully formed objects
        // (i.e., we wait until after position and velocity and all that are set, so that the collision component update() call can work right)
        if ("collision" in newAsteroid.components) {
            // SUUUUUPER JANKY -- TODO clean up Asteroid collision component management (create once; after initial creation, only modify)
            if (newAsteroid.components["collision"].points.length == 0) {   // and, for that matter, if tpoints and normals also have 0 length
                newAsteroid.components["collision"].points.push(vec2.create());     // bottom left
                newAsteroid.components["collision"].points.push(vec2.create());     // bottom right
                newAsteroid.components["collision"].points.push(vec2.create());     // top right
                newAsteroid.components["collision"].points.push(vec2.create());     // top left
                newAsteroid.components["collision"].tpoints.push(vec2.create());               // TODO make a function, addPoint (or something) that adds a new point to points, and also creates an entry in tpoints and normals
                newAsteroid.components["collision"].tpoints.push(vec2.create());
                newAsteroid.components["collision"].tpoints.push(vec2.create());
                newAsteroid.components["collision"].tpoints.push(vec2.create());
                newAsteroid.components["collision"].normals.push(vec2.create());               // TODO make a function, addPoint (or something) that adds a new point to points, and also creates an entry in tpoints and normals
                newAsteroid.components["collision"].normals.push(vec2.create());
                newAsteroid.components["collision"].normals.push(vec2.create());
                newAsteroid.components["collision"].normals.push(vec2.create());
            }

            vec2.set(newAsteroid.components["collision"].points[0], -this.asteroidHalfSizes[newAsteroid.size], this.asteroidHalfSizes[newAsteroid.size]);       // bottom left
            vec2.set(newAsteroid.components["collision"].points[1], this.asteroidHalfSizes[newAsteroid.size], this.asteroidHalfSizes[newAsteroid.size]);        // bottom right
            vec2.set(newAsteroid.components["collision"].points[2], this.asteroidHalfSizes[newAsteroid.size], -this.asteroidHalfSizes[newAsteroid.size]);       // top right
            vec2.set(newAsteroid.components["collision"].points[3], -this.asteroidHalfSizes[newAsteroid.size], -this.asteroidHalfSizes[newAsteroid.size]);      // top left

            newAsteroid.components["collision"].update(0);     // Do a trivial update to make the collider compute its size and such
            this.collisionMgrRef.addCollider(newAsteroid.components["collision"]);
        }

    }
    else {
        console.log("Unable to spawn new asteroid. All asteroids in pool are active");
    }
};

// Return next available Asteroid in the pool
AsteroidManager.prototype.getAvailableAsteroidFromPool = function() {
    var i = (this.lastUsedIndex + 1) % this.asteroids.length;

    while (this.asteroids[i].alive) {
        i = (i + 1) % this.asteroids.length;
        if (i == this.lastUsedIndex) {
            // If we're here, then every asteroid in the pool is currently active
            return null;
        }
    }

    this.lastUsedIndex = i;
    return this.asteroids[i];

};

