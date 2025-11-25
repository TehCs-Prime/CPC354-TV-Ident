// ---------------------------------------------------- Variables ------------------------------------------------------------

// Common variables
var canvas, gl, program, points;
var posBuffer, colBuffer, vPosition, vColor;
var modelViewMatrixLoc, projectionMatrixLoc;
var modelViewMatrix, projectionMatrix;

// Variables (Example in this case : triangle)
var vertices = [
    vec4(-0.5, -0.5, 0.0, 1.0),
    vec4( 0.5, -0.5, 0.0, 1.0),
    vec4( 0.0,  0.5, 0.0, 1.0)
];

var colors = [
    vec4(1, 0, 0, 1),
    vec4(0, 1, 0, 1),
    vec4(0, 0, 1, 1)
];

var points = vertices;

// ==========================================================================================================================

// ---------------------------------------------------- Functions ------------------------------------------------------------

// Getter of all HTML elements
function getUIElement()
{
    canvas = document.getElementById("gl-canvas");
}

// Configure WebGL settings
function configureWebGL()
{
    // Initialize WebGL
    gl = WebGLUtils.setupWebGL(canvas);
    
    // Report if WebGL failed to setup
    if(!gl){this.alert("Error No WebGl setup.")}

    // Set Viewport and reset color
    gl.viewport(0,0, canvas.width, canvas.height);
    gl.clearColor(0,0,0,1);

    // Hidden surface removal
    gl.enable(gl.DEPTH_TEST);

    // Initialize and link shaders to WebGL
    program = initShaders(gl,"vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Create Buffer and Load onto GPU
    // Position Buffering
    posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    // Link vertex data to vertex shader
    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0,0);
    gl.enableVertexAttribArray(vPosition);

    // Color Buffering
    colBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    // Link color data to fragment shader
    vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0,0);
    gl.enableVertexAttribArray(vColor);

    // Get location of matrix uniform variables
    modelViewMatrixLoc = gl.getUniformLocation(program,'modelViewMatrix');
    projectionMatrixLoc = gl.getUniformLocation(program,'projectionMatrix');
}

// Render drawings to view screen
function render(){

    // Clear color and depth buffer before re-rendering 
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    resizeCanvasToDisplaySize(gl);
    let aspect = canvas.width / canvas.height;

    // keep height = 4 units
    let height = 4;
    let width = height * aspect;

    // Pass projection matrix to shader to GPU
    projectionMatrix = ortho(-width, width, -height, height, -10, 10);
    gl.uniformMatrix4fv(projectionMatrixLoc,false,flatten(projectionMatrix));

    // Pass model view matrix to shader to GPU
    modelViewMatrix = mat4();
    modelViewMatrix = mult(modelViewMatrix, scale(1,1,1));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

    // Draw the primitive
    gl.drawArrays(gl.TRIANGLES, 0, points.length);
}

function resizeCanvasToDisplaySize(gl) {
    const canvas = gl.canvas;

    // Get display size = current canvas dimension
    const displayWidth  = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    // Adjust for device pixel ratio 
    const dpr = window.devicePixelRatio || 1;

    // Compute the actual pixel size needed
    const width  = Math.floor(displayWidth * dpr);
    const height = Math.floor(displayHeight * dpr);

    // Resize the canvas drawingbuffer only if necessary
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
    }
}

window.onload = function init(){
    getUIElement();
    configureWebGL();
    render();
}