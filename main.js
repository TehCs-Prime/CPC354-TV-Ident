// // ---------------------------------------------------- Variables ------------------------------------------------------------

// var canvas, gl, program;
// var posBuffer, vPosition;
// var modelViewMatrixLoc, projectionMatrixLoc;
// var modelViewMatrix, projectionMatrix;

// // Global State
// let loadedFont = null; 
// let meshPositions = null; 
// let vertexCount = 0;

// // Rotation State
// var theta = 35;  // Rotation around Y axis
// var phi = -15;    // Rotation around X axis
// var dr = 5.0 * Math.PI/180.0; // Speed multiplier

// // Mouse State
// var dragging = false;
// var lastX = 0;
// var lastY = 0;

// // User Customizable State
// var uColorLoc;
// let currentThickness = 20;       // Default thickness
// let currentSpacing = 5;
// let currentUserColor = [0.6039, 0.2314, 0.9098, 1.0]; // Default Green
// // New: Animation State
// let isAnimating = false;
// let rotationSpeed = 1.0;

// let isDayMode = false;

// // ---------------------------------------------------- WebGL Setup ------------------------------------------------------------

// function getUIElement() {
//     canvas = document.getElementById("gl-canvas");
// }

// function configureWebGL() {
//     gl = WebGLUtils.setupWebGL(canvas);
//     if (!gl) { alert("Error No WebGl setup."); }

//     // Scale by device pixel ratio for super sharp text
//     var dpr = window.devicePixelRatio || 1;
//     canvas.width = canvas.clientWidth * dpr;
//     canvas.height = canvas.clientHeight * dpr;

//     gl.viewport(0, 0, canvas.width, canvas.height);
//     gl.clearColor(0, 0, 0, 1);

//     program = initShaders(gl, "vertex-shader", "fragment-shader");
//     gl.useProgram(program);

//     modelViewMatrixLoc = gl.getUniformLocation(program, 'modelViewMatrix');
//     projectionMatrixLoc = gl.getUniformLocation(program, 'projectionMatrix');
    
//     uColorLoc = gl.getUniformLocation(program, 'uColor');

//     // Initialize the buffer once here
//     posBuffer = gl.createBuffer();
//     vPosition = gl.getAttribLocation(program, "vPosition");

//     // Mouse Event Listeners for Rotation
//     canvas.addEventListener("mousedown", function(e) {
//         // Disable mouse dragging if animation is running 
//         if (isAnimating) return;

//         dragging = true;
//         lastX = e.clientX;
//         lastY = e.clientY;
//     });

//     canvas.addEventListener("mouseup", function(e) {
//         dragging = false;
//     });

//     canvas.addEventListener("mousemove", function(e) {
//         if (!dragging) return;
        
//         var x = e.clientX;
//         var y = e.clientY;
        
//         // Calculate change in position
//         var deltaX = x - lastX;
//         var deltaY = y - lastY;

//         // Update rotation angles based on movement
//         theta += deltaX * 0.5; // 0.5 is sensitivity
//         phi   += deltaY * 0.5;

//         lastX = x;
//         lastY = y;
        
//     });
// }

// function render() {
//     // If the window is resized, we need to update dimensions and viewport
//     if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
//         var dpr = window.devicePixelRatio || 1;
//         canvas.width = canvas.clientWidth * dpr;
//         canvas.height = canvas.clientHeight * dpr;
//         gl.viewport(0, 0, canvas.width, canvas.height);
//     }

//     gl.enable(gl.DEPTH_TEST);
//     gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

//     // Basic Orthographic Projection
//     let aspect = canvas.width / canvas.height;
//     let height = 4;
//     let width = height * aspect;
    
//     projectionMatrix = ortho(-width, width, -height, height, -100, 100);
//     gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

//     // Test first: Auto-Rotate if animation is on
//     if (isAnimating) {
//         theta += rotationSpeed; // Speed of auto-rotation
//     }

//     // View Matrix
//     modelViewMatrix = mat4();

