// Game state for showing stats overlay, e.g. at end of game
function GameStateStatsOverlay() {
    GameStateBase.call(this);
    this.uiItems = [];
    this.messageQueue = null;

    this.highlightedItemIndex = 0;
    this.highlightedItem = null;    // Highlighted item, not necessarily selected/active

    this.activeItemIndex = -1;
    this.activeItem = null;

    this.bgm = null;
    this.newHighScore = false;
}

GameStateStatsOverlay.prototype = Object.create(GameStateBase.prototype);
GameStateStatsOverlay.prototype.constructor = GameStateStatsOverlay;


GameStateStatsOverlay.prototype.initialize = function(transferObj = null) {
    this.messageQueue = new MessageQueue();
    this.messageQueue.initialize(2);
    this.messageQueue.registerListener('UICommand', this, this.doUICommand);
    
    // TODO possibly modify checkForHighScore to support multiple game modes
    this.newHighScore = this.checkForHighScore(transferObj);

    // create the end-of-game message display, based on the passed-in object
    this.createDisplayMessage(transferObj.scoresAndStats);

    this.activeItemIndex = -1;
    this.activeItem = null;         // Active/selected item

    this.bgm = transferObj.bgmObj;

    // highlight the first highlightable item (this code duplicates the ArrorDown key handler. I'm being really lazy/sloppy with the code here)
    this.highlightedItemIndex = (this.highlightedItemIndex + 1) % this.uiItems.length;
    while (this.uiItems[this.highlightedItemIndex].isSelectable != true) {
        this.highlightedItemIndex = (this.highlightedItemIndex + 1) % this.uiItems.length;
    }
    this.highlightedItem = this.uiItems[this.highlightedItemIndex];

};


GameStateStatsOverlay.prototype.cleanup = function() {
    this.uiItems = [];
    if (this.bgm) {
        this.bgm.stop();
    }
};

GameStateStatsOverlay.prototype.checkForHighScore = function(gameInfo) {
    // We can simply load high scores (without testing for existence) because the high scores
    // object should have been created on application started (if it wasn't already present)

    // Load high scores. Note that gameInfo is an object that contains both the game stats and the game settings
    var highScores = JSON.parse(localStorage.getItem('highScores'));

    var gameMode = gameInfo.scoresAndStats.gameMode;
    // TODO 2018-11-03 - don't hardcode the gameMode in "gameModeSetting" (and perhaps we should rename to highScorePageSelector); in deathmatch, it's killCount, not timeLimit
    var playerCallSign = gameInfo.scoresAndStats.settings.callSign;
    var playerStats = gameInfo.scoresAndStats.stats.ship0;

    var gameModeSetting;    // e.g., in Death Match, this is the kill count (e.g. "25"); in Time Attack, this would be the time limit, e.g. "1:00"
    var relevantScoreList;  // A reference to a (mutable) list within the highScores object
    var highScoreItem;

    switch (gameInfo.scoresAndStats.settings.gameMode) {
        case "Death Match":
            gameModeSetting = gameInfo.scoresAndStats.settings.gameModeSettings.deathMatch.shipKills;
            relevantScoreList = highScores.deathMatch[gameModeSetting];
            var truncated_elapsed  = Math.floor(gameInfo.scoresAndStats.elapsed * 10) / 10;   // truncate to the 1 decimal place (the 10ths place)

            for (var i = 0; i < relevantScoreList.length; i++) {
                highScoreItem = relevantScoreList[i];

                // If the human player is the one who reached the kill count AND achieved a record time, then add their time to the high scores
                if (playerStats.kills == gameModeSetting &&
                    truncated_elapsed <= highScoreItem.time ) {

                    // Insert new high score into place
                    relevantScoreList.splice(i, 0, { "callSign": playerCallSign, "time": truncated_elapsed });
                    // pop the very last score off the list
                    relevantScoreList.pop();

                    // Write new high scores out
                    localStorage.setItem('highScores', JSON.stringify(highScores));
                    // TODO maybe set a "new high score" flag var, and break out of the loop? I don't like returning/exiting the function without officially terminating the loop
                    return true;
                }
            }
        break;

        case "Time Attack":
            gameModeSetting = gameInfo.scoresAndStats.settings.gameModeSettings.timeAttack.timeLimit;
            relevantScoreList = highScores.timeAttack[gameModeSetting];

            for (var i = 0; i < relevantScoreList.length; i++) {
                highScoreItem = relevantScoreList[i];

                if (playerStats.kills > highScoreItem.kills || 
                    playerStats.kills == highScoreItem.kills && playerStats.deaths < highScoreItem.deaths ||
                    playerStats.kills == highScoreItem.kills && playerStats.deaths == highScoreItem.deaths && playerStats.score > highScoreItem.score) {

                    // Insert new high score into place
                    relevantScoreList.splice(i, 0, { "callSign": playerCallSign, "kills": playerStats.kills, "deaths": playerStats.deaths, "ast_s": playerStats.asteroids_blasted_s, "ast_m": playerStats.asteroids_blasted_m, "ast_l": playerStats.asteroids_blasted_l, "score": playerStats.score });
                    // pop the very last score off the list
                    relevantScoreList.pop();

                    // Write new high scores out
                    localStorage.setItem('highScores', JSON.stringify(highScores));
                    // TODO maybe set a "new high score" flag var, and break out of the loop? I don't like returning/exiting the function without officially terminating the loop
                    return true;
                }
            }
        break;
    }

    return false;
};

