// Some notes about render components:
// - to properly position them, you have to use canvas' translate/rotate functions (well, this is true for things like sprites, rectangles, circles, etc..)


// ----------------------------------------------------------------------------
// RenderComponentSprite
// ----------------------------------------------------------------------------
function RenderComponentSprite() {
    GameObjectComponent.call(this);

    // NOTE: We'll need to load all the images on the document.onload() -- so we might need an image manager (long-term), or to just simply has a list/array of image components we plan to draw, so we can check that they all loaded, and throw an error if any didn't
    this.imgObj = null;
}

RenderComponentSprite.prototype = Object.create(GameObjectComponent.prototype);
RenderComponentSprite.prototype.constructor = RenderComponentSprite;


RenderComponentSprite.prototype.setImgObj = function(imgObj) {
    this.imgObj = imgObj;
};

// Draw
// Note that this function takes in only the canvas context obj; everything else needed to draw the component is contained within the component
// This is so that the render component group can draw any component without having to pass parameters
RenderComponentSprite.prototype.draw = function(canvasContext) {
    // Offset by width/2 and height/2 in order to make the origin (0,0) the center of the image, instead of top-left corner (i.e. drawImage works from top-left corner)
    // Because we're centered at the origin, make sure to set the canvas translation transform before drawing
    canvasContext.drawImage(this.imgObj, -this.imgObj.width / 2, -this.imgObj.height / 2);
};

RenderComponentSprite.prototype.update = function(dt_s, config = null) {
    // Override base GameObject class update(), but do nothing in this func
    // (unless we determine that something does need to be updated, in which case, update this comment :-D)
};

RenderComponentSprite.prototype.getWidth = function() {
    return this.imgObj.width;
};

RenderComponentSprite.prototype.getHeight = function() {
    return this.imgObj.height;
};


// ----------------------------------------------------------------------------
// RenderComponentCircle
// ----------------------------------------------------------------------------

function RenderComponentCircle() {
    GameObjectComponent.call(this);
    this.color = [255, 255, 255];   // Default to white, because why not?
    this.radius = 3;
}

RenderComponentCircle.prototype = Object.create(GameObjectComponent.prototype);
RenderComponentCircle.prototype.constructor = RenderComponentCircle;


// Draw
// Note that this function takes in only the canvas context obj; everything else needed to draw the component is contained within the component
// This is so that the render component group can draw any component without having to pass parameters
RenderComponentCircle.prototype.draw = function(canvasContext) {
    canvasContext.beginPath();
    canvasContext.arc(0, 0, this.radius, 0, Math.PI * 2);    // We're drawing at 0,0; make sure to set the canvas translate transform before drawing circles
    canvasContext.fillStyle = 'rgb(' + Math.floor(this.color[0]) + ', ' + Math.floor(this.color[1]) + ', ' + Math.floor(this.color[2]) + ')';
    canvasContext.fill();   // You can also use stroke() here for a circle outline; to set color, use strokeStyle
    canvasContext.closePath();
    // apparently stroke() or fill() end the path
};

RenderComponentCircle.prototype.update = function(dt_s, config = null) {
    // Override base GameObject class update(), but do nothing in this func
    // (unless we determine that something does need to be updated, in which case, update this comment :-D)
};

RenderComponentCircle.prototype.setColor = function(r, g, b) {
    this.color[0] = r;
    this.color[1] = g;
    this.color[2] = b;
};

RenderComponentCircle.prototype.getWidth = function() {
    return this.radius;
};

RenderComponentCircle.prototype.getHeight = function() {
    return this.radius;
};

// ----------------------------------------------------------------------------
// RenderComponentRect
// ----------------------------------------------------------------------------

function RenderComponentRect() {
    GameObjectComponent.call(this);
    this.color = [255, 255, 255];   // Default to white, because why not?
    this.width = 1;
    this.height = 1;
}

RenderComponentRect.prototype = Object.create(GameObjectComponent.prototype);
RenderComponentRect.prototype.constructor = RenderComponentRect;


