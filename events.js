// Helper to convert Hex to RGBA array
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
    return [0.0, 1.0, 0.0, 1.0]; // Default green
}

function initUIHandlers() {
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

    // THICKNESS Input Listener
    const thickEl = document.getElementById("thicknessInput");
    thickEl.addEventListener("input", function(e) {
        currentThickness = parseFloat(e.target.value);
        // We must regenerate the mesh when thickness changes
        let val = inputEl.value || "USM"; 
        updateText(val);
    });

    const colorEl = document.getElementById("colorInput");
    colorEl.addEventListener("input", function(e) {
        // Convert the hex color from the picker to RGBA for WebGL
        currentUserColor = hexToRgbA(e.target.value);
    });

    const spacingEl = document.getElementById("spacingInput");
    spacingEl.addEventListener("input", function(e) {
        currentSpacing = parseFloat(e.target.value);
        let val = inputEl.value || "USM"; 
        updateText(val);
    });

    const speedEl = document.getElementById("speedInput");
    speedEl.addEventListener("input", function(e) {
        let val = parseFloat(e.target.value);
        
        // 1. Update Rotation Speed
        rotationSpeed = val;

        // 2. Update Translation Speed
        // We preserve the current direction (Math.sign) but update the speed magnitude
        // Base speeds: X = 0.04, Y = 0.03 (when slider is 1.0)
        
        let signX = (velX !== 0) ? Math.sign(velX) : 1;
        let signY = (velY !== 0) ? Math.sign(velY) : 1;

        velX = signX * (val * 0.04);
        velY = signY * (val * 0.03);
    });

    // -----------------------------------------------------------------------
    // UPDATED BUTTON LOGIC
    // -----------------------------------------------------------------------

    const btnStartStop = document.getElementById("btnStartStop");
    const btnReset = document.getElementById("btnReset");

    // 1. START / STOP TOGGLE
    btnStartStop.addEventListener("click", function() {
        if (!isAnimating) {
            // Switch to STOP mode
            isAnimating = true;
            btnStartStop.innerText = "Stop";
            btnStartStop.classList.add("stop-active"); // Turn Red
        } else {
            // Switch to START mode
            isAnimating = false;
            btnStartStop.innerText = "Start";
            btnStartStop.classList.remove("stop-active"); // Turn Green
        }
    });

    // 2. RESET BUTTON
    btnReset.addEventListener("click", function() {
        // Reset Animation state
        isAnimating = false;
        btnStartStop.innerText = "Start";
        btnStartStop.classList.remove("stop-active");

        // Reset Animation Phase
        currentPhase = 0;

        // Reset Rotations
        theta = 35;
        phi = -15;

        // Reset Position & Velocity
        transX = 0;
        transY = 0;
        transZ = 0;
        velX = 0.04;
        velY = 0.03;

        // Reset Inputs
        inputEl.value = "USM";
        thickEl.value = "20";
        spacingEl.value = "5";
        colorEl.value = "#9a3be8";
        speedEl.value = "1.0";

        // Reset Variables
        currentThickness = 20;
        currentSpacing = 5;
        currentUserColor = [0.6039, 0.2314, 0.9098, 1.0];
        rotationSpeed = 1.0;
        scaleFactor = 0.02;

        updateText("USM");
    });

    // 3. DAY / NIGHT TOGGLE
    const btnDayNight = document.getElementById("btnDayNight");

    btnDayNight.addEventListener("click", function() {
        isDayMode = !isDayMode; // Toggle boolean

        // --- NEW LINE: Toggle the CSS class ---
        btnDayNight.classList.toggle("day-active");

        if (isDayMode) {
            // Day Mode: Light Background (almost white)
            // gl.clearColor(Red, Green, Blue, Alpha)
            gl.clearColor(0.9, 0.9, 0.9, 1.0); 
            
            // Update Icon to Sun
            btnDayNight.innerText = "☀️"; 

        } else {
            // Night Mode: Black Background (Default)
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            
            // Update Icon to Moon
            btnDayNight.innerText = "🌙"; 
        }
    });
}