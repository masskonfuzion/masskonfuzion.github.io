function GameStateSettings() {
    GameStateBase.call(this);
    this.uiItems = [];

    // TODO maybe keep a 2nd list of "selectable UI items". Then, change the uiItems.push call into a call that encapsulates adding the item to the displayable UI items list, vs the selectable UI items list. (i.e., some items are meant to be displayed only). And/or implement other UI items (i.e., pictures)
    this.uiItems.push( new uiItemText("TBD / Still TODO", "32px", "MenuFont", "white", 0.5, 0.5, "center", "middle") );
    this.uiItems.push( new uiItemText("Return", "36px", "MenuFont", "white", 0.5, 0.85, "center", "middle", {"command": "changeState", "params": {"stateName": "MainMenu"}}) );  // Currently, stateName is the name of the state obj (var) in the global scope

    this.activeItemIndex = 0;
    this.activeItem = this.uiItems[this.activeItemIndex];

    this.messageQueue = null;

}

GameStateSettings.prototype = Object.create(GameStateBase.prototype);
GameStateSettings.prototype.constructor = GameStateSettings;

GameStateSettings.prototype.initialize = function(transferObj = null) {
    this.messageQueue = new MessageQueue();
    this.messageQueue.initialize(2);
    this.messageQueue.registerListener('UICommand', this, this.doUICommand);

    this.activeItemIndex = this.uiItems.length - 1;   // Select the last item (i.e., the "Return" item -- do this because the credits item is selectable. It shouldn't be, but I'm being lazy... :-D)
    this.activeItem = this.uiItems[this.activeItemIndex];
};

GameStateSettings.prototype.cleanup = function() {
};

GameStateSettings.prototype.render = function(canvasContext, dt_s) {
    canvasContext.save();
    canvasContext.setTransform(1,0,0,1,0,0);    // Reset transformation (similar to OpenGL loadIdentity() for matrices)

    // Clear the canvas (note that the game application object is global)
    canvasContext.fillStyle = 'black';
    canvasContext.fillRect(0,0, canvasContext.canvas.width, canvasContext.canvas.height);

    // Draw UI items
    for (var item of this.uiItems) {
        item.draw(canvasContext);
    }

    // Highlight active item
    // TODO call getWidth() on active item; round up to nearest int (e.g. because measureText() returns float); multiply by 1.5. Make a rect
    var hlItem = this.uiItems[this.activeItemIndex];
    var hlWidth = Math.ceil( hlItem.getWidth(canvasContext) * 1.5 );
    var hlHeight = Math.ceil( hlItem.getHeight(canvasContext) * 1.5);
    var hlX = Math.floor(MathUtils.lerp(hlItem.posNDC[0], 0, canvasContext.canvas.width) - hlWidth/2);
    var hlY = Math.floor(MathUtils.lerp(hlItem.posNDC[1], 0, canvasContext.canvas.height) - hlHeight/2);

    canvasContext.lineWidth = 3;
    canvasContext.strokeStyle = "yellow";
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
                this.activeItemIndex = (this.activeItemIndex + this.uiItems.length - 1) % this.uiItems.length;
                break;
            case "ArrowDown":
                this.activeItemIndex = (this.activeItemIndex + 1) % this.uiItems.length;
                break;
            case "Enter":
            case "Space":
                // Enqueue an action to be handled in the postRender step. We want all actions (e.g. state changes, etc.) to be handled in postRender, so that when the mainloop cycles back to the beginning, the first thing that happens is the preRender step in the new state (if the state changed)
                var cmdMsg = { "topic": "UICommand",
                               "targetObj": this,
                               "command": this.uiItems[this.activeItemIndex].actionMsg["command"],
                               "params": this.uiItems[this.activeItemIndex].actionMsg["params"]
                             };
                this.messageQueue.enqueue(cmdMsg);
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


GameStateSettings.prototype.doUICommand = function(msg) {
    // Take action on a message with topic, "UICommand"
    // UICommand messages contain a command, a targetObj (i.e. who's going to execute the command), and a params list
    // The command is most likely to call a function. This is not quite a function callback, because we are not storing a pre-determined function ptr
    //console.log("In doUICommand(), with msg = ", msg);

    switch (msg.command) {
        case "changeState":
            // call the game state manager's changestate function
            // NOTE gameStateMgr is global, because I felt like making it that way. But we could also have the GameStateManager handle the message (instead of having this (active game state) handle the message, by calling a GameStateManager member function
            gameStateMgr.changeState(gameStateMgr.stateMap[msg.params.stateName]);
            break;
    }

};