GameStateStatsOverlay.prototype.preRender = function(canvasContext, dt_s) {
};

// Create the game over display message (using menu/ui items)
GameStateStatsOverlay.prototype.createDisplayMessage = function(infoObj) {
    switch(infoObj.settings.gameMode) {
        case "Death Match":
        var truncated_elapsed  = Math.floor(infoObj.elapsed * 10) / 10;   // truncate to the 1 decimal place (the 10ths place) // (TODO put truncation into a function? It's called in createDisplayMessage and checkForHighScore

        var winMsg = infoObj.winnerInfo.characterName + " wins (reached kill target in " + this.getTimeStringFromFloatValue(truncated_elapsed) + ")!!";
        this.uiItems.push( new uiItemText(winMsg, "36px", "MenuFont", "white", 0.5, 0.35, "center", "middle", {"command": "changeState", "params": {"stateName": "MainMenu"} }) );

        break;

        case "Time Attack":
        var winMsg = infoObj.winnerInfo.characterName  + " wins with " + infoObj.winnerInfo.kills.toString() + " kills in " + game.settings.visible.gameModeSettings.timeAttack.timeLimit + "!!";
        this.uiItems.push( new uiItemText(winMsg, "36px", "MenuFont", "white", 0.5, 0.35, "center", "middle", {"command": "changeState", "params": {"stateName": "MainMenu"} }) );
        break;
    }


    var rankedShipIDs = this.sortScores(infoObj.stats);

    var i = 0;

    // A couple of vars to control layout. NOTE: next time around, we'll use a layout object of some sort (maybe a JSON layout?)
    var yNDC = 0.55;
    var ySpacing = 0.1;

    var objectIDForCharacterNameLookup = "";
    var shipObjectID = "";
    var characterName = "";

    // Iterate backwards because rankedShipIDs is sorted in ascending order; we want to print out highest to lowest scores
    for (var loopIdx = rankedShipIDs.length - 1; loopIdx >= 0; loopIdx -= 1) {
        var shipID = rankedShipIDs[loopIdx];
        // I could use Object.keys() and Object.values()... but I don't trust JavaScript.. O(n**2) lookup it is..
        for (var shipObjectID in infoObj.shipDict) {
            if (infoObj.shipDict[shipObjectID] == shipID) {
                characterName = infoObj.characters[shipObjectID].callSign;
                break;
            }
        }

        this.uiItems.push( new uiItemText(characterName, "20px", "MenuFont", "white", 0.1, yNDC + (i * ySpacing), "center", "middle", null ) );
        this.uiItems.push( new uiItemImage(game.imgMgr.imageMap["kills_icon"].imgObj, 0.2, yNDC + (i * ySpacing), "center", "middle", null ) );
        this.uiItems.push( new uiItemText(infoObj.stats[shipID].kills.toString(), "20px", "MenuFont", "white", 0.26, yNDC + (i * ySpacing), "center", "middle", null ) );
        this.uiItems.push( new uiItemImage(game.imgMgr.imageMap["deaths_icon"].imgObj, 0.32, yNDC + (i * ySpacing), "center", "middle", null ) );
        this.uiItems.push( new uiItemText(infoObj.stats[shipID].deaths.toString(), "20px", "MenuFont", "white", 0.38, yNDC + (i * ySpacing), "center", "middle", null ) );

        this.uiItems.push( new uiItemImage(game.imgMgr.imageMap["asteroids_icon"].imgObj, 0.48, yNDC + (i * ySpacing), "center", "middle", null ) );
        this.uiItems.push( new uiItemText("S:", "20px", "MenuFont", "white", 0.54, yNDC + (i * ySpacing), "center", "middle", null ) );
        this.uiItems.push( new uiItemText(infoObj.stats[shipID].asteroids_blasted_s.toString(), "20px", "MenuFont", "white", 0.58, yNDC + (i * ySpacing), "center", "middle", null ) );
        this.uiItems.push( new uiItemText("M:", "20px", "MenuFont", "white", 0.62, yNDC + (i * ySpacing), "center", "middle", null ) );
        this.uiItems.push( new uiItemText(infoObj.stats[shipID].asteroids_blasted_m.toString(), "20px", "MenuFont", "white", 0.66, yNDC + (i * ySpacing), "center", "middle", null ) );
        this.uiItems.push( new uiItemText("L:", "20px", "MenuFont", "white", 0.70, yNDC + (i * ySpacing), "center", "middle", null ) );
        this.uiItems.push( new uiItemText(infoObj.stats[shipID].asteroids_blasted_l.toString(), "20px", "MenuFont", "white", 0.74, yNDC + (i * ySpacing), "center", "middle", null ) );

        this.uiItems.push( new uiItemText("Score:", "20px", "MenuFont", "white", 0.80, yNDC + (i * ySpacing), "center", "middle", null ) );
        this.uiItems.push( new uiItemText(infoObj.stats[shipID].score.toString(), "20px", "MenuFont", "white", 0.88, yNDC + (i * ySpacing), "center", "middle", null ) );
        i += 1;
    }

    if (this.newHighScore) {
        this.uiItems.push( new uiItemImage(game.imgMgr.imageMap["new_high_score"].imgObj, 0.85, 0.15, "center", "middle", null ) );
    }
};

