
var angH = 0, angV = 0;

var havePointerLock = 'pointerLockElement' in document ||
    'mozPointerLockElement' in document ||
    'webkitPointerLockElement' in document;

// Ask the browser to release the pointer
/*document.exitPointerLock = document.exitPointerLock ||
    document.mozExitPointerLock ||
    document.webkitExitPointerLock;
document.exitPointerLock();*/

// Hook pointer lock state change events
document.addEventListener('pointerlockchange', changeCallback, false);
document.addEventListener('mozpointerlockchange', changeCallback, false);
document.addEventListener('webkitpointerlockchange', changeCallback, false);

function changeCallback(requestedElement) {
    if (document.pointerLockElement === canvas ||
        document.mozPointerLockElement === canvas ||
        document.webkitPointerLockElement === canvas) {
        // Pointer was just locked
        // Enable the mousemove listener
        console.log("enable");
        document.addEventListener("mousemove", moveCallback, false);
    } else {
        // Pointer was just unlocked
        // Disable the mousemove listener
        console.log("disable");
        document.removeEventListener("mousemove", moveCallback, false);
    }
}

function moveCallback(e) {
    var movementX = e.movementX ||
        e.mozMovementX ||
        e.webkitMovementX ||
        0;
    angH -= movementX / 50.0;
    var movementY = e.movementY ||
        e.mozMovementY ||
        e.webkitMovementY ||
        0;
    angV -= movementY / 50.0;

    angV = Math.max(-1.57, Math.min(angV, 1.57));
}

function initMouse() {
    canvas.requestPointerLock = canvas.requestPointerLock ||
        canvas.mozRequestPointerLock ||
        canvas.webkitRequestPointerLock;

    // Ask the browser to lock the pointer
    canvas.requestPointerLock();
}