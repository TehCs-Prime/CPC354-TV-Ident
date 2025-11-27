// ---------------------- Animation Loop & State Updates ----------------------

function updateAnimationState() {
    if (isAnimating) {
        switch (currentPhase) {
            case 0: // Rotate right by 180 degrees
                if (theta < 215) { // 35 + 180 = 215
                    theta += rotationSpeed; // Adjust speed as needed
                } else {
                    theta = 215;
                    currentPhase++;
                }
                break;

            case 1: // Rotate back to original
                if (theta > 35) {
                    theta -= rotationSpeed;
                } else {
                    theta = 35;
                    currentPhase++;
                }
                break;

            case 2: // Rotate left by 180 degrees
                if (theta > -145) { // 35 - 180 = -145
                    theta -= rotationSpeed;
                } else {
                    theta = -145;
                    currentPhase++;
                }
                break;

            case 3: // Rotate back to original
                if (theta < 35) {
                    theta += rotationSpeed;
                } else {
                    theta = 35;
                    currentPhase++;
                }
                break;

            case 4: // Gradually enlarge
                if (scaleFactor < 0.05) {
                    scaleFactor += scaleStep;
                } else {
                    scaleFactor = 0.05;
                    currentPhase++;
                }
                break;

            case 5: // Move about 
                // Update Rotation
                theta += rotationSpeed;

                // Update Position (Translation)
                transX += velX;
                transY += velY;

                // Bounce Logic (Check Walls)
                // If we hit Right or Left wall
                if (transX > boundaryX || transX < -boundaryX) {
                    velX = -velX;   // Reverse direction
                }
                // If we hit Top or Bottom wall
                if (transY > boundaryY || transY < -boundaryY) {
                    velY = -velY;   // Reverse direction
                }
                break;
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
    mv = mult(mv, scale(scaleFactor, -scaleFactor, scaleFactor));

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