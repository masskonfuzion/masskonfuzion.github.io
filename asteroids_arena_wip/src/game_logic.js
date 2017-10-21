function GameLogic() {
// TODO: Probably make the GameLogic class implement some interface that has the necessary functions that all GameLogic objects must have
    this.collisionMgr = null;   // Placeholder for a collision manager (definition probably belongs in base/interface class)
    this.gameObjs = {};
	this.keyCtrlMap = {};   // keyboard key state handling (keeping it simple)
    this.messageQueue = null;
    this.timer = null;
    this.fixed_dt_s = 0.015;
    this.objectIDToAssign = -1;  // probably belongs in the base class.
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

    this.timer = new Timer();

    // ----- Initialize collision manager
    // NOTE: Collision Manager is initialized first, so that other items can access it and register their collision objects with it
    this.collisionMgr = new CollisionManager();
    this.collisionMgr.initialize( {"x":0, "y":0, "width": game.canvas.width, "height": game.canvas.height} );     // width/height should match canvas width/height (maybe just use the canvas object?) .. Or.... should the quadtree size match the arena size (which is larger than the canvas)?

    // ----- Initialize thrust/rocket particle system
    this.addGameObject("thrustPS", new ParticleSystem());
    var thrustPSRef = this.gameObjs["thrustPS"];
    thrustPSRef.initialize(1024);

    // ----- Initialize Bullet Manager system
    // Note: bullet mgr has to come before spaceship so that spaceship can register as a bullet emitter
    this.addGameObject("bulletMgr", new BulletManager());
    var bulletMgrRef = this.gameObjs["bulletMgr"];
    bulletMgrRef.initialize(256);

    // ----- Initialize spaceship
    // TODO possibly make a Spaceship Manager or something similar - for when we add spaceship bots; or move this into a ship.initialize() function.. something
    this.addGameObject("ship", new Spaceship());
    var shipRef = this.gameObjs["ship"];
    var shipConfigObj = { "imgObj": game.imgMgr.imageMap["ship"].imgObj };
    shipRef.initialize(shipConfigObj);

    this.collisionMgr.addCollider(shipRef.components["collision"]);   // Have to do the collision manager registration out here, because the spaceship is fully formed at this point (we can't do it in the spaceship constructor (in its current form) -- the parent obj is not passed in)

    var spaceshipThrustPE = shipRef.components["thrustPE"];       // Get the spaceship's thrust particle emitter
    spaceshipThrustPE.registerParticleSystem(this.gameObjs["thrustPS"]);

    var spaceshipGunPE = shipRef.components["gunPE"];             // Get the spaceship's gun particle emitter
    spaceshipGunPE.registerParticleSystem(this.gameObjs["bulletMgr"].components["gunPS"]);

    // ----- Initialize Asteroid Manager
    this.addGameObject("astMgr", new AsteroidManager());
    var astMgrRef = this.gameObjs["astMgr"];
    astMgrRef.initialize(1, 16);

    // ----- Initialize Arena
    // TODO -- make arena. Simplest is rectangle obj {x, y, width, height}; but can also make a class, with arbitrary arena shape, and the ability to test for containment of objs within itself.  Can use this test to determine when to expire bullet objects

};

GameLogic.prototype.addGameObject = function(objName, obj) {
    // TODO assign the current GameLogic.objectIDToAssign to the object (probably add to the GameObject prototype); increment the GameLogic object's objectIDToAssign
    this.objectIDToAssign += 1;

    this.gameObjs[objName] = obj;
    this.gameObjs[objName].objectID = this.objectIDToAssign;
    this.gameObjs[objName].parentObj = this;
};

GameLogic.prototype.setThrust = function(shipRef) {
    // TODO implement the command pattern for ship controls (thrust and turning). The command pattern will allow for AI
};

GameLogic.prototype.setAngularVel = function(shipRef, angVel) {
    // 
};

GameLogic.prototype.draw = function() {
    // Clear the canvas (note that the game application object is global)
    game.context.fillStyle = 'black';
    game.context.fillRect(0,0, game.canvas.width, game.canvas.height);

    // the game application obj is global
    for (var goKey in this.gameObjs) {
        if (this.gameObjs.hasOwnProperty(goKey)) {
            if ("render" in this.gameObjs[goKey].components || this.gameObjs[goKey].draw) {  // Make sure the component has a render component, or otherwise has a draw method
                this.gameObjs[goKey].draw(game.context);        // Assume that the draw() function for a GameObject calls into the draw() function for its render component
            }
        }
    }
};


