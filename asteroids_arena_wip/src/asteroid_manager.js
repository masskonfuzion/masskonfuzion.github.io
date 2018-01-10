function AsteroidManager () {
    GameObject.call(this);
    // The Asteroid field is essentially a particle system
    this.addComponent("asteroidPS", new ParticleSystem(Asteroid));
    this.addComponent("asteroidPE", new ParticleEmitter());     // The Asteroid manager will control the particle emitter to put particles into the system

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
}


AsteroidManager.prototype = Object.create(GameObject.prototype);
AsteroidManager.prototype.constructor = AsteroidManager;

AsteroidManager.prototype.initialize = function(initAsteroids, maxAsteroids) {
    // maxAsteroids is the maximum number of Asteroids that could be in play
    this.maxAsteroids = maxAsteroids;   // NOTE: we could also just get the length of the particle system's array; consider removing this.maxAsteroids?
    var mySystem = this.components["asteroidPS"];
    mySystem.initialize(maxAsteroids);
    mySystem.collisionMgrRef = this.parentObj.collisionMgr;     // TODO maybe make a wrapper function, to make a cleaner assignment of collisionMgrRef

    var myEmitter = this.components["asteroidPE"];
    myEmitter.setVelocityRange(1.0, 5.0);
    myEmitter.setAngleRange(-180, 180);     // degrees
    myEmitter.setLaunchDir(1.0, 0.0);   // Direction doesn't matter.. the angle range will be a full 360 degrees
    myEmitter.setPosition(256, 256);
    myEmitter.registerParticleSystem(mySystem);

    // Notes on bannedLocations:
    //  - We're probably taking references to the ship's (or ships') position(s), which is what we want
    var bannedLocations = this.createBannedLocationsList(100);  // The parameter is the radius from each banned location, within which asteroids cannot be spawned
    for (var i = 0; i < initAsteroids; i++) {
        // Note the "funcCalls" property - "params" is a list that, when passed into a function.apply() call, is "splatted" into individual parameters, similar to Python *args
        var configObj = { "renderCompType": "image",
                          "imageRef": game.imgMgr.imageMap["astLarge"].imgObj,
                          "funcCalls": [ {"func": Asteroid.prototype.setSize, "params": [2]} ],
                          "bannedLocations": bannedLocations
                        };
        // Emit a particle with the given config. Note that the config tells the particle which image to use for its render component
        // Because the images are already loaded by the ImageManager (in the GameLogic object), all we have to do is reference it
        // Also note: this approach requires the ParticleSystem to be configured to create Particles with an image/sprite render component
        myEmitter.emitParticle(game.fixed_dt_s, configObj);
        this.activeAsteroids[2] += 1;  // Track # of active asteroids (when an asteroid is initialized, it is size 2 (large))
    }
};

AsteroidManager.prototype.update = function(dt_s, config = null) {
    // 4 is a magic number -- the # of asteroids that can possibly result from shooting 1 large asteroid
    var freeSpacesNeeded = this.activeAsteroids[2] * 4 + this.activeAsteroids[1] * 2;
    var totalAsteroids = this.activeAsteroids[2] + this.activeAsteroids[1] + this.activeAsteroids[0];
    if (this.maxAsteroids - totalAsteroids > freeSpacesNeeded) {
        var myEmitter = this.components["asteroidPE"];

        // TODO make a more robust random # generator for emitter position (e.g., use arena's dimensions, etc)
        var spawnPos = vec2.create();
        vec2.set(spawnPos, Math.floor(Math.random() * 600 + 100), Math.floor(Math.random() * 250 + 100));

        while(!this.parentObj.gameObjs["arena"].containsPt(spawnPos)) {
            vec2.set(spawnPos, Math.floor(Math.random() * 600 + 100), Math.floor(Math.random() * 250 + 100));
        }
        // NOTE: the asteroid spawning in this function will occur when asteroids are destroyed because they left the arena
        // TODO add some kind of level manager? (i.e. max # of asteroids that will be spawned in this level? Or, otherwise make this game a pure deathmatch, ending when ships are destroyed? Or, just play for time? I don't know what this game should be)
        myEmitter.setPosition(spawnPos[0], spawnPos[1]);
        myEmitter.setVelocityRange(1.0, 5.0);   // TODO Confirm.. do I really need this here? I thought I only needed to set the velocity range one time, in the initialize function

        var bannedLocations = this.createBannedLocationsList(50);
        var configObj = { "renderCompType": "image",
                          "imageRef": game.imgMgr.imageMap["astLarge"].imgObj,
                          "funcCalls": [ {"func": Asteroid.prototype.setSize, "params": [2]} ],
                          "bannedLocations": bannedLocations
                        };
        myEmitter.emitParticle(game.fixed_dt_s, configObj);
        this.activeAsteroids[2] += 1;  // Track # of active asteroids
    }

    for (var compName in this.components) {
        if (this.components.hasOwnProperty(compName)) {
            this.components[compName].update(dt_s);
        }
    }
};