GameStateStatsOverlay.prototype.render = function(canvasContext, dt_s) {
    canvasContext.save();
    canvasContext.setTransform(1,0,0,1,0,0);    // Reset transformation (similar to OpenGL loadIdentity() for matrices)

    // Clear the canvas (note that the game application object is global)
    canvasContext.fillStyle = 'black';
    canvasContext.fillRect(0,0, canvasContext.canvas.width, canvasContext.canvas.height);

    for (var item of this.uiItems) {
        item.draw(canvasContext);
    }

    // Draw highlight box around currently highlightedItem (should really be part of a Menu/UI class)
    // TODO look at the alignment of the highlighted item - adjust highlight position based on left/center/align (actual text rendering position seems to be affected by that)
    var hlItem = this.uiItems[this.highlightedItemIndex];
    var hlWidth = Math.ceil( hlItem.getWidth(canvasContext) * 1.5 );
    var hlHeight = Math.ceil( hlItem.getHeight(canvasContext) * 1.5);

    var hlXOffset = (hlItem.hasOwnProperty("align") && hlItem.align == "center") ? -hlWidth / 2 : 0;
    //var hlYOffset = (hlItem.hasOwnProperty("baseline") && hlItem.align == "middle") ? -hlHeight / 2 : 0; // TODO delete, or update to handle top/middle/bottom
    var hlYOffset = -hlHeight / 2;  // Note: this highlight assumes that textBaseline (vertical align) is "middle"

    var hlX = Math.floor(MathUtils.lerp(hlItem.posNDC[0], 0, canvasContext.canvas.width) + hlXOffset);
    var hlY = Math.floor(MathUtils.lerp(hlItem.posNDC[1], 0, canvasContext.canvas.height) + hlYOffset);

    canvasContext.lineWidth = 3;
    canvasContext.strokeStyle = "yellow";
    canvasContext.strokeRect(hlX, hlY, hlWidth, hlHeight);

    canvasContext.restore();
};


