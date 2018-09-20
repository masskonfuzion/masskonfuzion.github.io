// TODO make sure these codes work for, e.g., foreign keyboard layouts. In JS, the 'code' might be, e.g. "KeyQ" for q in QWERTY, but it might be ` in Dvorak (or something like that). Combine 'code' with 'key' to get the actual key pressed

function uiItemTextInput(text, size, fontFamily, color, ndcX, ndcY, align, baseline, actionMsg) {
    this.size = size;               // Can be whatever CSS will accept  - must be defined somewhere in the scope of the game
    this.font = fontFamily;         // this should be the str as called by the canvasContext, e.g. "18px FontName"
    this.align = align == null ? "left" : align;    // can be "left", "center", or "right"
    this.baseline = baseline == null ? "top" : baseline;    // specifies the baseline (vertical align)
    this.color = color;             // can be words (e.g. "white") or rgb codes (e.g. "#ffffff")
    this.posNDC = [ndcX, ndcY];
    this.text = text;
    this.actionMsg = actionMsg == null ? null : actionMsg;             // A message object that can be enqueued into a message/event queue, and handled when needed (NOTE: the UI must have a message/event handler for this message)
    this.isSelectable = true;   // Hard-coded because any text input box must be selectable
}

uiItemTextInput.prototype = Object.create(uiItemBase.prototype);
uiItemTextInput.prototype.constructor = uiItemTextInput;

uiItemTextInput.prototype.draw = function(canvasContext) {
    // TODO figure out text alignment -- might be able to use a native canvas call? research
    canvasContext.font = this.size + " " + this.font;
    canvasContext.fillStyle = this.color;
    canvasContext.textAlign = this.align;
    canvasContext.textBaseline = this.baseline;

    var textToDisplay = this.text == null ? this.boundObj[this.boundKey].toString() : this.text;
    canvasContext.fillText(textToDisplay, MathUtils.lerp(this.posNDC[0], 0, canvasContext.canvas.width), MathUtils.lerp(this.posNDC[1], 0, canvasContext.canvas.height));
    
};

// for measuring width of text/fonts, must pass in the canvas context
uiItemTextInput.prototype.getWidth = function(canvasContext) {
    // set the canvas font, so we can measure text
    canvasContext.font = this.size + " " + this.font;
    return canvasContext.measureText(this.text).width;
};

// Get height of text UI item
// Assumption: the font size is given in px
// TODO: find a better way to determine ui item height programmatically
// we pass in canvasContext, but there apparently is no good way to measure the height of font/text
uiItemTextInput.prototype.getHeight = function(canvasContext) {
    var size = this.size.split("px")[0] * 1.0; // I hate this (JavaScript implicit type casting... I hate this, I hate this, I hate this.. But it works)
    return size;
};

// Set this.text from text input box's bound value in the selectable values list
// Assumption:
// - boundObj and boundKey are set
uiItemTextInput.prototype.getTextFromBoundValue = function() {
    this.text = this.boundObj[this.boundKey].toString();
};

uiItemTextInput.prototype.handleUserInput = function(params) {
    switch(params["event"]) {
        case "ActiveUIItem_HandleEvent_KeyUp_Misc":
            // TODO - upgrade this -- we really only want to take action on control characters (e.g. Backspace, delete); otherwise, print whatever (support other languages' diacritics)
            switch(params["eventObj"].key) {
                case "Backspace":
                    if (this.text.length > 0) {
                        this.text = this.text.substring(0, this.text.length - 1);
                    }
                break;

                case "a": case "b": case "c": case "d": case "e": case "f": case "g":
                case "h": case "i": case "j": case "k": case "l": case "m": case "n": case "o": case "p":
                case "q": case "r": case "s": case "t": case "u": case "v":
                case "w": case "x": case "y": case "z":
                case "A": case "B": case "C": case "D": case "E": case "F": case "G":
                case "H": case "I": case "J": case "K": case "L": case "M": case "N": case "O": case "P":
                case "Q": case "R": case "S": case "T": case "U": case "V":
                case "W": case "X": case "Y": case "Z":
                case "0": case "1": case "2": case "3": case "4": case "5": case "6": case "7": case "8": case "9":
                case "_": case "-": case " ":
                    this.text = this.text + params["eventObj"].key;
                break;
            }
            this.setBoundValue(this.text);
        break
    }
};