//     // Apply Rotations FIRST
//     // Rotate around X axis (up/down mouse movement)
//     modelViewMatrix = mult(modelViewMatrix, rotate(phi, [1, 0, 0]));
//     // Rotate around Y axis (left/right mouse movement)
//     modelViewMatrix = mult(modelViewMatrix, rotate(theta, [0, 1, 0]));

//     modelViewMatrix = mult(modelViewMatrix, scale(0.02, -0.02, 0.02)); 
//     gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

//     // Do not use flatten() might behave unexpectedly with a simple 1D color array. Use Float32Array directly.
//     gl.uniform4fv(uColorLoc, new Float32Array(currentUserColor));

//     if (!meshPositions || vertexCount === 0) return;

//     gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
// }

// function updateBufferData() {
//     // Bind the buffer and send new data
//     gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
//     gl.bufferData(gl.ARRAY_BUFFER, meshPositions, gl.STATIC_DRAW);
    
//     gl.enableVertexAttribArray(vPosition);
//     gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
// }


// // ---------------------- STEP 2: Flatten / Approximate Curves ----------------------

// // Helper: Calculate signed area to detect winding direction
// function getSignedArea(points) {
//     let area = 0;
//     for (let i = 0; i < points.length; i++) {
//         let j = (i + 1) % points.length;
//         area += (points[i].x * points[j].y) - (points[j].x * points[i].y);
//     }
//     return area / 2;
// }

// // Helper to run Earcut on a single grouped solid
// // Updated helper to accept a specific Z depth
// function triangulateSolid(solid, z, targetArray, reverseWinding = false) {
//     const flatCoords = [];
//     const holeIndices = [];
//     let indexOffset = 0;

//     // Add Outer Ring
//     solid.outer.forEach(p => {
//         flatCoords.push(p.x, p.y);
//         indexOffset += 2;
//     });

//     // Add Holes
//     solid.holes.forEach(hole => {
//         holeIndices.push(indexOffset / 2);
//         hole.forEach(p => {
//             flatCoords.push(p.x, p.y);
//             indexOffset += 2;
//         });
//     });

//     // Run Earcut
//     const indices = earcut(flatCoords, holeIndices);

//     // If generating the Back Face, we often reverse the index order 
//     // so the face normals point "outwards" (away from the center of the object)
//     if (reverseWinding) {
//         indices.reverse();
//     }

//     // Map back to 3D points
//     for (let i = 0; i < indices.length; i++) {
//         const idx = indices[i];
//         targetArray.push({ 
//             x: flatCoords[idx * 2], 
//             y: flatCoords[idx * 2 + 1],
//             z: z // Apply the requested depth
//         });
//     }
// }

// // Helper to finalize the array
// function flattenAndCenter(triangles) {
//     // Initialize bounds
//     let minX = Infinity, maxX = -Infinity;
//     let minY = Infinity, maxY = -Infinity;
//     let minZ = Infinity, maxZ = -Infinity;

//     // Calculate Bounding Box
//     triangles.forEach(p => {
//         if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
//         if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
//         if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z;
//     });

//     // Find Center
//     const centerX = (minX + maxX) / 2;
//     const centerY = (minY + maxY) / 2;
//     const centerZ = (minZ + maxZ) / 2;
    
//     const finalData = [];
//     triangles.forEach(p => {
//         finalData.push(p.x - centerX);
//         finalData.push(p.y - centerY);
//         finalData.push(p.z - centerZ); 
//     });
    
//     return new Float32Array(finalData);
// }

// function getContoursFromPath(commands, segmentsPerCurve = 10) {
//     const contours = [];
//     let currentContour = [];

//     function addPoint(x, y) {
//         currentContour.push({ x: x, y: y });
//     }

