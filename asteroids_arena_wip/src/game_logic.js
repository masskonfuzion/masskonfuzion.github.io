function GameScoresAndStats() {
    this.score = 0;
    this.deaths = 0;
    this.kills = 0;
}

function GameLogic() {
    
    GameObject.call(this);

    this.collisionMgr = null;   // Placeholder for a collision manager (definition probably belongs in base/interface class)
    this.gameObjs = {};
    this.shipDict = {};     // A mapping of ship GameObject objectIDs (assigned by game engine) to the "nicknames" (assigned by the programmer)
    this.characters = {};   // A mapping of GameObject objectIDs to "character" objects
	this.keyCtrlMap = {};   // keyboard key state handling (keeping it simple)
    this.messageQueue = null;
    this.objectIDToAssign = -1;  // probably belongs in the base class.
    // NOTE: this.settings (i.e. gameLogic.settings) is DIFFERENT than the settings object stored in localStorage. localStorage has user-configurable settings. gameLogic has settings for the game itself (shouldn't be modified by the player/user
    this.settings = { "hidden": {}, "visible": {} };    // hidden settings are, e.g. point values for accomplishing certain goals; visible settings are, e.g. game config options
    this.gameStats = {};    // store things, e.g. player's score, in-game achievements, state variables, etc.

    this.addComponent("xplodPE", new ParticleEmitter());

    this.commandMap["createExplosion"] = this.createExplosion;
    this.bulletSoundPool = null;

    this.bgm_track_list = [];
    this.bgm = null;
}

GameLogic.prototype = Object.create(GameObject.prototype);
GameLogic.prototype.constructor = GameLogic;


