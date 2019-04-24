//
// Start here
//
var canvas;
var gl;

var shaderProgram;
var buffers;
var programInfo;

var virtMem = new Uint8Array(256*256);
var virtText;

var look_dir, look_right, look_up;
var cam_eye = [-1500, 1200, 1200];

var keys = {};

function main() {
	canvas = document.querySelector('#glcanvas');
	gl = canvas.getContext('webgl2');

	document.addEventListener("click", initMouse, false);

	// If we don't have a GL context, give up now

	if (!gl) {
		alert('Unable to initialize WebGL2. Your browser or machine may not support it.');
		return;
	}


	// Initialize a shader program; this is where all the lighting
	// for the vertices and so forth is established.
	shaderProgram = initShaderProgram(gl, vsSource, fsSource);

	// Collect all the info needed to use the shader program.
	// Look up which attributes our shader program is using
	// for aVertexPosition, aVevrtexColor and also
	// look up uniform locations.
	programInfo = {
		program: shaderProgram,
		attribLocations: {
			vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
		},
		uniformLocations: {
			look_dir: gl.getUniformLocation(shaderProgram, 'look_dir'),
			look_up: gl.getUniformLocation(shaderProgram, 'look_up'),
			look_right: gl.getUniformLocation(shaderProgram, 'look_right'),
			cam_eye: gl.getUniformLocation(shaderProgram, 'cam_eye'),
			memory_sampler: gl.getUniformLocation(shaderProgram, 'memory_sampler'),
		},
	};

	// Here's where we call the routine that builds all the
	// objects we'll be drawing.
	buffers = initBuffers();

	// Draw the scene
	drawScene();
}

//
// initBuffers
//
// Initialize the buffers we'll need. For this demo, we just
// have one object -- a simple two-dimensional square.
//
function initBuffers() {

	// Create a buffer for the square's positions.

	const positionBuffer = gl.createBuffer();

	// Select the positionBuffer as the one to apply buffer
	// operations to from here out.

	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

	// Now create an array of positions for the square.

	const positions = [
		1.0,  1.0,
		-1.0,  1.0,
		1.0, -1.0,
		-1.0, -1.0,
	];

	// Now pass the list of positions into WebGL to build the
	// shape. We do this by creating a Float32Array from the
	// JavaScript array, then use it to fill the current buffer.

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

	createVirtualMemory();

	return {
		position: positionBuffer,
	};
}

//
// Draw the scene.
//
function drawScene() {
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

	gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
	gl.clearDepth(1.0);                 // Clear everything
	gl.enable(gl.DEPTH_TEST);           // Enable depth testing
	gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

	// Clear the canvas before we start drawing on it.

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// Create a perspective matrix, a special matrix that is
	// used to simulate the distortion of perspective in a camera.
	// Our field of view is 45 degrees, with a width/height
	// ratio that matches the display size of the canvas
	// and we only want to see objects between 0.1 units
	// and 100 units away from the camera.

	// Tell WebGL how to pull out the positions from the position
	// buffer into the vertexPosition attribute
	{
		const numComponents = 2;
		const type = gl.FLOAT;
		const normalize = false;
		const stride = 0;
		const offset = 0;
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
		gl.vertexAttribPointer(
			programInfo.attribLocations.vertexPosition,
			numComponents,
			type,
			normalize,
			stride,
			offset
		);
		gl.enableVertexAttribArray(
			programInfo.attribLocations.vertexPosition
		);
	}

	// Tell WebGL to use our program when drawing

	gl.useProgram(programInfo.program);

	// Set the shader uniforms

	look_dir = [Math.cos(angH) * Math.cos(angV), Math.sin(angH) * Math.cos(angV), Math.sin(angV)];
	look_right = [Math.sin(angH) * canvas.width * 1.0 / canvas.height, -Math.cos(angH) * canvas.width * 1.0 / canvas.height, 0]
	look_up = [-Math.cos(angH) * Math.sin(angV), -Math.sin(angH) * Math.sin(angV), Math.cos(angV)];

	var mov_dir = [Math.cos(angH), Math.sin(angH), 0];
	var mov_right = [Math.sin(angH), -Math.cos(angH), 0]
	var mov_up = [0, 0, 1];


	for(var i = 0; i < 3; i++) {
		if(keys['w']) cam_eye[i] += 5*mov_dir[i];
		if(keys['a']) cam_eye[i] -= 5*mov_right[i];
		if(keys['s']) cam_eye[i] -= 5*mov_dir[i];
		if(keys['d']) cam_eye[i] += 5*mov_right[i];
		if(keys['q']) cam_eye[i] -= 5*mov_up[i];
		if(keys['e']) cam_eye[i] += 5*mov_up[i];
	}

	gl.uniform3f(
		programInfo.uniformLocations.look_dir,
		look_dir[0], look_dir[1], look_dir[2]
	);
	gl.uniform3f(
		programInfo.uniformLocations.look_right,
		look_right[0], look_right[1], look_right[2]
	);
	gl.uniform3f(
		programInfo.uniformLocations.look_up,
		look_up[0], look_up[1], look_up[2]
		
	);
	gl.uniform3f(
		programInfo.uniformLocations.cam_eye,
		cam_eye[0], cam_eye[1], cam_eye[2]
	);

	gl.activeTexture(gl.TEXTURE0);
	// Bind the texture to texture unit 0
	gl.bindTexture(gl.TEXTURE_2D, virtText);
	// Tell the shader we bound the texture to texture unit 0
	gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

	{
		const offset = 0;
		const vertexCount = 4;
		gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
	}
}

