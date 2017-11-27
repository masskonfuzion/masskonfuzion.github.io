function GameStateManager() {
    this.states = [];       // A stack, implemented with an Array object
}

// TODO add touch event handlers to the [change/pause/resume]State functions (maybe encapsulate the add/remove calls into functions)
// Change from current state to toState
GameStateManager.prototype.changeState = function(toState) {
    // TODO encapsulate the mgmt further into helper functions. e.g., changeState and resumeState have the same "current state deactivation" code
    var fromState = this.popState();
    if (fromState) {
        fromState.cleanup();
    }

    this.pushState(toState);
    this.currState().initialize();
};

// Push a new state onto the stack, without popping the current one
// Scenarios where it's desirable to have multiple states in the stack:
// - pause menu overlay over paused game
// - in-game inventory menu
GameStateManager.prototype.pauseState = function(toState) {

    // Now, push the passed-in state, initialize it, activate its handlers
    this.pushState(toState);
    this.currState().initialize();
};

GameStateManager.prototype.resumeState = function(toState) {
    // Destroy the existing state
    var fromState = this.popState();
    if (fromState) {
        fromState.cleanup();
    }
};


GameStateManager.prototype.currState = function() {
    return this.states[this.states.length - 1];

};


// push a state to the front of the stack
GameStateManager.prototype.pushState = function(state) {
    this.states.push(state);
};


// pop the state from the top of the stack
GameStateManager.prototype.popState = function(state) {
    return retState = this.states.pop();
};