//     commands.forEach(cmd => {
//         if (cmd.type === 'M') {
//             // If we have an existing contour, save it and start a new one
//             if (currentContour.length > 0) {
//                 contours.push(currentContour);
//             }
//             currentContour = [];
//             addPoint(cmd.x, cmd.y);
//         } 
//         else if (cmd.type === 'L') { 
//             addPoint(cmd.x, cmd.y);
//         } 
//         else if (cmd.type === 'C') { 
//             // Bezier Curve
//             const last = currentContour[currentContour.length - 1];
//             const p0 = { x: last.x, y: last.y };
//             const p1 = { x: cmd.x1, y: cmd.y1 };
//             const p2 = { x: cmd.x2, y: cmd.y2 };
//             const p3 = { x: cmd.x, y: cmd.y };

//             for (let t = 1; t <= segmentsPerCurve; t++) {
//                 const tt = t / segmentsPerCurve;
//                 const mt = 1 - tt;
//                 const x = mt * mt * mt * p0.x + 3 * mt * mt * tt * p1.x + 3 * mt * tt * tt * p2.x + tt * tt * tt * p3.x;
//                 const y = mt * mt * mt * p0.y + 3 * mt * mt * tt * p1.y + 3 * mt * tt * tt * p2.y + tt * tt * tt * p3.y;
//                 addPoint(x, y);
//             }
//         } 
//         else if (cmd.type === 'Q') { 
//             // Quadratic Curve
//             const last = currentContour[currentContour.length - 1];
//             const p0 = { x: last.x, y: last.y };
//             const p1 = { x: cmd.x1, y: cmd.y1 };
//             const p2 = { x: cmd.x, y: cmd.y };

//             for (let t = 1; t <= segmentsPerCurve; t++) {
//                 const tt = t / segmentsPerCurve;
//                 const mt = 1 - tt;
//                 const x = mt * mt * p0.x + 2 * mt * tt * p1.x + tt * tt * p2.x;
//                 const y = mt * mt * p0.y + 2 * mt * tt * p1.y + tt * tt * p2.y;
//                 addPoint(x, y);
//             }
//         }
//         else if (cmd.type === 'Z') { 
//             // Close Path - usually implied by the loop, but ensures connection
//             // We don't necessarily need to add a point here if the next M handles it
//         }
//     });

//     // Push the final contour if it exists
//     if (currentContour.length > 0) {
//         contours.push(currentContour);
//     }

//     return contours;
// }

// function addSideWalls(contour, zFront, zBack, targetArray) {
//     const len = contour.length;
//     for (let i = 0; i < len; i++) {
//         let curr = contour[i];
//         let next = contour[(i + 1) % len]; // Wrap to start

//         // We create a "Quad" (2 triangles) for every segment of the outline
        
//         // Triangle 1
//         targetArray.push({ x: curr.x, y: curr.y, z: zFront });
//         targetArray.push({ x: next.x, y: next.y, z: zFront });
//         targetArray.push({ x: curr.x, y: curr.y, z: zBack });

//         // Triangle 2
//         targetArray.push({ x: next.x, y: next.y, z: zBack });
//         targetArray.push({ x: curr.x, y: curr.y, z: zBack });
//         targetArray.push({ x: next.x, y: next.y, z: zFront }); // Note: vertex order matters for culling, but simpler here
//     }
// }

// // Helper to convert Hex to RGBA array
// function hexToRgbA(hex){
//     var c;
//     if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
//         c= hex.substring(1).split('');
//         if(c.length== 3){
//             c= [c[0], c[0], c[1], c[1], c[2], c[2]];
//         }
//         c= '0x'+c.join('');
//         // Return as 0-1 range array [r, g, b, a]
//         return [
//             ((c>>16)&255)/255, 
//             ((c>>8)&255)/255, 
//             (c&255)/255, 
//             1.0
//         ];
//     }
//     return [0.0, 1.0, 0.0, 1.0]; // Default green
// }

// // ---------------------- EXECUTION ----------------------

// function generateTextVertices(text) {
//     if (!text || text.length === 0) return new Float32Array([]);

//     const fontSize = 100;
//     const thickness = currentThickness;
//     const frontZ = thickness / 2;
//     const backZ = -thickness / 2;

//     let allTriangles = [];
//     let cursorX = 0; 