GameLogic.prototype.initialize = function(configObj = null) {
    // Key control map is keyed on keypress event "code", e.g. "KeyW" (as opposed to "keyCode", which is a number, like 87)
    // Based on documentation on the Mozilla Developer Network (MDN), "code" is preferred, and "keyCode" is deprecated
    // TODO change from using "code" to using "key" (see Mozilla Developers' Network documentation on KeyboardEvents)
    this.keyCtrlMap["thrust"] = { "code": "KeyW", "state": false };
    this.keyCtrlMap["turnLeft"] = { "code": "KeyA", "state": false };
    this.keyCtrlMap["turnRight"] = { "code": "KeyD", "state": false };
    this.keyCtrlMap["fireA"] = { "code": "ShiftLeft", "state": false };

    this.messageQueue = new MessageQueue();
    this.messageQueue.initialize(64);
    this.messageQueue.registerListener('GameCommand', this, this.sendCmdToGameObj);
    this.messageQueue.registerListener('CollisionEvent', this, this.processCollisionEvent);
    this.messageQueue.registerListener('UICommand', this, this.doUICommand);

    this.settings["hidden"]["pointValues"] = { "destroyLargeAsteroid": 25,
                                               "destroyMediumAsteroid": 50,
                                               "destroySmallAsteroid": 75,
                                               "kill": 200,
                                               "death": -100
                                             };
    this.timeAttackSecondsLeft = 0;
    if (game.settings.visible.gameMode == "Time Attack") {
        var minsec = game.settings.visible.gameModeSettings.timeAttack.timeLimit.split(":");
        this.timeAttackSecondsLeft = parseInt(minsec[0]) * 60 + parseInt(minsec[1]);    // Use parseInt() to explicitly convert str to int. JS does this automatically/implicitly, but I prefer the explicit conversion
    }

    this.bulletSoundPool = new SoundPool("assets/sounds/laser01.mp3", null, 5);   // TODO make resource manager for sounds (and.. other assets, while we're at it?)
    this.shipExplosionSoundPool = new SoundPool("assets/sounds/grenade_explosion-soundbible.com.wav", null, 5);
    this.asteroidExplosionSoundPool = new SoundPool("assets/sounds/rock_debris_explosion-freesfx.co.uk.mp3", null, 5);

    this.bgm_track_list = ["assets/sounds/masskonfuzion-astro_ravenous.mp3", "assets/sounds/masskonfuzion-asterisk.mp3"];
    var track_to_play = Math.floor( Math.random() * this.bgm_track_list.length );
    this.bgm = new Sound(this.bgm_track_list[track_to_play]);
    this.bgm.play({"volume": 0.5});    // TODO move bgm out to a sound/resource manager - make it possible to play a new song when the current song finishes. Also note: this bgm object gets passed through a state transition

    // Begin initializing game subsystems. Note that the order of operations is important

    // ----- Initialize collision manager
    // NOTE: Collision Manager is initialized first, so that other items can access it and register their collision objects with it
    this.addCollisionManager();
    this.collisionMgr.initialize( {"x":0, "y":0, "width": game.canvas.width, "height": game.canvas.height} );     // width/height should match canvas width/height (maybe just use the canvas object?) .. Or.... should the quadtree size match the arena size (which is larger than the canvas)?

    // ----- Initialize thrust/rocket particle system
    this.addGameObject("thrustPS", new ParticleSystem());
    var thrustPSRef = this.gameObjs["thrustPS"];
    thrustPSRef.initialize(1024);

    // ----- Initialize explosion particle system
    this.addGameObject("xplodPS", new ParticleSystem());
    var xplodPSRef = this.gameObjs["xplodPS"];
    xplodPSRef.initialize(512);


    var xplodPERef = this.components["xplodPE"];
    xplodPERef.registerParticleSystem(this.gameObjs["xplodPS"]);
    xplodPERef.setVelocityRange(10.0, 80.0);
    xplodPERef.setTTLRange(0.5, 1.0);         // seconds
    xplodPERef.setLaunchDir(1.0, 0.0);        // launch base dir is the vector [1,0]
    xplodPERef.setAngleRange(0.0, 359.0);     // rotate the base launch dir by some amount
    xplodPERef.setMinColor(128, 128, 128);    // rgb values (note: placeholder; will be overwritten during gameplay)
    xplodPERef.setMaxColor(255, 255, 255);    // rgb values (note: placeholder; will be overwritten during gameplay)


    // ----- Initialize Bullet Manager system
    // Note: bullet mgr has to come before spaceship so that spaceship can register as a bullet emitter
    this.addGameObject("bulletMgr", new BulletManager());
    var bulletMgrRef = this.gameObjs["bulletMgr"];
    bulletMgrRef.initialize(256);

    // ----- Initialize Arena
    this.addGameObject("arena", new Arena());
    var arenaRef = this.gameObjs["arena"];
    arenaRef.initialize();

    // ----- Initialize Asteroid Manager
    this.addGameObject("astMgr", new AsteroidManager());
    var astMgrRef = this.gameObjs["astMgr"];
    astMgrRef.initialize(1, 32);

    // ----- Initialize spaceships
    // TODO don't hardcode the initial position -- use arena test for containment
    // Note: ship0 is the player's ship
    this.addGameObject("ship0", new Spaceship());
    var shipRef = this.gameObjs["ship0"];
    var shipConfigObj = { "imgObj": configObj.imgObj,
                          "initialPos": [400, 225],
                        };
    shipRef.initialize(shipConfigObj);

    this.collisionMgr.addCollider(shipRef.components["collision"]);   // Have to do the collision manager registration out here, because the spaceship is fully formed at this point (we can't do it in the spaceship constructor (in its current form) -- the parent obj is not passed in)

    var spaceshipThrustPE = shipRef.components["thrustPE"];       // Get the spaceship's thrust particle emitter
    spaceshipThrustPE.registerParticleSystem(this.gameObjs["thrustPS"]);

    var spaceshipGunPE = shipRef.components["gunPE"];             // Get the spaceship's gun particle emitter
    spaceshipGunPE.registerParticleSystem(this.gameObjs["bulletMgr"].components["gunPS"]);

    // NOTE: because of the way the game engine/framework is designed, we have to add individual spaceships as GameObjects (e.g., so they can get assigned an ObjectID), and then if we want to have a "shipDict", we have to have a list of references to the ship GameObjects
    this.shipDict[shipRef.objectID] = "ship0";
    this.characters[shipRef.objectID] = new Character();    // Note that this assignment happens AFTER we know the spaceship's objectID
    this.characters[shipRef.objectID].callSign = game.settings.visible.callSign;
    this.characters[shipRef.objectID].colorScheme.light = configObj.colorScheme.light;
    this.characters[shipRef.objectID].colorScheme.medium = configObj.colorScheme.medium;
    this.characters[shipRef.objectID].colorScheme.dark = configObj.colorScheme.dark;


    this.addGameObject("ship1", new Spaceship());
    shipRef = this.gameObjs["ship1"];
    shipConfigObj = { "imgObj": game.imgMgr.imageMap["ship1"].imgObj,
                      "initialPos": [50, 225],
                      "isAI": true,
                      "knowledge": this,
                      "aiProfile": "miner"
                    };
    shipRef.initialize(shipConfigObj);

    this.collisionMgr.addCollider(shipRef.components["collision"]);   // Have to do the collision manager registration out here, because the spaceship is fully formed at this point (we can't do it in the spaceship constructor (in its current form) -- the parent obj is not passed in)

    var spaceshipThrustPE = shipRef.components["thrustPE"];       // Get the spaceship's thrust particle emitter
    spaceshipThrustPE.registerParticleSystem(this.gameObjs["thrustPS"]);

    var spaceshipGunPE = shipRef.components["gunPE"];             // Get the spaceship's gun particle emitter
    spaceshipGunPE.registerParticleSystem(this.gameObjs["bulletMgr"].components["gunPS"]);

    // NOTE: because of the way the game engine/framework is designed, we have to add individual spaceships as GameObjects (e.g., so they can get assigned an ObjectID), and then if we want to have a "shipDict", we have to have a list of references to the ship GameObjects
    this.shipDict[shipRef.objectID] = "ship1";
    this.characters[shipRef.objectID] = new Character();
    this.characters[shipRef.objectID].callSign = "Olympos";
    this.characters[shipRef.objectID].colorScheme.light = [64, 16, 234];    // admittedly, this "light" color is still a pretty dark blue -- it matches the ship, though - colors taken using the GIMP color picker tool to the ship's png image file
    this.characters[shipRef.objectID].colorScheme.medium = [48, 12, 158];   // roughly 2/3 of light
    this.characters[shipRef.objectID].colorScheme.dark = [24, 6, 80];       // roughly 1/2 of medium


    this.addGameObject("ship2", new Spaceship());
    shipRef = this.gameObjs["ship2"];

    shipConfigObj = { "imgObj": game.imgMgr.imageMap["ship2"].imgObj,
                      "initialPos": [750, 225],
                      "isAI": true,
                      "knowledge": this,
                      "aiProfile": "hunter",
                      "aiHuntRadius": 800
                    };
    shipRef.initialize(shipConfigObj);

    this.collisionMgr.addCollider(shipRef.components["collision"]);   // Have to do the collision manager registration out here, because the spaceship is fully formed at this point (we can't do it in the spaceship constructor (in its current form) -- the parent obj is not passed in)

    var spaceshipThrustPE = shipRef.components["thrustPE"];       // Get the spaceship's thrust particle emitter
    spaceshipThrustPE.registerParticleSystem(this.gameObjs["thrustPS"]);

    var spaceshipGunPE = shipRef.components["gunPE"];             // Get the spaceship's gun particle emitter
    spaceshipGunPE.registerParticleSystem(this.gameObjs["bulletMgr"].components["gunPS"]);

    // NOTE: because of the way the game engine/framework is designed, we have to add individual spaceships as GameObjects (e.g., so they can get assigned an ObjectID), and then if we want to have a "shipDict", we have to have a list of references to the ship GameObjects
    this.shipDict[shipRef.objectID] = "ship2";
    this.characters[shipRef.objectID] = new Character();
    this.characters[shipRef.objectID].callSign = "Artemis";
    this.characters[shipRef.objectID].colorScheme.light = [87, 82, 82]; // "light" it matches the ship - collors taken using the GIMP color picker tool to the ship's png image file
    this.characters[shipRef.objectID].colorScheme.medium = [29, 26, 26]; // roughly 2/3 of light
    this.characters[shipRef.objectID].colorScheme.dark = [15, 13, 13];   // roughly 1/2 of medium

    // Create score keeping object
    for (var shipIDKey in this.shipDict) {
        var shipName = this.shipDict[shipIDKey];
        this.gameStats[shipName] = new GameScoresAndStats();
    }

};

GameLogic.prototype.addGameObject = function(objName, obj) {
    this.objectIDToAssign += 1;

    this.gameObjs[objName] = obj;
    this.gameObjs[objName].objectID = this.objectIDToAssign;
    this.gameObjs[objName].parentObj = this;
};

GameLogic.prototype.addCollisionManager = function() {
    // create a collision manager and assign it to this.collisionMgr (which is initialized as null when the gameLogic is constructed)
    this.collisionMgr = new CollisionManager();
    this.collisionMgr.parentObj = this;
};