// Draw
// Note that this function takes in only the canvas context obj; everything else needed to draw the component is contained within the component
// This is so that the render component group can draw any component without having to pass parameters
RenderComponentRect.prototype.draw = function(canvasContext) {
    // For rectangles, the strokeRect and fillRect functions take positions in as the top-left corner.  We're offsetting, to get the center, rather than top-left
    canvasContext.strokeRect(-this.width/2, -this.height/2, this.width, this.height);
};

RenderComponentRect.prototype.update = function(dt_s, config = null) {
    // Override base GameObject class update(), but do nothing in this func
    // (unless we determine that something does need to be updated, in which case, update this comment :-D)
};

RenderComponentRect.prototype.setColor = function(r, g, b) {
    this.color[0] = r;
    this.color[1] = g;
    this.color[2] = b;
};

RenderComponentRect.prototype.getWidth = function() {
    return this.width;
};

RenderComponentRect.prototype.setWidth = function(width) {
    this.width = width;
};

RenderComponentRect.prototype.getHeight = function() {
    return this.height;
};

RenderComponentRect.prototype.setHeight = function(height) {
    this.height = height;
};

// ----------------------------------------------------------------------------
// RenderComponentLine
// ----------------------------------------------------------------------------
function RenderComponentLine() {
    GameObjectComponent.call(this);
    this.color = [255, 255, 255];   // Default to white, because why not?
    this.startPt = vec2.create();
    this.endPt = vec2.create();
    this.lineWidth = 1;

}

RenderComponentLine.prototype = Object.create(GameObjectComponent.prototype);
RenderComponentLine.prototype.constructor = RenderComponentLine;

// Draw
// Note that this function takes in only the canvas context obj; everything else needed to draw the component is contained within the component
// This is so that the render component group can draw any component without having to pass parameters
RenderComponentLine.prototype.draw = function(canvasContext) {
    canvasContext.beginPath();
    canvasContext.lineWidth = this.lineWidth;
    canvasContext.moveTo(this.startPt[0], this.startPt[1]);
    canvasContext.lineTo(this.endPt[0], this.endPt[1]);
    canvasContext.strokeStyle = 'rgb(' + Math.floor(this.color[0]) + ', ' + Math.floor(this.color[1]) + ', ' + Math.floor(this.color[2]) + ')';
    canvasContext.stroke();   // You can also use stroke() here for a circle outline; to set color, use strokeStyle
    canvasContext.closePath();
    // apparently stroke() or fill() end the path
};

RenderComponentLine.prototype.update = function(dt_s, config = null) {
    // Override base GameObject class update(), but do nothing in this func
    // (unless we determine that something does need to be updated, in which case, update this comment :-D)
};

RenderComponentLine.prototype.setStartPt = function(x, y) {
    vec2.set(this.startPt, x, y);
};

RenderComponentLine.prototype.setEndPt = function(x, y) {
    vec2.set(this.endPt, x, y);
};

RenderComponentLine.prototype.setLineWidth = function(lineWidth) {
    this.lineWidth = lineWidth;
};

RenderComponentLine.prototype.setColor = function(r, g, b) {
    this.color[0] = r;
    this.color[1] = g;
    this.color[2] = b;
};

// ----------------------------------------------------------------------------
// RenderComponentGroup
// ----------------------------------------------------------------------------
function RenderComponentGroup() {
    // Inherit components array, as well as functions addComponent(), etc.
    GameObjectComponent.call(this);
    this.groupItems = [];

}

RenderComponentGroup.prototype = Object.create(GameObjectComponent.prototype);
RenderComponentGroup.prototype.constructor = RenderComponentGroup;

RenderComponentGroup.prototype.draw = function(canvasContext) {
    for (var groupItem of this.groupItems) {
        groupItem.draw(canvasContext);
    }
};

RenderComponentGroup.prototype.update = function(dt_s, config = null) {
    // Override base GameObject class update(), but do nothing in this func
    // (unless we determine that something does need to be updated, in which case, update this comment :-D)
    for (var groupItem of this.groupItems) {
        groupItem.update(dt_s, config);
    }
};

RenderComponentGroup.prototype.addGroupItem = function(item) {
    this.groupItems.push(item);
}

// TODO probably also implement a delGroupItem() or something similar
