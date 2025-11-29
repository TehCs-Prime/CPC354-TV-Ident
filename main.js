// for every user input
function updateText(text) {
    if (!loadedFont) return;
    
    //generate a new vertex buffer from input text
    meshPositions = generateTextVertices(text);
    vertexCount = meshPositions.length / 3;

    // Send new vertex buffer to GPU
    updateBufferData();
}

window.onload = function init() { 
    //get canvas and UI elements 
    getUIElement();
    //initialize WebGL elements
    configureWebGL();
    //initialize UI event listeners(text, sliders, buttons)
    initUIHandlers();

    //load the font file
    opentype.load('fonts/static/Roboto-Medium.ttf', function (err, font) {
        if (err) {
            console.error('Font load error:', err);
            return;
        }

        //store the font
        loadedFont = font;

        //capitalize user input text
        //set "USM" as default input
        let initialText = inputEl.value || "USM"; 
        initialText = initialText.toUpperCase().replace(/[^A-Z]/g, '').substring(0,4);

        //read initial UI values
        currentUserColor = hexToRgbA(colorEl.value);
        currentThickness = parseFloat(thickEl.value);
        currentSpacing = parseFloat(spacingEl.value);

        //build the initial mesh and upload its vertex buffer
        updateText(initialText);
        
        //start the render loop
        tick()
    });
}