GameLogic.prototype.draw = function(canvasContext) {
    canvasContext.save();
    canvasContext.setTransform(1,0,0,1,0,0);    // Reset transformation (similar to OpenGL loadIdentity() for matrices)

    // Clear the canvas (note that the game application object is global)
    canvasContext.fillStyle = 'black';
    canvasContext.fillRect(0,0, game.canvas.width, game.canvas.height);

    // TODO replace with a proper "camera" class. Update the camera during the update cycle (allow camera to track any given object), then simply apply camera transform here. This should also allow for easier effects, e.g. screen shake
    var camPos = vec2.create();
    var viewportCenter = vec2.create();
    vec2.set(viewportCenter, game.canvas.width / 2, game.canvas.height / 2);
    vec2.sub(camPos, viewportCenter, this.gameObjs["ship0"].components["physics"].currPos);

    canvasContext.translate(camPos[0], camPos[1]);

    // the game application obj is global
    for (var goKey in this.gameObjs) {
        if (this.gameObjs.hasOwnProperty(goKey)) {
            if ("render" in this.gameObjs[goKey].components || this.gameObjs[goKey].draw) {  // Make sure the component has a render component, or otherwise has a draw method
                this.gameObjs[goKey].draw(canvasContext);        // Assume that the draw() function for a GameObject calls into the draw() function for its render component
            }
        }
    }
    canvasContext.restore();
};


GameLogic.prototype.processMessages = function(dt_s) {
    // dt_s is not used specifically by processMessages, but is passed in in case functions called by processMessages need it
    //console.log('MessageQueue has ' + this.messageQueue.numItems() + ' items in it');

    while (!this.messageQueue._empty) {
        //console.log('Processing message');
        // NOTE: If the queue is initialized with dummy values, then this loop will iterate over dummy values
        // It may be better to use a queue that is has an actual empty array when the queue is empty
        // That way, this loop will not run unless items actually exist in the queue
        var msg = this.messageQueue.dequeue();

        //console.log('Iterating over topic: ' + msg.topic);

        for (var handler of this.messageQueue._registeredListeners[msg.topic]) {
            handler["func"].call(handler["obj"], msg);
        }
    }
};


GameLogic.prototype.handleKeyboardInput = function(evt) {
    // This function is the "quarterback" for handling user keyboard input
    //console.log(evt);

    if (evt.type == "keydown") {
        this.handleKeyDownEvent(evt);
    }
    else if (evt.type == "keyup") {
        this.handleKeyUpEvent(evt);
    }
};

GameLogic.prototype.handleKeyDownEvent = function(evt) {
    //console.log(this);
    // NOTE: We don't define these function on the prototype it inherited from; we define the function at the object level
    // Also note: Not relevant for this game, but this event-based approach can be used for many input schemes. e.g., for a fighting game, instead of directly enqueuing game commands, we could enqueue key presses with time stamps, to determine if a "special move combo" was entered
    //console.log('Key code ' + evt.keyCode + ' down');

    // NOTE: apparently, it is not possible to disable key repeat in HTML5/Canvas/JS..
    var cmdMsg = {};
    if (evt.code == this.keyCtrlMap["thrust"]["code"]) {
        // User pressed thrust key
        this.keyCtrlMap["thrust"]["state"] = true;

        // Note that the payload of messages in the queue can vary depending on context. At a minimum, the message MUST have a topic
        cmdMsg = { "topic": "GameCommand",
                   "command": "setThrustOn",
                   "targetObj": this.gameObjs["ship0"],
                   "params": null
                 };
        this.messageQueue.enqueue(cmdMsg);
    }

    if (evt.code == this.keyCtrlMap["fireA"]["code"]) {
        // User pressed the fire A key (e.g. primary weapon)
        cmdMsg = { "topic": "GameCommand",
                   "command": "setFireAOn",
                   "targetObj": this.gameObjs["ship0"],
                   "params": null
                 };
        this.messageQueue.enqueue(cmdMsg);
    }

    if (evt.code == this.keyCtrlMap["turnLeft"]["code"]) {
        // User pressed turnLeft key
        this.keyCtrlMap["turnLeft"]["state"] = true;
        cmdMsg = { "topic": "GameCommand",
                   "command": "setTurnLeftOn",
                   "targetObj": this.gameObjs["ship0"],
                   "params": null
                 };
        this.messageQueue.enqueue(cmdMsg);
    }
    else if (evt.code == this.keyCtrlMap["turnRight"]["code"]) {
        // User pressed turnRight key
        this.keyCtrlMap["turnRight"]["state"] = true;
        cmdMsg = { "topic": "GameCommand",
                   "command": "setTurnRightOn",
                   "targetObj": this.gameObjs["ship0"],
                   "params": null
                 };
        this.messageQueue.enqueue(cmdMsg);
    }
};


GameLogic.prototype.handleKeyUpEvent = function(evt) {
    //console.log('Key code ' + evt.keyCode + ' up');

    var cmdMsg = {};
    if (evt.code == this.keyCtrlMap["thrust"]["code"]) {
        // User released thrust key
        this.keyCtrlMap["thrust"]["state"] = false;

        cmdMsg = { "topic": "GameCommand",
                   "command": "setThrustOff",
                   "targetObj": this.gameObjs["ship0"],
                   "params": null
                 };
        this.messageQueue.enqueue(cmdMsg);
    }

    if (evt.code == this.keyCtrlMap["fireA"]["code"]) {
        // User pressed the fire A key (e.g. primary weapon)
        cmdMsg = { "topic": "GameCommand",
                   "command": "setFireAOff",
                   "targetObj": this.gameObjs["ship0"],
                   "params": null
                 };
        this.messageQueue.enqueue(cmdMsg);
    }

    if (evt.code == this.keyCtrlMap["turnLeft"]["code"]) {
        // User pressed turnLeft key
        this.keyCtrlMap["turnLeft"]["state"] = false;
        cmdMsg = { "topic": "GameCommand",
                   "command": "setTurnOff",
                   "targetObj": this.gameObjs["ship0"],
                   "params": null
                 };
        this.messageQueue.enqueue(cmdMsg);
    }

    else if (evt.code == this.keyCtrlMap["turnRight"]["code"]) {
        // User pressed turnRight key
        this.keyCtrlMap["turnRight"]["state"] = false;
        cmdMsg = { "topic": "GameCommand",
                   "command": "setTurnOff",
                   "targetObj": this.gameObjs["ship0"],
                   "params": null
                 };
        this.messageQueue.enqueue(cmdMsg);
    }

    // NOTE: UI controls are hard-coded currently; but they could also be stored in a key mapping,
    // like this.keyCtrlMap, for easy customization
    else if (evt.code == "Escape") {
        if (this.bgm) {
            this.bgm.stop();
        }

        // TODO Pop up confirmation before exiting. Probably easiest to make a separate game state (i.e., stack it on top of the playing state)
        cmdMsg = { "topic": "UICommand",
                   "targetObj": this,
                   "command": "changeState",
                   "params": {"stateName": "MainMenu"}
                 };
        this.messageQueue.enqueue(cmdMsg);
    }
};

