// Pause state
// TODO 2018-10-25 Finish developing this state. It's currently a copy/paste job from the GameOver state
function GameStatePause() {
    GameStateBase.call(this);
    this.uiItems = [];
    this.messageQueue = null;

    this.highlightedItemIndex = 0;
    this.highlightedItem = null;    // Highlighted item, not necessarily selected/active

    this.activeItemIndex = -1;
    this.activeItem = null;

    this.bgm = null;
}

GameStatePause.prototype = Object.create(GameStateBase.prototype);
GameStatePause.prototype.constructor = GameStatePause;


GameStatePause.prototype.initialize = function(transferObj = null) {
    this.messageQueue = new MessageQueue();
    this.messageQueue.initialize(2);
    this.messageQueue.registerListener('UICommand', this, this.doUICommand);
    
    // create the end-of-game message display, based on the passed-in object
    this.createDisplayMessage();

    this.bgm = transferObj.bgmObj;

    // highlight the first highlightable item (this code duplicates the ArrorDown key handler. I'm being really lazy/sloppy with the code here)
    this.highlightedItemIndex = (this.highlightedItemIndex + 1) % this.uiItems.length;
    while (this.uiItems[this.highlightedItemIndex].isSelectable != true) {
        this.highlightedItemIndex = (this.highlightedItemIndex + 1) % this.uiItems.length;
    }
    this.highlightedItem = this.uiItems[this.highlightedItemIndex];

};


GameStatePause.prototype.cleanup = function() {
    this.uiItems = [];
    if (this.bgm) {
        this.bgm.stop();
    }
};


GameStatePause.prototype.preRender = function(canvasContext, dt_s) {
};

// Create the game over display message (using menu/ui items)
GameStatePause.prototype.createDisplayMessage = function(configObj = null) {
    // Just decided on 2018-10-16 to actually execute on using a function to create the display message for game states (i.e., for all game states going forward. Before, the display message had been created in the initialize() function)
    // A couple of vars to control layout. NOTE: next time around, we'll use a layout object of some sort (maybe a JSON layout?)
    var yNDC = 0.55;
    var ySpacing = 0.1;

    var objectIDForCharacterNameLookup = "";
    var shipObjectID = "";
    var characterName = "";

    this.uiItems.push( new uiItemText("Resume Game", "32px", "MenuFont", "white", 0.5, 0.72, "center", "middle", {"command": "resumeState", "params": null}) );  // Currently, stateName is the name of the state obj (var) in the global scope
    this.uiItems.push( new uiItemText("Return to Main Menu", "36px", "MenuFont", "white", 0.5, 0.85, "center", "middle", {"command": "exitGame", "params": null}) ); // TODO make sure that we properly clean up the playing state properly if we exit straight to the main menu from here. Possibly pass a parameter to somehow instruct Playing to clean itself up. Or, make the command here call a function that exits the game (cleans up the gameLogic object and the Playing State
};

GameStatePause.prototype.render = function(canvasContext, dt_s) {
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


GameStatePause.prototype.postRender = function(canvasContext, dt_s) {
    this.processMessages(dt_s);
};


GameStatePause.prototype.handleKeyboardInput = function(evt) {
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


GameStatePause.prototype.processMessages = function(dt_s) {
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


GameStatePause.prototype.doUICommand = function(msg) {
    // Take action on a message with topic, "UICommand"
    // UICommand messages contain a command, a targetObj (i.e. who's going to execute the command), and a params list
    // The command is most likely to call a function. This is not quite a function callback, because we are not storing a pre-determined function ptr
    //console.log("In doUICommand(), with msg = ", msg);

    switch (msg.command) {
        // TODO probably remove changeState
        case "changeState":
            gameStateMgr.changeState(gameStateMgr.stateMap[msg.params.stateName]);
            break;
        case "resumeState":
            gameStateMgr.resumeState();
            break;
        case "exitGame":
            this.exitGame()
            break;
    }
};


// Exit the game
// Call cleanup() on GameStatePlaying, and also clean up the gameLogic object
GameStatePause.prototype.exitGame = function() {
    // Reach straight into the game state manager to get the playing game state (NVM: possibly make a function, getState())
    gameStateMgr.stateMap["Playing"].cleanup()

    // "Dequeue" a state off the front of the state array/stack/queue thing (do this because the
    // Paused state is at the "top" of the stack (which is implemented with an array); however,
    // the Playing state is also on the stack. If we don't remove the Playing state, it will still
    // be on the stack when we return to the MainMenu
    gameStateMgr.states.shift(1);

    // Call gameStateMgr.changeState directly from here (we could also enqueue a changeState meessage at this point, and let the message processor handle it in its next message queue iteration, but.. meh
    // This calls the current state's cleanup()
    gameStateMgr.changeState( gameStateMgr.stateMap["MainMenu"] );
};
