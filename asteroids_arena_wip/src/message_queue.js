// Message Queue "class" ------------------------------------------------------
function MessageQueue() {
    QueueBase.call(this);
    // A dict of lists. The key is the message topic; the value is the list of listeners on that topic
    // Each list will be populated with associative arrays, e.g. { listenerID: listenerRef }
    this._registeredListeners = {};     // A dict of lists.
    
}

MessageQueue.prototype = Object.create(QueueBase.prototype);
MessageQueue.prototype.constructor = MessageQueue;

MessageQueue.prototype.registerListener = function(topic, handlerObj, handlerFunc) {
    // Because of scoping issues and funky behavior with the "this" keyword,
    // this registration function takes in the "this" reference of the object
    // that owns the handler function
    console.log("Entering registerListener. \"this\" = ");
    console.log(this);
    // TODO make sure we're registering a reference to the listener object, rather than a copy of it
    listenerID = this._registeredListeners.length;  // e.g., When empty, id == 0

    if ( !(topic in this._registeredListeners) ) {
        // Add a topic key if it doesn't exist in registeredListeners
        // (in Python, we'd do this with a defaultdict)
        this._registeredListeners[topic] = [];
        console.log("Topic " + topic + " not previously present in registeredListeners. Added");
    }

    //this._registeredListeners[topic].push( handlerFunc );
    this._registeredListeners[topic].push( { "obj": handlerObj, "func": handlerFunc} );

    console.log("Added listener " + handlerFunc.toString());
};


// ----------------------------------------------------------------------------

