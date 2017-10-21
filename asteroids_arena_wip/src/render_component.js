function RenderComponentSprite() {
    GameObjectComponent.call(this);

    // NOTE: We'll need to load all the images on the document.onload() -- so we might need an image manager (long-term), or to just simply has a list/array of image components we plan to draw, so we can check that they all loaded, and throw an error if any didn't
    this.imgObj = null;
}

RenderComponentSprite.prototype = Object.create(GameObjectComponent.prototype);
RenderComponentSprite.prototype.constructor = RenderComponentSprite;


RenderComponentSprite.prototype.setImgObj = function(imgObj) {
    this.imgObj = imgObj;
}

RenderComponentSprite.prototype.draw = function(canvasContext, xCoord, yCoord) {
    // xCoord,yCoord must be passed in (probably from the physics component's position?)
    // Offset by width/2 and height/2 in order to make xCoord,yCoord the center of the image, instead of top-left corner
    canvasContext.drawImage(this.imgObj, xCoord - this.imgObj.width / 2, yCoord - this.imgObj.height / 2);
}

RenderComponentSprite.prototype.update = function(dt_s, config = null) {
    // Override base GameObject class update(), but do nothing in this func
    // (unless we determine that something does need to be updated, in which case, update this comment :-D)
}

RenderComponentSprite.prototype.getWidth = function() {
    return this.imgObj.width;
}

RenderComponentSprite.prototype.getHeight = function() {
    return this.imgObj.height;
}


// ----------------------------------------------------------------------------

function RenderComponentCircle() {
    GameObjectComponent.call(this);
    this.color = [255, 255, 255];   // Default to white, because why not?
    this.radius = 3;
}

RenderComponentCircle.prototype = Object.create(GameObjectComponent.prototype);
RenderComponentCircle.prototype.constructor = RenderComponentCircle;


RenderComponentCircle.prototype.draw = function(canvasContext, xCoord, yCoord) {
    // xCoord,yCoord must be passed in (probably from the physics component's position?)
    canvasContext.beginPath();
    canvasContext.arc(xCoord, yCoord, this.radius, 0, Math.PI * 2, false);
    canvasContext.fillStyle = 'rgb(' + Math.floor(this.color[0]) + ', ' + Math.floor(this.color[1]) + ', ' + Math.floor(this.color[2]) + ')';
    canvasContext.fill();   // You can also use stroke() here for a circle outline; to set color, use strokeStyle
    //canvasContext.closePath();
    // apparently stroke() or fill() end the path
}

RenderComponentCircle.prototype.update = function(dt_s, config = null) {
    // Override base GameObject class update(), but do nothing in this func
    // (unless we determine that something does need to be updated, in which case, update this comment :-D)
}

RenderComponentCircle.prototype.setColor = function(r, g, b) {
    this.color[0] = r;
    this.color[1] = g;
    this.color[2] = b;
}

RenderComponentCircle.prototype.getWidth = function() {
    return this.radius;
}

RenderComponentCircle.prototype.getHeight = function() {
    return this.radius;
}

// ----------------------------------------------------------------------------

function RenderComponentRect() {
    GameObjectComponent.call(this);
    this.color = [255, 255, 255];   // Default to white, because why not?
    this.width = 1;
    this.height = 1;
};

RenderComponentRect.prototype = Object.create(GameObjectComponent.prototype);
RenderComponentRect.prototype.constructor = RenderComponentRect;


RenderComponentRect.prototype.draw = function(canvasContext, xCoord, yCoord) {
    // PICK UP FROM HER -- draw a rect instead of a circle; then add a Rect render component to the aabb and draw the aabb's for the spaceship and asteroids.. Debug that ish
    // xCoord,yCoord must be passed in (probably from the physics component's position?)
    // For rectangles, the positions are given as the top-left corner
    canvasContext.strokeRect(xCoord, yCoord, width, height)
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

RenderComponentRect.prototype.getHeight = function() {
    return this.height;
};

