function GameApplication(xSize=512, ySize=512) {
    //console.log("Made an application obj");
    this.xSize = xSize;
    this.ySize = ySize;

    this.canvas = null;
    this.context = null;
    this.imgMgr = null;
}

GameApplication.prototype.initialize = function() {
    // We initialize canvas and context here, becausee this initialize() function gets called once the program starts, and the page element named "canvas" is created
    this.canvas = document.getElementById("canvas");
    this.context = this.canvas.getContext("2d");
    this.imgMgr = new ImageManager();

    this.context.fillStyle = 'black';
    this.context.fillRect(0,0, this.canvas.width, this.canvas.height);

    this.context.font = '30px serif';
    this.context.fillStyle = 'white';
    this.context.fillText('If you see only this, something is probably wrong ;-)', this.canvas.width / 8, this.canvas.height / 8);

}
