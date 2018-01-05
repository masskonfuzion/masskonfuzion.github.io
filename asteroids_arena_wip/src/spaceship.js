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
    this.ableState = SpaceshipAbleStateEnum.enabled

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

        this.aiConfig["aiBehavior"] = "";
        this.aiConfig["aiProfile"] = "miner";           // TODO at some point, stop hardcoding this
        this.aiConfig["aiMaxLinearVel"] = 24;           // TODO tune this -- currently set artificially low, for testing
        this.aiConfig["aiSqrAttackDist"] = 80 * 80;     // Squared distance within which a ship will attack a target
        this.aiConfig["aiFireHalfAngle"] = 3;           // degrees
        this.aiConfig["target"] = null;

        this.initializeAI(configObj["knowledge"]);
    }
};

// Override the default update()
Spaceship.prototype.update = function(dt_s, config = null) {

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
                    var launchDir = vec2.create()
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
                    var launchDir = vec2.create()
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
}

Spaceship.prototype.enableTurnRight = function() {
    var myPhysComp = this.components["physics"];

    myPhysComp.angularVel = 210;
}

Spaceship.prototype.disableTurn = function() {
    var myPhysComp = this.components["physics"];

    myPhysComp.angularVel = 0;
}

Spaceship.prototype.enableFireA = function() {
    this.fireAState = true;

    var myGunPE = this.components["gunPE"];
    myGunPE.setEnabled();                       // Enable the emitter
}

Spaceship.prototype.disableFireA = function() {
    this.fireAState = false;

    var myGunPE = this.components["gunPE"];
    myGunPE.setDisabled();                       // Disable the emitter
}


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
    };
    aiStateSelectTarget.exit = function(knowledge = null) {
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
    aiStatePursueTarget.enter = function(knowledge = null) { };
    aiStatePursueTarget.exit = function(knowledge = null) { };
    aiStatePursueTarget.update = function(knowledge, dt_s = game.fixed_dt_s) {
        // Rembmer: game is a global object

        // Compute rays offset by some number of degrees to the left and to the right of the ship's current heading/orientation
        // - sightLine0 and sightLine1
        // Compute the sight line normals, sightNormal0 and sightNormal1
        // - so, e.g. if sightLine0 is "to the left", then its normal points "to the right", and if sightLine1 is "to the right",
        // then its normal points "to the left"
        // The target is "in sight" if:
        // - The vector/ray from the ship to the target intersects the line segment formed by connecting the two sightLine vectors
        //   some distance down the line
        // - can also probably just use dot products
        //   - use the sightLine vectors (normalized); get the vector from ship to target
        //   - compute the points at the end of each sightLine vector
        //   - compute vectors, one from those points to target; normalize
        //   - dot the sightLine-target endpoint vectors against the sightLine normals
        //   - actually, you probably only need to dot the vector from ship to target against the normals
        //   - the target is in sight if each of the respective sightLine-to-target vectors dotted with the sightNormal is > 0
        var parentShip = knowledge["parentObj"];

        // Get a reference to the ship's angle vector
        var shipDir = vec2.clone( parentShip.components["physics"].angleVec ); // NOTE: angleVec is already unit length

        // Compute the ship-to-target vector
        var shipToTarget = vec2.create();
        vec2.sub(shipToTarget, parentShip.aiConfig["target"].components["physics"].currPos, parentShip.components["physics"].currPos);
        vec2.normalize(shipToTarget, shipToTarget);

        var th = Math.acos( vec2.dot(shipDir, shipToTarget) );  // radians

        if (th > glMatrix.toRadian(20)) {   // TODO don't hardcode the half angle here
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
            parentShip.disableTurn();

            var currVel = vec2.create();
            vec2.sub(currVel, parentShip.components["physics"].currPos, parentShip.components["physics"].prevPos);
            if (vec2.length(currVel) / game.fixed_dt_s < parentShip.aiConfig["aiMaxLinearVel"]) {
                parentShip.enableThrust();
            } else {
                parentShip.disableThrust();
            }
        }
    };
    // NOTE: We're presuming that if a target becomes not-alive during pursuit, that means we didn't kill it; something else did
    var aiCondPursueToSelect = new FSMConditionEQ(aiFsm.knowledge, "ref", "parentObj.aiConfig.target.alive", "const", false);   // TODO! Find a way to identify if a spaceship is alive. Using .alive works for particles (asteroids); maybe just add an alive member to the spaceship
    var aiTransPursueToSelect = new FSMTransition("SelectTarget", aiCondPursueToSelect);
    aiStatePursueTarget.addTransition(aiTransPursueToSelect);
    
    var aiCondPursueToAttack = new FSMConditionLT(aiFsm.knowledge, "calc", ["sqrDist", "parentObj.components.physics.currPos", "parentObj.aiConfig.target.components.physics.currPos"], "const", this.aiConfig["aiSqrAttackDist"]);   // TODO don't hardcode -- use thresholds in an AI config object
    var aiTransPursueToAttack = new FSMTransition("AttackTarget", aiCondPursueToAttack);
    aiStatePursueTarget.addTransition(aiTransPursueToAttack);


    var aiStateAttackTarget = new FSMState("AttackTarget");
    aiStateAttackTarget.enter = function(knowledge = null) { };
    aiStateAttackTarget.exit = function(knowledge = null) {
        var parentShip = knowledge["parentObj"];
        parentShip.disableFireA();

    };
    aiStateAttackTarget.update = function(knowledge, dt_s = game.fixed_dt_s) {
        var parentShip = knowledge["parentObj"];

        var shipDir = vec2.clone( parentShip.components["physics"].angleVec );  // angleVec is already normalized

        var shipToTarget = vec2.create();
        vec2.sub(shipToTarget, parentShip.aiConfig["target"].components["physics"].currPos, parentShip.components["physics"].currPos);
        vec2.normalize(shipToTarget, shipToTarget);

        // the dot product represents |u|*|v|*cos(th) - because |u| == |v| == 1, the dot product represents cos(th) between the two vectors
        var th = Math.acos( vec2.dot(shipDir, shipToTarget) );  // radians

        // if th > the ai aim/fire threshold angle, we need to narrow the angle by turning in the direction that shipToTarget is offset from shipDir
        if (th > glMatrix.toRadian(parentShip.aiConfig["aiFireHalfAngle"])) {
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

    var aiCondAttackToPursue = new FSMConditionGTE(aiFsm.knowledge, "calc", ["sqrDist", "parentObj.components.physics.currPos", "parentObj.aiConfig.target.components.physics.currPos"], "const", this.aiConfig["aiSqrAttackDist"]);   // TODO don't hardcode -- use thresholds in an AI config object
    var aiTransAttackToPursue = new FSMTransition("PursueTarget", aiCondAttackToPursue);
    aiStateAttackTarget.addTransition(aiTransAttackToPursue);

    aiFsm.addState(aiStateSelectTarget);  // Add fsm state object to machine
    aiFsm.addState(aiStatePursueTarget);  // Add fsm state object to machine
    aiFsm.addState(aiStateAttackTarget);  // Add fsm state object to machine
    aiFsm.setInitState("SelectTarget");        // Set initial state by name
    aiFsm.start();

    // TODO add avoid states (because we're not doing any hierchical state machine stuff, we're going to have 2 avoid states -- one that transitions back "pursue", and one that transitions back to "attack"

};


Spaceship.prototype.resetAI = function() {
    this.components["ai"].start();
};
