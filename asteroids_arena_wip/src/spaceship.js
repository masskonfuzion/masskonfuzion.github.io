var SpaceshipAbleStateEnum = { "disabled": 0,
                               "enabled": 1,
                               "spawning": 2
                             };

var ReflexDelayStateEnum = { "notstarted": 0,
                             "active": 1,
                             "completed": 2
                           };

function Spaceship() {
    // Inherit GameObject properties, includinga components dict
    GameObject.call(this);

    // TODO: Consider moving the addComponent calls to an initialize() function outside the ctor; i.e. try to guarantee a fully-formed object at ctor exit
    this.addComponent("physics", new PhysicsComponentVerlet());
    this.addComponent("render", new RenderComponentSprite());
    this.addComponent("thrustPE", new ParticleEmitter());           // Particle emitter for rocket/thruster exhaust particle system
    this.addComponent("gunPE", new ParticleEmitter());              // Particle emitter for bullet/guns particle system
    this.addComponent("collision", new CollisionComponentAABB());

    var thrustPE = this.components["thrustPE"];  // get a reference to our own component, to shorten the code
    thrustPE.setVelocityRange(150.0, 300.0);
    thrustPE.setAngleRange(-20, 20);     // degrees
    thrustPE.setTTLRange(0.2, 0.4);    // seconds
    thrustPE.setMinColor(20, 4, 4);
    thrustPE.setMaxColor(252, 140, 32);

    var gunPE = this.components["gunPE"];
    gunPE.setVelocityRange(300.0, 300.0);
    gunPE.setAngleRange(0, 0);     // degrees
    gunPE.setMinColor(200, 200, 200);   // TODO make sure these colors actually get set... Right now, particle color isn't getting set if the emitParticle call does not pass in a config object...
    gunPE.setMaxColor(200, 200, 200);
    gunPE.setRateLimit(0.1);
    // NOTE: we don't set TTLRange here because the particles were already created and initialized (in an object pool); the autoExpire/TTL stuff is done there


    this.fireAState = false;        // To be used in AI/logic or whatever, to tell the game that this spaceship is firing its guns
    this.ableState = SpaceshipAbleStateEnum.disabled;
    this.spawnGracePd_s = 2;    // spawn grace period, in seconds
    this.spawnClock = 0;        // time remaining during spawning abaleState, before switching to fully enabled

    // Populate the command map (this.commandMap is part of the GameObject base class, which this Spaceship derives from)
    this.commandMap["setThrustOn"] = this.enableThrust;
    this.commandMap["setThrustOff"] = this.disableThrust;
    this.commandMap["setTurnLeftOn"] = this.enableTurnLeft;
    this.commandMap["setTurnRightOn"] = this.enableTurnRight;
    this.commandMap["setTurnOff"] = this.disableTurn;
    this.commandMap["setFireAOn"] = this.enableFireA;
    this.commandMap["setFireAOff"] = this.disableFireA;

    this.aiControlled = false;
    this.aiConfig = {};
    this.aiNearestObj = [];
}


Spaceship.prototype = Object.create(GameObject.prototype);
Spaceship.prototype.constructor = Spaceship;

Spaceship.prototype.initialize = function(configObj) {
    // configObj is a dict object 
    // TODO test for existence of configObj and its properties
    this.components["render"].setImgObj(configObj["imgObj"]);
    this.components["physics"].setPosition(configObj["initialPos"][0], configObj["initialPos"][1]);
    this.components["collision"].update(0);    // Do an update to force the collision component to compute its boundaries

    // NOTE: can't set particle emitter IDs in the constructor because the objectID for this object has not been set at that point
    this.components["gunPE"].setEmitterID(this.constructor.name + this.objectID.toString() + "." + "gunPE");

    this.ableState = SpaceshipAbleStateEnum.spawning;
    this.resetSpawnClock();

    if(configObj.hasOwnProperty("isAI") && true == configObj["isAI"]) {
        this.aiControlled = true;
        //this.addComponent("ai", new FSM());   // TODO delete
        // Initialize an AI obj with a reference to this ship, and a reference to the gameLogic obj
        this.addComponent("ai", new SpaceshipAI(this, configObj["knowledge"]));

        this.aiConfig["aiProfile"] = configObj.hasOwnProperty("aiProfile") ? configObj["aiProfile"] : "miner";  // default to miner behavior profile if we forget to specify
        this.aiConfig["aiHuntRadius"] = configObj.hasOwnProperty("aiHuntRadius") ? configObj["aiHuntRadius"] : null;
        this.aiConfig["aiMaxLinearVel"] = 50;
        this.aiConfig["aiMinVelCorrectThreshold"] = 10;    // Speed above which we still need to slow down
        this.aiConfig["aiSqrAttackDist"] = Math.pow(160, 2);     // Squared distance within which a ship will attack a target
        this.aiConfig["aiSqrDistToTarget"] = 0;          // Current squared distance to target
        this.aiConfig["aiPrevSqrDistToTarget"] = 0;          // Prev squared distance to target
        this.aiConfig["aiVelCorrectDir"] = vec2.create();
        this.aiConfig["aiAlignHeadingThreshold"] = 2;     // Align-heading-towards-target threshold; a half-angle, in degrees
        this.aiConfig["aiAlignVelocityPursueThreshold"] = 22;     // Align-velocity-to-desired-direction threshold; a half-angle, in degrees
        this.aiConfig["aiAlignVelocityDriftThreshold"] = 60;     // Align-velocity-to-desired-direction threshold; a half-angle, in degrees
        this.aiConfig["aiAlignVelocityCorrectThreshold"] = 5;     // Align-velocity-to-desired-direction threshold; a half-angle, in degrees
        this.aiConfig["target"] = null;
        this.aiConfig["vecToTargetPos"] = vec2.create();        // vec2 from ship position to target position
        this.aiConfig["currVel"] = vec2.create();
        this.aiConfig["currVelDir"] = vec2.create();
        this.aiConfig["aiReflex"] = { "delayRange": {"min": 150, "max": 250},
                                      "delayInterval": 0,
                                      "currTimestamp": 0,
                                      "prevTimestamp": 0,
                                      "reflexState": 0
                                    };
        // ^ delay range given in milliseconds because the DOMHighResTimeStamp object returned by performance.now() is in ms
        // reflexState can be:  0 = not started, 1 = active, 2 = finished/time has elapsed

        // the decisionLogic object will store some decision-making data that it would otherwise be non-trivial to compute repeatedly (e.g. am I aligned to a vector -- is the angle between my vec and the target vec within a range?)
        // TODO maybe rename the "aligned..." vars to "headingAligned..."
        this.aiConfig["decisionLogic"] = { "alignedToTargetVector": false,
                                           "alignedToEvadeVector": false,
                                           "alignedToVelCorrectVector": false,
                                           "exceedingSpeedLimit": false,
                                           "movingGenerallyTowardsTarget": false,
                                           "currVelAlignedToDesiredVel": false,
                                           "distToTargetIncreasing": false,
                                           "withinAttackRange": false,
                                           "withinEvadeRange": false
                                         };

        this.initializeAI(configObj["knowledge"]);
    }
};