//     for (let i = 0; i < text.length; i++) {
//         const char = text[i];
//         const glyph = loadedFont.charToGlyph(char);
//         const path = glyph.getPath(cursorX, 0, fontSize);
//         console.log("Character:", char, "Path:", path);
        
//         // 1. Get contours
//         const rawContours = getContoursFromPath(path.commands, 10);

//         if (rawContours.length > 0) {
//             // 2. Classify (Area calculation)
//             const classified = rawContours.map(points => ({
//                 points: points,
//                 area: getSignedArea(points)
//             }));

//             // 3. Identify Solid vs Hole
//             const largest = classified.reduce((a, b) => 
//                 Math.abs(b.area) > Math.abs(a.area) ? b : a
//             );
//             const solidSign = Math.sign(largest.area);

//             // 4. Group Contours
//             let currentSolid = null;
            
//             // Helper to process a complete solid (Front + Back + Sides)
//             const processSolid = (solid) => {
//                 // A. Front Face
//                 triangulateSolid(solid, frontZ, allTriangles, false);
                
//                 // B. Back Face
//                 triangulateSolid(solid, backZ, allTriangles, true);

//                 // C. Side Walls (Outer)
//                 addSideWalls(solid.outer, frontZ, backZ, allTriangles);

//                 // D. Side Walls (Holes)
//                 solid.holes.forEach(hole => {
//                     addSideWalls(hole, frontZ, backZ, allTriangles);
//                 });
//             };

//             classified.forEach(c => {
//                 if (Math.sign(c.area) === solidSign) {
//                     if (currentSolid) processSolid(currentSolid);
//                     currentSolid = { outer: c.points, holes: [] };
//                 } else {
//                     if (currentSolid) currentSolid.holes.push(c.points);
//                 }
//             });
//             if (currentSolid) processSolid(currentSolid);
//         }

//         cursorX += glyph.advanceWidth * (fontSize / loadedFont.unitsPerEm)+currentSpacing;
//     }

//     if (allTriangles.length === 0) return new Float32Array([]);

//     return flattenAndCenter(allTriangles);
// }

// function updateText(text) {
//     if (!loadedFont) return;
    
//     // Regenerate mesh based on new text
//     meshPositions = generateTextVertices(text);
//     vertexCount = meshPositions.length / 3;

//     // Send new data to GPU
//     updateBufferData();
// }

// window.onload = function init() {
//     getUIElement();
//     configureWebGL();

//     // Setup Input Listener
//     const inputEl = document.getElementById("wordInput");
//     inputEl.addEventListener("input", function(e) {
//         // Enforce max length of 4 just in case
//         let val = e.target.value;

//         // Uppercase and only Alphabetic
//         val = val.toUpperCase();
//         val = val.replace(/[^A-Z]/g, '');

//         if (val.length > 4) val = val.substring(0, 4);
        
//         // Update the input field so the user sees the filtered result
//         e.target.value = val;

//         updateText(val);
//     });

//     // THICKNESS Input Listener
//     const thickEl = document.getElementById("thicknessInput");
//     thickEl.addEventListener("input", function(e) {
//         currentThickness = parseFloat(e.target.value);
//         // We must regenerate the mesh when thickness changes
//         let val = inputEl.value || "USM"; 
//         updateText(val);
//     });

//     const colorEl = document.getElementById("colorInput");
//     colorEl.addEventListener("input", function(e) {
//         // Convert the hex color from the picker to RGBA for WebGL
//         currentUserColor = hexToRgbA(e.target.value);
//     });

//     const spacingEl = document.getElementById("spacingInput");
//     spacingEl.addEventListener("input", function(e) {
//         currentSpacing = parseFloat(e.target.value);
//         let val = inputEl.value || "USM"; 
//         updateText(val);
//     });

//     const speedEl = document.getElementById("speedInput");
//     speedEl.addEventListener("input", function(e) {
//         rotationSpeed = parseFloat(e.target.value);
//     });

