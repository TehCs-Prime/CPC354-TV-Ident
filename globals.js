
var canvas, gl, program;
var inputEl, colorEl, thickEl, spacingEl, speedEl;
var posBuffer, vPosition;
var modelViewMatrixLoc, projectionMatrixLoc;
var modelViewMatrix, projectionMatrix;

// Global State
let loadedFont = null; 
let meshPositions = null; 
let vertexCount = 0;

// Rotation State
var theta = 35;  // Rotation around Y axis
var phi = -15;    // Rotation around X axis
var dr = 5.0 * Math.PI/180.0; // Speed multiplier

// Translation & Bouncing State 
var transX = 0;
var transY = 0;
var transZ = 0;

var velX = 0.04; // Speed in X direction
var velY = 0.03; // Speed in Y direction

// Boundaries (Walls) - Based on your Ortho projection height of 4
var boundaryX = 5.5; 
var boundaryY = 3.5; 

// Mouse State
var dragging = false;
var lastX = 0;
var lastY = 0;

// Scale State
var scaleFactor = 0.02;
var scaleStep = 0.0001;

// User Customizable State
var uColorLoc;
let currentThickness = 20;       // Default thickness
let currentSpacing = 5;
let currentUserColor = [0.6039, 0.2314, 0.9098, 1.0]; // Default Green

// Animation State
let currentPhase = 0;
let isAnimating = false;
let rotationSpeed = 1.0;

let isDayMode = false;