// Override the default update()
Spaceship.prototype.update = function(dt_s, config = null) {
    //if (this.aiControlled) {
    //    // TODO compute nearest threat (use the quadtree to prune calculations)
    //    // The quadtree is owned by the gameLogic object, which is also the parent obj of all spaceships
    //    // NOTE: it would be safer to verify that the gameLogic object has a collisionMgr, but whatever, we know it does..
    //    var qt = this.parentObj.collisionMgr.quadTree;

    //    var nearObjs = [];
    //    // Clear the near objs list
    //    qt.retrieve(nearObjs, this.components["collision"]);

    //    var minDist = Number.MAX_SAFE_INTEGER;
    //    for (var nearObj of nearObjs) {
    //        var sqrDist = 0; // TODO standardize a way to get distance to an object -- maybe use closest point or some other math
    //        // TODO 2018-01-11 - pick up from here
    //        // TODO 2018-04-12 - Hmmm.... pick up what from here? What was I trying to do? Always keep a reference to the nearest threat, no matter what state the AI is in? Possibly
    //    }
    //}

    // Iterate over all components and call their respective update() function
    for (var compName in this.components) {
        if (this.components.hasOwnProperty(compName)) {

            // NOTE: I'm debating whether or not I need the ParticleEmitter class. Or, I'm debating whether I can possibly keep it simple or I'll need to create a base class/subclass hierarchy
            // Determine the configuration object to send into update()
            var updateConfigObj = null;

            // Do some preliminary setup work before calling update() on the following components
            switch(compName) {
                case "thrustPE":
                    // Could wrap all this in a function
                    var myRenderComp = this.components["render"];
                    var myPhysicsComp = this.components["physics"];
                    var myThrustPEComp = this.components["thrustPE"];

                    // Compute the particle emitters' launch dir and position
                    var launchDir = vec2.create();
                    vec2.copy(launchDir, myPhysicsComp.angleVec);    // NOTE: could have called setLaunchDir() here

                    vec2.scale(launchDir, launchDir, -1);
                    vec2.normalize(launchDir, launchDir);   // Normalize, just to be sure..

                    // position the particle emitter at the back of the ship (use the ship's sprite dimensions for guidance)
                    var pePos = vec2.create();
                    vec2.set(pePos, -16, 0);
                    var rotMat = mat2.create();
                    mat2.fromRotation(rotMat, glMatrix.toRadian(myPhysicsComp.angle) );
                    vec2.transformMat2(pePos, pePos, rotMat);
                    vec2.add(pePos, pePos, myPhysicsComp.currPos);

                    // emitPoints is a list of emitter position/direction pairs. Used for having multiple emit points/dirs.
                    //var emitterConfig = { "emitPoints": [ {"position": pePos, "direction": launchDir}, {"position": pePos, "direction": launchDir}, {"position": pePos, "direction": launchDir}, {"position": pePos, "direction": launchDir} ] };   // emit 4 particles per update
                    updateConfigObj = { "emitPoints": [ {"position": pePos, "direction": launchDir}, {"position": pePos, "direction": launchDir} ] };   // emit 2 particles per update
                    break;
                case "gunPE":
                    // Could wrap all this in a function
                    var myRenderComp = this.components["render"];
                    var myPhysicsComp = this.components["physics"];
                    var myGunPEComp = this.components["gunPE"];

                    // Compute the particle emitters' launch dir and position
                    var launchDir = vec2.create();
                    vec2.copy(launchDir, myPhysicsComp.angleVec);    // NOTE: could have called setLaunchDir() here
                    vec2.normalize(launchDir, launchDir);   // Normalize, just to be sure..

                    // position the particle emitter at the front of the ship (use the ship's sprite dimensions for guidance)
                    var pePos = vec2.create();
                    vec2.set(pePos, 16, 0);
                    var rotMat = mat2.create();
                    mat2.fromRotation(rotMat, glMatrix.toRadian(myPhysicsComp.angle) );
                    vec2.transformMat2(pePos, pePos, rotMat);
                    vec2.add(pePos, pePos, myPhysicsComp.currPos);

                    myGunPEComp.setPosition(pePos[0], pePos[1]);
                    // NOTE: we emit 1 particle per update, but as we add different types of weapons, that can change
                    updateConfigObj = { "emitPoints": [ {"position": pePos, "direction": launchDir} ] };
                    break;
            }

            this.components[compName].update(dt_s, updateConfigObj);
        }
    }


    // If in spawning state, the ship is "partially enabled", except collisions are not processed (see game_logic.js)
    if (this.ableState == SpaceshipAbleStateEnum.spawning) {
        this.spawnClock -= dt_s;

        if (this.spawnClock <= 0) {
            this.spawnClock = 0;
            this.ableState = SpaceshipAbleStateEnum.enabled;
        }
    }
};

