/*
	Made by Kyle Spurlock
	
	Client Code
*/

var canvas = document.getElementById("mainCanvas");
var ctx = canvas.getContext("2d");
document.addEventListener("keydown", keyDown, false);
document.addEventListener("keyup", keyUp, false);

//constants

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const PLR_BOT_DEG = 65;		//bottom angle of player triangle
const PLR_TOP_Y_OFFSET = 10;
const PLR_BOT_Y_OFFSET = 30;

//global variables
var socket = io.connect("http://localhost:3000");
var leftPressed = false;
var upPressed = false;
var rightPressed = false;
var downPressed = false;
var plr1;
var plr2;

//classes

function Player(isControlled) {
	this.isControlled = isControlled;
	
	//center of triangle
	this.locX = WIDTH / 2;
	this.locY = HEIGHT / 2;
	
	//facing direction
	this.thetaDeg = 0;
	
	//starting triangle points
	this.topPointStartX = this.locX;
	this.topPointStartY = this.locY - PLR_TOP_Y_OFFSET;
	
	var xOffset = PLR_BOT_Y_OFFSET * (1 / Math.tan(degToRad(PLR_BOT_DEG)));
	this.leftPointStartX = this.locX - xOffset;
	this.leftPointStartY = this.locY + PLR_BOT_Y_OFFSET;
	
	this.rightPointStartX = this.locX + xOffset;
	this.rightPointStartY = this.locY + PLR_BOT_Y_OFFSET;
	
	this.topPointX = this.topPointStartX;
	this.topPointY = this.topPointStartY;
	this.leftPointX = this.leftPointStartX;
	this.leftPointY = this.leftPointStartY;
	this.rightPointX = this.rightPointStartX;
	this.rightPointY = this.rightPointStartY;
	
	//velocity
	this.velX = 0;
	this.velY = 0;
	
	this.updateMovement = function() {
		if (leftPressed) {
			//rotate left
			this.thetaDeg -= 1;
		} else if (rightPressed) {
			//rotate right
			this.thetaDeg += 1;
		}
		
		//perform rotation transformation
		var thetaRad = degToRad(this.thetaDeg);
		var topPoint = rotationMatrix(this.topPointX - this.locX, this.topPointY - this.locY, thetaRad);
		this.topPointX = topPoint[0] + this.locX;
		this.topPointY = topPoint[1] + this.locY;
		var leftPoint = rotationMatrix(this.leftPointX - this.locX, this.leftPointY - this.locY, thetaRad);
		this.leftPointX = leftPoint[0] + this.locX;
		this.leftPointY = leftPoint[1] + this.locY;
		var rightPoint = rotationMatrix(this.rightPointX - this.locX, this.rightPointY - this.locY, thetaRad);
		this.rightPointX = rightPoint[0] + this.locX;
		this.rightPointY = rightPoint[1] + this.locY;
		
		this.thetaDeg = 0;
	}
	
	this.draw = function() {
		ctx.beginPath();
		ctx.moveTo(this.topPointX, this.topPointY);
		ctx.lineTo(this.leftPointX, this.leftPointY);
		ctx.lineTo(this.rightPointX, this.rightPointY);
		ctx.lineTo(this.topPointX, this.topPointY);
		ctx.fill();
	}
}

//functions
function start() {
	plr1 = new Player(true);
	plr2 = new Player(false);
	
	setInterval(game, 10);
}

function game() {
	//update player movements
	plr1.updateMovement();
	//plr2.updateMovement();
	
	//update draw
	draw();
}

function draw() {
	//clear screen
	ctx.clearRect(0, 0, WIDTH, HEIGHT);
	
	//draw players
	plr1.draw();
	//plr2.draw();
	
	//draw asteroids
	
	//draw projectiles
	
	//draw alien
	
}

function keyDown(evt) {
	if (evt.keyCode == 37 || evt.keyCode == 65) {
		//left arrow or a
		leftPressed = true;
	} else if (evt.keyCode == 38 || evt.keyCode == 87) {
		//up arrow or w
		upPressed = true;
	} else if (evt.keyCode == 39 || evt.keyCode == 68) {
		//right arrow or d
		rightPressed = true;
	} else if (evt.keyCode == 40 || evt.keyCode == 83) {
		//down arrow or s
		downPressed = true;
	}
}

function keyUp(evt) {
	if (evt.keyCode == 37 || evt.keyCode == 65) {
		//left arrow or a
		leftPressed = false;
	} else if (evt.keyCode == 38 || evt.keyCode == 87) {
		//up arrow or w
		upPressed = false;
	} else if (evt.keyCode == 39 || evt.keyCode == 68) {
		//right arrow or d
		rightPressed = false;
	} else if (evt.keyCode == 40 || evt.keyCode == 83) {
		//down arrow or s
		downPressed = false;
	}
}

function degToRad(deg) {
	return (deg * Math.PI / 180);
}

function rotationMatrix(x, y, thetaRad) {
	var newX = x * Math.cos(thetaRad) - y * Math.sin(thetaRad);
	var newY = x * Math.sin(thetaRad) + y * Math.cos(thetaRad);
	
	return [newX, newY];
}

//start game
start();