AsteroidManager.prototype.resetAsteroidField = function() {
    // TODO revisit what to do when you reset
    // This fn is meant to be called after setting max/init (or maybe we should reset when we initialize? Not sure..

};

AsteroidManager.prototype.draw = function(canvasContext) {
    var myPS = this.components["asteroidPS"];
    myPS.draw(canvasContext);
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
        astToDisable.disable( {"collisionMgrRef": this.components["asteroidPS"].collisionMgrRef} ); 
        this.activeAsteroids[astToDisable.size] -= 1;
        // TODO trigger a particle explosion
    }
};

// Disable passed-in asteroid(s), and spawn new ones
// TODO consider splitting into separate disable() and spawn() functions? (requires enqueueing 2 messages, instead of 1, when an asteroid is destroyed and a new one needs to be spawned)
AsteroidManager.prototype.disableAndSpawnAsteroids = function(params) {
    // params is a dict object

    // TODO figure out why I designed this function to work on a list of asteroids (when I'm passing in only 1 asteroid to disable)
    for (var astToDisable of params.disableList) {
        var myEmitter = this.components["asteroidPE"];

        var spawnPoint = vec2.clone(astToDisable.components["physics"].currPos);

        // Get velocity from asteroid
        var astVel = vec2.create();
        var astVelDir = vec2.create();
        vec2.sub(astVel, astToDisable.components["physics"].currPos, astToDisable.components["physics"].prevPos);
        vec2.normalize(astVelDir, astVel);

        // Note: there should be as many launchData items as params.numToSpawn  // TODO maybe launchData should be passed in?
        // NOTE: we/re dividing the velocity multiplier by game.fixed_dt_s because in this computation, we're dealing with velocity over 1 frame; the physicsComponent's setPosAndVel function assumes we're working with velocity over a full second, so we're dividing by dt, to compensate
        var launchData = [ { "ang": glMatrix.toRadian(45), "dir": vec2.create(), "velMult": 2 / game.fixed_dt_s, "posMult": 40},
                           { "ang": glMatrix.toRadian(-45), "dir": vec2.create(), "velMult": 2 / game.fixed_dt_s, "posMult": 40} ];

        // Disable asteroid
        astToDisable.disable({"collisionMgrRef": this.components["asteroidPS"].collisionMgrRef});
        this.activeAsteroids[astToDisable.size] -= 1;

        //var bannedLocations = [ {"position": this.parentObj.gameObjs["ship0"].components["physics"].currPos, "radius": 50 } ];
        var bannedLocations = this.createBannedLocationsList(50);
        // TODO trigger a particle explosion
        if (astToDisable.size > 0) {
            var newSize = astToDisable.size - 1;
            var newSizeStr = this.asteroidSizeMap[astToDisable.size - 1];

            for (var i = 0; i < params.numToSpawn; i++) {
                var configObj = { "renderCompType": "image",
                                  "imageRef": game.imgMgr.imageMap[ newSizeStr ].imgObj,
                                  "funcCalls": [ { "func": Asteroid.prototype.setSize, "params": [newSize] } ],
                                  "bannedLocations": bannedLocations
                                };
                // Because the images are already loaded by the ImageManager (in the GameLogic object), all we have to do is reference it
                // Also note: this approach requires the ParticleSystem to be configured to create Particles with an image/sprite render component

                // Compute launch data based on asteroid velocity
                var rotMat = mat2.create();
                mat2.fromRotation(rotMat, launchData[i]["ang"]);
                vec2.transformMat2(launchData[i]["dir"], params.fragRefDir, rotMat);    // Rotate the asteroid/bullet fragment reference dir

                var offsetVec = vec2.create();
                vec2.scale(offsetVec, launchData[i]["dir"], launchData[i]["posMult"]);

                var fragmentPos = vec2.create();
                vec2.add(fragmentPos, spawnPoint, offsetVec);

                // If the fragment position is in the arena, then spawn it
                if (this.parentObj.gameObjs["arena"].containsPt(fragmentPos)) {
                    myEmitter.setPosition(fragmentPos[0], fragmentPos[1]);
                    myEmitter.setVelocityRange(vec2.length(astVel) * launchData[i]["velMult"], vec2.length(astVel) * launchData[i]["velMult"]);
                    myEmitter.setLaunchDir(launchData[i]["dir"][0], launchData[i]["dir"][1]);
                    myEmitter.setAngleRange(0, 0);  // i.e., launch in exactly the direction of launchDir

                    // Emit a particle with the given config. Note that the config tells the particle which image to use for its render component
                    myEmitter.emitParticle(game.fixed_dt_s, configObj);
                    this.activeAsteroids[newSize] += 1;
                } else {
                    // Not sure if anything actually needs to happen here. If the fragment spawn
                    // position is outside the arena, then do nothing.

                    // Possibly delete this empty else block, because jumping to it wastes
                    // processor time
                }
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

        var bannedLocItem = { "position": this.parentObj.gameObjs[shipID].components["physics"].currPos
                            , "radius": radius
                            };

        bannedLocations.push(bannedLocItem);
    };

    return bannedLocations;
};
