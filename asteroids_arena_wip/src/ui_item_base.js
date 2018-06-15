function uiItemBase() {
    this.cmd = null;                // maybe add a function to set the command.. whatever needs to happen
    this.boundObj = null;           // Object that contains configs/settings/whatever that this UI item is bound to
    this.boundKey = "";             // key/path to settings/config item that this item is bound to
    this.boundVal = null;
    this.isActive = false;          // Set to true if the user has activated this item
    this.actionMsg = null;          // A "message object" that will be enqueued in the message queue for the menu that owns this control (e.g., actionMsg can be a message to change state)
    this.isSelectable = false;      // "Selectable" means the item can be "activated" for interaction (e.g., a text box the user types in, or a value spinner)
                                    // A button is not "selectable" because it triggers an action immediately when the user presses the appropriate button (key/mouse/touch)
}


uiItemBase.prototype.draw = function(canvasContext) {
    throw new Error("Function must be implemented by subclass");
};

uiItemBase.prototype.initialize = function() {
    // By default, do nothing; but in some cases, subclasses will need to take some action
};

uiItemBase.prototype.getWidth = function() {
    throw new Error("Function must be implemented by subclass");
};

uiItemBase.prototype.setBoundObj = function(obj) {
    // Set a reference to the object that this UI item is bound to
    this.boundObj = obj;
};

uiItemBase.prototype.setBoundKey = function(key) {
    // Set the path to the bound data
    // ideally should be a simple key, like "myData"
    // So the idea is that this.boundObj[this.boundKey] gives you access to the data
    this.boundKey = key
};

// Set the value of object bound to this UI item
// Assumptions:
// - this.boundObj and this.boundKey are not null
uiItemBase.prototype.setBoundValue = function(value) {
    // Set the value of the bound object
    this.boundObj[this.boundKey] = value
};


uiItemBase.prototype.getBoundValue = function() {
    return this.boundObj[this.boundKey];
}; 


uiItemBase.prototype.setActiveTrue = function() {
    // To be called by a menu/form, when the user does something to activate this UI item
    this.isActive = true;
};


uiItemBase.prototype.setActiveFalse = function() {
    // To be called by a menu/form, when the user does something to deactivate this UI item
    this.isActive = false;
};


// params is a dict/obj, with an "event" key
uiItemBase.prototype.handleUserInput = function(params) {
    throw new Error("handleUserInput must be implemented by child/subclasses");
}
