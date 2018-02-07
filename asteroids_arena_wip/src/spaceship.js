var SpaceshipAbleStateEnum = { "disabled": 0,
                               "enabled": 1,
                               "spawning": 2
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
    this.addComponent("ai", new FSM());

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
    this.ableState = SpaceshipAbleStateEnum.enabled;

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

    if(configObj.hasOwnProperty("isAI") && true == configObj["isAI"]) {
        this.aiControlled = true;

        this.aiConfig["aiBehavior"] = ["Default"];      // Use an array of behaviors as a stack (used for implementing "humanizing" reflex delay)
        this.aiConfig["aiProfile"] = "miner";           // TODO at some point, stop hardcoding this
        this.aiConfig["aiMaxLinearVel"] = 50;           // TODO tune this
        this.aiConfig["aiVelCorrectThreshold"] = 10;
        this.aiConfig["aiSqrAttackDist"] = 100 ** 2;     // Squared distance within which a ship will attack a target
        this.aiConfig["aiFireHalfAngle"] = 3;           // degrees
        this.aiConfig["aiVelCorrectDir"] = vec2.create();
        this.aiConfig["aiAlignHeadingThreshold"] = 10;     // Align-heading-towards-target threshold; a half-angle, in degrees
        this.aiConfig["aiAlignVelocityPursueThreshold"] = 45;     // Align-velocity-to-desired-direction threshold; a half-angle, in degrees
        this.aiConfig["aiAlignVelocityDriftThreshold"] = 60;     // Align-velocity-to-desired-direction threshold; a half-angle, in degrees
        this.aiConfig["aiAlignVelocityCorrectThreshold"] = 5;     // Align-velocity-to-desired-direction threshold; a half-angle, in degrees
        this.aiConfig["target"] = null;
        this.aiConfig["aiReflex"] = { "delayRange": {"min": 150, "max": 250},
                                      "delayInterval": 0,
                                      "currTimestamp": 0,
                                      "prevTimestamp": 0,
                                      "reflexState": 0
                                    };
        // ^ delay range given in milliseconds because the DOMHighResTimeStamp object returned by performance.now() is in ms
        // isReacting is a behavior lock - if the ship is reacting (e.g. changing behavior states), then we don't process behaviors
        // reflexState can be:  0 = not started, 1 = active, 2 = finished/time has elapsed

        this.initializeAI(configObj["knowledge"]);
    }
};

// Override the default update()
Spaceship.prototype.update = function(dt_s, config = null) {

    if (this.aiControlled) {
        // TODO compute nearest threat (use the quadtree to prune calculations)
        // The quadtree is owned by the gameLogic object, which is also the parent obj of all spaceships
        // NOTE: it would be safer to verify that the gameLogic object has a collisionMgr, but whatever, we know it does..
        var qt = this.parentObj.collisionMgr.quadTree;

        var nearObjs = [];
        // Clear the near objs list
        qt.retrieve(nearObjs, this.components["collision"]);

        var minDist = Number.MAX_SAFE_INTEGER;
        for (var nearObj of nearObjs) {
            var sqrDist = 0; // TODO standardize a way to get distance to an object -- maybe use closest point or some other math
            // TODO 2018-01-11 - pick up from here
        }
    }

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

}

// Override the class default executeCommand()
Spaceship.prototype.executeCommand = function(cmdMsg, params) {
    //console.log("Spaceship executing command");
    //console.log(cmdMsg);

    // Call function
    this.commandMap[cmdMsg].call(this, params); // use call() because without it, we're losing our "this" reference (going from Spaceship to Object)
}

