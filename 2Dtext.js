function getContoursFromPath(commands, segmentsPerCurve = 10) {
    const contours = [];
    let currentContour = [];

    function addPoint(x, y) {
        currentContour.push({ x: x, y: y });
    }

    commands.forEach(cmd => {
        if (cmd.type === 'M') {
            if (currentContour.length > 0) {
                contours.push(currentContour);
            }
            currentContour = [];
            addPoint(cmd.x, cmd.y);
        } 
        else if (cmd.type === 'L') { 
            addPoint(cmd.x, cmd.y);
        } 
        else if (cmd.type === 'C') { 
            const last = currentContour[currentContour.length - 1];
            const p0 = { x: last.x, y: last.y };
            const p1 = { x: cmd.x1, y: cmd.y1 };
            const p2 = { x: cmd.x2, y: cmd.y2 };
            const p3 = { x: cmd.x, y: cmd.y };

            for (let t = 1; t <= segmentsPerCurve; t++) {
                const tt = t / segmentsPerCurve;
                const mt = 1 - tt;
                const x = mt * mt * mt * p0.x + 3 * mt * mt * tt * p1.x + 3 * mt * tt * tt * p2.x + tt * tt * tt * p3.x;
                const y = mt * mt * mt * p0.y + 3 * mt * mt * tt * p1.y + 3 * mt * tt * tt * p2.y + tt * tt * tt * p3.y;
                addPoint(x, y);
            }
        } 
        else if (cmd.type === 'Q') { 
            const last = currentContour[currentContour.length - 1];
            const p0 = { x: last.x, y: last.y };
            const p1 = { x: cmd.x1, y: cmd.y1 };
            const p2 = { x: cmd.x, y: cmd.y };

            for (let t = 1; t <= segmentsPerCurve; t++) {
                const tt = t / segmentsPerCurve;
                const mt = 1 - tt;
                const x = mt * mt * p0.x + 2 * mt * tt * p1.x + tt * tt * p2.x;
                const y = mt * mt * p0.y + 2 * mt * tt * p1.y + tt * tt * p2.y;
                addPoint(x, y);
            }
        }
    });

    if (currentContour.length > 0) {
        contours.push(currentContour);
    }

    return contours;
}

function generateTextVertices(text) {
    if (!text || text.length === 0) return new Float32Array([]);

    const fontSize = 100;
    const thickness = currentThickness;
    const frontZ = thickness / 2;
    const backZ = -thickness / 2;

    let allTriangles = [];
    let cursorX = 0; 

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const glyph = loadedFont.charToGlyph(char);
        const path = glyph.getPath(cursorX, 0, fontSize);
        
        // 1. Get contours
        const rawContours = getContoursFromPath(path.commands, 10);

        if (rawContours.length > 0) {
            // 2. Classify (Area calculation)
            const classified = rawContours.map(points => ({
                points: points,
                area: getSignedArea(points)
            }));

            // 3. Identify Solid vs Hole
            const largest = classified.reduce((a, b) => 
                Math.abs(b.area) > Math.abs(a.area) ? b : a
            );
            const solidSign = Math.sign(largest.area);

            // 4. Group Contours
            let currentSolid = null;
            
            // Helper to process a complete solid (Front + Back + Sides)
            const processSolid = (solid) => {
                triangulateSolid(solid, frontZ, allTriangles, false);
                triangulateSolid(solid, backZ, allTriangles, true);
                addSideWalls(solid.outer, frontZ, backZ, allTriangles);
                solid.holes.forEach(hole => {
                    addSideWalls(hole, frontZ, backZ, allTriangles);
                });
            };

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

        cursorX += glyph.advanceWidth * (fontSize / loadedFont.unitsPerEm)+currentSpacing;
    }

    if (allTriangles.length === 0) return new Float32Array([]);

    return flattenAndCenter(allTriangles);
}