GameLogic.prototype.update = function(dt_s, config = null) {

    // Do physics/integration
    for (var gameObjName of Object.getOwnPropertyNames(this.gameObjs)) {
        this.gameObjs[gameObjName].update(dt_s);
    }

    // Process collisions
    if (this.collisionMgr) {
        this.collisionMgr.update(dt_s);
    }

    // Do game-over check
    this.checkForGameOver(dt_s);

};

GameLogic.prototype.sendCmdToGameObj = function(msg) {
    // NOTE: because we have only 1 parameter to this function (really, to all registered listeners of a message queue), a ref to the object to which to send the cmd is included as part of the msg
    //console.log("sendCmdToGameObj: ");
    //console.log(msg);

    // Call the executeCommand() function with the given command (all GameObjs will have an executeCommand() function)
    msg["targetObj"].executeCommand(msg["command"], msg["params"]);
};


GameLogic.prototype.lookupObjectID = function(objName, prefix) {
    // ASSUMPTION! the objName will be something like Name#.Component, where Name is the object name (like "Spaceship2"), and the component name is anything, e.g. "GunPE" (gun particle emitter)
    var substrStartAt = prefix.length;
    var substrDotPos = objName.indexOf(".");
    return objName.substr(substrStartAt, substrDotPos - substrStartAt);
};

