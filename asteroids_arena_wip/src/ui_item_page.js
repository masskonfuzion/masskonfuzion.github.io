// TODO make pages of UI items
// The page itself will be what menus were (i.e. they'll have a list of items, active item, all that


// TODO also add other kinds of UI items (namely up/down and left/right arrow spinners, maybe text boxes, etc.


function uiItemPage() {
    uiItemBase.call(this);

    this.uiItems = [];
    this.activeItemIndex = 0;
    this.activeItem = this.uiItems[this.activeItemIndex];

}


uiItemPage.prototype = Object.create(uiItemBase.prototype);
uiItemPage.prototype.constructor = uiItemPage;


uiItemPage.prototype.draw = function(canvasContext) {
    for (var uiItem of this.uiItems) {
        uiItem.draw(canvasContext);
    }
};


uiItemPage.prototype.getWidth = function() {
    // Not sure what to do here (the Page is a collection of other uiItems, each of which will have its own width).. Maybe do nothing, but implement something, because the base class function

    // Maybe we can return the canvas width
    console.log("TODO implement uiItemPage.prototype.getWidth");
    return 
};

