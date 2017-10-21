// Timer "class" --------------------------------------------------------------
function Timer () {
    // The constructor function
    this.currTimestamp = 0.0;
    this.prevTimestamp = 0.0;
    this.elapsed = 0.0;
}

// "Member function" definitions -- defined on the prototype for a Timer
Timer.prototype.doFrameTimer = function(timestamp) {
    this.currTimestamp = timestamp;
    this.elapsed = (this.currTimestamp - this.prevTimestamp) / 1000.0;  // Convert to seconds (timestamps are given in milliseconds
    this.prevTimestamp = this.currTimestamp;
};

Timer.prototype.reset = function() {
    this.currTimestamp = 0.0;
    this.prevTimestamp = 0.0;
    this.elapsed = 0.0;
};

// ----------------------------------------------------------------------------


