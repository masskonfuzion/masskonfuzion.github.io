// Making a "var" that's really used as a namespace. 
var MathUtils = {};

// Note that we don't define functions on the prototype because:
// - MathUtils is not a class; it's a namespace
// - Therefore, nothing will inherit from MathUtils (memory benefit from defining functions on the prototype


// Purpose:
// - Calculate the angle in between vectors
// - Return the angle, in RADIANS, where the sign of the angle is determined relative to vecA
// - i.e., vecB is the result of starting with vecA, and rotating vecA about [returnValue] radians
// Preconditions:
// - vecA and vecB are two normalized vectors
// NOTE:
// - surprisingly, glMatrix does not provide any functions to determine the angle between 2 vectors
// TODO come up with a way to handle 0 vectors -- they have no length, so there's no valid way to get the angle beween them and another vector. Maybe return -maxint to indicate an invalid value
MathUtils.angleBetween = function (vecA, vecB) {
    // Use the property of the dot product that dot(A,B) = ||A||*||B||*cos(theta);
    // If A and B are normalized, then ||A|| = ||B|| = 1. So they drop out, and you're left with: dot(A,B) = cos(theta)
    var radians = Math.acos( vec2.dot(vecA, vecB) );

    var normA = vec2.create();
    vec2.set(normA, -vecA[1], vecA[0]);  // normal points in the +x (or +u) direction

    // Compute the sign of the angle, so we can know how to rotate from vecA to vecB
    var sign = vec2.dot(normA, vecB) > 0 ? 1 : -1;

    return sign * radians;
};

MathUtils.lerp = function(i, min, max) {
    // 1-dimensional (scalar) linear interpolation
    // i must be a value between 0 and 1, inclusive
    return min + (max - min) * i;
};
