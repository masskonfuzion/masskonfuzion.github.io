// Timer "class" --------------------------------------------------------------
function Timer () {
    // The constructor function
    this.currTimestamp = 0.0;
    this.prevTimestamp = 0.0;
    this.elapsed = 0.0;
}

// "Member function" definitions -- defined on the prototype for a Timer
// NOTE: doFrameTimer is meant to be used with requestAnimationFrame() (an HTML5 built-in), which passes in a timestamp
// For more generic timing/stopwatch functionality, use 
Timer.prototype.doFrameTimer = function(timestamp) {
    this.currTimestamp = timestamp;
    this.elapsed = (this.currTimestamp - this.prevTimestamp) / 1000.0;  // Convert to seconds (timestamps are given in milliseconds)
    if (this.elapsed > 0.25) {
        this.elapsed = 0.25;    // Limit potential dt, e.g., if debugging and you pause the game for extended periods of time
    }
    this.prevTimestamp = this.currTimestamp;
};

Timer.prototype.reset = function() {
    this.currTimestamp = 0.0;
    this.prevTimestamp = 0.0;
    this.elapsed = 0.0;
};

// ----------------------------------------------------------------------------


