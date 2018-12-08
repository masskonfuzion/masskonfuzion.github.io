function GameStateMainMenu() {
    // NVM: Menu should be arranged in "levels" or some such. Each level is a tree node. Each level can have 1 or more "pages" of configurable options. uiItems on pages can be mapped to a config item in a "config object" (a dict/associative array or whatever). The menu can have "accepted inputs" for navigation (keyboard keys/mouse/touch controls for navigation, confirming/canceling selections, etc). The uiItems can be configured with function callbacks or something, so that when the user enters various input, the menu takes the appropriate action. The menu should have a messageQueue, like the gameLogic object in the gameplaying state, for accepting input and such. Do it
    // ^^ For what it's worth... UI items should be dictated by a "layout" of some sort
    GameStateBase.call(this);

    this.messageQueue = null;

    this.uiItems = [];
    this.highlightedItemIndex = 0;
    this.highlightedItem = null;    // Highlighted item, not necessarily selected/active

    this.activeItemIndex = -1;      // -1 means "no active selection"; but probably rely on the value of activeItem itself to determine whether or not the user is interacting with an item
    this.activeItem = null;         // Active/selected item

    this.bgm = null;
}

GameStateMainMenu.prototype = Object.create(GameStateBase.prototype);
GameStateMainMenu.prototype.constructor = GameStateMainMenu;


GameStateMainMenu.prototype.initialize = function(transferObj = null) {
    this.messageQueue = new MessageQueue();
    this.messageQueue.initialize(2);
    this.messageQueue.registerListener('UICommand', this, this.doUICommand);
    
    // NOTE: game is a global object
    this.uiItems.push( new uiItemText("Asteroids Arena", "96px", "MenuFont", "lightgray", 0.503, 0.203, "center", "middle") );
    this.uiItems.push( new uiItemText("Asteroids Arena", "96px", "MenuFont", "white", 0.50, 0.2, "center", "middle") );
    this.uiItems.push( new uiItemText("Asteroids Arena", "96px", "MenuFont", "yellow", 0.497, 0.197, "center", "middle") );

    this.uiItems.push( new uiItemText("Play Game", "36px", "MenuFont", "white", 0.5, 0.45, "center", "middle", {"command": "changeState", "params": {"stateName": "ShipSelect", "sendBGM": true}}) );  // stateName is the name of the state obj in the global scope
    this.uiItems.push( new uiItemText("Settings", "32px", "MenuFont", "white", 0.5, 0.55, "center", "middle", {"command": "changeState", "params": {"stateName": "Settings", "sendBGM": true}}) );
    this.uiItems.push( new uiItemText("How to Play", "32px", "MenuFont", "white", 0.5, 0.65, "center", "middle", {"command": "changeState", "params": {"stateName": "HowToPlay", "sendBGM": true}}) );
    this.uiItems.push( new uiItemText("High Scores", "32px", "MenuFont", "white", 0.5, 0.75, "center", "middle", {"command": "changeState", "params": {"stateName": "HighScores", "sendBGM": true}}) );   // Not sending BGM to the Credis state, because we want that state to have its own BGM (like a cool remix of "How Great Thou Art")
    this.uiItems.push( new uiItemText("Credits", "32px", "MenuFont", "white", 0.5, 0.85, "center", "middle", {"command": "changeState", "params": {"stateName": "Credits", "sendBGM": false}}) );   // Not sending BGM to the Credis state, because we want that state to have its own BGM

    // TODO move bgm out to a sound/resource manager. We're just testing here -- make the BGM/sound manager global (or, at least not actually "global", but visible to all game states)
    if (transferObj && transferObj.bgmObj) {
        this.bgm = transferObj.bgmObj;
    }
    else {
        this.bgm = new Sound("assets/sounds/masskonfuzion-horizon.mp3", {"loop": true});
        this.bgm.play({"volume": 0.7});     // TODO move bgm out to a sound/resource manager
    }

    this.activeItemIndex = -1;
    this.activeItem = null;         // Active/selected item

    // highlight the first highlightable item (this code duplicates the ArrorDown key handler. I'm being really lazy/sloppy with the code here)
    this.highlightedItemIndex = (this.highlightedItemIndex + 1) % this.uiItems.length;
    while (this.uiItems[this.highlightedItemIndex].isSelectable != true) {
        this.highlightedItemIndex = (this.highlightedItemIndex + 1) % this.uiItems.length;
    }
    this.highlightedItem = this.uiItems[this.highlightedItemIndex];

};

GameStateMainMenu.prototype.cleanup = function() {
    // "if" here, because this.bgm might be null, depending on which state we're switching to. See GameStateMainMenu.prototype.doUICommand
    if (this.bgm) {
        this.bgm.stop();    // TODO move bgm out to a sound/resource manager
    }
};

GameStateMainMenu.prototype.preRender = function(canvasContext, dt_s) {
};

GameStateMainMenu.prototype.render = function(canvasContext, dt_s) {
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


GameStateMainMenu.prototype.postRender = function(canvasContext, dt_s) {
    this.processMessages(dt_s);
};


GameStateMainMenu.prototype.handleKeyboardInput = function(evt) {
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


GameStateMainMenu.prototype.processMessages = function(dt_s) {
    // dt_s is not used specifically by processMessages, but is passed in in case functions called by processMessages need it
    //console.log('MessageQueue has ' + this.messageQueue.numItems() + ' items in it');

    while (!this.messageQueue._empty) {
        //console.log('Processing message');
        // NOTE: If the queue is initialized with dummy values, then this loop will iterate over dummy values
        // It may be better to use a queue that is has an actual empty array when the queue is empty
        // That way, this loop will not run unless items actually exist in the queue
        var msg = this.messageQueue.dequeue();

        //console.log('Iterating over topic: ' + msg.topic);

        for (var handler of this.messageQueue._registeredListeners[msg.topic]) {
            handler["func"].call(handler["obj"], msg);
        }
    }
};


GameStateMainMenu.prototype.doUICommand = function(msg) {
    // Take action on a message with topic, "UICommand"
    // UICommand messages contain a command, a targetObj (i.e. who's going to execute the command), and a params list
    // The command is most likely to call a function. This is not quite a function callback, because we are not storing a pre-determined function ptr
    //console.log("In doUICommand(), with msg = ", msg);

    switch (msg.command) {
        case "changeState":
            // call the game state manager's changestate function
            // NOTE gameStateMgr is global, because I felt like making it that way. But we could also have the GameStateManager handle the message (instead of having this (active game state) handle the message, by calling a GameStateManager member function
            // Note: if you saw the BGM transfer logic in game_logic.js, you'll notice that it's different here. We are building a transferObj here, whereas in game_logic.js, the obj is already constructed by this point.

            var transferObj;
            if (msg.params.sendBGM) {
                var transferBGM = this.bgm;
                this.bgm = null;

                transferObj = { "bgmObj": transferBGM }
            }
            else {
                transferObj = null;
            }

            gameStateMgr.changeState(gameStateMgr.stateMap[msg.params.stateName], transferObj);
            break;
    }

};