GameLogic.prototype.processMessages = function(dt_s) {
    // dt_s is not used specifically by processMessages, but is passed in in case functions called by processMessages need it
    //console.log('MessageQueue has ' + this.messageQueue.numItems() + ' items in it');

    while (!this.messageQueue._empty) {
        console.log('Processing message');
        // NOTE: If the queue is initialized with dummy values, then this loop will iterate over dummy values
        // It may be better to use a queue that is has an actual empty array when the queue is empty
        // That way, this loop will not run unless items actually exist in the queue
        var msg = this.messageQueue.dequeue();

        console.log('Iterating over topic: ' + msg.topic);

        for (var handler of this.messageQueue._registeredListeners[msg.topic]) {
            // TODO evaluate why we're storing the listeners as dicts {id: ref}; why not just use a list?
            handler["func"].call(handler["obj"], msg);
        }
    }
};


GameLogic.prototype.handleKeyboardInput = function(evt) {
    // This function is the "quarterback" for handling user keyboard input
    console.log(evt);

    if (evt.type == "keydown") {
        this.handleKeyDownEvent(evt);
    }
    else if (evt.type == "keyup") {
        this.handleKeyUpEvent(evt);
    }
};

GameLogic.prototype.handleKeyDownEvent = function(evt) {
    console.log(this);
    // NOTE: We don't define these function on the prototype it inherited from; we define the function at the object level
    // Also note: Not relevant for this game, but this event-based approach can be used for many input schemes. e.g., for a fighting game, instead of directly enqueuing game commands, we could enqueue key presses with time stamps, to determine if a "special move combo" was entered
    console.log('Key code ' + evt.keyCode + ' down');

    // NOTE: apparently, it is not possible to disable key repeat in HTML5/Canvas/JS..
    var cmdMsg = {};
    if (evt.code == this.keyCtrlMap["thrust"]["code"]) {
        // User pressed thrust key
        this.keyCtrlMap["thrust"]["state"] = true;  // TODO figure out if we're using state here, and possibly get rid of it. We seem to not be processing the key states anywhere; instead, we enqueue commands immediately on state change

        // Note that the payload of messages in the queue can vary depending on context. At a minimum, the message MUST have a topic
        // TODO keep a reference to the player-controlled obj, instead of hard-coding?
        cmdMsg = { "topic": "GameCommand",
                   "command": "setThrustOn",
                   "objRef": this.gameObjs["ship"],
                   "params": null
                 };
        this.messageQueue.enqueue(cmdMsg);
    }

    if (evt.code == this.keyCtrlMap["fireA"]["code"]) {
        // User pressed the fire A key (e.g. primary weapon)
        cmdMsg = { "topic": "GameCommand",
                   "command": "setFireAOn",
                   "objRef": this.gameObjs["ship"],
                   "params": null
                 };
        this.messageQueue.enqueue(cmdMsg);
    }

    if (evt.code == this.keyCtrlMap["turnLeft"]["code"]) {
        // User pressed turnLeft key
        this.keyCtrlMap["turnLeft"]["state"] = true;
        cmdMsg = { "topic": "GameCommand",
                   "command": "setTurnLeftOn",
                   "objRef": this.gameObjs["ship"],
                   "params": null
                 };
        this.messageQueue.enqueue(cmdMsg);
    }
    else if (evt.code == this.keyCtrlMap["turnRight"]["code"]) {
        // User pressed turnRight key
        this.keyCtrlMap["turnRight"]["state"] = true;
        cmdMsg = { "topic": "GameCommand",
                   "command": "setTurnRightOn",
                   "objRef": this.gameObjs["ship"],
                   "params": null
                 };
        this.messageQueue.enqueue(cmdMsg);
    }
};


