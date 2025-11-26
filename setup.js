// ---------------------------------------------------- WebGL Setup ------------------------------------------------------------

function getUIElement() {
    canvas = document.getElementById("gl-canvas");
    inputEl = document.getElementById("wordInput");
    colorEl = document.getElementById("colorInput");
    thickEl = document.getElementById("thicknessInput");
    spacingEl = document.getElementById("spacingInput");
    speedEl = document.getElementById("speedInput");
}


function configureWebGL() {
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("Error No WebGl setup."); }

    // Scale by device pixel ratio for super sharp text
    var dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 1);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    modelViewMatrixLoc = gl.getUniformLocation(program, 'modelViewMatrix');
    projectionMatrixLoc = gl.getUniformLocation(program, 'projectionMatrix');
    
    uColorLoc = gl.getUniformLocation(program, 'uColor');

    // Initialize the buffer once here
    posBuffer = gl.createBuffer();
    vPosition = gl.getAttribLocation(program, "vPosition");

    // Mouse Event Listeners for Rotation
    canvas.addEventListener("mousedown", function(e) {
        // Disable mouse dragging if animation is running 
        if (isAnimating) return;

        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
    });

    canvas.addEventListener("mouseup", function(e) {
        dragging = false;
    });

    canvas.addEventListener("mousemove", function(e) {
        if (!dragging) return;
        
        var x = e.clientX;
        var y = e.clientY;
        
        // Calculate change in position
        var deltaX = x - lastX;
        var deltaY = y - lastY;

        // Update rotation angles based on movement
        theta += deltaX * 0.5; // 0.5 is sensitivity
        phi   += deltaY * 0.5;

        lastX = x;
        lastY = y;
        
    });
}

function render() {
    // If the window is resized, we need to update dimensions and viewport
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        var dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.clientWidth * dpr;
        canvas.height = canvas.clientHeight * dpr;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }

    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Basic Orthographic Projection
    let aspect = canvas.width / canvas.height;
    let height = 4;
    let width = height * aspect;
    
    // Update global boundaryX based on current aspect ratio so it bounces at the edge of screen
    boundaryX = width - 1.0; // Subtract padding

    projectionMatrix = ortho(-width, width, -height, height, -100, 100);
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

   // --- UPDATED: Use helper from animations.js ---
    modelViewMatrix = calculateModelViewMatrix();

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    

    // Do not use flatten() might behave unexpectedly with a simple 1D color array. Use Float32Array directly.
    gl.uniform4fv(uColorLoc, new Float32Array(currentUserColor));

    if (!meshPositions || vertexCount === 0) return;

    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
}

function updateBufferData() {
    // Bind the buffer and send new data
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, meshPositions, gl.STATIC_DRAW);
    
    gl.enableVertexAttribArray(vPosition);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
}