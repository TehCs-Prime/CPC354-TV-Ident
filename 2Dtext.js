// function to convert commands(line, curve, move) into lists of points
function getContoursFromPath(commands, segmentsPerCurve = 10) {
    // parameter commands refer to the array of path commands from opentype.js(M,L,C,Q)
    // parameter segmentsPerCurve refer to the resolution of curves(Higher value will produce smoother curve with more vertices)
    // countours is an array of shapes to be returned
    const contours = [];
    let currentContour = [];

    // add a point to the current shape
    function addPoint(x, y) {
        currentContour.push({ x: x, y: y });
    }

    commands.forEach(cmd => {
        // M : move to (start a new shape)
        if (cmd.type === 'M') {
            // save the current shape before building a new one
            if (currentContour.length > 0) {
                contours.push(currentContour);
            }
            currentContour = [];
            addPoint(cmd.x, cmd.y);
        } 

        // L : line to (straight line)
        else if (cmd.type === 'L') { 
            addPoint(cmd.x, cmd.y);
        } 

        // C : Complex curve with 2 control points
        else if (cmd.type === 'C') { 
            // get the last point of the current shape
            const last = currentContour[currentContour.length - 1];
            const p0 = { x: last.x, y: last.y };  //start point (start of line)
            const p1 = { x: cmd.x1, y: cmd.y1 };  //control point 1
            const p2 = { x: cmd.x2, y: cmd.y2 };  //control point 2
            const p3 = { x: cmd.x, y: cmd.y };    //end point (end of line)

            //interpolate the points along the curve
            //Cubic Bezier Formula : B(t) = (1-t)^3*P0 + 3(1-t)^2*t*P1 + 3(1-t)*t^2*P2 + t^3*P3
            for (let t = 1; t <= segmentsPerCurve; t++) {
                const tt = t / segmentsPerCurve;
                const mt = 1 - tt;
                const x = mt * mt * mt * p0.x + 3 * mt * mt * tt * p1.x + 3 * mt * tt * tt * p2.x + tt * tt * tt * p3.x;
                const y = mt * mt * mt * p0.y + 3 * mt * mt * tt * p1.y + 3 * mt * tt * tt * p2.y + tt * tt * tt * p3.y;
                addPoint(x, y);
            }
        } 

        // Q : Simple Curve with 1 control point
        else if (cmd.type === 'Q') { 
            const last = currentContour[currentContour.length - 1];
            const p0 = { x: last.x, y: last.y };
            const p1 = { x: cmd.x1, y: cmd.y1 };
            const p2 = { x: cmd.x, y: cmd.y };

            //interpolate the points
            //Quadratic formula : B(t) = (1-t)^2*P0 + 2(1-t)t*P1 + t^2*P2
            for (let t = 1; t <= segmentsPerCurve; t++) {
                const tt = t / segmentsPerCurve;
                const mt = 1 - tt;
                const x = mt * mt * p0.x + 2 * mt * tt * p1.x + tt * tt * p2.x;
                const y = mt * mt * p0.y + 2 * mt * tt * p1.y + tt * tt * p2.y;
                addPoint(x, y);
            }
        }
    });

    //save the final contour
    if (currentContour.length > 0) {
        contours.push(currentContour);
    }

    return contours;
}

// function to convert text to 3D mesh
function generateTextVertices(text) {
    if (!text || text.length === 0) return new Float32Array([]);

    // default value
    const fontSize = 100;
    const thickness = currentThickness;
    const frontZ = thickness / 2;
    const backZ = -thickness / 2;

    // array to hold every triangle vertices of the final 3D object
    let allTriangles = [];
    // track the position of the next character
    let cursorX = 0; 

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const glyph = loadedFont.charToGlyph(char);

        //get the raw vector path(M/L/C/Q commands) for glyph at cursorX
        const path = glyph.getPath(cursorX, 0, fontSize);
        
        //convert curves to list of points
        const rawContours = getContoursFromPath(path.commands, 10);

        if (rawContours.length > 0) {
            //calculate signed area to determine winding direction(clockwise/counter-clockwise)
            //positive or negative sign helps determine solids and holes
            const classified = rawContours.map(points => ({
                points: points,
                area: getSignedArea(points)
            }));

            //identify solid and hole
            //pick the contour with the largest absolute value(main outline)
            const largest = classified.reduce((a, b) => 
                Math.abs(b.area) > Math.abs(a.area) ? b : a
            );
            //contours with this sign are solid
            const solidSign = Math.sign(largest.area);

            //group contours into solid and respective holes
            let currentSolid = null;
            
            // Helper to process a complete solid (Front + Back + Sides)
            const processSolid = (solid) => {
                //front face
                triangulateSolid(solid, frontZ, allTriangles, false);
                //back face
                triangulateSolid(solid, backZ, allTriangles, true);
                //side walls for outer ring
                addSideWalls(solid.outer, frontZ, backZ, allTriangles);
                //side walls for hole
                solid.holes.forEach(hole => {
                    addSideWalls(hole, frontZ, backZ, allTriangles);
                });
            };

            //assign the contour as solid or hole based on the sign
            classified.forEach(c => {
                if (Math.sign(c.area) === solidSign) {
                    if (currentSolid) processSolid(currentSolid);
                    currentSolid = { outer: c.points, holes: [] };
                } else {
                    if (currentSolid) currentSolid.holes.push(c.points);
                }
            });
            if (currentSolid) processSolid(currentSolid);
        }

        //move cursor to the right for the next glyph
        cursorX += glyph.advanceWidth * (fontSize / loadedFont.unitsPerEm)+currentSpacing;
    }

    if (allTriangles.length === 0) return new Float32Array([]);

    return flattenAndCenter(allTriangles);
}