GameStateStatsOverlay.prototype.postRender = function(canvasContext, dt_s) {
    this.processMessages(dt_s);
};


GameStateStatsOverlay.prototype.handleKeyboardInput = function(evt) {
    if (evt.type == "keydown") {
        // haven't decided what (if anything) to do on keydown
    } else if (evt.type == "keyup") {
        switch(evt.code) {
            case "ArrowUp":
                // check if we have an active/selected UI item (this is janky. Again, there should be a class/object to handle this)
                // The up/down arrows should only move the highlight, which should work only if the menu/form does _not_ have an active/selected UI item
                if (this.activeItem == null) {
                    // find previous selectable item (probably should be a function; but also.. a Menu should be an object.. and it's not. So....)
                    // Because modulo math gets wonky with negative numbers, we'll add the length of the list to the current index, and then subtract an index; then do the mod
                    this.highlightedItemIndex = ((this.highlightedItemIndex + this.uiItems.length) - 1) % this.uiItems.length;
                    while (this.uiItems[this.highlightedItemIndex].isSelectable != true) {
                        this.highlightedItemIndex = ((this.highlightedItemIndex + this.uiItems.length) - 1) % this.uiItems.length;
                    }
                    this.highlightedItem = this.uiItems[this.highlightedItemIndex];
                }
                break;
            case "ArrowDown":
                // check if we have an active/selected UI item (this is janky. Again, there should be a class/object to handle this)
                if (this.activeItem == null) {
                    this.highlightedItemIndex = (this.highlightedItemIndex + 1) % this.uiItems.length;
                    while (this.uiItems[this.highlightedItemIndex].isSelectable != true) {
                        this.highlightedItemIndex = (this.highlightedItemIndex + 1) % this.uiItems.length;
                    }
                    this.highlightedItem = this.uiItems[this.highlightedItemIndex];
                }
                break;
            case "Enter":
                // Enqueue an action to be handled in the postRender step. We want all actions (e.g. state changes, etc.) to be handled in postRender, so that when the mainloop cycles back to the beginning, the first thing that happens is the preRender step in the new state (if the state changed)

                // If we have an active item, deactivate it
                if (this.activeItem) {
                    this.activeItem.isActive = false;   // The UI Items store their activation state, so the menu can query it and determine how to interact with the UI items, based on user input
                    this.activeItemIndex = -1;
                    this.activeItem = null; // Unassign activeItem reference
                }

                // Else, we need to either select/activate the highlighted item (if it is selectable), or otherwise call the command of the "non-selectable" item
                else {
                    if (this.highlightedItem.actionMsg) {
                        // if the UI item has an actionMsg associated with it, then enqueue that message
                        var cmdMsg = { "topic": "UICommand",
                                       "targetObj": this,
                                       "command": this.uiItems[this.highlightedItemIndex].actionMsg["command"],
                                       "params": this.uiItems[this.highlightedItemIndex].actionMsg["params"]
                                     };
                        this.messageQueue.enqueue(cmdMsg);
                    }
                    else {
                        // Else, select the item (if it's selectable)
                        if (this.highlightedItem.isSelectable) {
                            this.activeItemIndex = this.highlightedItemIndex;
                            this.activeItem = this.uiItems[this.highlightedItemIndex];
                            this.activeItem.isActive = true;
                        }
                        else {
                            // This case is probably nonsense. I don't think it's possible, given the properties of the UI. But at this point, I'm writing hack'n'slash code, so here is the case, anyway
                        }
                    }
                }
                break;
        }
    }
};


GameStateStatsOverlay.prototype.processMessages = function(dt_s) {
    // dt_s is not used specifically by processMessages, but is passed in in case functions called by processMessages need it
    //console.log('MessageQueue has ' + this.messageQueue.numItems() + ' items in it');

    while (!this.messageQueue._empty) {
        //console.log('Processing message');
        var msg = this.messageQueue.dequeue();

        //console.log('Iterating over topic: ' + msg.topic);

        for (var handler of this.messageQueue._registeredListeners[msg.topic]) {
            handler["func"].call(handler["obj"], msg);
        }
    }
};