GameLogic.prototype.processCollisionEvent = function(msg) {
    //console.log("Processing collision event message ");
    //console.log(msg);
    //console.log("Probably also enqueue a message to an explosion manager to trigger an explosion. Also, play a sound");

    var gameObjAType = msg.colliderA.parentObj.constructor.name;
    var gameObjBType = msg.colliderB.parentObj.constructor.name;

    // TODO Possibly restructure collision event if/then cases into their own individual function calls; maybe use function callbacks
    // TODO put some data into collision objects to determine which objects should collide with which others. Objects certain types might not need to collide with each other (e.g. arena walls with other arena walls; bullets fired by a ship with the ship itself)

    var cmdMsg = {}
    var numParticles = 0;   // placeholder; will be initialized wherever necessary

    if (gameObjAType == "Spaceship" && gameObjBType == "Asteroid" || gameObjBType == "Spaceship" && gameObjAType == "Asteroid") {
        //console.log("We have a collision between a spaceship and an asteroid")

        // Get a reference to the asteroid obj that is part of the collision, to include it as a param to the AsteroidManager, to disable the Asteroid and spawn new ones
        var asteroidRef = null;
        var spaceshipRef = null;
        if (gameObjAType == "Asteroid") {
            asteroidRef = msg.colliderA.parentObj;
            spaceshipRef = msg.colliderB.parentObj;
        } else {
            spaceshipRef = msg.colliderA.parentObj;
            asteroidRef = msg.colliderB.parentObj;
        }

        var playerShipRef = this.gameObjs["ship0"];     // NOTE: hard-coded reference to the player ship. I'm doing this because I want to finish this game... taking shortcuts now......
        var sndVol = Math.max(0.1, 1.0 - (vec2.sqrDist(playerShipRef.components["physics"].currPos, spaceshipRef.components["physics"].currPos) / 2250000.0));      // 2250000 = 1500**2 is a magic number -- it's meant to be greater than the hypotenuse of the arena (the largest possible distance that could separate 2 objects) (but it's hardcoded (A) because I'm taking shortcuts, and (B) because I haven't made any additional levels/arenas.. partly because of the shortcuts

        // The collision can only count if the spaceship is both alived and "enabled" (i.e., not in the middle of a respawn)
        if (spaceshipRef.ableState == SpaceshipAbleStateEnum.enabled) {
            numParticles = (asteroidRef.size + 1) * 8;  // The multiplier is a magic number; chosen because it created visually pleasing explosions, without too much performance hit

            cmdMsg = { "topic": "GameCommand",
                       "command": "createExplosion",
                       "targetObj": this,
                       "params": { "numParticles": numParticles,
                                   "center": [ asteroidRef.components["physics"].currPos[0], asteroidRef.components["physics"].currPos[1] ],
                                   "minColor": [64,64,64],
                                   "maxColor": [255,255,255]
                                 }
                     };
            this.messageQueue.enqueue(cmdMsg);
            this.asteroidExplosionSoundPool.play( {"volume": sndVol, "loop": false} ); // NOTE: technically, I should enqueue this, for a sound/resource handler to handle.. But I'm trying to finish this game, and I'm taking shortcuts now...

            numParticles = 24;  // 24 particles for a ship explosion. Maybe we shouldn't hardcode this; instead have a setting/config option

            var saveShipPos = vec2.clone(spaceshipRef.components["physics"].currPos);
            var characterObj = this.characters[spaceshipRef.objectID];

            cmdMsg = { "topic": "GameCommand",
                       "command": "createExplosion",
                       "targetObj": this,
                       "params": { "numParticles": numParticles,
                                   "center": [ saveShipPos[0], saveShipPos[1] ],
                                   "minColor": characterObj.colorScheme.dark,
                                   "maxColor": characterObj.colorScheme.light
                                 }
                     };
            this.messageQueue.enqueue(cmdMsg);
            this.shipExplosionSoundPool.play( {"volume": sndVol, "loop": false} ); // NOTE: technically, I should enqueue this, for a sound/resource handler to handle.. But I'm trying to finish this game, and I'm taking shortcuts now...

            var fragRefDir = vec2.create();   // Create collision normal out here, and pass into the disableAndSpwan call (so we can get fancy with collision normals, e.g., with spaceship surfaces
            vec2.sub(fragRefDir, spaceshipRef.components["physics"].currPos, spaceshipRef.components["physics"].prevPos);
            vec2.normalize(fragRefDir, fragRefDir);
            // Note: in params, disableList is a list so we can possibly disable multiple asteroids at once; numToSpawn is the # of asteroids to spawn for each disabled asteroid. Can maybe be controlled by game difficulty level.
            cmdMsg = { "topic": "GameCommand",
                       "command": "disableAndSpawnAsteroids",
                       "targetObj": this.gameObjs["astMgr"],
                       "params": { "disableList": [ asteroidRef ],
                                   "numToSpawn": 2,
                                   "fragRefDir": fragRefDir }
                     };
            this.messageQueue.enqueue(cmdMsg);  // NOTE: we do this here, and not in the next outer scope because we only want to enqueue a message onto the message queue if an actionable collision occurred

            // Note: 75 is a magic number; gives probably enough a cushion around the spaceship when it spawns at some random location
            // TODO make spawnAtNewLocation an enqueueable object.. that way, we can pass the ship's pos into the createExplosion call above. What's happening now is: We enqueue the explosion for later, but respawn now. So by the time we trigger the explosion, the ship's position is the respawn position
            this.spawnAtNewLocation(spaceshipRef, 75);

            var shipName = this.shipDict[spaceshipRef.objectID];    // NOTE: I hate that JS doesn't care that spaceshipObjectID is a string, but the keys in the dict/obj are int/float
            this.gameStats[shipName].deaths += 1;
        }

    } else if (gameObjAType == "Bullet" && gameObjBType == "Asteroid" || gameObjBType == "Bullet" && gameObjAType == "Asteroid") {
        // Get a reference to the asteroid obj that is part of the collision, to include it as a param to the AsteroidManager, to disable the Asteroid and spawn new ones
        var asteroidRef = null;
        var bulletRef = null;
        if (gameObjAType == "Asteroid") {
            asteroidRef = msg.colliderA.parentObj;
            bulletRef = msg.colliderB.parentObj;
        } else {
            asteroidRef = msg.colliderB.parentObj;
            bulletRef = msg.colliderA.parentObj;
        }

        // NOTE: We have to increment players' scores before destroying the bullets
        var shooterObjectID = this.lookupObjectID(bulletRef.emitterID, "Spaceship");
        var shipName = this.shipDict[shooterObjectID];  // NOTE: I hate that JS doesn't care that shooterObjectID is a string, but the keys in the dict/obj are int/float
        switch (asteroidRef.size) {
            case 0:
                this.gameStats[shipName].score += this.settings["hidden"]["pointValues"]["destroySmallAsteroid"];
                break;
            case 1:
                this.gameStats[shipName].score += this.settings["hidden"]["pointValues"]["destroyMediumAsteroid"];
                break;
            case 2:
                this.gameStats[shipName].score += this.settings["hidden"]["pointValues"]["destroyLargeAsteroid"];
                break;
        }

        var fragRefDir = vec2.create();   // Create collision normal out here, and pass into the disableAndSpwan call (so we can get fancy with collision normals, e.g., with spaceship surfaces
        vec2.sub(fragRefDir, bulletRef.components["physics"].currPos, bulletRef.components["physics"].prevPos);         // make the fragment ref dir the bullet's velocity dir
        vec2.normalize(fragRefDir, fragRefDir);

        // Disable bullet first (before doing any asteroid disabling stuff. This is to get the bullet "off the books" so it doesn't factor into the any asteroid interactions
        cmdMsg = { "topic": "GameCommand",
                   "command": "disableBullet",
                   "targetObj": this.gameObjs["bulletMgr"],
                   "params": { "bulletToDisable": bulletRef }
                 };
        this.messageQueue.enqueue(cmdMsg);

        // TODO for the particle explosion, add parameters to set number of particles, color, and maybe velocity, etc.

        numParticles = (asteroidRef.size + 1) * 8;  // The multiplier is a magic number; chosen because it created visually pleasing explosions, without too much performance hit
        cmdMsg = { "topic": "GameCommand",
                   "command": "createExplosion",
                   "targetObj": this,
                   "params": { "numParticles": numParticles,
                               "center": [ asteroidRef.components["physics"].currPos[0], asteroidRef.components["physics"].currPos[1] ],
                               "minColor": [64,64,64],
                               "maxColor": [255,255,255]
                             }
                 };
        this.messageQueue.enqueue(cmdMsg);

        var playerShipRef = this.gameObjs["ship0"];     // NOTE: hard-coded reference to the player ship. I'm doing this because I want to finish this game... taking shortcuts now......
        var sndVol = Math.max(0.1, 1.0 - (vec2.sqrDist(playerShipRef.components["physics"].currPos, asteroidRef.components["physics"].currPos) / 2250000.0));   // 2250000 = 1500**2 is a magic number -- it's meant to be greater than the hypotenuse of the arena (the largest possible distance that could separate 2 objects) (but it's hardcoded (A) because I'm taking shortcuts, and (B) because I haven't made any additional levels/arenas.. partly because of the shortcuts
        this.asteroidExplosionSoundPool.play( {"volume": sndVol, "loop": false} ); // NOTE: technically, I should enqueue this, for a sound/resource handler to handle.. But I'm trying to finish this game, and I'm taking shortcuts now...

        // Note: in params, disableList is a list so we can possibly disable multiple asteroids at once; numToSpawn is the # of asteroids to spawn for each disabled asteroid. Can maybe be controlled by game difficulty level.
        cmdMsg = { "topic": "GameCommand",
                   "command": "disableAndSpawnAsteroids",
                   "targetObj": this.gameObjs["astMgr"],
                   "params": { "disableList": [ asteroidRef ],
                               "numToSpawn": 2,
                               "fragRefDir": fragRefDir }
                 };
        this.messageQueue.enqueue(cmdMsg);  // NOTE: we enqueue here, and not in the next outer scope because we only want to enqueue a message onto the message queue if an actionable collision occurred

    } else if (gameObjAType == "Bullet" && gameObjBType == "Spaceship" || gameObjBType == "Bullet" && gameObjAType == "Spaceship") {
        var bulletRef = null;
        var spaceshipRef = null;

        if (gameObjAType == "Bullet") {
            bulletRef = msg.colliderA.parentObj;
            spaceshipRef = msg.colliderB.parentObj;
        } else {
            bulletRef = msg.colliderB.parentObj;
            spaceshipRef = msg.colliderA.parentObj;
        }

        if (spaceshipRef.ableState == SpaceshipAbleStateEnum.enabled) {
            // Make sure we're not processing the moment when a bullet fired by a spaceship is intersecting with the hitbox for the ship

            // Compute the spaceship's gun/emitter ID
            if (bulletRef.emitterID == spaceshipRef.components["gunPE"].emitterID) {
                //console.log("Skipping " + gameObjAType + "/" + gameObjBType + " collision because of self-shot prevention");
            } else {
                var shooterObjectID = this.lookupObjectID(bulletRef.emitterID, "Spaceship");
                var shooterName = this.shipDict[shooterObjectID];  // NOTE: I hate that JS doesn't care that shooterObjectID is a string, but the keys in the dict/obj are int/float
                    // If ship0 is the shooter, then increment human player's kills
                this.gameStats[shooterName].kills += 1;
                this.gameStats[shooterName].score += this.settings["hidden"]["pointValues"]["kill"];

                var victimName = this.shipDict[spaceshipRef.objectID];
                    // If spaceshipRef's objectID is the key of ship0 in this.shipDict, then the human player got hit. Increment deaths
                this.gameStats[victimName].deaths += 1;
                this.gameStats[victimName].score = Math.max(0, this.gameStats[victimName].score + this.settings["hidden"]["pointValues"]["death"]);

                numParticles = 24;  // 24 particles for a ship explosion. Maybe we shouldn't hardcode this; instead have a setting/config option
                var saveShipPos = vec2.clone(spaceshipRef.components["physics"].currPos);
                var characterObj = this.characters[spaceshipRef.objectID];
                cmdMsg = { "topic": "GameCommand",
                           "command": "createExplosion",
                           "targetObj": this,
                           "params": { "numParticles": numParticles,
                                       "center": [ saveShipPos[0], saveShipPos[1] ],
                                       "minColor": characterObj.colorScheme.dark,
                                       "maxColor": characterObj.colorScheme.light
                                     }
                         };
                this.messageQueue.enqueue(cmdMsg);

                var playerShipRef = this.gameObjs["ship0"];     // NOTE: hard-coded reference to the player ship. I'm doing this because I want to finish this game... taking shortcuts now......
                var sndVol = Math.max(0.1, 1.0 - (vec2.sqrDist(playerShipRef.components["physics"].currPos, spaceshipRef.components["physics"].currPos) / 2250000.0));  // 2250000 = 1500**2 is a magic number -- it's meant to be greater than the hypotenuse of the arena (the largest possible distance that could separate 2 objects) (but it's hardcoded (A) because I'm taking shortcuts, and (B) because I haven't made any additional levels/arenas.. partly because of the shortcuts
                this.shipExplosionSoundPool.play( {"volume": sndVol, "loop": false} );

                cmdMsg = { "topic": "GameCommand",
                           "command": "disableBullet",
                           "targetObj": this.gameObjs["bulletMgr"],
                           "params": { "bulletToDisable": bulletRef }
                         };
                this.messageQueue.enqueue(cmdMsg);

                // Note: 75 is a magic number; gives probably enough a cushion around the spaceship when it spawns at some random location
                this.spawnAtNewLocation(spaceshipRef, 75);

            }
        }
    } else if (gameObjAType == "Arena" && gameObjBType == "Bullet" || gameObjBType == "Arena" && gameObjAType == "Bullet") {
        // PSYCH!!! We don't test for bullet/arena collision.
        // See BulletManager; we test for containment of the bullet within the arena. If it leaves, then we destroy it
    } else if (gameObjAType == "Arena" && gameObjBType == "Asteroid" || gameObjBType == "Arena" && gameObjAType == "Asteroid") {
        var arenaRef = null;
        var asteroidRef = null;

        if (gameObjAType == "Arena") {
            arenaRef = msg.colliderA.parentObj;
            asteroidRef = msg.colliderB.parentObj;
        } else {
            arenaRef = msg.colliderB.parentObj;
            asteroidRef = msg.colliderA.parentObj;
        }

        numParticles = (asteroidRef.size + 1) * 8;  // The multiplier is a magic number; chosen because it created visually pleasing explosions, without too much performance hit
        cmdMsg = { "topic": "GameCommand",
                   "command": "createExplosion",
                   "targetObj": this,
                   "params": { "numParticles": numParticles,
                               "center": [ asteroidRef.components["physics"].currPos[0], asteroidRef.components["physics"].currPos[1] ],
                               "minColor": [64,64,64],
                               "maxColor": [255,255,255]
                             }
                 };
        this.messageQueue.enqueue(cmdMsg);

        var playerShipRef = this.gameObjs["ship0"];     // NOTE: hard-coded reference to the player ship. I'm doing this because I want to finish this game... taking shortcuts now......
        var sndVol = Math.max(0.1, 1.0 - (vec2.sqrDist(playerShipRef.components["physics"].currPos, asteroidRef.components["physics"].currPos) / 2250000.0));    // 2250000 = 1500**2 is a magic number -- it's meant to be greater than the hypotenuse of the arena (the largest possible distance that could separate 2 objects) (but it's hardcoded (A) because I'm taking shortcuts, and (B) because I haven't made any additional levels/arenas.. partly because of the shortcuts
        this.asteroidExplosionSoundPool.play( {"volume": sndVol, "loop": false} );

        var cmdMsg = { "topic": "GameCommand",
                       "command": "disableAsteroids",
                       "targetObj": this.gameObjs["astMgr"],
                       "params": { "disableList": [ asteroidRef ] }
                     };
        this.messageQueue.enqueue(cmdMsg);  // NOTE: we do this here, and not in the next outer scope because we only want to enqueue a message onto the message queue if an actionable collision occurred
    } else if (gameObjAType == "Arena" && gameObjBType == "Spaceship" || gameObjBType == "Arena" && gameObjAType == "Spaceship") {
        var arenaRef = null;
        var spaceshipRef = null;

        if (gameObjAType == "Arena") {
            arenaRef = msg.colliderA.parentObj;
            spaceshipRef = msg.colliderB.parentObj;
        } else {
            arenaRef = msg.colliderB.parentObj;
            spaceshipRef = msg.colliderA.parentObj;
        }

        numParticles = 24;  // 24 particles for a ship explosion. Maybe we shouldn't hardcode this; instead have a setting/config option
        var saveShipPos = vec2.clone(spaceshipRef.components["physics"]);
        var characterObj = this.characters[spaceshipRef.objectID];
        cmdMsg = { "topic": "GameCommand",
                   "command": "createExplosion",
                   "targetObj": this,
                   "params": { "numParticles": numParticles,
                               "center": [ saveShipPos[0], saveShipPos[1] ],
                               "minColor": characterObj.colorScheme.dark,
                               "maxColor": characterObj.colorScheme.light
                             }
                 };
        this.messageQueue.enqueue(cmdMsg);

        var playerShipRef = this.gameObjs["ship0"];     // NOTE: hard-coded reference to the player ship. I'm doing this because I want to finish this game... taking shortcuts now......
        var sndVol = Math.max(0.1, 1.0 - (vec2.sqrDist(playerShipRef.components["physics"].currPos, spaceshipRef.components["physics"].currPos) / 2250000.0));  // 2250000 = 1500**2 is a magic number -- it's meant to be greater than the hypotenuse of the arena (the largest possible distance that could separate 2 objects) (but it's hardcoded (A) because I'm taking shortcuts, and (B) because I haven't made any additional levels/arenas.. partly because of the shortcuts
        this.shipExplosionSoundPool.play( {"volume": sndVol, "loop": false} );

        // Note: 75 is a magic number; gives probably enough a cushion around the spaceship when it spawns at some random location
        this.spawnAtNewLocation(spaceshipRef, 75);
        var shipName = this.shipDict[spaceshipRef.objectID];    // NOTE: I hate that JS doesn't care that shooterObjectID is a string, but the keys in the dict/obj are int/float
        this.gameStats[shipName].deaths += 1;
        this.gameStats[shipName].score = Math.max(0, this.gameStats[shipName].score + this.settings["hidden"]["pointValues"]["death"]);

    } else if (gameObjAType == "Spaceship" && gameObjBType == "Spaceship") {
        // 2 spaceships crash into each other

        var spaceshipARef = msg.colliderA.parentObj;
        var spaceshipBRef = msg.colliderB.parentObj;

        if (spaceshipARef.ableState == SpaceshipAbleStateEnum.enabled && spaceshipBRef.ableState == SpaceshipAbleStateEnum.enabled) {
            // Ship-on-ship collisions are processed only if both ships are enabled

            numParticles = 24;  // 24 particles for a ship explosion. Maybe we shouldn't hardcode this; instead have a setting/config option

            var saveShipPos = vec2.clone(spaceshipARef.components["physics"].currPos);
            var characterObj = this.characters[spaceshipARef.objectID];
            cmdMsg = { "topic": "GameCommand",
                       "command": "createExplosion",
                       "targetObj": this,
                       "params": { "numParticles": numParticles,
                                   "center": [ saveShipPos[0], saveShipPos[1] ],
                                   "minColor": characterObj.colorScheme.dark,
                                   "maxColor": characterObj.colorScheme.light
                                 }
                     };
            this.messageQueue.enqueue(cmdMsg);

            var playerShipRef = this.gameObjs["ship0"];     // NOTE: hard-coded reference to the player ship. I'm doing this because I want to finish this game... taking shortcuts now......
            var sndVol = Math.max(0.1, 1.0 - (vec2.sqrDist(playerShipRef.components["physics"].currPos, spaceshipARef.components["physics"].currPos) / 2250000.0));     // 2250000 = 1500**2 is a magic number -- it's meant to be greater than the hypotenuse of the arena (the largest possible distance that could separate 2 objects) (but it's hardcoded (A) because I'm taking shortcuts, and (B) because I haven't made any additional levels/arenas.. partly because of the shortcuts
            this.shipExplosionSoundPool.play( {"volume": sndVol, "loop": false} );

            var saveShipPos = vec2.clone(spaceshipBRef.components["physics"].currPos);
            var characterObj = this.characters[spaceshipBRef.objectID];
            cmdMsg = { "topic": "GameCommand",
                       "command": "createExplosion",
                       "targetObj": this,
                       "params": { "numParticles": numParticles,
                                   "center": [ saveShipPos[0], saveShipPos[1] ],
                                   "minColor": characterObj.colorScheme.dark,
                                   "maxColor": characterObj.colorScheme.light
                                 }
                     };
            this.messageQueue.enqueue(cmdMsg);


            this.spawnAtNewLocation(spaceshipARef, 75);
            this.spawnAtNewLocation(spaceshipBRef, 75);

            var shipName = this.shipDict[spaceshipARef.objectID];    // NOTE: I hate that JS doesn't care that spaceshipObjectID is a string, but the keys in the dict/obj are int/float
            this.gameStats[shipName].deaths += 1;

            shipName = this.shipDict[spaceshipBRef.objectID];
            this.gameStats[shipName].deaths += 1;
        }
    }

    // Note that for asteroids and the spaceship, we're doing AABB-vs-line segment tests against the arena (to determine containment)
    // But for bullets, we're doing simple containment tests. This is because bullets are small, and the containment test looks convincing; but for spaceships/asteroids, the containment test allows too much of the body to cross the boundary line before triggering a collision (because the containment test deals only with the center point of potentially large objects)
};