// Override the class default executeCommand()
// .. but maybe this version should be the base
Spaceship.prototype.executeCommand = function(cmdMsg, params) {
    //console.log("Spaceship executing command");
    //console.log(cmdMsg);

    // Call function
    this.commandMap[cmdMsg].call(this, params); // use call() because without it, we're losing our "this" reference (going from Spaceship to Object)
};

Spaceship.prototype.draw = function(canvasContext) {
    var myRenderComp = this.components["render"];
    var myPhysicsComp = this.components["physics"];     // Get the physics comp because it has the position of the game obj in world space

    canvasContext.save();    // similar to glPushMatrix

    canvasContext.translate(myPhysicsComp.currPos[0], myPhysicsComp.currPos[1]);
    canvasContext.rotate( glMatrix.toRadian(myPhysicsComp.angle) );                 // Rotate

    myRenderComp.draw(canvasContext);                                               // Draw -- rendercomponent will use my position, so this draw() effectively "translates" the sprite to where it belongs
    canvasContext.restore(); // similar to glPopMatrix

    // Draw an indicator if the ship is protected, because it just respawned
    if (this.ableState == SpaceshipAbleStateEnum.spawning) {
        // draw a circle
        canvasContext.strokeStyle = "yellow";
        canvasContext.lineWidth = 1;
        canvasContext.beginPath();
        canvasContext.arc(this.components["physics"].currPos[0], this.components["physics"].currPos[1], 32, 0, Math.PI * 2);
        canvasContext.stroke(); // have to call stroke() to "commit" the arc to the canvas
        canvasContext.closePath();
    }


    // ----- DEBUGGING stuff
    var myCollisionComp = this.components["collision"];
    var topleft = vec2.clone(myCollisionComp.center);
    vec2.set(topleft, topleft[0] - myCollisionComp.getWidth() / 2, topleft[1] - myCollisionComp.getHeight() / 2);
    myCollisionComp.draw(canvasContext);
    // -----

};

Spaceship.prototype.enableThrust = function() {
    // Set acceleration vector
    var myPhysComp = this.components["physics"];
    vec2.set(myPhysComp.acceleration, Math.cos( glMatrix.toRadian(myPhysComp.angle) ), Math.sin( glMatrix.toRadian(myPhysComp.angle) ));
    // TODO don't hardcode the acceleration vector
    vec2.scale(myPhysComp.acceleration, myPhysComp.acceleration, 210);

    var myThrustPE = this.components["thrustPE"];
    myThrustPE.setEnabled();                       // Enable the emitter

    //console.log("Spaceship thrust");
    //console.log(myPhysComp.acceleration);
};

Spaceship.prototype.disableThrust = function() {
    var myPhysComp = this.components["physics"];
    vec2.set(myPhysComp.acceleration, 0.0, 0.0);    // Set the acceleration vector for the physics component

    var myThrustPE = this.components["thrustPE"];
    myThrustPE.setDisabled();                       // Disable the emitter

    //console.log("Spaceship thrust");
    //console.log(myPhysComp.acceleration);
};

Spaceship.prototype.enableTurnLeft = function() {
    var myPhysComp = this.components["physics"];

    myPhysComp.angularVel = -210;
};

Spaceship.prototype.enableTurnRight = function() {
    var myPhysComp = this.components["physics"];

    myPhysComp.angularVel = 210;
};

Spaceship.prototype.disableTurn = function() {
    var myPhysComp = this.components["physics"];

    myPhysComp.angularVel = 0;
};

Spaceship.prototype.enableFireA = function() {
    this.fireAState = true;

    var myGunPE = this.components["gunPE"];
    myGunPE.setEnabled();                       // Enable the emitter
};

Spaceship.prototype.disableFireA = function() {
    this.fireAState = false;

    var myGunPE = this.components["gunPE"];
    myGunPE.setDisabled();                       // Disable the emitter
};


Spaceship.prototype.initializeAI = function(knowledgeObj) {
    // Initialize state machine
    this.components["ai"].initialize(this, knowledgeObj);
};


// TODO possibly move "start reaction delay" into an AI class
Spaceship.prototype.startReflexDelay = function() {
    this.aiConfig.aiReflex.delayInterval = Math.random() * (this.aiConfig.aiReflex.delayRange.max - this.aiConfig.aiReflex.delayRange.min) + this.aiConfig.aiReflex.delayRange.min;
    this.aiConfig.aiReflex.currTimestamp = performance.now();
    this.aiConfig.aiReflex.prevTimestamp = this.aiConfig.aiReflex.currTimestamp;
    this.aiConfig.aiReflex.reflexState = 1;     // actively pausing to simulate reflex delay
};

Spaceship.prototype.updateReflex = function() {
    this.aiConfig.aiReflex.currTimestamp = performance.now();
    if ((this.aiConfig.aiReflex.currTimestamp - this.aiConfig.aiReflex.prevTimestamp) > this.aiConfig.aiReflex.delayInterval) {
        this.aiConfig.aiReflex.reflexState = 2; // reflex delay time has elapsed
    }
};

Spaceship.prototype.finishReflexDelay = function() {
    this.aiConfig.aiReflex.reflexState = 0; // reflex state goes back to 0, which means "not started"
};

Spaceship.prototype.resetAI = function() {
    // potential optimization: instead of assigning a new array here, pop all elements, instead of "Default"
    this.components["ai"].reset();
};

Spaceship.prototype.resetSpawnClock = function() {
    this.spawnClock = this.spawnGracePd_s;
};


// ============================================================================
// "New-style" AI functions
// The following functions implement an AI state machine, but remove the overhead of a
// node/graph-based machine. There will be "actions", which are functions that represent
// states. The current state/action will be maintained in a var (a queue..
// maybe even a priority-based queue, so we can interrupt the current state/action with a 
// more important one (ooh yeahh, I like that).
// The queue will contain a reference to the action function to execute. Each
// action/state will handle its own transitions. Yeah. I like this
// ============================================================================

