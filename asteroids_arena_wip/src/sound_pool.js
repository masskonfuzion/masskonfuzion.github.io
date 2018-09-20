// An array of identical sound objects 
// this is needed to simulate polyphonic playback
// An individual audio object will "re-trigger" the sound if played more than once
// However, we can play multiple audio objects that have identical sounds

function SoundPool (src, options = null, poolSize = 3) {
    this.count = 0;
    this.sounds = new Array(poolSize);

    for (var i = 0; i < this.sounds.length; i++) {
        this.sounds[i] = new Sound(src, options);
    }
}


SoundPool.prototype.play = function(overrides) {
    this.sounds[this.count].play(overrides)
    this.count = (this.count + 1) % this.sounds.length;
};

SoundPool.prototype.stop = function() {
    for (var sound of this.sounds) {
        sound.stop();
    }
};
