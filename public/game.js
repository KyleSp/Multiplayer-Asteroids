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

const PLR_ROT_SPEED = 2.5;
const PLR_SPEED = 0.1;
const PLR_SPEED_DECAY = 0.02;
const PLR_MAX_SPEED = 2;

const PLR_MAX_HEALTH = 3;

const PLR_SHOOT_DEBOUNCE = 500;
const PLR_RESPAWN_COOLDOWN = 1000;

const PROJ_RADIUS = 3;
const PROJ_START_DIST = 5;

const ALIEN_RADIUS = 40;

//global variables
var socket = io.connect("http://localhost:3000");
var playerNum = 0;
var otherPlayerNum = 0;
var gameStarted = false;
var allPlayersJoined = false;
var gameOver = 0;

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
var canShoot = true;

var plr1;
var plr2;
var projectiles = [];
var asteroids = [];
var alien;

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
	
	//TODO: clean up points and use objects instead
	
	this.topPointX = this.topPointStartX;
	this.topPointY = this.topPointStartY;
	this.leftPointX = this.leftPointStartX;
	this.leftPointY = this.leftPointStartY;
	this.rightPointX = this.rightPointStartX;
	this.rightPointY = this.rightPointStartY;
	
	//velocity
	this.velX = 0;
	this.velY = 0;
	
	this.health = PLR_MAX_HEALTH;
	
	this.visible = true;
	
	this.updateMovement = function() {
		if (this.isControlled && this.visible) {
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
			var norm = Math.sqrt(Math.pow(this.velX, 2) + Math.pow(this.velY, 2));
			if (norm != 0) {
				var unitVector = {x: this.velX / norm, y: this.velY / norm};
				
				this.velX -= PLR_SPEED_DECAY * unitVector.x;
				this.velY -= PLR_SPEED_DECAY * unitVector.y;
				
				//max speed
				if (norm > PLR_MAX_SPEED) {
					this.velX = unitVector.x * PLR_MAX_SPEED;
					this.velY = unitVector.y * PLR_MAX_SPEED;
				}
			}
			
			//update velocity
			this.velX += PLR_SPEED * forwardSpeed * Math.sin(headingRad);
			this.velY -= PLR_SPEED * forwardSpeed * Math.cos(headingRad);
			
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
		if (this.visible) {
			ctx.beginPath();
			ctx.moveTo(this.topPointX, this.topPointY);
			ctx.lineTo(this.leftPointX, this.leftPointY);
			ctx.lineTo(this.rightPointX, this.rightPointY);
			ctx.lineTo(this.topPointX, this.topPointY);
			ctx.stroke();
		}
	}
	
	this.shoot = function() {
		if (this.visible && canShoot && spacebarPressed && this.isControlled) {
			canShoot = false;
			
			setTimeout(function() {
				canShoot = true;
			}, PLR_SHOOT_DEBOUNCE);
			
			var x = PROJ_START_DIST * Math.cos(degToRad(this.headingDeg)) + this.topPointX;
			var y = PROJ_START_DIST * Math.sin(degToRad(this.headingDeg)) + this.topPointY;
			
			socket.emit("makeProj", {makeProj: true, locX: x, locY: y, headingDeg: this.headingDeg});
		}
	}
	
	this.damaged = function() {
		if (this.visible) {
			this.health -= 1;
			
			//reset player's position and velocity
			this.visible = false;
			
			var self = this;
			setTimeout(function() {
				self.visible = true;
				self.translate(-self.locX, -self.locY);
				self.translate(WIDTH / 2, HEIGHT / 2);
				self.velX = 0;
				self.velY = 0;
				self.headingDeg = 0;
				self.topPointX = self.topPointStartX;
				self.topPointY = self.topPointStartY;
				self.leftPointX = self.leftPointStartX;
				self.leftPointY = self.leftPointStartY;
				self.rightPointX = self.rightPointStartX;
				self.rightPointY = self.rightPointStartY;
			}, PLR_RESPAWN_COOLDOWN);
			
			//check for game over
			if (this.health <= 0) {
				this.health = 0;
				if (gameOver == 0) {
					if (this.isControlled) {
						gameOver = playerNum;
						console.log("player " + playerNum + " lost!");
					} else {
						gameOver = otherPlayerNum;
						console.log("player " + otherPlayerNum + " lost!");
					}
				}
			}
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
	ctx.strokeStyle = "#0000FF";
	plr1.draw();
	ctx.strokeStyle = "#00FF00";
	plr2.draw();
	
	//draw asteroids
	ctx.strokeStyle = "#FF0000";
	for (var i = 0; i < asteroids.length; ++i) {
		if (asteroids[i].visible) {
			var locX = asteroids[i].locX;
			var locY = asteroids[i].locY;
			var headingRad = degToRad(asteroids[i].headingDeg);
			var radius = asteroids[i].radius;
			
			var topLeftPoint = {x: locX - radius, y: locY - radius};
			var topRightPoint = {x: locX + radius, y: locY - radius};
			var bottomLeftPoint = {x: locX - radius, y: locY + radius};
			var bottomRightPoint = {x: locX + radius, y: locY + radius};
			
			//rotate
			var topLeftRot = rotationMatrix(topLeftPoint.x - locX, topLeftPoint.y - locY, headingRad);
			var topRightRot = rotationMatrix(topRightPoint.x - locX, topRightPoint.y - locY, headingRad);
			var bottomLeftRot = rotationMatrix(bottomLeftPoint.x - locX, bottomLeftPoint.y - locY, headingRad);
			var bottomRightRot = rotationMatrix(bottomRightPoint.x - locX, bottomRightPoint.y - locY, headingRad);
			
			ctx.beginPath();
			ctx.moveTo(topLeftRot[0] + locX, topLeftRot[1] + locY);
			ctx.lineTo(bottomLeftRot[0] + locX, bottomLeftRot[1] + locY);
			ctx.lineTo(bottomRightRot[0] + locX, bottomRightRot[1] + locY);
			ctx.lineTo(topRightRot[0] + locX, topRightRot[1] + locY);
			ctx.lineTo(topLeftRot[0] + locX, topLeftRot[1] + locY);
			ctx.stroke();
		}
	}
	
	//draw projectiles
	ctx.strokeStyle = "#FFFF00";
	for (var i = 0; i < projectiles.length; ++i) {
		if (projectiles[i].visible) {
			ctx.beginPath();
			ctx.arc(projectiles[i].locX, projectiles[i].locY, PROJ_RADIUS, 0, 2 * Math.PI);
			ctx.stroke();
		}
	}
	
	//draw alien
	ctx.strokeStyle = "#00FF00";
	if (alien && alien.visible) {
		ctx.beginPath();
		ctx.rect(alien.locX - ALIEN_RADIUS, alien.locY - ALIEN_RADIUS, ALIEN_RADIUS, ALIEN_RADIUS);
		ctx.stroke();
	}
	
	//draw health text
	ctx.font = "30px Arial";
	ctx.fillStyle = "blue";
	ctx.fillText("P1: " + plr1.health, 30, 50);
	ctx.fillStyle = "green";
	ctx.fillText("P2: " + plr2.health, WIDTH - 100, 50);
	
	//draw start game text
	if (!allPlayersJoined) {
		ctx.fillStyle = "white";
		ctx.fillText("Waiting for Player 2...", WIDTH / 2 - 150, HEIGHT / 2);
	}
	
	//draw gameover text
	ctx.fillStyle = "red";
	if (gameOver == 1) {
		ctx.fillText("Player 1 Lost!", WIDTH / 2 - 100, HEIGHT / 2);
	}
	if (gameOver == 2) {
		ctx.fillText("Player 2 Lost!", WIDTH / 2 - 100, HEIGHT / 2);
	}
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

//converts from degrees to radians
function degToRad(deg) {
	return (deg * Math.PI / 180);
}

//applies a rotation linear transformation to a point about the origin
//TODO: change [newX, newy] array to {x: newX, y: newY} object
function rotationMatrix(x, y, thetaRad) {
	var newX = x * Math.cos(thetaRad) - y * Math.sin(thetaRad);
	var newY = x * Math.sin(thetaRad) + y * Math.cos(thetaRad);
	
	return [newX, newY];
}

//start game

//get player's number
socket.on("playerNum", function(num) {
	playerNum = num;
	
	if (num == 1) {
		otherPlayerNum = 2;
	} else {
		otherPlayerNum = 1;
	}
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

socket.on("projectiles", function(data) {
	projectiles = data;
});

socket.on("asteroids", function(data) {
	asteroids = data;
});

socket.on("alien", function(data) {
	alien = data;
})

socket.on("playerHurt", function(data) {
	if (data.hurt) {
		if (data.plrNum == 1 && plr1) {
			plr1.damaged();
		} else if (data.plrNum == 2 && plr2) {
			plr2.damaged();
		}
	}
});

socket.on("allPlayersJoined", function(data) {
	if (data) {
		allPlayersJoined = true;
	}
});

start();