GameStateStatsOverlay.prototype.doUICommand = function(msg) {
    // Take action on a message with topic, "UICommand"
    // UICommand messages contain a command, a targetObj (i.e. who's going to execute the command), and a params list
    // The command is most likely to call a function. This is not quite a function callback, because we are not storing a pre-determined function ptr
    //console.log("In doUICommand(), with msg = ", msg);

    switch (msg.command) {
        case "changeState":
            // NOTE: This popState command calls the gameStateManager's resumeState(). There is a pushState() and popState() - maybe consolidate pauseState and resumeState into pushState and popState?

            // NOTE gameStateMgr is global, because I felt like making it that way. But we could also have the GameStateManager handle the message (instead of having this (active game state) handle the message, by calling a GameStateManager member function
            //gameStateMgr.resumeState();   // This is what we would call in an actual overlay.
            gameStateMgr.changeState(gameStateMgr.stateMap[msg.params.stateName]);
            break;
    }

};


// Return a list of shipIDs, to be used to display scores in sorted order
GameStateStatsOverlay.prototype.sortScores = function(scoreObj) {
    var rankedShipIDs = Object.getOwnPropertyNames(scoreObj);

    // first pass: sort shipIDs, ascending, based on the # of kills achieved by that ship
    for (var fill_slot = rankedShipIDs.length - 1; fill_slot > 0; fill_slot -= 1) {
        var pos_of_max = 0;
        for (var loc  = 1; loc <= fill_slot; loc += 1) {
            if (scoreObj[rankedShipIDs[loc]].kills > scoreObj[rankedShipIDs[pos_of_max]].kills) {
                pos_of_max = loc;
            }
        }

        var temp = rankedShipIDs[fill_slot];
        rankedShipIDs[fill_slot] = rankedShipIDs[pos_of_max];
        rankedShipIDs[pos_of_max] = temp;
    }

    // check for any ties by kills (We assume at least 2 ships)
    ////for (var i = 0; i < rankedShipIDs.length - 1; i++) {
    ////    for (var j = 1; j < rankedShipIDs.length; j++) {
    for (var i = rankedShipIDs.length - 1; i > 1; i--) {
        for (var j = (rankedShipIDs.length - 1) - 1; j > 0; j--) {
            // if ship j has the same # of kills as ship i
            if (scoreObj[rankedShipIDs[j]].kills == scoreObj[rankedShipIDs[j]].kills) {
                // Break tie on deaths
                if (scoreObj[rankedShipIDs[j]].deaths < scoreObj[rankedShipIDs[i]].deaths) {
                    // If ship j has fewer deaths than ship i, then swap j's rank with i (move j up in rank)
                    var temp = rankedShipIDs[i];
                    rankedShipIDs[i] = rankedShipIDs[j];
                    rankedShipIDs[j] = temp;
                }
                else if (scoreObj[rankedShipIDs[j]].deaths == scoreObj[rankedShipIDs[i]].deaths) {
                    // If ship j has the same # of deaths as i, break ties on score
                    if (scoreObj[rankedShipIDs[j]].score > scoreObj[rankedShipIDs[i]].score) {
                        // If ship j has a higher score than ship i (incorporates asteroids blasted), then swap j's rank with i (move j up in rank)
                        var temp = rankedShipIDs[i];
                        rankedShipIDs[i] = rankedShipIDs[j];
                        rankedShipIDs[j] = temp;
                    }
                }
            }
        }
    }

    return rankedShipIDs;
};


// Return a time string (e.g. MM:SS.D), given an input number (float) of seconds
GameStateStatsOverlay.prototype.getTimeStringFromFloatValue = function(val) {
    var minutes = Math.floor(val / 60);
    var seconds = val % 60;

    // string values of min/sec
    var sMin = minutes.toString();
    var sSec = seconds < 10 ? seconds.toString().padStart(2, "0") : seconds.toString();    // Use padStart() to 0-pad seconds
    return sMin + ":" + sSec
};

