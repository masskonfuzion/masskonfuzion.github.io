// A graph/node-based finite state machine.
// Some classes/helper functions for finite state machine

// ============================================================================
// A "namespace" with helper functions
// ============================================================================
var FSMTools = {
    getNested: function (theObject, path, separator) {
    try {
        separator = separator || '.';

        return path.
                replace('[', separator).replace(']','').
                split(separator).
                reduce(
                    function (obj, property) {
                        return obj[property];
                    }, theObject
                );

    } catch (err) {
        return undefined;
    }
},

    getValue: function(theObject, theType, theData) {
        // if theType is "ref", then theData is a key/path to access the actual data to return, from theObject
        // if theType is "const", then theData is the value to return (basically a pass-through function)
        // NOTE - this feels over-complicated, but I haven't yet come up with a leaner way to do this in JavaScript

        // NOTE: I normally dislike JS more than I like it, but I actually love the ability to switch on string expressions
        switch (theType) {
            case 'ref':
                return FSMTools.getNested(theObject, theData);
            case 'const':
                return theData;
            case 'calc':
                // calculations take in a list of parameters (i.e., theData is a list)
                // theData[0] is the type of calculation (e.g. sum)
                // For now, it will be assumed that all of the parameters to a calculation will be paths to access data from the knowledge object (basically, the same case as 'ref', above)
                switch (theData[0]) {
                    case 'sqrDist':
                        // Major assumptions here:
                        // theData[1] and theData[2] are glMatrix vec2 objects
                        var a = FSMTools.getNested(theObject, theData[1]);
                        var b = FSMTools.getNested(theObject, theData[2]);
                        return vec2.sqrDist(a,b);
                }
                break;
        }
    }
};

// ============================================================================
// FSM State Class
// ============================================================================
function FSMState(stateName = null) {
    this.stateName = stateName;
    this.isTerminal = false;
    this.transitions = [];
    // Note that transitions contain conditions to evaluate, and next-states. If no tests pass, then by default, the state stays the same
}

// TOOD maybe make FSMState an interface class, by throwing errors in these built-in enter(), exit(), and update() functions
FSMState.prototype.enter = function(knowledge = null) {
    // Function called upon entering this state
};

FSMState.prototype.exit = function(knowledge = null) {
    // Function called upon exiting this state, right before switching to the next
};

FSMState.prototype.update = function(objRef, dt_s=1.0) {
    // dt_s is delta-time, in seconds. May or may not be necessary.
};


FSMState.prototype.addTransition = function(transition) {
    this.transitions.push(transition);
};

FSMState.prototype.setTerminal = function() {
    this.isTerminal = true;
};


// ============================================================================
// FSM Transition Class
// ============================================================================
function FSMTransition(targetName = "", condition=null) {
    this.target_name = targetName;  // The name (string) of the state to transition to
    this.condition = condition;     // The condition here is an instance of one of the FSMCondition classes below
}

FSMTransition.prototype.setTarget = function(targetName) {
    this.target_name = targetName;
};

FSMTransition.prototype.setCondition = function(condition) {
    this.condition = condition;     // Every transition has exactly 1 condition (but the condition itself, can be compound. See ANDList and ORList)
};

FSMTransition.prototype.test = function() {
    return this.condition.test();
};


// ============================================================================
// FSM Condition Interface Classes
// ============================================================================
function FSMConditionInterface(knowledge = null, typeA = null, valA = null, typeB  = null, valB = null) {
    // An interface for conditional testing of object against other objects
    // typeA and typeB can be either "ref" or "const" (or null; but be careful with nulls)
    // if typeA/B is "ref", then valA/B is a path to follow in the knowledge obj, to get the data for evaluation
    // if typeA/B is "const", then valA/B is a constant
    // In languages like C/C++, it is possible to track references to data items by memory address; that is not possible in JavaScript
    // NOTE: I'm not sure I like storing a reference to the knowledge object in the condition class (for large state machines with many conditions, it might be better to use the one reference stored in the state machine itself; maybe pass it in from state machine into the test() functions of each condition). But meh, we have to start somewhere
    // Therefore, we keep references to the objects that contain the data we want to track/evaluate against.
    this.knowledge = knowledge;

    this.typeA = typeA;
    this.valA = valA;

    this.typeB = typeB;
    this.valB = valB;
}

FSMConditionInterface.prototype.test = function() {
    throw new Error("Function must be implemented by subclass");
};


