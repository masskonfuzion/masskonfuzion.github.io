function GameStatePlaying() {
    this.gameLogic = null;
    this.imgObjs = {};
}

GameStatePlaying.prototype = Object.create(GameStateBase.prototype);
GameStatePlaying.prototype.constructor = GameStatePlaying;

GameStatePlaying.prototype.initialize = function(transferObj = null) {
    this.imgObjs["kills_icon"] = game.imgMgr.imageMap["kills_icon"].imgObj; // TODO I hate the syntax of getting an img object. Change it/wrap it in a function call. Do something. Fix it!!
    this.imgObjs["deaths_icon"] = game.imgMgr.imageMap["deaths_icon"].imgObj; // TODO I hate the syntax of getting an img object. Change it/wrap it in a function call. Do something. Fix it!!
    this.imgObjs["asteroids_icon"] = game.imgMgr.imageMap["asteroids_icon"].imgObj; // TODO I hate the syntax of getting an img object. Change it/wrap it in a function call. Do something. Fix it!!

    this.gameLogic = new GameLogic();
    this.gameLogic.initialize(transferObj);

};

GameStatePlaying.prototype.cleanup = function() {
    // implement cleanup (maybe empty out some arrays? Of course, JS is garbage-collected, so... maybe do nothing :-D)
    // NOTE: we're not removing/reassigning-to-null this.gameLogic because we need it in states that follow (e.g. GameOver)
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
    for (var shipID in this.gameLogic.gameStats) {
        var shipObjectID = this.gameLogic.gameObjs[shipID].objectID;
        var characterName = this.gameLogic.characters[shipObjectID].callSign;
        textPosY = 0.066667 + i * 0.05;     // These are "magic numbers" -- tweaked manually, based on what looked good

        characterNamePosNDC = [0.15, textPosY];

        killsLabelPosNDC = [0.32, textPosY];      // NDCs go from 0 to 1 on each axis
        killsPosNDC = [0.40, textPosY];      // NDCs go from 0 to 1 on each axis

        deathsLabelPosNDC = [0.52, textPosY];      // NDCs go from 0 to 1 on each axis
        deathsPosNDC = [0.60, textPosY];      // NDCs go from 0 to 1 on each axis

        scoreLabelPosNDC = [0.72, textPosY];      // NDCs go from 0 to 1 on each axis
        scorePosNDC = [0.80, textPosY];      // NDCs go from 0 to 1 on each axis

        canvasContext.font = "18px GameFont";  // Testing

        var colorSchemeRef = this.gameLogic.characters[shipObjectID].colorScheme.light;
        canvasContext.fillStyle = "rgb(" + colorSchemeRef[0] + "," + colorSchemeRef[1] + "," + colorSchemeRef[2] + ")";

        // TODO wrap NDC calculation in function
        canvasContext.fillText(characterName, characterNamePosNDC[0] * canvasContext.canvas.width, characterNamePosNDC[1] * canvasContext.canvas.height);

        canvasContext.drawImage(this.imgObjs.kills_icon, (killsLabelPosNDC[0] * canvasContext.canvas.width) - (this.imgObjs.kills_icon.width/2), (killsLabelPosNDC[1] * canvasContext.canvas.height) - (this.imgObjs.kills_icon.height/2));
        canvasContext.fillText(this.gameLogic.gameStats[shipID].kills, killsPosNDC[0] * canvasContext.canvas.width, killsPosNDC[1] * canvasContext.canvas.height);

        canvasContext.drawImage(this.imgObjs.deaths_icon, (deathsLabelPosNDC[0] * canvasContext.canvas.width) - (this.imgObjs.deaths_icon.width/2), (deathsLabelPosNDC[1] * canvasContext.canvas.height) - (this.imgObjs.deaths_icon.height/2));
        canvasContext.fillText(this.gameLogic.gameStats[shipID].deaths, deathsPosNDC[0] * canvasContext.canvas.width, deathsPosNDC[1] * canvasContext.canvas.height);

        canvasContext.fillText("Score", scoreLabelPosNDC[0] * canvasContext.canvas.width, scoreLabelPosNDC[1] * canvasContext.canvas.height);
        canvasContext.fillText(this.gameLogic.gameStats[shipID].score, scorePosNDC[0] * canvasContext.canvas.width, scorePosNDC[1] * canvasContext.canvas.height);
        i += 1;
    }
    
    if (game.settings.visible.gameMode == "Time Attack") {
        timeLabelPosNDC = [0.75, 0.3];      // NDCs go from 0 to 1 on each axis
        timePosNDC = [0.85, 0.3];      // NDCs go from 0 to 1 on each axis

        // integer values of min/sec
        var iMin = Math.floor(this.gameLogic.timeAttackSecondsLeft / 60);
        var iSec = Math.floor(this.gameLogic.timeAttackSecondsLeft % 60);

        // string values of min/sec
        var sMin = iMin.toString();
        var sSec = iSec < 10 ? iSec.toString().padStart(2, "0") : iSec.toString();    // Use padStart() to 0-pad seconds
        var gameTimeLeft = sMin + ":" + sSec

        canvasContext.fillStyle = "lightgray";
        canvasContext.fillText("Time", timeLabelPosNDC[0] * canvasContext.canvas.width, timeLabelPosNDC[1] * canvasContext.canvas.height);
        canvasContext.fillText(gameTimeLeft, timePosNDC[0] * canvasContext.canvas.width, timePosNDC[1] * canvasContext.canvas.height);
    }

    canvasContext.restore();   // Restore the transformation
};

// A function callback registered with as the window event listener
// Can be coded to handle input directly, or can be a wrapper around an internal game logic object's input handler
GameStatePlaying.prototype.handleKeyboardInput = function(evt) {
    // TODO maybe handleKeyboardInput should return a value (true if the keypress was handled by gameLogic, false if not) so the game logic obj can handle only keypresses relevant to gameplay, and the GameState can handle others
    this.gameLogic.handleKeyboardInput(evt);
};
