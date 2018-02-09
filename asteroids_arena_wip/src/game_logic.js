function GameScoresAndStats() {
    this.score = 0;
    this.deaths = 0;
    this.kills = 0;
}

var jankyListOfScoreColors = ["orangered", "cyan", "darkgray"];

function GameLogic() {
// TODO: Probably make the GameLogic class implement some interface that has the necessary functions that all GameLogic objects must have
    this.collisionMgr = null;   // Placeholder for a collision manager (definition probably belongs in base/interface class)
    this.gameObjs = {};
    this.shipDict = {};     // A mapping of ship GameObject objectIDs (assigned by game engine) to the "nicknames" (assigned by the programmer)
	this.keyCtrlMap = {};   // keyboard key state handling (keeping it simple)
    this.messageQueue = null;
    this.objectIDToAssign = -1;  // probably belongs in the base class.
    this.settings = { "hidden": {}, "visible": {} };    // hidden settings are, e.g. point values for accomplishing certain goals; visible settings are, e.g. game config options
    this.gameStats = {};    // store things, e.g. player's score, in-game achievements, state variables, etc.
}

GameLogic.prototype.initialize = function() {
    // Key control map is keyed on keypress event "code", e.g. "KeyW" (as opposed to "keyCode", which is a number, like 87)
    this.keyCtrlMap["thrust"] = { "code": "KeyW", "state": false };
    this.keyCtrlMap["turnLeft"] = { "code": "KeyA", "state": false };
    this.keyCtrlMap["turnRight"] = { "code": "KeyD", "state": false };
    this.keyCtrlMap["fireA"] = { "code": "ShiftLeft", "state": false };

    this.messageQueue = new MessageQueue();
    this.messageQueue.initialize(64);
    this.messageQueue.registerListener('UserInput', this, this.actOnUserInputMessage);  // TODO - clean this up; the "UserInput" topic appears to be unused. The original idea was to first handle keyboard input (topic = UserInput), and then in the registered input listener function, enqueue messages with "GameCommand" (on both keyup and keydown events). But I don't think the 2-layer approach is necessary. I think we can go directly from the separate handleKeyDown and handleKeyUp functions to enqueueing the appropriate game actions
    this.messageQueue.registerListener('GameCommand', this, this.sendCmdToGameObj);
    this.messageQueue.registerListener('CollisionEvent', this, this.processCollisionEvent);

    this.settings["hidden"]["pointValues"] = { "destroyLargeAsteroid": 25,
                                               "destroyMediumAsteroid": 50,
                                               "destroySmallAsteroid": 75,
                                               "kill": 200,
                                               "death": -100
                                             };

    // ----- Initialize collision manager
    // NOTE: Collision Manager is initialized first, so that other items can access it and register their collision objects with it
    this.collisionMgr = new CollisionManager();
    this.collisionMgr.initialize( {"x":0, "y":0, "width": game.canvas.width, "height": game.canvas.height} );     // width/height should match canvas width/height (maybe just use the canvas object?) .. Or.... should the quadtree size match the arena size (which is larger than the canvas)?
    this.collisionMgr.parentObj = this; // TODO make a cleaner way to set parentObj (maybe make an addCollisionManager wrapper function)

    // ----- Initialize thrust/rocket particle system
    this.addGameObject("thrustPS", new ParticleSystem());
    var thrustPSRef = this.gameObjs["thrustPS"];
    thrustPSRef.initialize(1024);

    // ----- Initialize Bullet Manager system
    // Note: bullet mgr has to come before spaceship so that spaceship can register as a bullet emitter
    this.addGameObject("bulletMgr", new BulletManager());
    var bulletMgrRef = this.gameObjs["bulletMgr"];
    bulletMgrRef.initialize(256);

    // ----- Initialize spaceships
    // TODO possibly make a Spaceship Manager or something similar - for when we add spaceship bots; or move this into a ship.initialize() function.. something
    // TODO don't hardcode the initial position -- use arena test for containment
    // TODO don't hardcode the ship names (e.g. ship0); compute/generate those
    this.addGameObject("ship0", new Spaceship());
    var shipRef = this.gameObjs["ship0"];
    var shipConfigObj = { "imgObj": game.imgMgr.imageMap["ship0"].imgObj,
                          "initialPos": [400, 225],
                        };
    // TODO update ship.initialize() to take in a reference to the collision mgr and to the particle engines as part of the shipConfigObj being passed in. Then, move that stuff into initialize()
    shipRef.initialize(shipConfigObj);

    this.collisionMgr.addCollider(shipRef.components["collision"]);   // Have to do the collision manager registration out here, because the spaceship is fully formed at this point (we can't do it in the spaceship constructor (in its current form) -- the parent obj is not passed in)

    var spaceshipThrustPE = shipRef.components["thrustPE"];       // Get the spaceship's thrust particle emitter
    spaceshipThrustPE.registerParticleSystem(this.gameObjs["thrustPS"]);

    var spaceshipGunPE = shipRef.components["gunPE"];             // Get the spaceship's gun particle emitter
    spaceshipGunPE.registerParticleSystem(this.gameObjs["bulletMgr"].components["gunPS"]);

    // NOTE: because of the way the game engine/framework is designed, we have to add individual spaceships as GameObjects (e.g., so they can get assigned an ObjectID), and then if we want to have a "shipDict", we have to have a list of references to the ship GameObjects
    this.shipDict[shipRef.objectID] = "ship0";


    this.addGameObject("ship1", new Spaceship());
    shipRef = this.gameObjs["ship1"];


    var knowledgeObj = { "parentObj": shipRef,
                         "gameLogic": this
                       };

    shipConfigObj = { "imgObj": game.imgMgr.imageMap["ship1"].imgObj,
                      "initialPos": [650, 225],
                      "isAI": true,
                      "knowledge": knowledgeObj,
                      "aiProfile": "miner"
                    };
    // TODO update ship.initialize() to take in a reference to the collision mgr and to the particle engines as part of the shipConfigObj being passed in. Then, move that stuff into initialize()
    shipRef.initialize(shipConfigObj);

    this.collisionMgr.addCollider(shipRef.components["collision"]);   // Have to do the collision manager registration out here, because the spaceship is fully formed at this point (we can't do it in the spaceship constructor (in its current form) -- the parent obj is not passed in)

    var spaceshipThrustPE = shipRef.components["thrustPE"];       // Get the spaceship's thrust particle emitter
    spaceshipThrustPE.registerParticleSystem(this.gameObjs["thrustPS"]);

    var spaceshipGunPE = shipRef.components["gunPE"];             // Get the spaceship's gun particle emitter
    spaceshipGunPE.registerParticleSystem(this.gameObjs["bulletMgr"].components["gunPS"]);

    // NOTE: because of the way the game engine/framework is designed, we have to add individual spaceships as GameObjects (e.g., so they can get assigned an ObjectID), and then if we want to have a "shipDict", we have to have a list of references to the ship GameObjects
    this.shipDict[shipRef.objectID] = "ship1";


    this.addGameObject("ship2", new Spaceship());
    shipRef = this.gameObjs["ship2"];

    var knowledgeObj = { "parentObj": shipRef,
                         "gameLogic": this
                       };

    shipConfigObj = { "imgObj": game.imgMgr.imageMap["ship2"].imgObj,
                      "initialPos": [550, 225],
                      "isAI": true,
                      "knowledge": knowledgeObj,
                      "aiProfile": "hunter",
                      "aiHuntRadius": 500
                    };
    // TODO update ship.initialize() to take in a reference to the collision mgr and to the particle engines as part of the shipConfigObj being passed in. Then, move that stuff into initialize()
    shipRef.initialize(shipConfigObj);

    this.collisionMgr.addCollider(shipRef.components["collision"]);   // Have to do the collision manager registration out here, because the spaceship is fully formed at this point (we can't do it in the spaceship constructor (in its current form) -- the parent obj is not passed in)

    var spaceshipThrustPE = shipRef.components["thrustPE"];       // Get the spaceship's thrust particle emitter
    spaceshipThrustPE.registerParticleSystem(this.gameObjs["thrustPS"]);

    var spaceshipGunPE = shipRef.components["gunPE"];             // Get the spaceship's gun particle emitter
    spaceshipGunPE.registerParticleSystem(this.gameObjs["bulletMgr"].components["gunPS"]);

    // NOTE: because of the way the game engine/framework is designed, we have to add individual spaceships as GameObjects (e.g., so they can get assigned an ObjectID), and then if we want to have a "shipDict", we have to have a list of references to the ship GameObjects
    this.shipDict[shipRef.objectID] = "ship2";


    // Create score keeping object
    for (var shipIDKey in this.shipDict) {
        var shipName = this.shipDict[shipIDKey];
        this.gameStats[shipName] = new GameScoresAndStats();
    }


    // ----- Initialize Asteroid Manager
    this.addGameObject("astMgr", new AsteroidManager());
    var astMgrRef = this.gameObjs["astMgr"];
    astMgrRef.initialize(1, 64);

    // ----- Initialize Arena
    this.addGameObject("arena", new Arena());
    var arenaRef = this.gameObjs["arena"];
    arenaRef.initialize();

};

