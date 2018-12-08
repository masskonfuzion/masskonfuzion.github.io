function GameStateCredits() {
    GameStateBase.call(this);
    this.uiItems = [];
    this.messageQueue = null;

    this.highlightedItemIndex = 0;
    this.highlightedItem = null;    // Highlighted item, not necessarily selected/active

    this.activeItemIndex = -1;      // -1 means "no active selection"; but probably rely on the value of activeItem itself to determine whether or not the user is interacting with an item
    this.activeItem = null;         // Active/selected item

    this.bgm = null;
}

GameStateCredits.prototype = Object.create(GameStateBase.prototype);
GameStateCredits.prototype.constructor = GameStateCredits;

GameStateCredits.prototype.initialize = function(transferObj = null) {
    this.messageQueue = new MessageQueue();
    this.messageQueue.initialize(2);
    this.messageQueue.registerListener('UICommand', this, this.doUICommand);

    this.uiItems.push( new uiItemText("Mass KonFuzion did everything...", "32px", "MenuFont", "white", 0.5, 0.72, "center", "middle", null) );  // Currently, stateName is the name of the state obj (var) in the global scope
    this.uiItems.push( new uiItemText("Return", "36px", "MenuFont", "white", 0.5, 0.85, "center", "middle", {"command": "changeState", "params": {"stateName": "MainMenu"}}) );  // Currently, stateName is the name of the state obj (var) in the global scope

    // highlight the first highlightable item (this code duplicates the ArrorDown key handler. I'm being really lazy/sloppy with the code here)
    this.highlightedItemIndex = (this.highlightedItemIndex + 1) % this.uiItems.length;
    while (this.uiItems[this.highlightedItemIndex].isSelectable != true) {
        this.highlightedItemIndex = (this.highlightedItemIndex + 1) % this.uiItems.length;
    }
    this.highlightedItem = this.uiItems[this.highlightedItemIndex];

    // TODO move bgm out to a sound/resource manager. We're just testing here -- make the BGM/sound manager global (or, at least not actually "global", but visible to all game states)
    if (transferObj && transferObj.bgmObj) {
        this.bgm = transferObj.bgmObj;
    }
    else {
        // TODO replace with a sound asset located in the repository (and uploaded to origin)
        this.bgm = new Sound("assets/sounds/masskonfuzion-break_some_rocks.mp3", {"loop": true});
        this.bgm.play({"volume": 1.0});     // TODO move bgm out to a sound/resource manager
    }
};

GameStateCredits.prototype.cleanup = function() {
    this.uiItems = [];

    // "if" here, because this.bgm might be null, depending on which state we're switching to. See GameStateMainMenu.prototype.doUICommand
    if (this.bgm) {
        this.bgm.stop();    // TODO move bgm out to a sound/resource manager
    }
};

GameStateCredits.prototype.render = function(canvasContext, dt_s) {
    canvasContext.save();
    canvasContext.setTransform(1,0,0,1,0,0);    // Reset transformation (similar to OpenGL loadIdentity() for matrices)

    // Clear the canvas (note that the game application object is global)
    canvasContext.fillStyle = 'black';
    canvasContext.fillRect(0,0, canvasContext.canvas.width, canvasContext.canvas.height);

    // Set the transform for the image
    canvasContext.save();
    canvasContext.setTransform(1,0,0,1,400,150);    // Reset transformation (similar to OpenGL loadIdentity() for matrices) TODO maybe don't hardcode image coordinates
    
    // Dab on 'em
    // TODO 2018-10-09: Now that there's a uiItemImage type, maybe we can make the dab unicorn a UI Item?
    var imgObj = game.imgMgr.imageMap["dab"].imgObj;    // TODO I hate the syntax of getting an img object. Change it/wrap it in a function call. Do something. Fix it!!
    canvasContext.drawImage(imgObj, -imgObj.width / 2, -imgObj.height / 2);

    canvasContext.restore();    // "pop" the transform

    // Draw UI items
    for (var item of this.uiItems) {
        item.draw(canvasContext);
    }

    // Draw highlight box around currently highlightedItem (should really be part of a Menu/UI class)
    // TODO look at the alignment of the highlighted item - adjust highlight position based on left/center/align (actual text rendering position seems to be affected by that)
    var hlItem = this.uiItems[this.highlightedItemIndex];
    var hlWidth = Math.ceil( hlItem.getWidth(canvasContext) * 1.5 );
    var hlHeight = Math.ceil( hlItem.getHeight(canvasContext) * 1.5);
    var hlX = Math.floor(MathUtils.lerp(hlItem.posNDC[0], 0, canvasContext.canvas.width) - hlWidth/2);
    var hlY = Math.floor(MathUtils.lerp(hlItem.posNDC[1], 0, canvasContext.canvas.height) - hlHeight/2);

    canvasContext.lineWidth = 3;
    canvasContext.strokeStyle = "yellow";
    canvasContext.strokeRect(hlX, hlY, hlWidth, hlHeight);

    canvasContext.restore();
};

GameStateCredits.prototype.postRender = function(canvasContext, dt_s) {
    this.processMessages(dt_s);
};

GameStateCredits.prototype.handleKeyboardInput = function(evt) {
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


GameStateCredits.prototype.processMessages = function(dt_s) {
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


GameStateCredits.prototype.doUICommand = function(msg) {
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