function FSMConditionListInterface(condList) {
    // TODO make sure we're properly handling lists - possibly need to do a deep copy?
    this.condList = condList;
}
FSMConditionListInterface.prototype.test = function() {
    throw new Error("Function must be implemented by subclass");
};

// ============================================================================
// FSM Condition Classes
// ============================================================================
//Test if a > b
function FSMConditionGT(knowledge, typeA, valA, typeB, valB) {
    FSMConditionInterface.call(this, knowledge, typeA, valA, typeB, valB);
}
FSMConditionGT.prototype = Object.create(FSMConditionInterface);
FSMConditionGT.prototype.constructor = FSMConditionGT;
FSMConditionGT.prototype.test = function() {
    var a = FSMTools.getValue(this.knowledge, this.typeA, this.valA);
    var b = FSMTools.getValue(this.knowledge, this.typeB, this.valB);
    return a > b;
};


//Test if a >= b
function FSMConditionGTE(knowledge, typeA, valA, typeB, valB) {
    FSMConditionInterface.call(this, knowledge, typeA, valA, typeB, valB);
}
FSMConditionGTE.prototype = Object.create(FSMConditionInterface);
FSMConditionGTE.prototype.constructor = FSMConditionGTE;
FSMConditionGTE.prototype.test = function() {
    var a = FSMTools.getValue(this.knowledge, this.typeA, this.valA);
    var b = FSMTools.getValue(this.knowledge, this.typeB, this.valB);
    return a >= b;
};


//Test if a < b
function FSMConditionLT(knowledge, typeA, valA, typeB, valB) {
    FSMConditionInterface.call(this, knowledge, typeA, valA, typeB, valB);
}
FSMConditionLT.prototype = Object.create(FSMConditionInterface);
FSMConditionLT.prototype.constructor = FSMConditionLT;
FSMConditionLT.prototype.test = function() {
    var a = FSMTools.getValue(this.knowledge, this.typeA, this.valA);
    var b = FSMTools.getValue(this.knowledge, this.typeB, this.valB);
    return a < b;
};


//Test if a <= b
function FSMConditionLTE(knowledge, typeA, valA, typeB, valB) {
    FSMConditionInterface.call(this, knowledge, typeA, valA, typeB, valB);
}
FSMConditionLTE.prototype = Object.create(FSMConditionInterface);
FSMConditionLTE.prototype.constructor = FSMConditionLTE;
FSMConditionLTE.prototype.test = function() {
    var a = FSMTools.getValue(this.knowledge, this.typeA, this.valA);
    var b = FSMTools.getValue(this.knowledge, this.typeB, this.valB);
    return a <= b;
};


//Test if a == b
function FSMConditionEQ(knowledge, typeA, valA, typeB, valB) {
    FSMConditionInterface.call(this, knowledge, typeA, valA, typeB, valB);
}
FSMConditionEQ.prototype = Object.create(FSMConditionInterface);
FSMConditionEQ.prototype.constructor = FSMConditionEQ;
FSMConditionEQ.prototype.test = function() {
    var a = FSMTools.getValue(this.knowledge, this.typeA, this.valA);
    var b = FSMTools.getValue(this.knowledge, this.typeB, this.valB);
    return a == b;
};


//Test if a != b
function FSMConditionNEQ(knowledge, typeA, valA, typeB, valB) {
    FSMConditionInterface.call(this, knowledge, typeA, valA, typeB, valB);
}
FSMConditionNEQ.prototype = Object.create(FSMConditionInterface);
FSMConditionNEQ.prototype.constructor = FSMConditionNEQ;
FSMConditionNEQ.prototype.test = function() {
    var a = FSMTools.getValue(this.knowledge, this.typeA, this.valA);
    var b = FSMTools.getValue(this.knowledge, this.typeB, this.valB);
    return a != b;
};


//Test if a && b is True
function FSMConditionAND(knowledge, typeA, valA, typeB, valB) {
    FSMConditionInterface.call(this, knowledge, typeA, valA, typeB, valB);
}
FSMConditionAND.prototype = Object.create(FSMConditionInterface);
FSMConditionAND.prototype.constructor = FSMConditionAND;
FSMConditionAND.prototype.test = function() {
    var a = FSMTools.getValue(this.knowledge, this.typeA, this.valA);
    var b = FSMTools.getValue(this.knowledge, this.typeB, this.valB);
    return a && b;
};