GameLogic.prototype.addGameObject = function(objName, obj) {
    // TODO assign the current GameLogic.objectIDToAssign to the object (probably add to the GameObject prototype); increment the GameLogic object's objectIDToAssign
    this.objectIDToAssign += 1;

    this.gameObjs[objName] = obj;
    this.gameObjs[objName].objectID = this.objectIDToAssign;
    this.gameObjs[objName].parentObj = this;
};

GameLogic.prototype.setThrust = function(shipRef) {
    // TODO implement the command pattern for ship controls (thrust and turning). The command pattern will allow for AI.  Or... should this go into a SpaceshipManager (see above)
};

GameLogic.prototype.setAngularVel = function(shipRef, angVel) {
    // TODO implement the command pattern for ship controls (thrust and turning). The command pattern will allow for AI.  Or... should this go into a SpaceshipManager (see above)
};

GameLogic.prototype.draw = function(canvasContext) {
    canvasContext.save();
    canvasContext.setTransform(1,0,0,1,0,0);    // Reset transformation (similar to OpenGL loadIdentity() for matrices)

    // Clear the canvas (note that the game application object is global)
    canvasContext.fillStyle = 'black';
    canvasContext.fillRect(0,0, game.canvas.width, game.canvas.height);

    // TODO replace with a proper camera class. Update the camera during the update cycle (allow camera to track any given object), then simply apply camera transform here
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
            // TODO evaluate why we're storing the listeners as dicts {id: ref}; why not just use a list?
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
        this.keyCtrlMap["thrust"]["state"] = true;  // TODO figure out if we're using state here, and possibly get rid of it. We seem to not be processing the key states anywhere; instead, we enqueue commands immediately on state change

        // Note that the payload of messages in the queue can vary depending on context. At a minimum, the message MUST have a topic
        // TODO keep a reference to the player-controlled obj, instead of hard-coding?
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

    // Play sound effects

    // Process AI (if any/still TODO)
    // NOTE that user input is handled via event handler in the web browser
};

