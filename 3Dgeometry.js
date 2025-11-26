// Helper: Calculate signed area to detect winding direction
function getSignedArea(points) {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        let j = (i + 1) % points.length;
        area += (points[i].x * points[j].y) - (points[j].x * points[i].y);
    }
    return area / 2;
}

// Helper to run Earcut on a single grouped solid
function triangulateSolid(solid, z, targetArray, reverseWinding = false) {
    const flatCoords = [];
    const holeIndices = [];
    let indexOffset = 0;

    // Add Outer Ring
    solid.outer.forEach(p => {
        flatCoords.push(p.x, p.y);
        indexOffset += 2;
    });

    // Add Holes
    solid.holes.forEach(hole => {
        holeIndices.push(indexOffset / 2);
        hole.forEach(p => {
            flatCoords.push(p.x, p.y);
            indexOffset += 2;
        });
    });

    // Run Earcut
    const indices = earcut(flatCoords, holeIndices);

    if (reverseWinding) {
        indices.reverse();
    }

    // Map back to 3D points
    for (let i = 0; i < indices.length; i++) {
        const idx = indices[i];
        targetArray.push({ 
            x: flatCoords[idx * 2], 
            y: flatCoords[idx * 2 + 1],
            z: z 
        });
    }
}

// Helper to finalize the array
function flattenAndCenter(triangles) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    triangles.forEach(p => {
        if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
        if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z;
    });

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;
    
    const finalData = [];
    triangles.forEach(p => {
        finalData.push(p.x - centerX);
        finalData.push(p.y - centerY);
        finalData.push(p.z - centerZ); 
    });
    
    return new Float32Array(finalData);
}

function addSideWalls(contour, zFront, zBack, targetArray) {
    const len = contour.length;
    for (let i = 0; i < len; i++) {
        let curr = contour[i];
        let next = contour[(i + 1) % len]; 
        
        targetArray.push({ x: curr.x, y: curr.y, z: zFront });
        targetArray.push({ x: next.x, y: next.y, z: zFront });
        targetArray.push({ x: curr.x, y: curr.y, z: zBack });

        targetArray.push({ x: next.x, y: next.y, z: zBack });
        targetArray.push({ x: curr.x, y: curr.y, z: zBack });
        targetArray.push({ x: next.x, y: next.y, z: zFront }); 
    }
}