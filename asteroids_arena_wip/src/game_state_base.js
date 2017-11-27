function GameStateBase() {
    this._name = ""; // Set this._name in subclass constructors

}


// Initialize GameState (this function runs when the GameState is started (either on game startup, or change, e.g. from Title Screen -> Main Menu -> Game Playing, etc.)
GameStateBase.prototype.initialize = function(transferObj=null) {
    // initialize game state;
    // use transferObj to carry desired data from the state being transitioned out of, into this state (e.g., scores, state variables, etc.)
    // NOTE: base class does not implement this
    throw new Error("Function must be implemented by subclass");
};


// Clean up GameState (this function runs when the GameState is exited (either on game startup, or change, e.g. from Title Screen -> Main Menu -> Game Playing, etc.)
GameStateBase.prototype.cleanup = function() {
    throw new Error("Function must be implemented by subclass");
};


//TODO actually, states won't be responsible for pause/resume.  We need a game state manager. We can either (A) specify game states and transitions in some kind of data structure, or (B) hand-code transitions as part of the state objects themselves.
////TODO Consider changing "pause" to "PushState" or something; doesn't HAVE to be 'pause'
//GameStateBase.prototype.pause = function() {
//    throw new Error("Function must be implemented by subclass");
//};
//
//
////TODO Consider changing "resume" to "PopState" or something; doesn't HAVE to be 'resume'
//GameStateBase.prototype.resume = function() {
//    throw new Error("Function must be implemented by subclass");
//};


// Do things before rendering the scene (e.g.:
// update physics simulation/collision
// processes events/messages, etc.
GameStateBase.prototype.preRender = function(canvasContext, dt_s) {
};


// Render the scene or main/primary renderable object
GameStateBase.prototype.render = function(canvasContext, dt_s) {
};


// Do any post-render actions, e.g.:
// draw overlays (maybe score)
// post-process simulation steps
GameStateBase.prototype.postRender = function(canvasContext, dt_s) {
};


// A function callback registered with as the window event listener
// Can be coded to handle input directly, or can be a wrapper around an internal game logic object's input handler
GameStateBase.prototype.handleKeyboardInput = function(evt) {
};