//Test if a list of conditions all evaluate to True (can mix and match, and even have nested
//ANDLists or ORLists as items in the list)
function FSMConditionANDList(condList) {
    FSMConditionListInterface.call(this, condList);
}
FSMConditionANDList.prototype = Object.create(FSMConditionListInterface);
FSMConditionANDList.prototype.constructor = FSMConditionANDList;
FSMConditionANDList.prototype.test = function() {
    var result = true;

    for (var cond of this.condList) {
        result = cond.test();
        if (!result) {
            break;
        }
    }
    return result;
};


//Test if a || b is True
function FSMConditionOR(knowledge, typeA, valA, typeB, valB) {
    FSMConditionInterface.call(this, knowledge, typeA, valA, typeB, valB);
}
FSMConditionOR.prototype = Object.create(FSMConditionInterface);
FSMConditionOR.prototype.constructor = FSMConditionOR;
FSMConditionOR.prototype.test = function() {
    var a = FSMTools.getValue(this.knowledge, this.typeA, this.valA);
    var b = FSMTools.getValue(this.knowledge, this.typeB, this.valB);
    return a || b;
};


//Test if any of a list of conditions evaluates to True (can mix and match, and even have ANDLists or
//ORLists as items in the list)
function FSMConditionORList(condList) {
    FSMConditionListInterface.call(this, condList);
}
FSMConditionORList.prototype = Object.create(FSMConditionListInterface);
FSMConditionORList.prototype.constructor = FSMConditionORList;
FSMConditionORList.prototype.test = function() {
    var result = false;

    for (var cond of this.condList) {
        result = cond.test();
        if (result) {
            break;
        }
    }
    return result;
};


//Const true -- always true
function FSMConditionReturnTrue() {
    FSMConditionInterface.call(this);
}
FSMConditionReturnTrue.prototype = Object.create(FSMConditionInterface);
FSMConditionReturnTrue.prototype.constructor = FSMConditionReturnTrue;
FSMConditionReturnTrue.prototype.test = function() {
    return true;
};


//Const false -- always false
function FSMConditionReturnFalse() {
    FSMConditionInterface.call(this);
}
FSMConditionReturnFalse.prototype = Object.create(FSMConditionInterface);
FSMConditionReturnFalse.prototype.constructor = FSMConditionReturnFalse;
FSMConditionReturnFalse.prototype.test = function() {
    return false;   // Not sure if this would be useful... but including it, anyway
};


// ============================================================================
// Finite State Machine (FSM)
// ============================================================================
// We make the FSM a game object
function FSM(objRef = null) {
    GameObject.call(this);

    this.states = {};
    this.init_state = null;
    this.current_state = null;
    this.running = false;
    this.knowledge = objRef;  // A dict or similar -- contains all the data to be used as inputs to the FSM
    // TODO determine if I need to deepcopy? But maybe not.. But maybe?

}

FSM.prototype = Object.create(GameObject.prototype);
FSM.prototype.constructor = FSM;

FSM.prototype.initialize = function(objRef = null) {
    this.knowledge = objRef;  // A dict or similar -- contains all the data to be used as inputs to the FSM
};

//Iterate through the transitions of the current state, evaluating the control conditions.
//If no conditions evaluate to True, then by default, stay in the same state.
FSM.prototype.checkTransitions = function() {
   for (var transition of this.current_state.transitions) {
       if (transition.test()) {
           this.current_state.exit(this.knowledge);

           this.current_state = this.states[transition.target_name];
           this.current_state.enter(this.knowledge);
        }
    }
};


//Update the current state
FSM.prototype.update = function() {
    if (this.running) {
        this.current_state.update(this.knowledge, dt_s=null);    // Optionally supply a dt (delta_time) variable
        if (this.current_state.isTerminal) {  // We run through one update cycle of a terminal state, in case the state wants to do anything useful as clean-up or whatever
            this.running = false;
            this.current_state.exit();  // Exit the terminal state
        }
        this.checkTransitions();
    }
};


//Set the initial state (by text name)
//NOTE: This function MUST be called before starting the machine
FSM.prototype.setInitState = function(stateName) {
    this.init_state = this.states[stateName];
};


FSM.prototype.addState = function(state) {
    this.states[state.stateName] = state;
};


FSM.prototype.start = function() {
    this.running = true;
    this.current_state = this.init_state;
    this.current_state.enter();
};


FSM.prototype.stop = function() {
    this.running = false;
};