// Set queryObj at a new location
// Pick a random spawn location that is:
// - inside the arena, and
// - at least some distance, dist, away from any nearby 

// Preconditions:
// - queryObj MUST have a physics component and a collider component
// - queryObj's collider must have a center point (i.e., the collider is an AABB, circle, etc.)
GameLogic.prototype.spawnAtNewLocation = function(queryObj, cushionDist) {

    var spawnPosIsValid = false;

    while (!spawnPosIsValid) {
        // TODO rework this loop so we only generate positions; then, once we have a valid position, do all of the various assignments

        var spawnPos = vec2.create();
        vec2.set(spawnPos, Math.floor(Math.random() * 700) + 50, Math.floor(Math.random() * 300) + 50);   // TODO don't hardcode these values. Instead, maybe take in min/max x/y, based on arena dimensions

        if (!this.gameObjs["arena"].containsPt(spawnPos)) {
            // Start back at the top of the loop if the randomly generated coords are not in bounds
            continue;
        }

        var physComp = queryObj.components["physics"];
        physComp.setPosition(spawnPos[0], spawnPos[1]);
        physComp.setAcceleration(0, 0);
        physComp.angle = 0.0;

        var collComp = queryObj.components["collision"];
        collComp.update(0); // call update() to recompute bounding geometry

        // Get the list of all nearby objects (i.e., nearby colliders)
        var nearObjs = [];
        this.collisionMgr.quadTree.retrieve(nearObjs, collComp);

        // Here, we'll be lazy and simply compute the squared distance from collComp center to nearObj center (or closest point, if nearObj doesn't have a center)
        // A more robust test would be to compute the nearest point on collComp to nearObj in all cases
        var failedNearbyTest = false;
        for (var nearObj of nearObjs) {
            var poi = vec2.create();    // poi means point of interest. If the nearObj has a center point, then poi is the center. Otherwise, if nearObj has a linear component collider(e.g. line segment), then poi is a point on that linear component

            if (nearObj.hasOwnProperty("center")) {
                vec2.copy(poi, nearObj.center);
            } else if (nearObj.hasOwnProperty("sPt") && nearObj.hasOwnProperty("ePt")) {
                // poi is the projection of the queryObj's center point on to the line segment
                var segVec = vec2.create();
                vec2.sub(segVec, nearObj.ePt, nearObj.sPt);

                var direction = vec2.create();
                vec2.normalize(direction, segVec);

                var segToQueryObj = vec2.create();
                vec2.sub(segToQueryObj, collComp.center, nearObj.sPt);

                var t = vec2.dot(segToQueryObj, direction);
                vec2.scaleAndAdd(poi, nearObj.sPt, segVec, t);

            } // Can add more cases, e.g. if line/ray, we'll only have a point and a dir
            
            var sqDist = vec2.squaredDistance(collComp.center, poi);

            if (sqDist <= Math.pow(cushionDist, 2)) {
                failedNearbyTest = true;
                break
            }
        }

        // Not a fan of the negative logic here, but meh.. it works
        spawnPosIsValid = !failedNearbyTest
    }

    if (queryObj.hasOwnProperty("aiControlled") && queryObj.aiControlled) {
        queryObj.disableThrust();
        queryObj.disableTurn();
        queryObj.disableFireA();
        queryObj.resetAI();
    }

    // Set the "queryObj's" ableState to spawning
    queryObj.ableState = SpaceshipAbleStateEnum.spawning;
    queryObj.resetSpawnClock();
}