GameLogic.prototype.handleKeyUpEvent = function(evt) {
    console.log('Key code ' + evt.keyCode + ' up');

    if (evt.code == this.keyCtrlMap["thrust"]["code"]) {
        // User released thrust key
        this.keyCtrlMap["thrust"]["state"] = false;

        cmdMsg = { "topic": "GameCommand",
                   "command": "setThrustOff",
                   "objRef": this.gameObjs["ship"],
                   "params": null
                 };
        this.messageQueue.enqueue(cmdMsg);
    }

    if (evt.code == this.keyCtrlMap["fireA"]["code"]) {
        // User pressed the fire A key (e.g. primary weapon)
        cmdMsg = { "topic": "GameCommand",
                   "command": "setFireAOff",
                   "objRef": this.gameObjs["ship"],
                   "params": null
                 };
        this.messageQueue.enqueue(cmdMsg);
    }

    if (evt.code == this.keyCtrlMap["turnLeft"]["code"]) {
        // User pressed turnLeft key
        this.keyCtrlMap["turnLeft"]["state"] = false;
        cmdMsg = { "topic": "GameCommand",
                   "command": "setTurnOff",
                   "objRef": this.gameObjs["ship"],
                   "params": null
                 };
        this.messageQueue.enqueue(cmdMsg);
    }

    else if (evt.code == this.keyCtrlMap["turnRight"]["code"]) {
        // User pressed turnRight key
        this.keyCtrlMap["turnRight"]["state"] = false;
        cmdMsg = { "topic": "GameCommand",
                   "command": "setTurnOff",
                   "objRef": this.gameObjs["ship"],
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
    console.log('actOnUserInputMessage: "this" =');
    console.log(this);
    if (msg["topic"] == "UserInput") {
        console.log('Command: Topic=' + msg["topic"] + ', Command=' + msg["command"]);

        // TODO issue ship control commands from here (i.e. use command pattern)
        if (msg["command"] == 'ChangeCamera') {
            console.log('Taking some action (TODO finish this)');
            // TODO probably enqueue a new message, with topic "GameCommand". The AI will also use this
        }
    }
};

GameLogic.prototype.sendCmdToGameObj = function(msg) {
    // NOTE: because we have only 1 parameter to this function (really, to all registered listeners of a message queue), a ref to the object to which to send the cmd is included as part of the msg
    console.log("sendCmdToGameObj: ");
    console.log(msg);

    // Call the executeCommand() function with the given command (all GameObjs will have an executeCommand() function)
    msg["objRef"].executeCommand(msg["command"], msg["params"]);
};

GameLogic.prototype.processCollisionEvent = function(msg) {
    console.log("Processing collision event message ");
    console.log(msg);
    console.log("Probably also enqueue a message to an explosion manager to trigger an explosion. Also, play a sound");

    var gameObjAType = msg.colliderA.parentObj.constructor.name;
    var gameObjBType = msg.colliderB.parentObj.constructor.name;

    // TODO Possibly restructure collision event if/then cases into their own individual function calls

    var cmdMsg;

    // Spaceship vs Asteroid
    if (gameObjAType == "Spaceship" && gameObjBType == "Asteroid" || gameObjBType == "Spaceship" && gameObjAType == "Asteroid") {
        console.log("We have a collision between a spaceship and an asteroid")

        // Get a reference to the asteroid obj that is part of the collision, to include it as a param to the AsteroidManager, to disable the Asteroid and spawn new ones
        var asteroidRef = null;
        if (gameObjAType == "Asteroid") {
            asteroidRef = msg.colliderA.parentObj;
        } else {
            asteroidRef = msg.colliderB.parentObj;
        }

        // TODO also destroy the ship

        var fragRefDir = vec2.create();   // Create collision normal out here, and pass into the disableAndSpwan call (so we can get fancy with collision normals, e.g., with spaceship surfaces

        // Note: in params, disableList is a list so we can possibly disable multiple asteroids at once; numToSpawn is the # of asteroids to spawn for each disabled asteroid. Can maybe be controlled by game difficulty level.
        cmdMsg = { "topic": "GameCommand",
                   "command": "disableAndSpawnAsteroids",
                   "objRef": this.gameObjs["astMgr"],
                   "params": { "disableList": [ asteroidRef ],
                               "numToSpawn": 2,
                               "fragRefDir": fragRefDir }
                 };
        this.messageQueue.enqueue(cmdMsg);  // NOTE: we do this here, and not in the next outer scope because we only want to enqueue a message onto the message queue if an actionable collision occurred
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

        // Note: in params, disableList is a list so we can possibly disable multiple asteroids at once; numToSpawn is the # of asteroids to spawn for each disabled asteroid. Can maybe be controlled by game difficulty level.
        cmdMsg = { "topic": "GameCommand",
                   "command": "disableAndSpawnAsteroids",
                   "objRef": this.gameObjs["astMgr"],
                   "params": { "disableList": [ asteroidRef ],
                               "numToSpawn": 2,
                               "fragRefDir": fragRefDir }
                 };

        this.messageQueue.enqueue(cmdMsg);  // NOTE: we enqueue here, and not in the next outer scope because we only want to enqueue a message onto the message queue if an actionable collision occurred

        cmdMsg = { "topic": "GameCommand",
                   "command": "disableBullet",
                   "objRef": this.gameObjs["bulletMgr"],
                   "params": { "bulletToDisable": bulletRef }
                 };

        // TODO also destroy the bullet
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
            console.log("Skipping " + gameObjAType + "/" + gameObjBType + " collision because of self-shot prevention");
        }

    }
};

