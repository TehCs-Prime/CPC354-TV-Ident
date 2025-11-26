// ---------------------------------------------------- Variables ------------------------------------------------------------

var canvas, gl, program;
var posBuffer, vPosition;
var modelViewMatrixLoc, projectionMatrixLoc;
var modelViewMatrix, projectionMatrix;

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
}

function render() {
    // If the window is resized, we need to update dimensions and viewport
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        // Scale by device pixel ratio for super sharp text
        var dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.clientWidth * dpr;
        canvas.height = canvas.clientHeight * dpr;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }

    gl.clear(gl.COLOR_BUFFER_BIT);

    // Basic Orthographic Projection
    // Use the CURRENT canvas dimensions for aspect ratio
    let aspect = canvas.width / canvas.height;
    let height = 4;
    let width = height * aspect;
    
    projectionMatrix = ortho(-width, width, -height, height, -10, 10);
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    // View Matrix
    modelViewMatrix = mat4();
    modelViewMatrix = mult(modelViewMatrix, scale(0.02, -0.02, 0.02)); 
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

    if (!meshPositions) return;

    gl.drawArrays(gl.LINES, 0, vertexCount);
}

function setupMeshBuffers() {
    posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, meshPositions, gl.STATIC_DRAW);
    
    vPosition = gl.getAttribLocation(program, "vPosition");
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

function processGlyphOutline(font) {
    const glyph = font.charToGlyph('B');
    const path = glyph.getPath(0, 0, 100); 

    const polygonPoints = flattenPathToPoints(path.commands, 10);

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    polygonPoints.forEach(p => {
        if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    });
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const flatArray = [];
    polygonPoints.forEach(p => {
        flatArray.push(p.x - centerX); 
        flatArray.push(p.y - centerY); 
        flatArray.push(0.0);           
    });

    return new Float32Array(flatArray);
}

window.onload = function init() {
    getUIElement();
    configureWebGL();

    opentype.load('fonts/static/Roboto-Medium.ttf', function (err, font) {
        if (err) {
            console.error('Font load error:', err);
            return;
        }

        meshPositions = processGlyphOutline(font);
        vertexCount = meshPositions.length / 3;

        setupMeshBuffers();
        
        // Use requestAnimationFrame loop for smoother updates
        function tick() {
            render();
            requestAnimationFrame(tick);
        }
        tick();
    });
}