GameLogic.prototype.createExplosion = function(params) {
    // numParticles is required
    var xplodPERef = this.components["xplodPE"];
    for (var i = 0; i < params.numParticles; i++)
    {
        // NOTE: I'm seeing that the particle emitter design tries to do too much, and ends up removing granularity of control
        // "center" is required
        xplodPERef.setPosition(params.center[0], params.center[1]);
        xplodPERef.emitParticle(game.fixed_dt_s);
        xplodPERef.setMinColor(params.minColor[0], params.minColor[1], params.minColor[2]);
        xplodPERef.setMaxColor(params.maxColor[0], params.maxColor[1], params.maxColor[2]);
    }
};


// Override the class default executeCommand()
// .. but maybe this version should be the base
GameLogic.prototype.executeCommand = function(cmdMsg, params) {
    //console.log("Spaceship executing command");
    //console.log(cmdMsg);

    // Call function
    this.commandMap[cmdMsg].call(this, params); // use call() because without it, we're losing our "this" reference (going from Spaceship to Object)
};

GameLogic.prototype.doUICommand = function(msg) {
    // Take action on a message with topic, "UICommand"
    // UICommand messages contain a command, a targetObj (i.e. who's going to execute the command), and a params list
    // The command is most likely to call a function. This is not quite a function callback, because we are not storing a pre-determined function ptr
    //console.log("In doUICommand(), with msg = ", msg);

    switch (msg.command) {
        case "changeState":
            // call the game state manager's changestate function
            // NOTE gameStateMgr is global, because I felt like making it that way. But we could also have the GameStateManager handle the message (instead of having this (active game state) handle the message, by calling a GameStateManager member function
            // Note how we're using the transferObj here. It should be like this everywhere we call changeState or pauseState or whatever
            var transferObj = msg.params.hasOwnProperty("transferObj") ? msg.params.transferObj : null;   // Use msg.params if it exists; else pass null
            gameStateMgr.changeState(gameStateMgr.stateMap[msg.params.stateName], transferObj);
            break;
    }

};


