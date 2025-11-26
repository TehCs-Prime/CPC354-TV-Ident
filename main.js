// ---------------------------------------------------- Variables ------------------------------------------------------------

// Common variables
var canvas, gl, program, points;
var posBuffer, colBuffer, vPosition, vNormal;
var modelViewMatrixLoc, projectionMatrixLoc;
var modelViewMatrix, projectionMatrix;

// Variables (Example in this case : triangle)
var vertices = [];
var colors = [];
var points = [];

let meshPositions = null;
let meshNormals = null;
let meshIndices = null;

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
    // Rotate to see the 3D effect (30 degrees on X, 30 on Y)
    modelViewMatrix = mult(modelViewMatrix, rotateX(10)); 
    modelViewMatrix = mult(modelViewMatrix, rotateY(0));

    modelViewMatrix = mult(modelViewMatrix, scale(0.02, -0.02, 0.02));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

    // Draw the primitive
    if (!meshIndices) return;  
    gl.drawElements(gl.TRIANGLES, meshIndices.length, gl.UNSIGNED_SHORT, 0);

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

function setupMeshBuffers() {
    // Position buffer
    posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, meshPositions, gl.STATIC_DRAW);
    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.enableVertexAttribArray(vPosition);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);

    // Normal buffer
    const normBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, meshNormals, gl.STATIC_DRAW);
    vNormal = gl.getAttribLocation(program, "vNormal");
    gl.enableVertexAttribArray(vNormal);
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);

    // Index buffer
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, meshIndices, gl.STATIC_DRAW);
}

function flattenPathToContours(commands, segmentsPerCurve = 10) {
  const contours = [];
  let current = null;
  let cursor = { x: 0, y: 0 };

  function startContour(x, y) {
    current = [];
    contours.push(current);
    cursor = { x, y };
    current.push({ x, y });
  }

  commands.forEach(cmd => {
    if (cmd.type === 'M') {
      startContour(cmd.x, cmd.y);
    } else if (cmd.type === 'L') {
      cursor = { x: cmd.x, y: cmd.y };
      if (!current) startContour(cursor.x, cursor.y);
      current.push({ x: cursor.x, y: cursor.y });
    } else if (cmd.type === 'C') {
      // cubic bezier from cursor to (cmd.x, cmd.y)
      if (!current) startContour(cursor.x, cursor.y);
      const p0 = { x: cursor.x, y: cursor.y };
      const p1 = { x: cmd.x1,   y: cmd.y1 };
      const p2 = { x: cmd.x2,   y: cmd.y2 };
      const p3 = { x: cmd.x,    y: cmd.y };
      for (let t = 1; t <= segmentsPerCurve; t++) {
        const tt = t / segmentsPerCurve;
        const mt = 1 - tt;
        const x = mt*mt*mt*p0.x + 3*mt*mt*tt*p1.x + 3*mt*tt*tt*p2.x + tt*tt*tt*p3.x;
        const y = mt*mt*mt*p0.y + 3*mt*mt*tt*p1.y + 3*mt*tt*tt*p2.y + tt*tt*tt*p3.y;
        current.push({ x, y });
      }
      cursor = { x: p3.x, y: p3.y };
    } else if (cmd.type === 'Q') {
      if (!current) startContour(cursor.x, cursor.y);
      const p0 = { x: cursor.x, y: cursor.y };
      const p1 = { x: cmd.x1,   y: cmd.y1 };
      const p2 = { x: cmd.x,    y: cmd.y };
      for (let t = 1; t <= segmentsPerCurve; t++) {
        const tt = t / segmentsPerCurve;
        const mt = 1 - tt;
        const x = mt*mt*p0.x + 2*mt*tt*p1.x + tt*tt*p2.x;
        const y = mt*mt*p0.y + 2*mt*tt*p1.y + tt*tt*p2.y;
        current.push({ x, y });
      }
      cursor = { x: p2.x, y: p2.y };
    } else if (cmd.type === 'Z') {
      // close contour - nothing specific needed
      current = null;
    }
  });

  // Build earcut-friendly flat array + holeIndices
  const flat = [];
  const holeIndices = [];
  let idx = 0;
  for (let c = 0; c < contours.length; ++c) {
    if (c > 0) holeIndices.push(idx);
    const contour = contours[c];
    for (let i = 0; i < contour.length; ++i) {
      flat.push(contour[i].x, contour[i].y);
      idx++;
    }
  }

  return { contours, flat: new Float32Array(flat), holeIndices };
}

