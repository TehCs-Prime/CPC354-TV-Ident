//function to get canvas and UI controls
function getUIElement() {
    canvas = document.getElementById("gl-canvas");
    inputEl = document.getElementById("wordInput");
    colorEl = document.getElementById("colorInput");
    thickEl = document.getElementById("thicknessInput");
    spacingEl = document.getElementById("spacingInput");
    speedEl = document.getElementById("speedInput");
}

//function to initialize WebGL, shaders, buffers and mouse handlers
function configureWebGL() {
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("Error No WebGl setup."); }

    //scale by device pixel ratio for sharper rendering on window resizing that is repeated in every rendering, once here
    var dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;

    //define the viewport and clear color
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 1);

    //complie and use shader program
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    //create uniform location for matrices and color
    modelViewMatrixLoc = gl.getUniformLocation(program, 'modelViewMatrix');
    projectionMatrixLoc = gl.getUniformLocation(program, 'projectionMatrix');
    
    uColorLoc = gl.getUniformLocation(program, 'uColor');

    //create position buffer
    posBuffer = gl.createBuffer();
    //get attribute location
    vPosition = gl.getAttribLocation(program, "vPosition");

    //mouse drag to rotate
    canvas.addEventListener("mousedown", function(e) {
        //diable while animating
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
        
        //calculate change in position
        var deltaX = x - lastX;
        var deltaY = y - lastY;

        //update rotation angles based on movement
        theta += deltaX * 0.5;
        phi   += deltaY * 0.5;

        lastX = x;
        lastY = y;
        
    });
}

//function to draw the frames
function render() {
    //update canvas size and viewport when window is resized
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        var dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.clientWidth * dpr;
        canvas.height = canvas.clientHeight * dpr;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }

    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //build orthographic projection
    let aspect = canvas.width / canvas.height;
    let height = 4;
    let width = height * aspect;
    
    //update horizontal bounce boundary
    boundaryX = width - 1.0; 

    projectionMatrix = ortho(-width, width, -height, height, -100, 100);
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

   //get model-view from animation helper (translate + rotate + scale)
    modelViewMatrix = calculateModelViewMatrix();

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    

    //set solid color(RGBA) for fragment shader
    gl.uniform4fv(uColorLoc, new Float32Array(currentUserColor));

    if (!meshPositions || vertexCount === 0) return;

    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
}

//function to upload vertex data to GPU
function updateBufferData() {
    // Bind the buffer and send new data
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, meshPositions, gl.STATIC_DRAW);
    
    gl.enableVertexAttribArray(vPosition);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
}