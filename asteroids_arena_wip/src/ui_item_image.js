function uiItemImage(imgObjRef, ndcX, ndcY, align, baseline, actionMsg) {
    // NOTE: by default, uiItemImage uses images that have been loaded into the ImageManager (i.e. to use this ui item, you must have instantiated an ImageManager in your game/application)
    // uiItemImage can be a label (i.e. item cannot trigger actions) or a button (i.e. item can trigger actions)
    this.imgObj = imgObjRef;
    this.posNDC = [ndcX, ndcY];
    this.align = align == null ? "left" : align;            // can be "left", "center", or "right"  (we're using the same as for canvas text, even though images don't specifically take in an "align" param)
    this.baseline = baseline == null ? "top" : baseline;    // specifies the baseline (vertical align) (we're using the same as for canvas text, even though images don't specifically take in an "baseline" param)
    this.actionMsg = actionMsg == null ? null : actionMsg;             // A message object that can be enqueued into a message/event queue, and handled when needed (NOTE: the UI must have a message/event handler for this message)

    // If this text item can perform an action, then it is a "button", and is selectable
    if (this.actionMsg) {
        this.isSelectable = true;
    }

    switch(align) {
        default:
        case "left":
            this.align = 0;
            break;
        case "center":
            this.align = 0.5;
            break;
        case "right":
            this.align = 1.0;
            break;
    }

    switch(baseline) {
        default:
        case "top":
            this.baseline = 0;
            break;
        case "middle":
            this.baseline = 0.5;
            break;
        case "bottom":
            this.baseline = 1.0;
            break;
    }

}

uiItemImage.prototype = Object.create(uiItemBase.prototype);
uiItemImage.prototype.constructor = uiItemImage;

uiItemImage.prototype.draw = function(canvasContext) {
    canvasContext.drawImage(this.imgObj, MathUtils.lerp(this.posNDC[0] - (this.align * this.getWidth() / canvasContext.canvas.width), 0, canvasContext.canvas.width), MathUtils.lerp(this.posNDC[1] - (this.baseline * this.getHeight() / canvasContext.canvas.height), 0, canvasContext.canvas.height));
};

// for measuring width of text/fonts, must pass in the canvas context
uiItemImage.prototype.getWidth = function(canvasContext) {
    // set the canvas font, so we can measure text
    return this.imgObj.width;
};

// Get height of text UI item
// Assumption: the font size is given in px
// TODO: find a better way to determine ui item height programmatically
// we pass in canvasContext, but there apparently is no good way to measure the height of font/text
uiItemImage.prototype.getHeight = function(canvasContext) {
    return this.imgObj.height;
    return size;
};