// TODO eventually break the SpaceshipAI object to its own file?
function SpaceshipAI() {
    GameObject.call(this);

    this.parentObj = null;  // The spaceship that has this AI obj
    this.knowledge = null;  // The rest of the "knowledge" (i.e. the gameLogic object)
    this.defaultState = null;

    // a JS array object, to be used as a queue of actions (FIFO)
    // In JS, enqueue with push() (i.e. add to tail); remove with shift() (i.e. pop from head)
    // each "action" will actually be a reference to a function to execute

    // This queue is a basic JS "queue". (it's an array object)
    // For a fancier, more heavily-engineered queue idea, see the MessageQueue
    this.actionQueue = [];

    // And now, the actions/behaviors.
    // Each aiState is a simple JS object, with a priority level and a function to call
    // Priority 0 is the highest/most important priority level.
    // The functions are members of this SpaceshipAI class -- each aiState obj will
    // store a reference to the function

    this.aiStateDelayNextAction = { "priority": 0, "function": this.aiBehaviorDelayNextAction };

    // TODO write these functions, too
    this.aiStateAlignToReduceVelocity = { "priority": 1, "function": this.aiBehaviorAlignToReduceVelocity };
    this.aiStateThrustToReduceVelocity = { "priority": 1, "function": this.aiBehaviorThrustToReduceVelocity };

    this.aiStateAlignToEvadeThreat = { "priority": 2, "function": this.aiBehaviorAlignToEvadeThreat }; // TODO: write this function.. Same as AlignToTarget, but will use a different vector
    this.aiStateThrustToEvadeThreat = { "priority": 2, "function": this.aiBehaviorThrustToEvadeThreat };  // TODO write this function.. essentially the same as ThrustToTarget, but with different transitions

    this.aiStateSelectTarget = { "priority": 3, "function": this.aiBehaviorSelectTarget };
    this.aiStateAlignToTarget = { "priority": 3, "function": this.aiBehaviorAlignToTarget };
    this.aiStateThrustToTarget = { "priority": 3, "function": this.aiBehaviorThrustToTarget };
    this.aiStateAttackTarget = { "priority": 3, "function": this.aiBehaviorAttackTarget };

}

SpaceshipAI.prototype = Object.create(GameObject.prototype);
SpaceshipAI.prototype.constructor = SpaceshipAI;

SpaceshipAI.prototype.initialize = function(parentObj, knowledge) {
    // Set default state (a reference to the function itself, which is defined on the prototype)
    console.log("Initializing AI. actionQueue: ", Object.assign({}, this.actionQueue));  // Make a copy of the queue because, by default, console.log() will echo a reference to the object, which is mutable (yuck!!! but we're debugging)
    this.defaultState = this.aiStateSelectTarget;
    this.parentObj = parentObj;
    this.knowledge = knowledge;
};

SpaceshipAI.prototype.reset = function() {
    this.parentObj.aiConfig["target"] = null;
    this.actionQueue = [];
};

SpaceshipAI.prototype.update = function(dt_s, config = null) {
    // Call action function on the spaceship that is this AI's parent object

    // Update any info needed for computations that will be done as part af AI
    // e.g., update the ship's knowledge of its vector to target, etc.
    this.updateDecisionLogic();

    if (this.actionQueue.length == 0) {
        this.enqueue(this.defaultState);
    }

    this.actionQueue[0]["function"].call(this);
};


// deqeueue current state/action/behavior and enqueue the given one
// (the given state is a reference to the function to execute)
SpaceshipAI.prototype.dequeueCurrentEnqueueNew = function(behavior) {
    // Note - we can build on this design if we want
    // Have transitions enqueue a fromState_Exit() and toState_Enter() action.. all that
    // We can even update the queue to be a priority queue, and have some actions preempt others, or whatever.
    this.dequeue();
    this.enqueue(behavior);
    // NOTE: a behavior is an object with a "priority" property and a "function" reference
    // The function actually executes the behavior
};

SpaceshipAI.prototype.dequeue = function() {
    // dequeue the current state, but do not enqueue anything
    // Useful for, e.g., simulating delay, due to reflexes. A preceding state can enqueue 2
    // actions: pause, and then do some behavior
    // The pause state can be dequeued, leaving whatever the 2nd action was as the active
    // state.
    var behavior = this.actionQueue.shift();           // dequeue the current state/action/behavior
    console.log("Dequeueing behavior: ", behavior);
    console.log("actionQueue: ", Object.assign({}, this.actionQueue));

};

SpaceshipAI.prototype.enqueue = function(behavior) {
    // Enqueue, with priority
    // i.e., insert the incoming behavior as the last item of whatever priority level it's at

    if (this.actionQueue.length == 0) {
        // if the actionQueue is empty, simply push() the behavior onto the end
        console.log("Inserting behavior at tail of queue: ", behavior);
        this.actionQueue.push(behavior);
        console.log("actionQueue: ", Object.assign({}, this.actionQueue));
    } else if (behavior.priority < this.actionQueue[0].priority) {
        // Peek at the first item in the queue. If its priority level is higher than the incoming
        // behavior's, then we can simply insert the incoming behavior at the head of the queue
        console.log("Inserting behavior at head of queue: ", behavior);
        this.actionQueue.unshift(behavior); // unshift() inserts one or more items at the front of an array
        console.log("actionQueue: ", Object.assign({}, this.actionQueue));
    } else {
        // otherwise, we have to find a place to put the incoming behavior
        // (linear search.. can we do better?)
        for (var i = 1; i < this.actionQueue.length; i++) {
            if (this.actionQueue[i].priority > behavior.priority) {
                // If we're here, then we've reached an item in the queue with a higher priority
                // number (which actually means a less-important priority level)
                // In that case, mark where we are, and insert the incoming behavior _before_
                // that item
                break;
            }
        }
        // splice() will insert an item before the item at index #i
        // (the 0 in the 2nd parameter means "delete 0 items")
        // if the for loop (linear search) above didn't find a hit, then i will be the end of
        // the array. in that case, the splice() will be equivalent to push()
        console.log("Inserting behavior at element " + i + ": ", behavior);
        this.actionQueue.splice(i, 0, behavior);
        console.log("actionQueue: ", Object.assign({}, this.actionQueue));
    }
};


