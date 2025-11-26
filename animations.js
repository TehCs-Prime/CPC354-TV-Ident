// ---------------------- Animation Loop & State Updates ----------------------

function updateAnimationState() {
    // Only move if animation is active
    if (isAnimating) {
        // 1. Update Rotation
        theta += rotationSpeed; 

        // 2. Update Position (Translation)
        transX += velX;
        transY += velY;

        // 3. Bounce Logic (Check Walls)
        // If we hit Right or Left wall
        if (transX > boundaryX || transX < -boundaryX) {
            velX = -velX; // Reverse direction
        }
        // If we hit Top or Bottom wall
        if (transY > boundaryY || transY < -boundaryY) {
            velY = -velY; // Reverse direction
        }
    }
}

// Helper to build the matrix (Moved from setup.js)
function calculateModelViewMatrix() {
    var mv = mat4();

    // 1. Apply Translation (The Bouncing Movement)
    mv = mult(mv, translate(transX, transY, transZ));

    // 2. Apply Rotations
    mv = mult(mv, rotate(phi, [1, 0, 0]));
    mv = mult(mv, rotate(theta, [0, 1, 0]));

    // 3. Apply Scale
    mv = mult(mv, scale(0.02, -0.02, 0.02)); 

    return mv;
}

function tick() {
    // 1. Update State
    updateAnimationState();

    // 2. Render Scene
    render();

    // 3. Loop
    requestAnimationFrame(tick);
}