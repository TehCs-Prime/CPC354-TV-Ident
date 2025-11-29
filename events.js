//function to convert Hex to RGBA array
function hexToRgbA(hex){
    var c;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x'+c.join('');
        // Return as 0-1 range array [r, g, b, a]
        return [
            ((c>>16)&255)/255, 
            ((c>>8)&255)/255, 
            (c&255)/255, 
            1.0
        ];
    }
    return [0.0, 1.0, 0.0, 1.0]; // Default color
}

//function to handle all UI controls(text, sliders, buttons)
function initUIHandlers() {
    //handle text input
    const inputEl = document.getElementById("wordInput");
    inputEl.addEventListener("input", function(e) {
        //set max length of input string as 4
        let val = e.target.value;

        //capitalize alphabets
        val = val.toUpperCase();
        val = val.replace(/[^A-Z]/g, '');

        if (val.length > 4) val = val.substring(0, 4);
        
        //update the input field
        e.target.value = val;

        updateText(val);
    });

    //handle thickness slider
    const thickEl = document.getElementById("thicknessInput");
    thickEl.addEventListener("input", function(e) {
        currentThickness = parseFloat(e.target.value);
        //regenerate the mesh when thickness changes
        let val = inputEl.value || "USM"; 
        updateText(val);
    });

    //color picker
    const colorEl = document.getElementById("colorInput");
    colorEl.addEventListener("input", function(e) {
        // Convert the hex color from the picker to RGBA for WebGL
        currentUserColor = hexToRgbA(e.target.value);
    });

    //handle spacing slider
    const spacingEl = document.getElementById("spacingInput");
    spacingEl.addEventListener("input", function(e) {
        currentSpacing = parseFloat(e.target.value);
        //regenerate the mesh based on the adjusted spacing
        let val = inputEl.value || "USM"; 
        updateText(val);
    });

    //handle speed slider
    const speedEl = document.getElementById("speedInput");
    speedEl.addEventListener("input", function(e) {
        //update the rotation speed
        let val = parseFloat(e.target.value);
        
        rotationSpeed = val;

        //update translation speed
        let signX = (velX !== 0) ? Math.sign(velX) : 1;
        let signY = (velY !== 0) ? Math.sign(velY) : 1;

        velX = signX * (val * 0.04);
        velY = signY * (val * 0.03);
    });


    //define start and reset button
    const btnStartStop = document.getElementById("btnStartStop");
    const btnReset = document.getElementById("btnReset");


    //handle start and stop button
    btnStartStop.addEventListener("click", function() {
        if (!isAnimating) {
            //start the animation
            isAnimating = true;
            btnStartStop.innerText = "Stop";
            btnStartStop.classList.add("stop-active"); // Turn Red
        } else {
            //stop the animation
            isAnimating = false;
            btnStartStop.innerText = "Start";
            btnStartStop.classList.remove("stop-active"); // Turn Green
        }
    });

    //reset everything to defaults
    btnReset.addEventListener("click", function() {
        //reset animation state
        isAnimating = false;
        btnStartStop.innerText = "Start";
        btnStartStop.classList.remove("stop-active");

        //reset animation phase
        currentPhase = 0;

        //reset rotation
        theta = 35;
        phi = -15;

        //reset position and translation speed
        transX = 0;
        transY = 0;
        transZ = 0;
        velX = 0.04;
        velY = 0.03;

        //reset inputs
        inputEl.value = "USM";
        thickEl.value = "20";
        spacingEl.value = "5";
        colorEl.value = "#9a3be8";
        speedEl.value = "1.0";

        //reset variables
        currentThickness = 20;
        currentSpacing = 5;
        currentUserColor = [0.6039, 0.2314, 0.9098, 1.0];
        rotationSpeed = 1.0;
        scaleFactor = 0.02;

        updateText("USM");
    });

    //function to switch between bright and dark background
    const btnDayNight = document.getElementById("btnDayNight");

    btnDayNight.addEventListener("click", function() {
        isDayMode = !isDayMode; // Toggle boolean

        //toggle the update of the button
        btnDayNight.classList.toggle("day-active");

        if (isDayMode) {
            //Light Background
            gl.clearColor(0.9, 0.9, 0.9, 1.0); 
            
            //update the button to sun icon
            btnDayNight.innerText = "☀️"; 

        } else {
            //Black Background
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            
            //update icon to moon
            btnDayNight.innerText = "🌙"; 
        }
    });
}