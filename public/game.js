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

const PLR_BOT_DEG = 55;		//bottom angle of player triangle
const PLR_TOP_Y_OFFSET = 10;
const PLR_BOT_Y_OFFSET = 10;

const PLR_ROT_SPEED = 1.5;
const PLR_SPEED = 0.1;
const PLR_SPEED_DECAY = 0.01;
const PLR_MAX_SPEED = 2;

const PROJ_RADIUS = 2;
const PROJ_START_DIST = 5;
const PROJ_SPEED = 3;
const PROJ_TIME = 2000;

//global variables
var socket = io.connect("http://localhost:3000");
var playerNum = 0;
var otherPlayerNum = 0;
var gameStarted = false;

//from other player
var otherPoints = {
	topPointX: 0,
	topPointY: 0,
	leftPointX: 0,
	leftPointY: 0,
	rightPointX: 0,
	rightPointY: 0
};

var leftPressed = false;
var upPressed = false;
var rightPressed = false;
var spacebarPressed = false;
//var downPressed = false;

var plr1;
var plr2;
var projectiles = [];

//classes

function Player(isControlled) {
	this.isControlled = isControlled;
	
	//center of triangle
	this.locX = WIDTH / 2;
	this.locY = HEIGHT / 2;
	
	//facing direction
	this.headingDeg = 0;
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
		if (this.isControlled) {
			//rotation
			
			if (leftPressed) {
				//rotate left
				this.thetaDeg -= PLR_ROT_SPEED;
				this.headingDeg -= PLR_ROT_SPEED;
			} else if (rightPressed) {
				//rotate right
				this.thetaDeg += PLR_ROT_SPEED;
				this.headingDeg += PLR_ROT_SPEED;
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
			
			//movement
			
			var headingRad = degToRad(this.headingDeg);
			var forwardSpeed = 0;
			if (upPressed) {
				//move forward
				forwardSpeed = 1;
			}
			/*else if (downPressed) {
				//move backward
				forwardSpeed = -1;
			}
			*/
			
			//speed decay
			//var velAngleRad = Math.atan(this.velY / this.velX);
			if (this.velX != 0) {
				if (this.velX > 0) {
					//going right
					this.velX -= PLR_SPEED_DECAY;
					//this.velX -= PLR_SPEED_DECAY * Math.cos(velAngleRad);
					if (this.velX < 0) {
						this.velX = 0;
					}
				} else {
					//going left
					this.velX += PLR_SPEED_DECAY;
					//this.velX += PLR_SPEED_DECAY * Math.cos(velAngleRad);
					if (this.velX > 0) {
						this.velX = 0;
					}
				}
			}
			
			if (this.velY != 0) {
				if (this.velY > 0) {
					//going down
					this.velY -= PLR_SPEED_DECAY;
					//this.velY += PLR_SPEED_DECAY * Math.sin(velAngleRad);
					if (this.velY < 0) {
						this.velY = 0;
					}
				} else {
					//going up
					this.velY += PLR_SPEED_DECAY;
					//this.velY -= PLR_SPEED_DECAY * Math.sin(velAngleRad);
					if (this.velY > 0) {
						this.velY = 0;
					}
				}
			}
			
			//update velocity
			this.velX += PLR_SPEED * forwardSpeed * Math.sin(headingRad);
			this.velY -= PLR_SPEED * forwardSpeed * Math.cos(headingRad);
			
			if (Math.abs(this.velX) > PLR_MAX_SPEED) {
				this.velX = PLR_MAX_SPEED * (this.velX / Math.abs(this.velX));
			}
			
			if (Math.abs(this.velY) > PLR_MAX_SPEED) {
				this.velY = PLR_MAX_SPEED * (this.velY / Math.abs(this.velY));
			}
			
			//update position
			this.translate(this.velX, this.velY);
			
			//handle border collision
			if (this.locX < 0) {
				//left border
				this.translate(WIDTH, 0);
			} else if (this.locX > WIDTH) {
				//right border
				this.translate(-WIDTH, 0);
			}
			
			if (this.locY < 0) {
				//top border
				this.translate(0, HEIGHT);
			} else if (this.locY > HEIGHT) {
				//bottom border
				this.translate(0, -HEIGHT);
			}
			
			//output other player's points to server
			socket.emit("otherPoints_" + playerNum, {
				topPointX: this.topPointX,
				topPointY: this.topPointY,
				leftPointX: this.leftPointX,
				leftPointY: this.leftPointY,
				rightPointX: this.rightPointX,
				rightPointY: this.rightPointY
			});
		} else {
			this.topPointX = otherPoints.topPointX;
			this.topPointY = otherPoints.topPointY;
			this.leftPointX = otherPoints.leftPointX;
			this.leftPointY = otherPoints.leftPointY;
			this.rightPointX = otherPoints.rightPointX;
			this.rightPointY = otherPoints.rightPointY;
		}
	}
	
	this.translate = function(x, y) {
		this.locX += x;
		this.topPointX += x;
		this.leftPointX += x;
		this.rightPointX += x;
		
		this.locY += y;
		this.topPointY += y;
		this.leftPointY += y;
		this.rightPointY += y;
	}
	
	this.draw = function() {
		ctx.beginPath();
		ctx.moveTo(this.topPointX, this.topPointY);
		ctx.lineTo(this.leftPointX, this.leftPointY);
		ctx.lineTo(this.rightPointX, this.rightPointY);
		ctx.lineTo(this.topPointX, this.topPointY);
		ctx.stroke();
	}
	
	this.shoot = function() {
		if (spacebarPressed) {
			spacebarPressed = false;
			var x = PROJ_START_DIST * Math.cos(degToRad(this.headingDeg)) + this.topPointX;
			var y = PROJ_START_DIST * Math.sin(degToRad(this.headingDeg)) + this.topPointY;
			proj = new Projectile(x, y, this.headingDeg);
			projectiles.push(proj);
		}
	}
}

