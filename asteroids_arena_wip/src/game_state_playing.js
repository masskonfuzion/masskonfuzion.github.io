function GameStatePlaying() {
    this.gameLogic = new GameLogic();
}

GameStatePlaying.prototype = Object.create(GameStateBase.prototype);
GameStatePlaying.prototype.constructor = GameStatePlaying;

GameStatePlaying.prototype.initialize = function() {
    this.gameLogic.initialize();
};

GameStatePlaying.prototype.cleanup = function() {
    // TODO implement cleanup (maybe empty out some arrays? Of course, JS is garbage-collected, so... maybe do nothing :-D)
};

// Do things before rendering the scene (e.g.:
// update physics simulation/collision
// processes events/messages, etc.
GameStatePlaying.prototype.preRender = function(canvasContext, dt_s) {
    this.gameLogic.processMessages(game.fixed_dt_s);   // TODO delete
    // Note: lurking in the gameLogic update() is a collisionMgr update that will attempt (but be blocked) to enqueue multiple collision events.
    this.gameLogic.update(game.fixed_dt_s);  // TODO delete
};


// Render the scene or main/primary renderable object
GameStatePlaying.prototype.render = function(canvasContext, dt_s) {
    this.gameLogic.draw(canvasContext);
};


// Do any post-render actions, e.g.:
// draw overlays (maybe score)
// post-process simulation steps
GameStatePlaying.prototype.postRender = function(canvasContext, dt_s) {
    canvasContext.save();   // Save the transformation   (this is probably not necessary -- the transform should always be "identity", because we're maintaining state everywhere we manipulate the transform stack

    scorePosNDC = [0.72, 0.066667];      // NDCs go from 0 to 1 on each axis

    canvasContext.font = "24px AstronBoy";  // Testing
    canvasContext.fillStyle = "orangered";
    // TODO wrap NDC calculation in function
    canvasContext.fillText("Score Goes Here", scorePosNDC[0] * canvasContext.canvas.width, scorePosNDC[1] * canvasContext.canvas.height);

    canvasContext.restore();   // Restore the transformation
};

// A function callback registered with as the window event listener
// Can be coded to handle input directly, or can be a wrapper around an internal game logic object's input handler
GameStatePlaying.prototype.handleKeyboardInput = function(evt) {
    this.gameLogic.handleKeyboardInput(evt);
};
