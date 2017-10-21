function GameObject () {
    this.components = {};
    this.commandMap = {};   // Map of commands to functions to run, to execute those commands. e.g. { "doStuff": this.doMyThing }
    this.parentObj = null;  // TODO replace all GameObjectComponent subclass calls with GameObject (now that GameObject has a parentObj property)
    this.objectID = -1;
}

GameObject.prototype.update = function(dt_s, config = null) {
    console.assert(this !== GameObject.prototype);
};

GameObject.prototype.executeCommand = function(cmdMsg, params) {
    console.assert(this !== GameObject.prototype);
};

GameObject.prototype.addComponent = function(compType, compObj) {
    compObj.parentObj = this;  // Set parent obj. Felt like overkill to make a function in the component class, so it's done here

    // For simplicity, compType will be a string (like "render" or "physics")
    this.components[compType] = compObj;
};

GameObject.prototype.getComponent = function(compType) {
    if (compType in this.components && this.components.hasOwnProperty(compType)) {
        return this.components[compType];
    }

    return null;
};
