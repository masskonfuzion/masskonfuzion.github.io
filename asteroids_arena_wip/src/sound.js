function Sound(srcPath, optionsObj = null) {
   this.src = srcPath;
   this.options = optionsObj ? optionsObj : { "volume": 1, "loop": false };
   this.playing = false;

   // Configure audio
   this.audio = new Audio();
   this.audio.src = this.src;
   this.audio.loop = this.options.hasOwnProperty("loop") && this.options["loop"] == true;
   this.audio.addEventListener("error", () => { throw new Error("Error loading audio resource: " + this.audio.src); }, false);     // arrow function is an anoymous function, like lambda in Python
   this.audio.addEventListener("ended", () => { this.playing = false; }, false); // Note that with arrow functions, the "this" reference stays with the Sound object
}


Sound.prototype.play = function(overrides) {
    // merge any overrides passed in (as a dict)
    var opts = Object.assign({time: 0}, this.options, overrides);

    this.audio.volume = opts.volume;
    this.audio.currentTime = opts.time;
    this.audio.play();
    this.playing = true;
};

Sound.prototype.stop = function() {
    this.audio.pause();
    this.playing = false;
};

// Define getter and setter for Sound object
Object.defineProperty(Sound, 'volume', {
    get: function() { return this.audio.volume; },
    set: function(v) { this.audio.volume = this.options.volume = v },
    // The set function sets the options volume, which will affect the current play (if the sound is playing when volume is set) and any subsequent plays
});