//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(gl, vsSource, fsSource) {
	const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
	const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

	// Create the shader program

	const shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	// If creating the shader program failed, alert

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
		return null;
	}

	return shaderProgram;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source) {
	const shader = gl.createShader(type);

	// Send the source to the shader object

	gl.shaderSource(shader, source);

	// Compile the shader program

	gl.compileShader(shader);

	// See if it compiled successfully

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}

	return shader;
}

function createVirtualMemory() {
	virtText = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, virtText);

	gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8UI, 256, 256, 0, gl.RED_INTEGER, gl.UNSIGNED_BYTE, virtMem);

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

	changeVirtualMemoryBlock(16, [
		0x10, 0x01,
		0x10, 0x01,
		0x10, 0x01,
		0x00, 0x00,
		0x00, 0x00,
		0x10, 0x01,
		0x10, 0x01,
		0x10, 0x01
	]);

	changeVirtualMemoryBlock(17, [
		0x20, 0x01,
		0x20, 0x01,
		0x20, 0x01,
		0x00, 0x00,
		0x00, 0x00,
		0x20, 0x01,
		0x20, 0x01,
		0x20, 0x01
	]);

	changeVirtualMemoryBlock(18, [
		0x30, 0x01,
		0x30, 0x01,
		0x30, 0x01,
		0x00, 0x00,
		0x00, 0x00,
		0x30, 0x01,
		0x30, 0x01,
		0x30, 0x01
	]);

	changeVirtualMemoryBlock(19, [
		0x40, 0x01,
		0x40, 0x01,
		0x40, 0x01,
		0x00, 0x00,
		0x00, 0x00,
		0x40, 0x01,
		0x40, 0x01,
		0x40, 0x01
	]);

	changeVirtualMemoryBlock(20, [
		0x50, 0x01,
		0x50, 0x01,
		0x50, 0x01,
		0x00, 0x00,
		0x00, 0x00,
		0x50, 0x01,
		0x50, 0x01,
		0x50, 0x01
	]);

	changeVirtualMemoryBlock(21, [
		0x60, 0x01,
		0x60, 0x01,
		0x60, 0x01,
		0x00, 0x00,
		0x00, 0x00,
		0x60, 0x01,
		0x60, 0x01,
		0x60, 0x01
	]);

	changeVirtualMemoryBlock(22, [
		0xc0, 0x00,
		0xc2, 0x00,
		0xc8, 0x00,
		0x00, 0x00,
		0x00, 0x00,
		0xf2, 0x00,
		0xf8, 0x00,
		0xfa, 0x00
	]);

	changeVirtualMemoryBlock(23, [
		0x00, 0x00,
		0x00, 0x00,
		0x00, 0x00,
		0x00, 0x00,
		0x00, 0x00,
		0x00, 0x00,
		0x00, 0x00,
		0x00, 0x00
	]);
}

function changeVirtualMemoryBlock(index, vals) {
	gl.texSubImage2D(gl.TEXTURE_2D, 0, (index%16)*16, Math.floor(index/16), 16, 1, gl.RED_INTEGER, gl.UNSIGNED_BYTE, new Uint8Array(vals));
	for(var i = 0; i < 16; i++) {
		virtMem[Math.floor(index/16) + i][index%16] = vals[i];
	}
}

main();

window.onkeyup = function(e) { keys[String.fromCharCode(e.keyCode).toLowerCase()] = false; }
window.onkeydown = function(e) { keys[String.fromCharCode(e.keyCode).toLowerCase()] = true; }

setInterval(drawScene, 20);

function resizeCanvas() {
	// Lookup the size the browser is displaying the canvas.
	var displayWidth  = canvas.clientWidth;
	var displayHeight = canvas.clientHeight;
   
	// Check if the canvas is not the same size.
	if (canvas.width  != displayWidth ||
		canvas.height != displayHeight) {
   
	  // Make the canvas the same size
	  canvas.width  = displayWidth;
	  canvas.height = displayHeight;
	}
  }

window.onresize = resizeCanvas;

resizeCanvas();