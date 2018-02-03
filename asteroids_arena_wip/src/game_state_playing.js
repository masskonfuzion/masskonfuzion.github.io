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
    this.gameLogic.processMessages(game.fixed_dt_s);
    // Note: lurking in the gameLogic update() is a collisionMgr update that will attempt (but be blocked) to enqueue multiple collision events.
    this.gameLogic.update(game.fixed_dt_s);
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

    // TODO store overlay NDC layouts in an object, to avoid setting vars every frame

    var i = 0;
    for (var shipName in this.gameLogic.gameStats) {
        textPosY = 0.066667 + i * 0.05;

        deathsLabelPosNDC = [0.32, textPosY];      // NDCs go from 0 to 1 on each axis
        deathsPosNDC = [0.40, textPosY];      // NDCs go from 0 to 1 on each axis    //TODO figure out right/left align (maybe canvas can do this for you?)

        killsLabelPosNDC = [0.52, textPosY];      // NDCs go from 0 to 1 on each axis
        killsPosNDC = [0.60, textPosY];      // NDCs go from 0 to 1 on each axis    //TODO figure out right/left align (maybe canvas can do this for you?)

        scoreLabelPosNDC = [0.72, textPosY];      // NDCs go from 0 to 1 on each axis
        scorePosNDC = [0.80, textPosY];      // NDCs go from 0 to 1 on each axis    //TODO figure out right/left align (maybe canvas can do this for you?)

        canvasContext.font = "24px AstronBoy";  // Testing
        canvasContext.fillStyle = "orangered";  // TODO Eventually:  change color to match player ship color
        // TODO wrap NDC calculation in function
        canvasContext.fillText("Deaths", deathsLabelPosNDC[0] * canvasContext.canvas.width, deathsLabelPosNDC[1] * canvasContext.canvas.height);
        canvasContext.fillText(this.gameLogic.gameStats[shipName].deaths, deathsPosNDC[0] * canvasContext.canvas.width, deathsPosNDC[1] * canvasContext.canvas.height);

        canvasContext.fillText("Kills", killsLabelPosNDC[0] * canvasContext.canvas.width, killsLabelPosNDC[1] * canvasContext.canvas.height);
        canvasContext.fillText(this.gameLogic.gameStats[shipName].kills, killsPosNDC[0] * canvasContext.canvas.width, killsPosNDC[1] * canvasContext.canvas.height);

        canvasContext.fillText("Score", scoreLabelPosNDC[0] * canvasContext.canvas.width, scoreLabelPosNDC[1] * canvasContext.canvas.height);
        canvasContext.fillText(this.gameLogic.gameStats[shipName].score, scorePosNDC[0] * canvasContext.canvas.width, scorePosNDC[1] * canvasContext.canvas.height);
        i += 1;
    }

    canvasContext.restore();   // Restore the transformation
};

// A function callback registered with as the window event listener
// Can be coded to handle input directly, or can be a wrapper around an internal game logic object's input handler
GameStatePlaying.prototype.handleKeyboardInput = function(evt) {
    this.gameLogic.handleKeyboardInput(evt);
};
