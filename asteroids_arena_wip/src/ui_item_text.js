function uiItemText(text, size, fontFamily, color, ndcX, ndcY, align, baseline, actionMsg) {
    // uiItemText can be a label (i.e. item cannot trigger actions) or a button (i.e. item can trigger actions)
    this.size = size;               // Can be whatever CSS will accept  - must be defined somewhere in the scope of the game
    this.font = fontFamily;         // this should be the str as called by the canvasContext, e.g. "18px FontName"
    this.align = align == null ? "left" : align;    // can be "left", "center", or "right"
    this.baseline = baseline == null ? "top" : baseline;    // can be "left", "center", or "right"
    this.color = color;             // can be words (e.g. "white") or rgb codes (e.g. "#ffffff")
    this.posNDC = [ndcX, ndcY];
    this.text = text;
    this.actionMsg = actionMsg == null ? null : actionMsg;             // A message object that can be enqueued into a message/event queue, and handled when needed (NOTE: the UI must have a message/event handler for this message)

    // If this text item can perform an action, then it is a "button", and is selectable
    if (this.actionMsg) {
        this.isSelectable = true;
    }
}

uiItemText.prototype = Object.create(uiItemBase.prototype);
uiItemText.prototype.constructor = uiItemText;

uiItemText.prototype.draw = function(canvasContext) {
    // TODO figure out text alignment -- might be able to use a native canvas call? research
    canvasContext.font = this.size + " " + this.font;
    canvasContext.fillStyle = this.color;
    canvasContext.textAlign = this.align;
    canvasContext.textBaseline = this.baseline;

    var textToDisplay = this.text == null ? this.boundObj[this.boundKey].toString() : this.text;
    canvasContext.fillText(textToDisplay, MathUtils.lerp(this.posNDC[0], 0, canvasContext.canvas.width), MathUtils.lerp(this.posNDC[1], 0, canvasContext.canvas.height));
    
};

// for measuring width of text/fonts, must pass in the canvas context
uiItemText.prototype.getWidth = function(canvasContext) {
    // set the canvas font, so we can measure text
    canvasContext.font = this.size + " " + this.font;
    return canvasContext.measureText(this.text).width;
};

// Get height of text UI item
// Assumption: the font size is given in px
// TODO: find a better way to determine ui item height programmatically
// we pass in canvasContext, but there apparently is no good way to measure the height of font/text
uiItemText.prototype.getHeight = function(canvasContext) {
    var size = this.size.split("px")[0] * 1.0; // I hate this (JavaScript implicit type casting... I hate this, I hate this, I hate this.. But it works)
    return size;
};
