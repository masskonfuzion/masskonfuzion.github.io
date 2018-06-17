function GameStateSettings() {
    GameStateBase.call(this);
    this.messageQueue = null;

    // The following members should really be members of a Menu/UI class. Maybe I'll still implement that..
    this.uiItems = [];

    this.highlightedItemIndex = 0;
    this.highlightedItem = null;    // Highlighted item, not necessarily selected/active

    this.activeItemIndex = -1;      // -1 means "no active selection"; but probably rely on the value of activeItem itself to determine whether or not the user is interacting with an item
    this.activeItem = null;         // Active/selected item
}

GameStateSettings.prototype = Object.create(GameStateBase.prototype);
GameStateSettings.prototype.constructor = GameStateSettings;

GameStateSettings.prototype.initialize = function(transferObj = null) {
    this.messageQueue = new MessageQueue();
    this.messageQueue.initialize(2);
    this.messageQueue.registerListener('UICommand', this, this.doUICommand);

    // TODO Implement other UI items (i.e., pictures)
    this.uiItems.push( new uiItemText("General", "32px", "MenuFont", "white", 0.05, 0.05, "left", "middle") );

    // TODO move game mode setting into a "Mode Select" screen that is presented when the user selects to Play Game
    this.uiItems.push( new uiItemText("Game Mode", "24px", "MenuFont", "white", 0.05, 0.1, "left", "middle") );

    var uiItemGameModeSetting = new uiItemSpinner(null, "24px", "MenuFont", "white", 0.25, 0.1, "left", "middle");
    uiItemGameModeSetting.setSelectableValues( ["Death Match", "Time Attack" ] );
    uiItemGameModeSetting.setBoundObj(game.settings.visible);
    uiItemGameModeSetting.setBoundKey("gameMode");
    uiItemGameModeSetting.getValueIndexFromBoundValue();  // We have to call this to get the spinner to "know" which of its selectableValues is selected
    this.uiItems.push( uiItemGameModeSetting );


    this.uiItems.push( new uiItemText("Difficulty", "24px", "MenuFont", "white", 0.55, 0.1, "left", "middle") );
    this.uiItems.push( new uiItemText("( TODO )", "24px", "MenuFont", "white", 0.75, 0.1, "left", "middle") );
    this.uiItems.push( new uiItemText("DeathMatch Options", "32px", "MenuFont", "white", 0.05, 0.2, "left", "middle") );

    this.uiItems.push( new uiItemText("Kills Count", "24px", "MenuFont", "white", 0.05, 0.25, "left", "middle") );

    var uiItemKillsCountSetting = new uiItemSpinner(null, "24px", "MenuFont", "white", 0.25, 0.25, "left", "middle");
    uiItemKillsCountSetting.setSelectableValues( [5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50] );
    // ^^ because I didn't feel like writing a function to initialize the selectable values by using a range (like start=5, end=50, step=1)
    // selectable values must be set before synchronizing bound value to selectable values list
    // This list could also come from "invisible" settings... but then again... maybe not; because end users could hack that
    uiItemKillsCountSetting.setBoundObj(game.settings.visible.gameModeSettings.deathMatch);
    uiItemKillsCountSetting.setBoundKey("shipKills");
    uiItemKillsCountSetting.getValueIndexFromBoundValue();  // We have to call this to get the spinner to "know" which of its selectableValues is selected
    this.uiItems.push( uiItemKillsCountSetting );

    this.uiItems.push( new uiItemText("Timer Attack Options", "32px", "MenuFont", "white", 0.05, 0.35, "left", "middle") );
    this.uiItems.push( new uiItemText("Time Limit", "24px", "MenuFont", "white", 0.05, 0.40, "left", "middle") );
    
    var uiItemTimeLimitSetting = new uiItemSpinner(null, "24px", "MenuFont", "white", 0.25, 0.40, "left", "middle");
    uiItemTimeLimitSetting.setSelectableValues( [ "1:00", "2:00", "3:00", "4:00", "5:00", "6:00", "7:00", "8:00", "9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00", "24:00", "25:00", "26:00", "27:00", "28:00", "29:00", "30:00" ] );
    uiItemTimeLimitSetting.setBoundObj(game.settings.visible.gameModeSettings.timeAttack);
    uiItemTimeLimitSetting.setBoundKey("timeLimit");
    uiItemTimeLimitSetting.getValueIndexFromBoundValue();  // We have to call this to get the spinner to "know" which of its selectableValues is selected
    this.uiItems.push( uiItemTimeLimitSetting );


    this.uiItems.push( new uiItemText("Controls", "32px", "MenuFont", "white", 0.55, 0.2, "left", "middle") );
    this.uiItems.push( new uiItemText("Thrust", "24px", "MenuFont", "white", 0.55, 0.25, "left", "middle") );
    this.uiItems.push( new uiItemText("W", "24px", "MenuFont", "white", 0.75, 0.25, "left", "middle") );
    this.uiItems.push( new uiItemText("Turn Left", "24px", "MenuFont", "white", 0.55, 0.3, "left", "middle") );
    this.uiItems.push( new uiItemText("A", "24px", "MenuFont", "white", 0.75, 0.3, "left", "middle") );
    this.uiItems.push( new uiItemText("Turn Right", "24px", "MenuFont", "white", 0.55, 0.35, "left", "middle") );
    this.uiItems.push( new uiItemText("D", "24px", "MenuFont", "white", 0.75, 0.35, "left", "middle") );
    this.uiItems.push( new uiItemText("Fire", "24px", "MenuFont", "white", 0.55, 0.4, "left", "middle") );
    this.uiItems.push( new uiItemText("L Shift", "24px", "MenuFont", "white", 0.75, 0.4, "left", "middle") );

    this.uiItems.push( new uiItemText("Return", "36px", "MenuFont", "white", 0.5, 0.85, "center", "middle", {"command": "changeState", "params": {"stateName": "MainMenu"}}) );  // Currently, stateName is the name of the state obj (var) in the global scope

    // highlight the first highlightable item (this code duplicates the ArrorDown key handler. I'm being really lazy/sloppy with the code here)
    this.highlightedItemIndex = (this.highlightedItemIndex + 1) % this.uiItems.length;
    while (this.uiItems[this.highlightedItemIndex].isSelectable != true) {
        this.highlightedItemIndex = (this.highlightedItemIndex + 1) % this.uiItems.length;
    }
    this.highlightedItem = this.uiItems[this.highlightedItemIndex];
};

