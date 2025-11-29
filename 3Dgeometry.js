//function to compute the signed area of 2D polygon
function getSignedArea(points) {
    // Shoelace formula only 
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        let j = (i + 1) % points.length;
        area += (points[i].x * points[j].y) - (points[j].x * points[i].y);
    }
    return area / 2;
}

//function to triangulate a 2D polygon with holes
function triangulateSolid(solid, z, targetArray, reverseWinding = false) {
    const flatCoords = [];
    const holeIndices = [];
    let indexOffset = 0;

    // we alrd know this solid face is hole/solid by the time we pass solid parameter
    // it is defined in the main function in generateTextVertices()

    //add outer ring
    solid.outer.forEach(p => {
        flatCoords.push(p.x, p.y);
        indexOffset += 2;
    });

    //add holes
    solid.holes.forEach(hole => {
        holeIndices.push(indexOffset / 2);
        hole.forEach(p => {
            flatCoords.push(p.x, p.y);
            indexOffset += 2;
        });
    });

    //run earcut to split the shpae into triangle indices
    const indices = earcut(flatCoords, holeIndices);

    //flip the traingles at the back face so normals points outward
    if (reverseWinding) {
        indices.reverse();
    }

    //turn triangle indices into 3D points and append to output
    for (let i = 0; i < indices.length; i++) {
        const idx = indices[i];
        targetArray.push({ 
            x: flatCoords[idx * 2], 
            y: flatCoords[idx * 2 + 1],
            z: z 
        });
    }
}

//function to mesh around (0,0,0) and flatten into an arryay for WebGL
function flattenAndCenter(triangles) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    //scan all points to find bounds(box around the mesh)
    triangles.forEach(p => {
        if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
        if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z;
    });

    //compute the center of the box
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;
    
    //subtract the center from every point (so that it all transformation is around the center)
    const finalData = [];
    triangles.forEach(p => {
        finalData.push(p.x - centerX);
        finalData.push(p.y - centerY);
        finalData.push(p.z - centerZ); 
    });
    
    //return a WebGL friendly form
    return new Float32Array(finalData);
}

//function to build the side walls
//create a rectangle (using 2 triangles) for each edge in the outline
function addSideWalls(contour, zFront, zBack, targetArray) {
    // loop through every contour edge
    const len = contour.length;
    for (let i = 0; i < len; i++) {
        let curr = contour[i];
        let next = contour[(i + 1) % len]; 
        
        // first triangle
        targetArray.push({ x: curr.x, y: curr.y, z: zFront });
        targetArray.push({ x: next.x, y: next.y, z: zFront });
        targetArray.push({ x: curr.x, y: curr.y, z: zBack });

        // second triangle
        targetArray.push({ x: next.x, y: next.y, z: zBack });
        targetArray.push({ x: curr.x, y: curr.y, z: zBack });
        targetArray.push({ x: next.x, y: next.y, z: zFront }); 
    }
}