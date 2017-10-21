function ImageAsset(filepath) {
    this.imgPath = filepath;

    this.imgObj = document.createElement("img");
    this.imgObj.loadedByGame = false;   // Creating a property key that probably should never collide with standard JavaScript objects

    this.imgObj.onload = function() {
        // Remember that when this.imgObj.onload runs, the "this" reference within the scope of the onload() fn is now the img object, not the ImageManager (because "this" in JS is the object that is calling the method)
        // Therefore, loadedByGame belongs to "this", the img.
        this.loadedByGame = true;
    };
    this.imgObj.src = this.imgPath;
}

// ----------------------------------------------------------------------------

function ImageManager() {
    this.imageMap = {};

    // Add an imgObjRef to the image map, associated with the given key
    // This should be run in window.onload() (can be in some sort of initialize() function called from window.onload())
    this.addImgToMap = function (key, imgObjRef) {
        this.imageMap[key] = imgObjRef;
    };
}

