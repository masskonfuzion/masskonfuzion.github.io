// QueueBase "class" ----------------------------------------------------------

// Notes:
// This queue is pre-allocated upon construction. i.e., it always contains a
// fixed number of items. This allows the queue to (ideally?) always occupy
// the same memory locations (well, theoretically that's what would happen
// if we could guarantee the size of the objects..).

// The trade-off is that potentialy unused queue items "linger" in the queue
// until they are overwritten.

// Another approach to writing this queue would be to actually push items onto
// the underlying array, and pop them off when items are consumed, so that
// an empty queue actually has an underlying array length of 0.


function QueueBase () {
    this._queue = [];    // A list object that will contain the queue's data

    this._tail = 0;
    this._head = 0;
    this._empty = true;

    // TODO continue with game -- make a message queue/command handler. Then change the camera responder to enqueue a message for the command managers to "offer up" to its listener/handlers
}


QueueBase.prototype.initialize = function(numItems) {
    // NOTE: This function should only ever be run one time

    if (this._queue.length > 0) {
        throw new Error ("Queue alredy initialized");
    } else {
        for (var i = 0; i < numItems; i++) {
            console.log("Initializing queue: " + numItems + " items.");
            this._queue.push(null);     // Initialize the array with null objects
        }
        console.log("Initalized queue with " + numItems + " items.");
    }

};

QueueBase.prototype.enqueue = function(obj) {
    // Append the object to the object list
    // JavaScript, being dynamically typed, will not enforce the data type of
    // the objects being enqueued. That is up to the developer

    if (this._empty) {
        this._empty = false;
    } else {
        this._tail = (this._tail + 1) % this._queue.length;
        
        if (this._tail == this._head) {
            // there is apparently no built-in assert() function in JavaScript
            throw new Error("Max number of queue items exceeded");
        }
    }

    // TODO - make sure we're copying, instead of adding object references? (I think that's what we want?)
    this._queue[this._tail] = obj;
    console.log("Enqueued an object at index " + this._tail + ". (head= " + this._head + ").");
};
    // NOTE: There are some quirks about how push() behaves that you should
    // read about somewhere else.. Just note that push() is actually the method
    // you want here; it adds elements to the end of an array (even though
    // "push" sounds like it would insert at the head of the array, as in a
    // stack).


QueueBase.prototype.dequeue = function() {
    if (this._empty) {
        console.log("Nothing to dequeue; queue is empty");
        return null;
    } else {
        return_obj = this._queue[this._head];
        console.log("Dequeued an object from head=" + this._head + " (tail=" + this._tail + ").");

        if ((this._head == this._tail) && (!this._empty)) {
            this._empty = true;
        } else {
            this._head = (this._head + 1) % (this._queue.length);
        }
        return return_obj;
    }
};

QueueBase.prototype.numItems = function() {
    var retVal;

    if (this._empty) {
        return 0;
    } else {
        if (this._tail > this._head) {
            retVal = this._tail - this._head + 1;
        }
        else if (this._tail < this._head) {
            retVal = (this._tail + this._queue.length) - this._head + 1;
        }
        else {
            retVal = 1; // this._tail - this._head + 1 == 0 + 1 == 1
        }
    }
    return retVal;
};


QueueBase.prototype.clear = function () {
    // TODO implement clear()
};
// ----------------------------------------------------------------------------
