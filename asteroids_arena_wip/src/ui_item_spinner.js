function uiItemSpinner(text, size, fontFamily, color, ndcX, ndcY, align, baseline, actionMsg) {
    this.size = size;               // Can be whatever CSS will accept  - must be defined somewhere in the scope of the game
    this.font = fontFamily;         // this should be the str as called by the canvasContext, e.g. "18px FontName"
    this.align = align == null ? "left" : align;    // can be "left", "center", or "right"
    this.baseline = baseline == null ? "top" : baseline;    // specifies the baseline (vertical align)
    this.color = color;             // can be words (e.g. "white") or rgb codes (e.g. "#ffffff")
    this.posNDC = [ndcX, ndcY];
    // TODO remove this.text -- there is no "this.text" in a spinner; it's either "" or a bound value
    this.text = text;
    this.actionMsg = actionMsg == null ? null : actionMsg;             // A message object that can be enqueued into a message/event queue, and handled when needed (NOTE: the UI must have a message/event handler for this message)
    this.isSelectable = true;

    this.selectableValues = [];
    this.valueIndex = -1;
}

uiItemSpinner.prototype = Object.create(uiItemBase.prototype);
uiItemSpinner.prototype.constructor = uiItemSpinner;

uiItemSpinner.prototype.draw = function(canvasContext) {
    // TODO figure out text alignment -- might be able to use a native canvas call? research
    canvasContext.font = this.size + " " + this.font;
    canvasContext.fillStyle = this.color;
    canvasContext.textAlign = this.align;
    canvasContext.textBaseline = this.baseline;

    var textToDisplay = this.text == null ? this.boundObj[this.boundKey].toString() : this.text;
    canvasContext.fillText(textToDisplay, MathUtils.lerp(this.posNDC[0], 0, canvasContext.canvas.width), MathUtils.lerp(this.posNDC[1], 0, canvasContext.canvas.height));
    
};

// for measuring width of text/fonts, must pass in the canvas context
uiItemSpinner.prototype.getWidth = function(canvasContext) {
    // set the canvas font, so we can measure text
    canvasContext.font = this.size + " " + this.font;
    //return canvasContext.measureText(this.text).width;
    return canvasContext.measureText(this.boundObj[this.boundKey].toString()).width;
};

// Get height of text UI item
// Assumption: the font size is given in px
// TODO: find a better way to determine ui item height programmatically
// we pass in canvasContext, but there apparently is no good way to measure the height of font/text
uiItemSpinner.prototype.getHeight = function(canvasContext) {
    var size = this.size.split("px")[0] * 1.0; // I hate this (JavaScript implicit type casting... I hate this, I hate this, I hate this.. But it works)
    return size;
};


// Set the list of selectable values - to keep things simple (for me, the API programmer), the
// end user of this API must always supply a list of values
uiItemSpinner.prototype.setSelectableValues = function(theData) {
    // We can simply "copy" the list -- our data item will have a reference to the list being
    // passed into the function
    this.selectableValues = theData;
};


// Set this.valueIndex by finding this spinner's bound value in the selectable values list
// Assumption:
// - boundObj and boundKey are set
// - selectableValues has been set
// - the value of boundObj[boundKey] is in the selectableValues list
uiItemSpinner.prototype.getValueIndexFromBoundValue = function() {
    this.valueIndex = this.selectableValues.indexOf(this.boundObj[this.boundKey]);

    if (this.valueIndex < 0) {
        throw new Error("Spinner has mismatched boundValue / selectableValues");
    }
};


uiItemSpinner.prototype.handleUserInput = function(params) {
    switch(params["event"]) {
        case "ActiveUIItem_HandleEvent_KeyDown_ArrowRight":
            if (this.boundObj) {
                this.valueIndex = (this.valueIndex + 1) % this.selectableValues.length
                this.setBoundValue(this.selectableValues[this.valueIndex]); // setBoundValue is in the base class
            }
            break;

        case "ActiveUIItem_HandleEvent_KeyDown_ArrowLeft":
            if (this.boundObj) {
                this.valueIndex = ((this.valueIndex + this.selectableValues.length) - 1) % this.selectableValues.length
                this.setBoundValue(this.selectableValues[this.valueIndex]); // setBoundValue is in the base class
            }
            break;
    }
};