// This state is essentially the AI's "thinking" step
// i.e., it has "knowledge" (maybe the "knowledge" var should be called "awareness". The ship
// is "aware" of things around it. The updateDecisionLogic function is responsible for "thinking" --
// processing objects it's aware of, and updating vars that represent the AI's understanding
// of the situation
// Note as of right now (2018-05-03 08:08), the spaceship has an aiConfig object.. But.... maybe that should be in this object
// TODO: move the Spaceship.aiConfig into the SpaceshipAI class?
SpaceshipAI.prototype.updateDecisionLogic = function() {
    var parentShip = this.parentObj;

    // update current velocity (approximate... because of Verlet stuff)
    vec2.sub(parentShip.aiConfig["currVel"], parentShip.components["physics"].currPos, parentShip.components["physics"].prevPos);
    vec2.normalize(parentShip.aiConfig["currVelDir"], parentShip.aiConfig["currVel"]);

    if (parentShip.aiConfig["target"]) {
        // NOTE: at this point, we've only established that the target object exists. But we have
        // NOT established that the target is a valid target for pursuing/attacking. Keep reading..
        var target = parentShip.aiConfig["target"];

        // Determine whether we still have a target or not.
        // Asteroids have an "alive" property (because they derive from particles, which have "alive")
        // Spaceships do not have the "alive" property. They have an ableState
        var stillHaveTarget = (target.hasOwnProperty("alive") && target.alive) ||
                              (target.hasOwnProperty("ableState") && target.ableState != SpaceshipAbleStateEnum.disabled);

        // If we still have a target, do certain stuff
        if (stillHaveTarget) {
            // Update vector from ship's current position to target's current position
            vec2.sub(parentShip.aiConfig["vecToTargetPos"], target.components["physics"].currPos, parentShip.components["physics"].currPos);
            vec2.normalize(parentShip.aiConfig["vecToTargetPos"], parentShip.aiConfig["vecToTargetPos"]);

            // Update Squared dist to target
            parentShip.aiConfig["aiPrevSqrDistToTarget"] = parentShip.aiConfig["aiSqrDistToTarget"];
            parentShip.aiConfig["aiSqrDistToTarget"] = vec2.sqrDist(parentShip.components["physics"].currPos, target.components["physics"].currPos);
        }
        else {
            // If we no longer have a target, then remove it from the ship's knowledge
            // This will cause a state transition to select a new target
            parentShip.aiConfig["target"] = null;
        }
    }

    // Update the velocity correction dir vector. For now, we'll naively just choose the
    // inverse of the ship's heading. 
    if (this.actionQueue[0] && this.actionQueue[0].priority > this.aiStateThrustToReduceVelocity.priority) {
        // When the current behavior's priority is NOT the same as the align/thrust to reduce
        // velocity actions, we are in some state
        // not related to correcting velocity. In those cases, we want to update aiVelCorrectDir.
        // But if we're in one of those states (align-to-vel-correction-dir or
        // thrust-to-reduce-vel, we don't want to update; we want that value to stay what it is
        // Maybe there's a better way to do this.. (e.g. use a descriptive enum. But for now, we
        // have what we have.
        var normalizedVel = vec2.create();
        vec2.normalize(normalizedVel, parentShip.aiConfig["currVel"]);
        vec2.scale(parentShip.aiConfig["aiVelCorrectDir"], normalizedVel, -1);
    }


    // Now that all stats/metrics are computed, store super-quick true/false decision variables
    // TODO consider pre-computing 180.0 / Math.PI and storing it in MathUtils
    parentShip.aiConfig["decisionLogic"].alignedToTargetVector = parentShip.aiConfig["target"] != null &&
                                                                 this.isVectorAligned(parentShip.components["physics"].angleVec, parentShip.aiConfig["vecToTargetPos"], parentShip.aiConfig["aiAlignHeadingThreshold"]);

    parentShip.aiConfig["decisionLogic"].movingGenerallyTowardsTarget = parentShip.aiConfig["target"] != null &&
                                                                        this.isVectorAligned(parentShip.aiConfig["currVelDir"], parentShip.aiConfig["vecToTargetPos"], parentShip.aiConfig["aiAlignVelocityPursueThreshold"]);

    parentShip.aiConfig["decisionLogic"].distToTargetIncreasing = parentShip.aiConfig["target"] != null &&
                                                                  (parentShip.aiConfig["aiSqrDistToTarget"] > parentShip.aiConfig["aiPrevSqrDistToTarget"]);

    parentShip.aiConfig["decisionLogic"].currVelAlignedToDesiredVel = this.isVectorAligned(parentShip.components["physics"].angleVec, parentShip.aiConfig["vecToTargetPos"], parentShip.aiConfig["aiAlignVelocityPursueThreshold"]);

    parentShip.aiConfig["decisionLogic"].alignedToEvadeVector = false;  // TODO compute
    parentShip.aiConfig["decisionLogic"].alignedToVelCorrectVector = this.isVectorAligned(parentShip.components["physics"].angleVec, parentShip.aiConfig["aiVelCorrectDir"], parentShip.aiConfig["aiAlignVelocityCorrectThreshold"]);
    parentShip.aiConfig["decisionLogic"].exceedingSpeedLimit = vec2.len(parentShip.aiConfig["currVel"]) / game.fixed_dt_s > parentShip.aiConfig["aiMaxLinearVel"];
    parentShip.aiConfig["decisionLogic"].withinAttackRange = parentShip.aiConfig["aiSqrDistToTarget"] <= parentShip.aiConfig["aiSqrAttackDist"];
    parentShip.aiConfig["withinEvadeRange"] = false;    // TODO compute

};