//     // -----------------------------------------------------------------------
//     // UPDATED BUTTON LOGIC
//     // -----------------------------------------------------------------------

//     const btnStartStop = document.getElementById("btnStartStop");
//     const btnReset = document.getElementById("btnReset");

//     // 1. START / STOP TOGGLE
//     btnStartStop.addEventListener("click", function() {
//         if (!isAnimating) {
//             // Switch to STOP mode
//             isAnimating = true;
//             btnStartStop.innerText = "Stop";
//             btnStartStop.classList.add("stop-active"); // Turn Red
//         } else {
//             // Switch to START mode
//             isAnimating = false;
//             btnStartStop.innerText = "Start";
//             btnStartStop.classList.remove("stop-active"); // Turn Green
//         }
//     });

//     // 2. RESET BUTTON
//     btnReset.addEventListener("click", function() {
//         // Reset Animation state
//         isAnimating = false;
//         btnStartStop.innerText = "Start";
//         btnStartStop.classList.remove("stop-active");

//         // Reset Rotations
//         theta = 35;
//         phi = -15;

//         // Reset Inputs
//         inputEl.value = "USM";
//         thickEl.value = "20";
//         spacingEl.value = "5";
//         colorEl.value = "#9a3be8";
//         speedEl.value = "1.0";

//         // Reset Variables
//         currentThickness = 20;
//         currentSpacing = 5;
//         currentUserColor = [0.6039, 0.2314, 0.9098, 1.0];
//         rotationSpeed = 1.0;

//         updateText("USM");
//     });

//     // 3. DAY / NIGHT TOGGLE
//     const btnDayNight = document.getElementById("btnDayNight");

//     btnDayNight.addEventListener("click", function() {
//         isDayMode = !isDayMode; // Toggle boolean

//         // --- NEW LINE: Toggle the CSS class ---
//         btnDayNight.classList.toggle("day-active");

//         if (isDayMode) {
//             // Day Mode: Light Background (almost white)
//             // gl.clearColor(Red, Green, Blue, Alpha)
//             gl.clearColor(0.9, 0.9, 0.9, 1.0); 
            
//             // Update Icon to Sun
//             btnDayNight.innerText = "☀️"; 

//         } else {
//             // Night Mode: Black Background (Default)
//             gl.clearColor(0.0, 0.0, 0.0, 1.0);
            
//             // Update Icon to Moon
//             btnDayNight.innerText = "🌙"; 
//         }
//     });

//     opentype.load('fonts/static/Roboto-Medium.ttf', function (err, font) {
//         if (err) {
//             console.error('Font load error:', err);
//             return;
//         }

//         loadedFont = font; // Store globally

//         // Initialize with default text (empty or placeholder)
//         // Check if there is already value in input (e.g. browser refresh)
//         let initialText = inputEl.value || "USM"; 
//         initialText = initialText.toUpperCase().replace(/[^A-Z]/g, '').substring(0,4);

//         // Load initial color/thickness values from DOM
//         currentUserColor = hexToRgbA(colorEl.value);
//         currentThickness = parseFloat(thickEl.value);
//         currentSpacing = parseFloat(spacingEl.value);

//         updateText(initialText);
        
//         // Start Render Loop
//         function tick() {
//             render();
//             requestAnimationFrame(tick);
//         }
//         tick();
//     });
// }








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
    initUIHandlers();

    opentype.load('fonts/static/Roboto-Medium.ttf', function (err, font) {
        if (err) {
            console.error('Font load error:', err);
            return;
        }

        loadedFont = font; // Store globally

        // Check if there is already value in input (e.g. browser refresh)
        let initialText = inputEl.value || "USM"; 
        initialText = initialText.toUpperCase().replace(/[^A-Z]/g, '').substring(0,4);

        // Load initial color/thickness values from DOM
        currentUserColor = hexToRgbA(colorEl.value);
        currentThickness = parseFloat(thickEl.value);
        currentSpacing = parseFloat(spacingEl.value);

        updateText(initialText);
        
        // Start Render Loop
        tick()
    });
}