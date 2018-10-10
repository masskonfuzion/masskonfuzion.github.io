function Character() {
    // NVM (maybe?) make Character a base class? (or.. maybe not? it might make more sense to do that in a language like C++, where you need a base-class pointer to an object of a subclass)
    // A "character" -- a combination of spaceship object, call sign, color scheme
    this.spaceshipRef = null;   // Come to think of it, this reference might not be needed TODO - make a dict of characters in gameLogic - key should be the objectID of the ship (e.g., 0, 1, 2, etc); value is this character object... I know.. it's ugly...
    this.colorScheme = { "light": [255,255,255],
                         "medium": [255,255,255],
                         "dark": [255,255,255]
                       };

    this.callSign = ""
}