SpaceshipAI.prototype.aiBehaviorSelectTarget = function() {
    // NOTE: in the original state machine-based AI, the knowledge obj was a dict/Object, with property "parentObj" == the spaceship, and property "knowledge" = the gameLogic obj. In this function, parentObj is the "this" reference
    var parentShip = this.parentObj;

    // Find the nearest target
    if (parentShip.aiConfig["aiProfile"] == "miner") {
        // find nearest object - prefer asteroids, but attack a ship if it's closer than the nearest asteroid
        // TODO possibly wrap the target selection loops inside functions. We're duplicating code here
        var astMgr = this.knowledge.gameObjs["astMgr"];

        var minSqrDistAst = Number.MAX_SAFE_INTEGER;
        var potentialAstTarget = null;
        for (var asteroid of astMgr.asteroids) {
            // Blah, why did I make the asteroids a subclass of particles?
            if (asteroid.alive) {
                var sqDistAst = vec2.sqrDist(parentShip.components["physics"].currPos, asteroid.components["physics"].currPos);
                if (sqDistAst < minSqrDistAst) {
                    minSqrDistAst = sqDistAst;
                    potentialAstTarget = asteroid;
                }
            }
        }

        var minSqrDistShip = Number.MAX_SAFE_INTEGER;
        var potentialShipTarget = null;
        for (var shipDictIDKey in this.knowledge.shipDict) {
            // Iterate over ships that aren't my ship ("I" am an AI, not a ship)
            if (parentShip.objectID != shipDictIDKey) {
                var gameObjIDName = this.knowledge.shipDict[shipDictIDKey];
                var shipRef = this.knowledge.gameObjs[gameObjIDName];

                // TODO - add some kind of after-death delay so we don't target a ship that just respawned
                sqDistShip = vec2.sqrDist(parentShip.components["physics"].currPos, shipRef.components["physics"].currPos);
                if (sqDistShip < minSqrDistShip) {
                    minSqrDistShip = sqDistShip;
                    potentialShipTarget = shipRef;
                }
            }
        }
        
        // Target the nearest asteroid, unless a ship is closer
        parentShip.aiConfig["target"] = sqDistAst <= sqDistShip ? potentialAstTarget : potentialShipTarget;

    } else if (parentShip.aiConfig["aiProfile"] == "hunter") {
        // find nearest ship and go after it. Only prefer an asteroid if there are no ships within the hunt radius
        var minSqrDistShip = Number.MAX_SAFE_INTEGER;

        var sqDistShip = 0;
        var potentialShipTarget = null;
        for (var shipDictIDKey in this.knowledge.shipDict) {
            // Iterate over ships that aren't my ship ("I" am an AI, not a ship)
            if (parentShip.objectID != shipDictIDKey) {
                var gameObjIDName = this.knowledge.shipDict[shipDictIDKey];
                var shipRef = this.knowledge.gameObjs[gameObjIDName];

                // TODO - add some kind of after-death delay so we don't target a ship that just respawned
                sqDistShip = vec2.sqrDist(parentShip.components["physics"].currPos, shipRef.components["physics"].currPos);
                if (sqDistShip < minSqrDistShip) {
                    minSqrDistShip = sqDistShip;
                    potentialShipTarget = shipRef;
                }
            }
        }
        // Target the nearest ship
        parentShip.aiConfig["target"] =  potentialShipTarget;

        // If the nearest ship is outside the hunt radius, then go for asteroids
        if (minSqrDistShip >= Math.pow(parentShip.aiConfig["aiHuntRadius"], 2)) {
            var astMgr = this.knowledge.gameObjs["astMgr"];

            var minSqrDistAst = Number.MAX_SAFE_INTEGER;
            var sqDistAst = 0;
            var potentialAstTarget = null;
            for (var asteroid of astMgr.asteroids) {
                // Blah, why did I make the asteroids a subclass of particles?
                if (asteroid.alive) {
                    sqDistAst = vec2.sqrDist(parentShip.components["physics"].currPos, asteroid.components["physics"].currPos);
                    if (sqDistAst < minSqrDistAst) {
                        minSqrDistAst = sqDistAst;
                        potentialAstTarget = asteroid;
                    }
                }
            }
            // If we're here, we want to target the nearest asteroid, even though we're a "hunter"
            parentShip.aiConfig["target"] =  potentialAstTarget;
        }
    }

    // TODO add in level 0 (alarm -- velocity correction) and level 1 (evade actions -- see ai_take_07 diagram)
    // Transitions (level 2 - normal AI)
    if (parentShip.aiConfig["target"]) {
        if (parentShip.aiConfig["decisionLogic"].alignedToTargetVector) {
            if (parentShip.aiConfig["decisionLogic"].withinAttackRange) {
                // ship has target and is aligned to target and is within attack range -> attack
                this.dequeueCurrentEnqueueNew(this.aiStateDelayNextAction);
                this.enqueue(this.aiStateAttackTarget);
            }
            else {
                // ship has target and is aligned to target and is NOT within attack range -> thrust to target
                this.dequeueCurrentEnqueueNew(this.aiStateDelayNextAction);
                this.enqueue(this.aiStateThrustToTarget);
            }
        }
        else {
            // ship has target and is not aligned to target -> align to target
            this.dequeueCurrentEnqueueNew(this.aiStateDelayNextAction);
            this.enqueue(this.aiStateAlignToTarget);
        }
    }
};


// Return true if the the angle between vecA and vecB is within the tolerance
// tolerance is a half-angle, in degrees
// i.e., if tolerance is 5, then it's actual +/- 5 degrees; a 10 degree window
SpaceshipAI.prototype.isVectorAligned = function(vecA, vecB, tolerance) {
    // angleBetween returns radians -- convert that to degrees
    var angBtwn = MathUtils.angleBetween(vecA, vecB) * (180.0 / Math.PI);
    return (Math.abs(angBtwn) <= Math.abs(tolerance))
};