GameStateSettings.prototype.cleanup = function() {
    this.uiItems = [];

    // Save settings to localStorage. We have to JSON.stringify() the object, because localStorage wants key/value pairs of strings (even numbers get saved as strings)
    // TODO maybe the localStorage saving shouldn't happen in cleanup(), but in the handler for the return action
    localStorage.setItem('settings', JSON.stringify(game.settings));
};

GameStateSettings.prototype.render = function(canvasContext, dt_s) {
    canvasContext.save();
    canvasContext.setTransform(1,0,0,1,0,0);    // Reset transformation (similar to OpenGL loadIdentity() for matrices)

    // Clear the canvas (note that the game application object is global)
    canvasContext.fillStyle = 'black';
    canvasContext.fillRect(0,0, canvasContext.canvas.width, canvasContext.canvas.height);

    // Draw UI items. (Should really be part of the render() or draw() method of a Menu/UI class
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
    
    canvasContext.strokeStyle = this.activeItem == null ? "yellow" : "red";
    canvasContext.strokeRect(hlX, hlY, hlWidth, hlHeight);

    canvasContext.restore();
};

GameStateSettings.prototype.postRender = function(canvasContext, dt_s) {
    this.processMessages(dt_s);
};

GameStateSettings.prototype.handleKeyboardInput = function(evt) {
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
            case "ArrowLeft":
                var cmdMsg = { "topic": "UICommand",
                               "targetObj": this,
                               "command": "sendUserInputToActiveItem",
                               "params": { "event": "ActiveUIItem_HandleEvent_KeyDown_ArrowLeft" }
                             };
                this.messageQueue.enqueue(cmdMsg);
                break;
            case "ArrowRight":
                // NOTE: "ActiveUIItem_HandleEvent_KeyDown_ArrowRight and etc. will be used to trigger function calls in the UI Items.  This object (i.e., the menu/form will need to call the functions on the form's active items.
                // Side note: I don't like this design. It forces the menu/UI itself to call the functions that make the UI items handle their own internal data. That's ugly. If I ever have to write another UI, I'd have menus be an object in & of themselves. The menu objects would store the menu layout, and also, they'd have the functions necessary to handle user input and pass whatever needs to be passed into UI items.
                var cmdMsg = { "topic": "UICommand",
                               "targetObj": this,
                               "command": "sendUserInputToActiveItem",
                               "params": { "event": "ActiveUIItem_HandleEvent_KeyDown_ArrowRight" }
                             };
                this.messageQueue.enqueue(cmdMsg);
                break;
            case "Enter":
            case "Space":
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


GameStateSettings.prototype.processMessages = function(dt_s) {
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
            // TODO evaluate why we're storing the listeners as dicts {id: ref}; why not just use a list?
            handler["func"].call(handler["obj"], msg);
        }
    }
};


// Take action on a message with topic, "UICommand"
GameStateSettings.prototype.doUICommand = function(msg) {
    // UICommand messages contain a command, a targetObj (i.e. who's going to execute the command), and a params list
    // The command is most likely to call a function. This is not quite a function callback, because we are not storing a pre-determined function ptr
    //console.log("In doUICommand(), with msg = ", msg);

    switch (msg.command) {
        case "changeState":
            // call the game state manager's changestate function
            // NOTE gameStateMgr is global, because I felt like making it that way. But we could also have the GameStateManager handle the message (instead of having this (active game state) handle the message, by calling a GameStateManager member function
            gameStateMgr.changeState(gameStateMgr.stateMap[msg.params.stateName]);
            break;

        case "sendUserInputToActiveItem":
            if (this.activeItem) {
                this.sendUserInputToActiveItem(msg.params);
            }
            break;
    }
};


// Send a user input event to the active/selected item in this menu.
// NOTE: Any GameStates that want to implement a menu/UI must implement this function.
// Menus/UIs are not structured as objects
GameStateSettings.prototype.sendUserInputToActiveItem = function(params) {
    this.activeItem.handleUserInput(params);
};