Spaceship.prototype.draw = function(canvasContext) {
    var myRenderComp = this.components["render"];
    var myPhysicsComp = this.components["physics"];     // Get the physics comp because it has the position of the game obj in world space

    canvasContext.save();    // similar to glPushMatrix

    canvasContext.translate(myPhysicsComp.currPos[0], myPhysicsComp.currPos[1]);
    canvasContext.rotate( glMatrix.toRadian(myPhysicsComp.angle) );                 // Rotate

    myRenderComp.draw(canvasContext);                                               // Draw -- rendercomponent will use my position, so this draw() effectively "translates" the sprite to where it belongs
    canvasContext.restore(); // similar to glPopMatrix

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
    var aiFsm = this.components["ai"];
    aiFsm.initialize(knowledgeObj); // the input to the AI is the entire game logic object)

    // NOTE: It's probably not the best idea to pass the entire game logic object into this ship's
    // AI FSM, but it's the quickest/easiest way, given the implementation details of this game.

    // TODO move ship state machine into its own file
    // Note/question: In JS, if I (1) create an object (say, newObj)while inside a function, then (2) assign that object to container object (so, e.g. containerObj["someLabel"] = newObj; -- does newObj still exist after the function exits?
    // In C/C++, the answer would depend on how I created newObj -- if i just statically declared newObj, it would be gone; I'd have to new/malloc the obj, to have a pointer to it in heap space.
    // But in JS (I tested this in Firefox developer console) - the objects stick around. JS must already be doing some kind of heap allocation (which I guess makes sense, for a garbage-collected language)
    var aiStateSelectTarget = new FSMState("SelectTarget");
    // TODO maybe give fsm states a reference to the fsm's knowledge. I can imagine the states having a use for knowledge in the enter() and exit() functions
    // TODO while we're at it, we need to decide: should the states and conditions each store their own reference to the machine's knowledge object, or should they not (and the machine passes its reference everywhere it's needed?)
    aiStateSelectTarget.enter = function(knowledge = null) {
        // possibly some logic here, like setting hunter/miner profile
        // NOTE: we're actually overriding a function provided in the FSMState class, which has the same signature. If we don't actually use enter() and exit(), we don't have to implement them.
        //console.log("Enter state SelectTarget");
    };
    aiStateSelectTarget.exit = function(knowledge = null) {
        //console.log("Exit state SelectTarget");
    };
    aiStateSelectTarget.update = function(knowledge, dt_s = null) {
        // NOTE: objRef will be passed in by the FSM. It will be the gameLogic object, so this state will have access to ships, bullets, and asteroids

        // knowledge is passed in by the state machine
        // Find the nearest target
        var parentObj = knowledge["parentObj"];
        if (parentObj.aiConfig["aiProfile"] == "miner") {
            // find nearest asteroid
            var astMgr = knowledge["gameLogic"].gameObjs["astMgr"];
            var minSqrDist = Number.MAX_SAFE_INTEGER;

            for (var asteroid of astMgr.components["asteroidPS"].particles) {
                // Blah, why did I make the asteroids a subclass of particles?
                if (asteroid.alive) {
                    var sqDist = vec2.sqrDist(parentObj.components["physics"].currPos, asteroid.components["physics"].currPos);
                    if (sqDist < minSqrDist) {
                        minSqrDist = sqDist;
                        parentObj.aiConfig["target"] = asteroid;
                    }
                }
            }
        }
    };
    var aiTransSelectToAttack = new FSMTransition("AttackTarget", new FSMConditionReturnTrue()); // No condition; always transition from SelectTarget to AttackTarget
    aiStateSelectTarget.addTransition(aiTransSelectToAttack);


    var aiStatePursueTarget = new FSMState("PursueTarget");
    aiStatePursueTarget.enter = function(knowledge = null) {
        //console.log("Enter state PursueTarget");
    };
    aiStatePursueTarget.exit = function(knowledge = null) {
        var parentShip = knowledge["parentObj"];

        // When we exit the state, we blank out the ship's aiBehavior. This is by design;
        // currently, the AI is designed to have only 1 behavior. We want states to be
        // properly able to set the aiBehavior upon enter or first update. So we clear
        // out the var on exit
        parentShip.aiConfig["aiBehavior"] = ["Default"];
        //console.log("Exit state PursueTarget");
    };
    aiStatePursueTarget.update = function(knowledge, dt_s = game.fixed_dt_s) {
        // Remember: game is a global object
        var parentShip = knowledge["parentObj"];

        // Get a reference to the ship's heading vector
        var shipDir = vec2.clone( parentShip.components["physics"].angleVec ); // NOTE: angleVec is already unit length

        // Compute the ship-to-target vector
        var shipToTarget = vec2.create();
        vec2.sub(shipToTarget, parentShip.aiConfig["target"].components["physics"].currPos, parentShip.components["physics"].currPos);
        vec2.normalize(shipToTarget, shipToTarget);

        // Compute the signed angle between the ship's heading and the shipToTarget vector
        // (the sign indicates whether a + or - rotation about the angle is required to get from shipDir to shipToTarget)
        // NOTE: In HTML5/Canvas space, a + rotation is clockwise on the screen (i.e., to the right)
        var thHeadingTarget = MathUtils.angleBetween(shipDir, shipToTarget);     // radians

        // TODO spruce up AI decision making here, something like the following:
        // - ship should be able to shoot from "far away", even if drifting away from the target, as long as it has a good shot lined up

        var currVel = vec2.create();
        vec2.sub(currVel, parentShip.components["physics"].currPos, parentShip.components["physics"].prevPos);

        var normalizedVel = vec2.create();
        vec2.normalize(normalizedVel, currVel); // store normalized currVel into normalizedVel

        var thVelTarget = MathUtils.angleBetween(normalizedVel, shipToTarget);

        var behaviorIndex = parentShip.aiConfig["aiBehavior"].length - 1;
        console.log("aiBehavior " + parentShip.aiConfig["aiBehavior"][behaviorIndex] + ";\tlist:", parentShip.aiConfig["aiBehavior"]);
        
        switch (parentShip.aiConfig["aiBehavior"][behaviorIndex]) {
            case "Default":
                // aiBehavior constitutes a state machine-within-the-machine, of sorts. It's hard-coded
                // aiBehavior transitions
                parentShip.aiConfig["aiBehavior"].push("AlignToTarget");
                parentShip.aiConfig["aiBehavior"].push("ReflexDelay");
                // NOTE that we push items onto the stack in the OPPOSITE order that we want to process them (Last-in, First-out)
                break;

            case "ReflexDelay":
                if (parentShip.aiConfig["aiReflex"]["reflexState"] == 0) {
                    parentShip.startReflexDelay();
                } else if (parentShip.aiConfig["aiReflex"]["reflexState"] == 1) {
                    parentShip.updateReflex();
                } else if (parentShip.aiConfig["aiReflex"]["reflexState"] == 2) {
                    parentShip.finishReflexDelay();

                    // After finishing the delay, pop() to get the next behavior to execute
                    parentShip.aiConfig["aiBehavior"].pop();
                }
                break;

            case "AlignToTarget":
                // Align Heading to some target
                // This case is for when the ship's velocity is less than the "speed limit". If the
                // ship is already moving fast, then the behavior will be to reduce velocity, which
                // will also involve adjusting heading
                // if currVel u-component is already within an allowable threshold of deviance from the target velocity vector, then thrust freely

                // Adjust turn/heading
                if (thHeadingTarget > glMatrix.toRadian(parentShip.aiConfig["aiAlignHeadingThreshold"])) {
                    // In the HTML5 Canvas coordinate system, a + rotation is to the right
                    // But it might be worth (at some point? if I feel like it?) renaming enableTurnRight/Left to enableTurnPos/Neg
                    parentShip.enableTurnRight();
                } else if (thHeadingTarget < glMatrix.toRadian(-parentShip.aiConfig["aiAlignHeadingThreshold"])) {
                    parentShip.enableTurnLeft();
                } else {
                    parentShip.disableTurn();
                    parentShip.aiConfig["aiBehavior"].pop();
                    parentShip.aiConfig["aiBehavior"].push("ThrustToPursueTarget");
                    parentShip.aiConfig["aiBehavior"].push("ReflexDelay");
                }
                break;

            case "ThrustToPursueTarget":

                // We want to accelerate towards the target. 
                // * if ||vel|| < speed limit, then thrust
                // * if ||vel|| > speed limit, then
                // ** if angleBetween(vel, shipToTarget) <= 20 (degrees), stop thrusting (but keep drifting? - perhaps "drift" can be a state?)
                // ** else work to reduce tangential component? (or, otherwise, do nothing, but continue 
                if (vec2.len(currVel) / game.fixed_dt_s <= parentShip.aiConfig["aiMaxLinearVel"]) {
                    console.log("ThrustToPursueTarget, vel magnitude: " + vec2.len(currVel) / game.fixed_dt_s, "Vec: ", currVel, "align to:", parentShip.aiConfig["aiVelCorrectDir"]);
                    parentShip.enableThrust();
                } else {
                    // If ship heading is within an acceptable offset from shipToTarget, then disableThrust and just drift
                    // Otherwise, work to reduce the velocity component that is doing more to take the ship away from its desired heading, and then get back to AlignToTarget (which will re-align the ship for thrusting)
                    parentShip.disableThrust();

                    if ( Math.abs(thVelTarget) <= glMatrix.toRadian(parentShip.aiConfig["aiAlignVelocityPursueThreshold"]) ) {
                        parentShip.aiConfig["aiBehavior"].pop();
                        parentShip.aiConfig["aiBehavior"].push("Drift");
                        parentShip.aiConfig["aiBehavior"].push("ReflexDelay");
                    } else {
                        parentShip.aiConfig["aiBehavior"].pop();
                        parentShip.aiConfig["aiBehavior"].push("AlignToCorrectVel");
                        parentShip.aiConfig["aiBehavior"].push("ReflexDelay");
                        // Set the direction to align with, to correct velocity
                        vec2.set(parentShip.aiConfig["aiVelCorrectDir"], -normalizedVel[0], -normalizedVel[1]);
                    }
                }
                break;

            case "Drift":
                    // This state is meant to allow the spaceship to "do nothing" if it is already well-aligned with its target
                    if ( Math.abs(thVelTarget) > glMatrix.toRadian(parentShip.aiConfig["aiAlignVelocityDriftThreshold"]) ) {
                        // TODO possibly encapsulate into function. This code is identical to the code in ThrustToPursueTarget
                        parentShip.aiConfig["aiBehavior"].pop();
                        parentShip.aiConfig["aiBehavior"].push("AlignToCorrectVel");
                        parentShip.aiConfig["aiBehavior"].push("ReflexDelay");
                        vec2.set(parentShip.aiConfig["aiVelCorrectDir"], -normalizedVel[0], -normalizedVel[1]);
                    }
                break;
                
            case "AlignToCorrectVel":
                // Line up the ship's heading to reduce velocity in the direction it's going

                var th_Heading_DesiredVel = MathUtils.angleBetween(shipDir, parentShip.aiConfig["aiVelCorrectDir"]);
                if (th_Heading_DesiredVel > glMatrix.toRadian(parentShip.aiConfig["aiAlignVelocityCorrectThreshold"])) {
                    // Determine which direction to turn, to aim
                    // Could ternary here ( condition ? val_if_true : val_if_false ), but for readability, we'll use long form
                    // In the HTML5 Canvas coordinate system, a + rotation is to the right
                    // But it might be worth (at some point? if I feel like it?) renaming enableTurnRight/Left to enableTurnPos/Neg
                    parentShip.enableTurnRight();
                } else if (th_Heading_DesiredVel < glMatrix.toRadian(-parentShip.aiConfig["aiAlignVelocityCorrectThreshold"])) {     // TODO don't hardcode
                    parentShip.enableTurnLeft();
                } else {
                    parentShip.disableTurn();
                    parentShip.aiConfig["aiBehavior"].pop();
                    parentShip.aiConfig["aiBehavior"].push("ThrustToAdjustVelocity");
                    parentShip.aiConfig["aiBehavior"].push("ReflexDelay");
                }
                break;

            case "ThrustToAdjustVelocity":
                if ( vec2.len(currVel) / game.fixed_dt_s > parentShip.aiConfig["aiVelCorrectThreshold"] ) {
                    var th_Heading_DesiredVel = MathUtils.angleBetween(shipDir, parentShip.aiConfig["aiVelCorrectDir"]);

                    if (Math.abs(th_Heading_DesiredVel) <= parentShip.aiConfig["aiAlignVelocityCorrectThreshold"]) {
                        console.log("ThrustToAdjustVelocity, vel magnitude: " + vec2.len(currVel) / game.fixed_dt_s, "Vec: ", currVel, "align to:", parentShip.aiConfig["aiVelCorrectDir"]);
                        parentShip.enableThrust();
                    } else {
                        parentShip.disableThrust();
                        parentShip.aiConfig["aiBehavior"].pop();
                        parentShip.aiConfig["aiBehavior"].push("AlignToCorrectVel");
                        parentShip.aiConfig["aiBehavior"].push("ReflexDelay");
                        vec2.set(parentShip.aiConfig["aiVelCorrectDir"], -normalizedVel[0], -normalizedVel[1]);
                    }
                } else {
                    parentShip.disableThrust();
                    parentShip.aiConfig["aiBehavior"].pop();
                    parentShip.aiConfig["aiBehavior"].push("AlignToTarget");
                    parentShip.aiConfig["aiBehavior"].push("ReflexDelay");
                }
                break;
        }

        // NOTES on behaviors (and maybe some TODOs)
        // - There should be a ReduceComponent pursuit behavior (in the Pursue and also Attack states) that reduces velocity in a given direction.
        //   - The idea is to find a target velocity direction, and then act to reduce velocity in any direction other than that target dir
        //   - (but this probably just means reducing velocity in the direction perpendicular to the target velocity)
        // - There should also be a SlowDown behavior to reduce velocity in the current direction
        //   - performed by turning 180 deg relative to current/desired velocity, and thrusting, to reduce velocity in that direction
    };
    // NOTE: We're presuming that if a target becomes not-alive during pursuit, that means we didn't kill it; something else did
    var aiCondPursueToSelect = new FSMConditionEQ(aiFsm.knowledge, "ref", "parentObj.aiConfig.target.alive", "const", false);   // TODO! Find a way to identify if a spaceship is alive. Using .alive works for particles (asteroids); maybe just add an alive member to the spaceship
    var aiTransPursueToSelect = new FSMTransition("SelectTarget", aiCondPursueToSelect);
    aiStatePursueTarget.addTransition(aiTransPursueToSelect);
    
    var aiCondPursueToAttack = new FSMConditionLTE(aiFsm.knowledge, "calc", ["sqrDist", "parentObj.components.physics.currPos", "parentObj.aiConfig.target.components.physics.currPos"], "const", this.aiConfig["aiSqrAttackDist"]);
    var aiTransPursueToAttack = new FSMTransition("AttackTarget", aiCondPursueToAttack);
    aiStatePursueTarget.addTransition(aiTransPursueToAttack);

    var aiCondPursueToAvoidA;
    // TODO make an avoid state, and nearly finish it, but don't add conditions. Then, deep-copy it, so we have 2 separate states, but with the exact-same-everything (including update()). Then, after deep-copy, assign transitions/conditions, so that one transitions back to PursueTarget, and the other transitions back to AttackTarget. Use the nearest threat computed in the spacehip's update() procedure


    var aiStateAttackTarget = new FSMState("AttackTarget");
    aiStateAttackTarget.enter = function(knowledge = null) {
        //console.log("Enter state AttackTarget");
    };
    aiStateAttackTarget.exit = function(knowledge = null) {
        var parentShip = knowledge["parentObj"];
        parentShip.disableFireA();
        //console.log("Exit state AttackTarget");
    };
    aiStateAttackTarget.update = function(knowledge, dt_s = game.fixed_dt_s) {
        var parentShip = knowledge["parentObj"];

        var shipDir = vec2.clone( parentShip.components["physics"].angleVec );  // angleVec is already normalized

        var shipToTarget = vec2.create();
        vec2.sub(shipToTarget, parentShip.aiConfig["target"].components["physics"].currPos, parentShip.components["physics"].currPos);
        vec2.normalize(shipToTarget, shipToTarget);

        // the dot product represents |u|*|v|*cos(thHeadingTarget) - because |u| == |v| == 1, the dot product represents cos(thHeadingTarget) between the two vectors
        var thHeadingTarget = Math.acos( vec2.dot(shipDir, shipToTarget) );  // radians

        // if thHeadingTarget > the ai aim/fire threshold angle, we need to narrow the angle by turning in the direction that shipToTarget is offset from shipDir
        if (thHeadingTarget > glMatrix.toRadian(parentShip.aiConfig["aiFireHalfAngle"])) {
            // We need to figure out which direction the angle sweeps, with respect to the ship's heading. So we'll compute a normal vector in the + rotation direction. So, e.g., (1,0) rotates to (0, 1); (0,1) rotates to (-1, 0), etc.
            // NOTE: In HTML5/Canvas space, a + rotation is clockwise on the screen (i.e., to the right)
            var normal = vec2.create();
            vec2.set(normal, -shipDir[1], shipDir[0]);    

            // Determine which direction to turn, to aim
            // Could ternary here ( condition ? val_if_true : val_if_false ), but for readability, we'll use long form
            if (vec2.dot(normal, shipToTarget) > 0) {
                parentShip.enableTurnRight();
            } else {
                parentShip.enableTurnLeft();
            }
            
        } else {
            // Fire away!!
            parentShip.disableTurn();
            parentShip.enableFireA();
        }
    }
    var aiCondAttackToSelect = new FSMConditionEQ(aiFsm.knowledge, "ref", "parentObj.aiConfig.target.alive", "const", false);   // TODO! Find a way to identify if a spaceship is alive. Using .alive works for particles (asteroids); maybe just add an alive member to the spaceship
    var aiTransAttackToSelect = new FSMTransition("SelectTarget", aiCondAttackToSelect);
    aiStateAttackTarget.addTransition(aiTransAttackToSelect);

    var aiCondAttackToPursue = new FSMConditionGT(aiFsm.knowledge, "calc", ["sqrDist", "parentObj.components.physics.currPos", "parentObj.aiConfig.target.components.physics.currPos"], "const", this.aiConfig["aiSqrAttackDist"]);
    var aiTransAttackToPursue = new FSMTransition("PursueTarget", aiCondAttackToPursue);
    aiStateAttackTarget.addTransition(aiTransAttackToPursue);
    
    var aiCondAttackToAvoidB;   // TODO make this condition essentially the same as (if not exactly the same as) aiCondAttackToAvoidA

    aiFsm.addState(aiStateSelectTarget);  // Add fsm state object to machine
    aiFsm.addState(aiStatePursueTarget);  // Add fsm state object to machine
    aiFsm.addState(aiStateAttackTarget);  // Add fsm state object to machine
    aiFsm.setInitState("SelectTarget");        // Set initial state by name
    aiFsm.start();

    // TODO add avoid states (because we're not doing any hierchical state machine stuff, we're going to have 2 avoid states -- one that transitions back "pursue", and one that transitions back to "attack"

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
    this.aiConfig["aiBehavior"] = ["Default"];      // Use an array of behaviors as a stack (used for implementing "humanizing" reflex delay)
    this.components["ai"].start();
};