// posA and posB are glMatrix vec2d objects
SpaceshipAI.prototype.isWithinRange = function(posA, posB, sqDistThreshold) {
    return vec2.sqrDist(posA, posB) <= sqDistThreshold;
};


//SpaceshipAI.prototype.isTargetAcquired = function() {
//    return 
//};


// Align to target (target info is stored within the ship/AI object
SpaceshipAI.prototype.aiBehaviorAlignToTarget = function() {
    var parentShip = this.parentObj;
    // TODO (in this and other AI behavior functions) - pre-empt with level 1 and level 0 actions. 
    // First, check for any pre-empting conditions (i.e, manually test whether to switch to a
    // higher-priority/alarm behavior

    var target = parentShip.aiConfig["target"];

    if (target) {
        // Compute the angle between the ship's heading and the vector from ship pos to target pos
        // Both vectors are already normalized. angleBetween returns radians, but our AI thresholds are in degrees, so we convert
        var angBtwn = MathUtils.angleBetween(parentShip.components["physics"].angleVec, parentShip.aiConfig["vecToTargetPos"]) * 180.0 / Math.PI;

        // Adjust turn/heading
        if (angBtwn > parentShip.aiConfig["aiAlignHeadingThreshold"]) {
            // In the HTML5 Canvas coordinate system, a + rotation is to the right (as opposed to school/paper where pos rotation is to the left (i.e. from +x towards +y, which goes from facing right to facing up)
            // It might be worth (at some point? if I feel like it?) renaming enableTurnRight/Left to enableTurnPos/Neg
            parentShip.enableTurnRight();
        } else if (angBtwn < -parentShip.aiConfig["aiAlignHeadingThreshold"]) {
            parentShip.enableTurnLeft();
        } else {
            // NOTE: if you're here, you're aligned to target, ready to transition out of the state
            parentShip.disableTurn();

            // Note that we don't set aiConfig["decisionLogic"].alignedToTargetVector here, but
            // that var is constantly being updated in updateDecisionLogic()

            // transitions out of this state
            if (parentShip.aiConfig["decisionLogic"].withinAttackRange) {
                // have target and aligned to target and within attack range -> attack target
                this.dequeueCurrentEnqueueNew(this.aiStateDelayNextAction);
                this.enqueue(this.aiStateAttackTarget);
            }
            else {
                // have target and aligned to target an not within attack range -> thrust to target
                this.dequeueCurrentEnqueueNew(this.aiStateDelayNextAction);
                this.enqueue(this.aiStateThrustToTarget);
            }
        }
    } else {
        // if the ship doesn't have an enemy/target selected, then select one
        this.dequeueCurrentEnqueueNew(this.aiStateDelayNextAction);
        this.enqueue(this.aiStateSelectTarget);
    }
};

// Thrust to target
SpaceshipAI.prototype.aiBehaviorThrustToTarget = function() {
    var parentShip = this.parentObj;

    // Test whether we're at max speed and need to correct velocity
    if ( (parentShip.aiConfig["decisionLogic"].exceedingSpeedLimit == true && parentShip.aiConfig["decisionLogic"].movingGenerallyTowardsTarget == false) ||
         parentShip.distToTargetIncreasing ) {

        // If the ship is thrusting, stop the thrust
        parentShip.disableThrust();

        // Enqueue delay -- it's a highest-priority task, so it always goes to the head of the queue
        //this.dequeueCurrentEnqueueNew(this.aiStateDelayNextAction);   // TODO reinstate when ready
        this.enqueue(this.aiStateAlignToReduceVelocity);
        return;     // Exit early because we've been pre-empted
    }

    // The thrust state can either engage or disengage thrust. 
    // Thrust is disengaged if the ship has reached its speed limit, but the AI will stay in this
    // state until something causes a transition out to another state/behavior
    var shipPhysComp = parentShip.components["physics"];
    var target = parentShip.aiConfig["target"];

    // Do state/behavior update
    if (target) {
        // TODO maybe do the division by game.fixed_dt_s in updateDecisionLogic (where currVel is updated)
        //if (vec2.len(parentShip.aiConfig["currVel"]) / game.fixed_dt_s <= parentShip.aiConfig["aiMaxLinearVel"]) {    // TODO delete this line?
        if (parentShip.aiConfig["decisionLogic"].exceedingSpeedLimit == false) {
            parentShip.enableThrust();
        } else {
            // If ship heading is within an acceptable offset from shipToTarget, then disableThrust and just drift
            // Otherwise, work to reduce the velocity component that is doing more to take the ship away from its desired heading, and then get back to AlignToTarget (which will re-align the ship for thrusting)
            parentShip.disableThrust();
        }

        // Transitions
        if (parentShip.aiConfig["decisionLogic"].alignedToTargetVector) {
            if (parentShip.aiConfig["decisionLogic"].withinAttackRange) {
                // have target and aligned to target and within attack range -> attack target
                parentShip.disableThrust();
                this.dequeueCurrentEnqueueNew(this.aiStateDelayNextAction);
                this.enqueue(this.aiStateAttackTarget);
            }

            // If the above condition isn't true, then we probably:
            // have target and aligned to target and not within attack range -> i.e., stay in this state

        }
        else {
            // have target and not aligned to target -> align to target
            parentShip.disableThrust();
            this.dequeueCurrentEnqueueNew(this.aiStateDelayNextAction);
            this.enqueue(this.aiStateAlignToTarget);
        }
    }
    else {
        // if the ship doesn't have an enemy/target selected, then select one
        parentShip.disableThrust();
        this.dequeueCurrentEnqueueNew(this.aiStateDelayNextAction);
        this.enqueue(this.aiStateSelectTarget);
    }

};

