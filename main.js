// ---------------------------------------------------- Variables ------------------------------------------------------------

var canvas, gl, program;
var posBuffer, vPosition;
var modelViewMatrixLoc, projectionMatrixLoc;
var modelViewMatrix, projectionMatrix;

// Global State
let loadedFont = null; 
let meshPositions = null; 
let vertexCount = 0;      

// ---------------------------------------------------- WebGL Setup ------------------------------------------------------------

function getUIElement() {
    canvas = document.getElementById("gl-canvas");
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
    
    // Initialize the buffer once here
    posBuffer = gl.createBuffer();
    vPosition = gl.getAttribLocation(program, "vPosition");
}

function render() {
    // If the window is resized, we need to update dimensions and viewport
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        var dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.clientWidth * dpr;
        canvas.height = canvas.clientHeight * dpr;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }

    gl.clear(gl.COLOR_BUFFER_BIT);

    // Basic Orthographic Projection
    let aspect = canvas.width / canvas.height;
    let height = 4;
    let width = height * aspect;
    
    projectionMatrix = ortho(-width, width, -height, height, -10, 10);
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    // View Matrix
    modelViewMatrix = mat4();
    modelViewMatrix = mult(modelViewMatrix, scale(0.02, -0.02, 0.02)); 
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

    if (!meshPositions || vertexCount === 0) return;

    gl.drawArrays(gl.LINES, 0, vertexCount);
}

function updateBufferData() {
    // Bind the buffer and send new data
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, meshPositions, gl.STATIC_DRAW);
    
    gl.enableVertexAttribArray(vPosition);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
}

// ---------------------- STEP 2: Flatten / Approximate Curves ----------------------

function flattenPathToPoints(commands, segmentsPerCurve = 10) {
    const points = [];
    let cursor = { x: 0, y: 0 };
    let startOfContour = { x: 0, y: 0 };

    function addLineSegment(xStart, yStart, xEnd, yEnd) {
        points.push({ x: xStart, y: yStart }); 
        points.push({ x: xEnd, y: yEnd });     
    }

    commands.forEach(cmd => {
        if (cmd.type === 'M') { 
            cursor = { x: cmd.x, y: cmd.y };
            startOfContour = { x: cmd.x, y: cmd.y };
        } 
        else if (cmd.type === 'L') { 
            addLineSegment(cursor.x, cursor.y, cmd.x, cmd.y);
            cursor = { x: cmd.x, y: cmd.y };
        } 
        else if (cmd.type === 'C') { 
            const p0 = { x: cursor.x, y: cursor.y };
            const p1 = { x: cmd.x1, y: cmd.y1 };
            const p2 = { x: cmd.x2, y: cmd.y2 };
            const p3 = { x: cmd.x, y: cmd.y };

            let prev = p0;
            for (let t = 1; t <= segmentsPerCurve; t++) {
                const tt = t / segmentsPerCurve;
                const mt = 1 - tt;
                const x = mt * mt * mt * p0.x + 3 * mt * mt * tt * p1.x + 3 * mt * tt * tt * p2.x + tt * tt * tt * p3.x;
                const y = mt * mt * mt * p0.y + 3 * mt * mt * tt * p1.y + 3 * mt * tt * tt * p2.y + tt * tt * tt * p3.y;
                
                addLineSegment(prev.x, prev.y, x, y);
                prev = { x, y };
            }
            cursor = { x: p3.x, y: p3.y };
        } 
        else if (cmd.type === 'Q') { 
            const p0 = { x: cursor.x, y: cursor.y };
            const p1 = { x: cmd.x1, y: cmd.y1 };
            const p2 = { x: cmd.x, y: cmd.y };

            let prev = p0;
            for (let t = 1; t <= segmentsPerCurve; t++) {
                const tt = t / segmentsPerCurve;
                const mt = 1 - tt;
                const x = mt * mt * p0.x + 2 * mt * tt * p1.x + tt * tt * p2.x;
                const y = mt * mt * p0.y + 2 * mt * tt * p1.y + tt * tt * p2.y;

                addLineSegment(prev.x, prev.y, x, y);
                prev = { x, y };
            }
            cursor = { x: p2.x, y: p2.y };
        }
        else if (cmd.type === 'Z') { 
            addLineSegment(cursor.x, cursor.y, startOfContour.x, startOfContour.y);
            cursor = { ...startOfContour };
        }
    });

    return points;
}

// ---------------------- EXECUTION ----------------------

function generateTextVertices(text) {
    if (!text || text.length === 0) return new Float32Array([]);

    const fontSize = 100;
    let combinedPoints = [];
    let cursorX = 0; // Tracks the horizontal position for the next letter

    // 1. Loop through each character to build the geometry
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const glyph = loadedFont.charToGlyph(char);

        // getPath(x, y, fontSize) - we pass cursorX to shift the letter automatically
        const path = glyph.getPath(cursorX, 0, fontSize);
        
        // Convert curves to line segments
        const pts = flattenPathToPoints(path.commands, 10);
        combinedPoints.push(...pts);

        // Advance the cursor based on the glyph's width
        // We must scale advanceWidth because it is in font units
        cursorX += glyph.advanceWidth * (fontSize / loadedFont.unitsPerEm);
    }

    if (combinedPoints.length === 0) return new Float32Array([]);

    // 2. Calculate Bounding Box to Center the Whole Word
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    combinedPoints.forEach(p => {
        if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    });

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // 3. Flatten into Float32Array (x, y, z) and shift to center
    const flatArray = [];
    combinedPoints.forEach(p => {
        flatArray.push(p.x - centerX); 
        flatArray.push(p.y - centerY); 
        flatArray.push(0.0);           
    });

    return new Float32Array(flatArray);
}

function updateText(text) {
    if (!loadedFont) return;
    
    // Regenerate mesh based on new text
    meshPositions = generateTextVertices(text);
    vertexCount = meshPositions.length / 3;

    // Send new data to GPU
    updateBufferData();
}

window.onload = function init() {
    getUIElement();
    configureWebGL();

    // Setup Input Listener
    const inputEl = document.getElementById("wordInput");
    inputEl.addEventListener("input", function(e) {
        // Enforce max length of 4 just in case
        let val = e.target.value;

        // Uppercase and only Alphabetic
        val = val.toUpperCase();
        val = val.replace(/[^A-Z]/g, '');

        if (val.length > 4) val = val.substring(0, 4);
        
        // Update the input field so the user sees the filtered result
        e.target.value = val;

        updateText(val);
    });

    opentype.load('fonts/static/Roboto-Medium.ttf', function (err, font) {
        if (err) {
            console.error('Font load error:', err);
            return;
        }

        loadedFont = font; // Store globally

        // Initialize with default text (empty or placeholder)
        // Check if there is already value in input (e.g. browser refresh)
        let initialText = inputEl.value || "USM"; 
        initialText = initialText.toUpperCase().replace(/[^A-Z]/g, '').substring(0,4);
        
        updateText(initialText);
        
        // Start Render Loop
        function tick() {
            render();
            requestAnimationFrame(tick);
        }
        tick();
    });
}