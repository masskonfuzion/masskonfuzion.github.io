function uiItemBase() {
    this.cmd = null;                // maybe add a function to set the command.. whatever needs to happen
}


uiItemBase.prototype.draw = function(canvasContext) {
    throw new Error("Function must be implemented by subclass");
};

uiItemBase.prototype.getWidth = function() {
    throw new Error("Function must be implemented by subclass");
};