// Attack a target (fire weapon)
SpaceshipAI.prototype.aiBehaviorAttackTarget = function() {
    var parentShip = this.parentObj;

    var target = parentShip.aiConfig["target"];
    if (target) {

        // Allow the spaceship to fire only if it is "enabled" (i.e. not currently in the spawning/recovery state)
        if (parentShip.ableState == SpaceshipAbleStateEnum.enabled) {
            parentShip.enableFireA();   // TODO add secondary weapons?
        }

        // Transitions
        if (parentShip.aiConfig["decisionLogic"].alignedToTargetVector) {
            if (parentShip.aiConfig["withinAttackRange"] == false) {
                // has target and is aligned to target and is out of attack range -> thrust to target
                parentShip.disableFireA();
                this.dequeueCurrentEnqueueNew(this.aiStateDelayNextAction);
                this.enqueue(this.aiStateThrustToTarget);
            }
        }
        else {
            // has target and is not aligned to target -> align to target
            parentShip.disableFireA();
            this.dequeueCurrentEnqueueNew(this.aiStateDelayNextAction);
            this.enqueue(this.aiStateAlignToTarget);
        }
    }
    else {
        // target lost -> select a new one
        parentShip.disableFireA();
        this.dequeueCurrentEnqueueNew(this.aiStateDelayNextAction);
        this.enqueue(this.aiStateSelectTarget);
    }
};


SpaceshipAI.prototype.aiBehaviorDelayNextAction = function() {
    var parentShip = this.parentObj;

    // Note: when exiting this state, we do a simple dequeue. This state assumes it was enqueued
    // along with the state it is delaying, so dequeueing will leave the next state as active

    // TODO move reflex delay (among other things) from the Spaceship class to the SpaceshipAI class
    switch(parentShip.aiConfig["aiReflex"].reflexState) {
        case ReflexDelayStateEnum.notstarted:
            parentShip.aiConfig.aiReflex.delayInterval = Math.random() * (parentShip.aiConfig.aiReflex.delayRange.max - parentShip.aiConfig.aiReflex.delayRange.min) + parentShip.aiConfig.aiReflex.delayRange.min;
            parentShip.aiConfig.aiReflex.currTimestamp = performance.now();
            parentShip.aiConfig.aiReflex.prevTimestamp = parentShip.aiConfig.aiReflex.currTimestamp;
            parentShip.aiConfig.aiReflex.reflexState = ReflexDelayStateEnum.active;     // actively pausing to simulate reflex delay
            break;

        case ReflexDelayStateEnum.active:
            parentShip.aiConfig.aiReflex.currTimestamp = performance.now();
            if ((parentShip.aiConfig.aiReflex.currTimestamp - parentShip.aiConfig.aiReflex.prevTimestamp) > parentShip.aiConfig.aiReflex.delayInterval) {
                parentShip.aiConfig.aiReflex.reflexState = ReflexDelayStateEnum.completed; // reflex delay time has elapsed
            }
            break;

        case ReflexDelayStateEnum.completed:
            // Simple dequeue. We assume that the state being delayed is next in the queue, so we
            // don't need to enqueue any following states
            this.dequeue(); 
            break;
    }
};


// This state is essentially the same as aiBehaviorAlignToTarget, but instead of aligning
// heading to face towards a target, it aligns heading to a vector that will reduce velocity when
// thrust is applied
SpaceshipAI.prototype.aiBehaviorAlignToReduceVelocity = function() {
    var parentShip = this.parentObj;
    
    // Note: this state/behavior is a higher-level behavior than the "normal' select/pursue/attack target states
    var angBtwn = MathUtils.angleBetween(parentShip.components["physics"].angleVec, parentShip.aiConfig["aiVelCorrectDir"]) * 180.0 / Math.PI;

    // Adjust turn/heading
    if (angBtwn > parentShip.aiConfig["aiAlignVelocityCorrectThreshold"]) {
        // In the HTML5 Canvas coordinate system, a + rotation is to the right (as opposed to school/paper where pos rotation is to the left (i.e. from +x towards +y, which goes from facing right to facing up)
        // It might be worth (at some point? if I feel like it?) renaming enableTurnRight/Left to enableTurnPos/Neg
        parentShip.enableTurnRight();
    } else if (angBtwn < -parentShip.aiConfig["aiAlignVelocityCorrectThreshold"]) {
        parentShip.enableTurnLeft();
    } else {
        // NOTE: if you're here, you're aligned to target, ready to transition out of the state
        parentShip.disableTurn();

        // Transitions out of this state (there's really only 1 - thrust)
        // TODO -- remove this condition? If you're in this state, the vel vector must be aligned "enough" with the desired vel
        if (parentShip.aiConfig["decisionLogic"].alignedToVelCorrectVector) {
            this.dequeueCurrentEnqueueNew(this.aiStateDelayNextAction);
            this.enqueue(this.aiStateThrustToReduceVelocity);
        }
    }
};


SpaceshipAI.prototype.aiBehaviorThrustToReduceVelocity = function() {
    // Unlike the thrust-towards-target behavior (which will thrust up to a maximum speed), the
    // goal of the thrust-to-reduce-velocity behavior is to reduce speed to _below_ a certain
    // threshold

    // aiBehaviorThrustToReduceVelocity assumes that the direction we're going to thrust in has
    // already been set, and it won't change until we exit this behavior (and that the direction
    // is correct, so that we can freely thrust in that direction to reduce our overall speed)

    // NOTE! This state does not have any transitions. It is an "alarm behavior" (i.e. it will
    // pre-empt any behavior, but not specifically transition back to any particular behavior),
    // so we simply dequeue it and resume from whatever state was active before the pre-emption.

    var parentShip = this.parentObj;
    if (vec2.len(parentShip.aiConfig["currVel"]) / game.fixed_dt_s >= parentShip.aiConfig["aiMinVelCorrectThreshold"]) {
        parentShip.enableThrust();
    } else {
        // If ship heading is within an acceptable offset from shipToTarget, then disableThrust and just drift
        // Otherwise, work to reduce the velocity component that is doing more to take the ship away from its desired heading, and then get back to AlignToTarget (which will re-align the ship for thrusting)
        parentShip.disableThrust();
        this.dequeue();
    }
};