function Projectile(locX, locY, headingDeg) {
	this.locX = locX;
	this.locY = locY;
	this.radius = PROJ_RADIUS;
	
	this.visible = true;
	
	var headingRad = degToRad(headingDeg);
	
	this.velX = PROJ_SPEED * Math.cos(headingRad - Math.PI / 2);
	this.velY = PROJ_SPEED * Math.sin(headingRad - Math.PI / 2);
	
	var self = this;
	setTimeout(function() {
		self.visible = false;
	}, PROJ_TIME);
	
	this.updateMovement = function() {
		if (this.visible) {
			this.locX += this.velX;
			this.locY += this.velY;
			
			//handle border collision
			if (this.locX < 0) {
				//left border
				this.locX += WIDTH;
			} else if (this.locX > WIDTH) {
				//right border
				this.locX -= WIDTH;
			}
			
			if (this.locY < 0) {
				//top border
				this.locY += HEIGHT;
			} else if (this.locY > HEIGHT) {
				//bottom border
				this.locY -= HEIGHT;
			}
		}
	}
	
	this.draw = function() {
		if (this.visible) {
			ctx.beginPath();
			ctx.arc(this.locX, this.locY, this.radius, 0, 2 * Math.PI);
			ctx.fill();
		}
	}
}

//functions
function start() {
	setInterval(game, 10);
}

function game() {
	if ((playerNum == 1 || playerNum == 2)) {
		if (!gameStarted) {
			gameStarted = true;
			plr1 = new Player(playerNum == 1);
			plr2 = new Player(playerNum == 2);
		} else {
			//update
			plr1.updateMovement();
			plr2.updateMovement();
			
			plr1.shoot();
			plr2.shoot();
			
			for (var i = 0; i < projectiles.length; ++i) {
				projectiles[i].updateMovement();
			}
			
			//update draw
			draw();
		}
	}
}

function draw() {
	//clear screen
	ctx.fillStyle = "#000000";
	ctx.fillRect(0, 0, WIDTH, HEIGHT);
	
	//draw players
	ctx.strokeStyle = "#FFFFFF";
	plr1.draw();
	plr2.draw();
	
	//draw asteroids
	
	//draw projectiles
	ctx.fillStyle = "#FFFF00";
	for (var i = 0; i < projectiles.length; ++i) {
		projectiles[i].draw();
	}
	
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
		//downPressed = true;
	} else if (evt.keyCode == 32) {
		//spacebar
		spacebarPressed = true;
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
		//downPressed = false;
	} else if (evt.keyCode == 32) {
		//spacebar
		spacebarPressed = false;
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

//get player's number
socket.on("playerNum", function(num) {
	playerNum = num;
});

//get other player's points from server
socket.on("otherPoints_1", function(data) {
	if (playerNum == 2) {
		otherPoints = data;
	}
});

socket.on("otherPoints_2", function(data) {
	if (playerNum == 1) {
		otherPoints = data;
	}
});


start();