GameLogic.prototype.actOnUserInputMessage = function(msg) {
    //console.log('actOnUserInputMessage: "this" =');
    //console.log(this);
    if (msg["topic"] == "UserInput") {
        //console.log('Command: Topic=' + msg["topic"] + ', Command=' + msg["command"]);

        // TODO issue ship control commands from here (i.e. use command pattern)
        if (msg["command"] == 'ChangeCamera') {
            //console.log('Taking some action (TODO finish this)');
            // TODO probably enqueue a new message, with topic "GameCommand". The AI will also use this
        }
    }
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

    var cmdMsg;

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

        var fragRefDir = vec2.create();   // Create collision normal out here, and pass into the disableAndSpwan call (so we can get fancy with collision normals, e.g., with spaceship surfaces

        // Note: in params, disableList is a list so we can possibly disable multiple asteroids at once; numToSpawn is the # of asteroids to spawn for each disabled asteroid. Can maybe be controlled by game difficulty level.
        // TODO rework GameCommand so that the caller doesn't need to know which object will handle the game command.  Have handlers register with the GameLogic obj, so the caller can simply put the GameCommand out
        cmdMsg = { "topic": "GameCommand",
                   "command": "disableAndSpawnAsteroids",
                   "targetObj": this.gameObjs["astMgr"],
                   "params": { "disableList": [ asteroidRef ],
                               "numToSpawn": 2,
                               "fragRefDir": fragRefDir }
                 };
        this.messageQueue.enqueue(cmdMsg);  // NOTE: we do this here, and not in the next outer scope because we only want to enqueue a message onto the message queue if an actionable collision occurred

        // Note: 75 is a magic number; gives probably enough a cushion around the spaceship when it spawns at some random location
        this.spawnAtNewLocation(spaceshipRef, 75);

        // TODO keep deaths for all the ships, including computer-controlled
        var shipName = this.shipDict[spaceshipRef.objectID];    // NOTE: I hate that JS doesn't care that spaceshipObjectID is a string, but the keys in the dict/obj are int/float
        this.gameStats[shipName].deaths += 1;   // TODO - now that there's a ship list, we need to map the ship ref to the player (either cpu or human)

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

        var fragRefDir = vec2.create();   // Create collision normal out here, and pass into the disableAndSpwan call (so we can get fancy with collision normals, e.g., with spaceship surfaces
        vec2.sub(fragRefDir, bulletRef.components["physics"].currPos, bulletRef.components["physics"].prevPos);         // make the fragment ref dir the bullet's velocity dir
        vec2.normalize(fragRefDir, fragRefDir);

        // NOTE: We have to increment players' scores before destroying the bullets
        var shooterObjectID = this.lookupObjectID(bulletRef.emitterID, "Spaceship");
        // TODO keep scores for all the ships, including computer-controlled
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


        // Note: in params, disableList is a list so we can possibly disable multiple asteroids at once; numToSpawn is the # of asteroids to spawn for each disabled asteroid. Can maybe be controlled by game difficulty level.
        cmdMsg = { "topic": "GameCommand",
                   "command": "disableAndSpawnAsteroids",
                   "targetObj": this.gameObjs["astMgr"],
                   "params": { "disableList": [ asteroidRef ],
                               "numToSpawn": 2,
                               "fragRefDir": fragRefDir }
                 };

        this.messageQueue.enqueue(cmdMsg);  // NOTE: we enqueue here, and not in the next outer scope because we only want to enqueue a message onto the message queue if an actionable collision occurred

        cmdMsg = { "topic": "GameCommand",
                   "command": "disableBullet",
                   "targetObj": this.gameObjs["bulletMgr"],
                   "params": { "bulletToDisable": bulletRef }
                 };

        this.messageQueue.enqueue(cmdMsg);


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

        // Make sure we're not processing the moment when a bullet fired by a spaceship is intersecting with the hitbox for the ship

        // Compute the spaceship's gun/emitter ID
        if (bulletRef.emitterID == spaceshipRef.components["gunPE"].emitterID) {
            //console.log("Skipping " + gameObjAType + "/" + gameObjBType + " collision because of self-shot prevention");
        } else {
            // Note: 75 is a magic number; gives probably enough a cushion around the spaceship when it spawns at some random location
            this.spawnAtNewLocation(spaceshipRef, 75);

            var shooterObjectID = this.lookupObjectID(bulletRef.emitterID, "Spaceship");
            // TODO keep track of kills for all ships, including computer-controlled
            var shooterName = this.shipDict[shooterObjectID];  // NOTE: I hate that JS doesn't care that shooterObjectID is a string, but the keys in the dict/obj are int/float
                // If ship0 is the shooter, then increment human player's kills (TODO think about scaling up for local multiplayer?)
            this.gameStats[shooterName].kills += 1;
            this.gameStats[shooterName].score += this.settings["hidden"]["pointValues"]["kill"];

            var victimName = this.shipDict[spaceshipRef.objectID];
                // If spaceshipRef's objectID is the key of ship0 in this.shipDict, then the human player got hit. Increment deaths
            this.gameStats[victimName].deaths += 1;
            this.gameStats[victimName].score = Math.max(0, this.gameStats[victimName].score + this.settings["hidden"]["pointValues"]["death"]);

            cmdMsg = { "topic": "GameCommand",
                       "command": "disableBullet",
                       "targetObj": this.gameObjs["bulletMgr"],
                       "params": { "bulletToDisable": bulletRef }
                     };
            this.messageQueue.enqueue(cmdMsg);
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
        // TODO implement a "spawning" state -- maybe render some cool VFX and do a countdown or something

        // Note: 75 is a magic number; gives probably enough a cushion around the spaceship when it spawns at some random location
        this.spawnAtNewLocation(spaceshipRef, 75);
        // TODO keep deaths for all the ships, including computer-controlled
        var shipName = this.shipDict[spaceshipRef.objectID];    // NOTE: I hate that JS doesn't care that shooterObjectID is a string, but the keys in the dict/obj are int/float
        this.gameStats[shipName].deaths += 1;
        this.gameStats[shipName].score = Math.max(0, this.gameStats[shipName].score + this.settings["hidden"]["pointValues"]["death"]);

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

        var spawnPos = vec2.create();
        vec2.set(spawnPos, Math.floor(Math.random() * 700) + 50, Math.floor(Math.random() * 300) + 50);   // TODO don't hardcode these values. Instead, maybe take in min/max x/y, based on arena dimensions

        if (!this.gameObjs["arena"].containsPt(spawnPos)) {
            // Start back at the top of the loop if the randomly generated coords are not in bounds
            continue;
        }

        // Set the position of the query object (e.g. a Spaceship)
        var physComp = queryObj.components["physics"];
        physComp.setPosition(spawnPos[0], spawnPos[1]);
        physComp.setAcceleration(0, 0);
        physComp.angle = 0.0;

        var collComp = queryObj.components["collision"];
        collComp.update(0); // call update() to recompute bounding geometry

        // Get the list of all nearby objects (i.e., nearby colliders)
        var nearObjs = [];
        this.collisionMgr.quadTree.retrieve(nearObjs, collComp);

        // Here, we'll be lazy and simply compute the squared distance from collComp center to nearObj center
        // A more robust test would be to compute the nearest point on collComp to nearObj
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

            if (sqDist <= cushionDist * cushionDist) {
                failedNearbyTest = true;
                break
            }
        }

        if (!failedNearbyTest) {
            spawnPosIsValid = true;
        }
    }

    if (queryObj.hasOwnProperty("aiControlled") && queryObj.aiControlled) {
        queryObj.disableThrust();
        queryObj.disableTurn();
        queryObj.resetAI();
    }
}