GameLogic.prototype.checkForGameOver = function(dt_s) {
    switch (game.settings.visible.gameMode) {
        case "Death Match":
            for (var shipID in this.gameStats) {
                var scoreObj = this.gameStats[shipID];

                if (scoreObj.kills == game.settings.visible.gameModeSettings.deathMatch.shipKills) {
                    // TODO make the transfer object be a collection of messages and their corresponding positions (essentially a control template for the display of the Game Over message -- i.e. score leaders in descending order)

                    var shipObjectID = this.gameObjs[shipID].objectID;
                    var characterName = this.characters[shipObjectID].callSign;
                    var winner = { "characterName": characterName
                                 }
                    var gameOverInfo = { "winnerInfo": winner,
                                         "settings": game.settings["visible"],
                                         "stats": this.gameStats,
                                         "shipDict" : this.shipDict,
                                         "characters": this.characters
                                       };

                    // Transfer this GameLogicObject's bgm object into the GameOver state, so the music can keep playing
                    var transferBGM = this.bgm; // should increment the reference count of the obj referenced by this.bgm by 1
                    this.bgm = null;    // should leave transferBGM as-is, and set my this.bgm ref to null, reducing the ref count to the actual Sound obj by 1 (at this point, the ref count should be 1

                    var cmdMsg = { "topic": "UICommand",
                                   "targetObj": this,
                                   "command": "changeState",
                                   "params": {"stateName": "GameOver",
                                              "transferObj": {"scoresAndStats": gameOverInfo, "bgmObj": transferBGM } 
                                             }
                                 };
                    this.messageQueue.enqueue(cmdMsg);
                }
            }
        break;

        case "Time Attack":
            this.timeAttackSecondsLeft -= dt_s;

            if (this.timeAttackSecondsLeft <= 0.0) {

                var winner = { "characterName": "",
                               "kills": 0
                             };

                for (var shipID in this.gameStats) {
                    var scoreObj = this.gameStats[shipID];

                    var shipObjectID = this.gameObjs[shipID].objectID;
                    var characterName = this.characters[shipObjectID].callSign;

                    if (scoreObj.kills > winner.kills ) {
                        winner.characterName= characterName;
                        winner.kills = scoreObj.kills;
                    }
                }

                    var transferBGM = this.bgm; // should increment the reference count of the obj referenced by this.bgm by 1
                    this.bgm = null;    // should leave transferBGM as-is, and set my this.bgm ref to null, reducing the ref count to the actual Sound obj by 1 (at this point, the ref count should be 1

                // TODO make the transfer object be a collection of messages and their corresponding positions (essentially a control template for the display of the Game Over message -- i.e. score leaders in descending order)
                // e.g. Most kills, best score, most deaths
                var gameOverInfo = { "winnerInfo": winner,
                                     "settings": game.settings["visible"],
                                     "stats": this.gameStats,
                                     "shipDict" : this.shipDict,
                                     "characters": this.characters
                                   };

                var cmdMsg = { "topic": "UICommand",
                               "targetObj": this,
                               "command": "changeState",
                               "params": {"stateName": "GameOver",
                                          "transferObj": {"scoresAndStats": gameOverInfo, "bgmObj": transferBGM } 
                                         }
                             };
                this.messageQueue.enqueue(cmdMsg);
            }
        break;
    }
}