function extrude2D(vertices2D, indices2D, depth) {
  const positions = [];
  const normals   = [];
  const indices   = [];

  const n2 = vertices2D.length;

  // 1. Position & Normal Generation
  // Front face at +depth/2 (Normal points towards camera +Z)
  vertices2D.forEach(p => {
    positions.push(p.x, p.y, depth/2);
    normals.push(0, 0, 1);
  });
  // Back face at -depth/2 (Normal points away from camera -Z)
  vertices2D.forEach(p => {
    positions.push(p.x, p.y, -depth/2);
    normals.push(0, 0, -1);
  });

  // 2. Index Generation (Fixing the winding order)
  
  // Front face triangles
  // CHANGED: Swapped order to (i+2, i+1, i) to fix inverted normals
  for (let i = 0; i < indices2D.length; i += 3) {
    indices.push(indices2D[i+2], indices2D[i+1], indices2D[i]);
  }

  // Back face triangles
  // CHANGED: Swapped order to standard (i, i+1, i+2) because it faces away
  for (let i = 0; i < indices2D.length; i += 3) {
    indices.push(n2 + indices2D[i], n2 + indices2D[i+1], n2 + indices2D[i+2]);
  }

  // Side faces
  // Calculates normals for the sides
  for (let i = 0; i < n2; i++) {
    const j = (i + 1) % n2;
    const f0 = i, f1 = j;
    const b0 = n2 + i, b1 = n2 + j;

    // Standard two-triangle quad for sides
    indices.push(f0, f1, b1);
    indices.push(f0, b1, b0);

    const p0 = vertices2D[i];
    const p1 = vertices2D[j];
    
    // Calculate side normal
    const ex = p1.x - p0.x, ey = p1.y - p0.y;
    const len = Math.hypot(ex, ey) || 1;
    // Normal is perpendicular to the edge
    const nx = ey/len, ny = -ex/len;

    // Assign these normals to the vertices involved in side faces
    // Note: For sharp edges, we usually need duplicate vertices, 
    // but this approximates it for your current setup.
    normals[f0*3 + 0] = nx; normals[f0*3 + 1] = ny; normals[f0*3 + 2] = 0;
    normals[f1*3 + 0] = nx; normals[f1*3 + 1] = ny; normals[f1*3 + 2] = 0;
    normals[b0*3 + 0] = nx; normals[b0*3 + 1] = ny; normals[b0*3 + 2] = 0;
    normals[b1*3 + 0] = nx; normals[b1*3 + 1] = ny; normals[b1*3 + 2] = 0;
  }

  return {
    vertices3D: new Float32Array(positions),
    normals:    new Float32Array(normals),
    indices:    new Uint16Array(indices)
  };
}

function buildGlyphMesh_U(font) {
    const glyph = font.charToGlyph('R');
    const fontSize = 100;
    const path = glyph.getPath(0, 0, fontSize);
    console.log(path.commands)

    const flatInfo = flattenPathToContours(path.commands, 20);
    const flatArray = Array.from(flatInfo.flat);
    const indices2D = earcut(flatArray, flatInfo.holeIndices);

    const vertices2D = [];
    
    // Variables for bounding box calculation
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (let i = 0; i < flatInfo.flat.length; i += 2) {
        const x = flatInfo.flat[i];
        const y = flatInfo.flat[i+1];
        
        // Track min/max
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        vertices2D.push({ x, y });
    }

    // Calculate center
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Center the vertices
    for (let v of vertices2D) {
        v.x -= centerX;
        v.y -= centerY;
    }

    // Extrude
    const depth = 20; // Increased thickness slightly for better 3D look
    const mesh = extrude2D(vertices2D, indices2D, depth);

    return mesh;
}

// ==========================================================================================================================

// ---------------------------------------------------- Loading ------------------------------------------------------------

window.onload = function init(){
    getUIElement();
    configureWebGL();

    opentype.load('fonts/static/Roboto-Medium.ttf', function(err, font) {
    if (err) {
        console.error('Font load error:', err);
        return;
    }
    const mesh = buildGlyphMesh_U(font);
    meshPositions = mesh.vertices3D;
    meshNormals   = mesh.normals;
    meshIndices   = mesh.indices;

    // Now upload to GPU
    setupMeshBuffers();
    animate();  // call render *after* mesh is ready

});

}

function animate() {
    render();
    requestAnimationFrame(animate);
}
