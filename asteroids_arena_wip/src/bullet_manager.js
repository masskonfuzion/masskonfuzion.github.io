// Bullet manager that controls the bullet particle system
// The manager can control how bullets are enables/initialized (and re-initialized) and disabled; also can control what sprite/image the bullet objects draw, as well as how they move

function BulletManager () {
    GameObject.call(this);
    // The Bullet particle system is an object pool
    this.addComponent("gunPS", new ParticleSystem(Bullet));

    this.maxBullets = 0;
    this.initialBullets = 0;
    this.numFreeSlots = 0;  // Track the # of free Bullet slots in the particle system

    // Populate the command map (this.commandMap is part of the GameObject base class, which this Bullet Manager derives from)
    this.commandMap["disableBullet"] = this.disableBullet;
}

BulletManager.prototype = Object.create(GameObject.prototype);
BulletManager.prototype.constructor = BulletManager;

BulletManager.prototype.initialize = function(maxBullets) {
    // maxBullets is the maximum number of Bullets that could be in play
    var mySystem = this.components["gunPS"];
    mySystem.initialize(maxBullets);
    mySystem.collisionMgrRef = this.parentObj.collisionMgr;     // TODO maybe make a wrapper function, to make a cleaner assignment of collisionMgrRef

    // NOTE: Chances are the BulletManager does not have its own emitter; various other things will have emitters (e.g. spaceships). However, the manager will be able to expire bullets when they meet certain conditions (e.g. off-screen, collide with something)
};

// Run a generic update function that simply walks through this object's components and updates them all
// The update() function is a "standard" function in the engine -- every game object should have an update()
BulletManager.prototype.update = function(dt_s, config = null) {
    for (var compName in this.components) {
        if (this.components.hasOwnProperty(compName)) {
            this.components[compName].update(dt_s);
        }
    }

    this.postUpdate(dt_s, config);
};


BulletManager.prototype.draw = function(canvasContext) {
    var myPS = this.components["gunPS"];
    myPS.draw(canvasContext);
};


// Run additional update logic after the update function finishes
// (This function is called from update()
// NOTE: We use this approach to avoid putting bullet colliders into the quadtree
BulletManager.prototype.postUpdate = function(dt_s, config=null) {
    // Enqueue a message to instruct the Bullet Management system to disable a bullet object if certain conditions are met
    for (var bullet of this.components["gunPS"].particles) {
        // Test for particles leaving arena
        if (!bullet.alive) {
            continue;
        }

        var physComp = bullet.components["physics"];
        if (!this.parentObj.gameObjs["arena"].containsPt(physComp.currPos)) {
                this.disableBullet({ "bulletToDisable": bullet });
            }

        // NOTE: This postUpdate routine handles only bullets leaving the arena. Look to the collision manager for another case: bullet collides with object. 
    }
};


BulletManager.prototype.executeCommand = function(cmdMsg, params) {
    //console.log("BulletManager executing command");
    //console.log(cmdMsg);

    // Call function
    // Note that this command passes a "params" arg in the cmdMsg payload, where other executeCommand functions (elsewhere in this codebase) do not..
    this.commandMap[cmdMsg].call(this, params); // use call() because without it, we're losing our "this" reference (going from BulletManager to Object)
};


BulletManager.prototype.disableBullet = function(dictObj) {
    // reminder that the object passed in is a dict / associative array
    
    var bullet = dictObj["bulletToDisable"];
    bullet.alive = false;
    // NOTE: Another (better?) way to particles access to the collision manager that manages their colliders is to simply give the particles a reference to the particle system they belong to
    bullet.disable( {"collisionMgrRef": this.components["gunPS"].collisionMgrRef} );   // call into the bullet's parent class (i.e., Particle's) disable function
                        // TODO - move this to Trello: Possibly move collider disable logic from base Particle class into specific Bullet & Asteroid classes? Maybe?
};


