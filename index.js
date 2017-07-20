/*
	Made by Kyle Spurlock
	
	Server Code
*/

//TODO: only send essential properties of objects to clients for asteroids and projectiles (optimization)
//TODO: make it work for multiple rooms (use 2d arrays)
//TODO: delete asteroids and projectiles that are no longer visible

var express = require("express");
var socket = require("socket.io");

//app setup
var app = express();
var server = app.listen(3000, function() {
	console.log("listening to port 3000");
});

//static files for clients
app.use(express.static("public"));

//socket setup
var io = socket(server);

//constants

const WIDTH = 600;
const HEIGHT = 600;

const PLR_TOP_Y_OFFSET = 10;

const PROJ_RADIUS = 3;
const PROJ_SPEED = 3;
const PROJ_TIME = 1300;

const NUM_AST = 4;
const AST_COLLISION_PERCENT = 1;
const AST_RADIUS_LARGE = 40;
const AST_RADIUS_MEDIUM = 20;
const AST_RADIUS_SMALL = 10;
const AST_MAX_SPEED_LARGE = 0.5;
const AST_MAX_SPEED_MEDIUM = 1.0;
const AST_MAX_SPEED_SMALL = 1.5;
const AST_MAX_ROT_SPEED = 1;

//variables

var roomNum = 1;
var projectiles = [];
var asteroids = [];
var plrPoints = [];
var plr1Points;
var plr2Points;

//classes

function Projectile(locX, locY, headingDeg) {
	this.locX = locX;
	this.locY = locY;
	
	this.radius = PROJ_RADIUS;
	
	var headingRad = degToRad(headingDeg);
	this.velX = PROJ_SPEED * Math.cos(headingRad - Math.PI / 2);
	this.velY = PROJ_SPEED * Math.sin(headingRad - Math.PI / 2);
	
	this.visible = true;
	
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
	
	this.checkCollisions = function() {
		if (this.visible) {
			//projectile hits asteroid
			for (var i = 0; i < asteroids.length; ++i) {
				if (asteroids[i].visible) {
					var collisionRadius = asteroids[i].radius * AST_COLLISION_PERCENT;
					var boundLeft = asteroids[i].locX - collisionRadius;
					var boundRight = asteroids[i].locX + collisionRadius;
					var boundTop = asteroids[i].locY - collisionRadius;
					var boundBottom = asteroids[i].locY + collisionRadius;
					
					if (this.locX > boundLeft && this.locX < boundRight && this.locY > boundTop && this.locY < boundBottom) {
						//collision
						this.visible = false;
						
						asteroids[i].makeSmallerAsteroids(2);
						
						break;
					}
				}
			}
		}
		
		if (this.visible) {
			//TODO: combine damage done to players for asteroids and projectiles
			//projectile hits player
			var boundLeft = this.locX - PROJ_RADIUS * 2;
			var boundRight = this.locX + PROJ_RADIUS * 2;
			var boundTop = this.locY - PROJ_RADIUS * 2;
			var boundBottom = this.locY + PROJ_RADIUS * 2;
			if (plr1Points) {
				//var plr1Loc = {x: plr1Points.topPointX, y: plr1Points.topPointY - PLR_TOP_Y_OFFSET};
				
				var plr1Loc = {
					x: (plr1Points.topPointX + plr1Points.leftPointX + plr1Points.rightPointX) / 3,
					y: (plr1Points.topPointY + plr1Points.leftPointY + plr1Points.rightPointY) / 3
				};
				
				if (plr1Loc.x >= boundLeft && plr1Loc.x <= boundRight && plr1Loc.y >= boundTop && plr1Loc.y <= boundBottom) {
					//collision
					console.log("plr1 hit by a projectile!");
					this.visible = false;
					io.sockets.in("room_" + roomNum).emit("playerHurt", {plrNum: 1, hurt: true});
					io.sockets.in("room_" + roomNum).emit("playerHurt", {plrNum: 1, hurt: false});
				}
			}
			
			if (plr2Points) {
				//var plr2Loc = {x: plr2Points.topPointX, y: plr2Points.topPointY - PLR_TOP_Y_OFFSET};
				
				var plr2Loc = {
					x: (plr2Points.topPointX + plr2Points.leftPointX + plr2Points.rightPointX) / 3,
					y: (plr2Points.topPointY + plr2Points.leftPointY + plr2Points.rightPointY) / 3
				};
				
				if (plr2Loc.x >= boundLeft && plr2Loc.x <= boundRight && plr2Loc.y >= boundTop && plr2Loc.y <= boundBottom) {
					//collision
					console.log("plr2 hit by a projectile!");
					this.visible = false;
					io.sockets.in("room_" + roomNum).emit("playerHurt", {plrNum: 2, hurt: true});
					io.sockets.in("room_" + roomNum).emit("playerHurt", {plrNum: 2, hurt: false});
				}
			}
		}
	}
}

function Asteroid(locX, locY, radius, maxSpeed) {
	this.locX = locX;
	this.locY = locY;
	
	this.velX = maxSpeed * (2 * Math.random() - 1);
	this.velY = maxSpeed * (2 * Math.random() - 1);
	
	this.headingDeg = calcRand(0, 359);
	
	this.radius = radius;
	
	this.rotSpeed = AST_MAX_ROT_SPEED * (2 * Math.random() - 1);
	
	this.visible = true;
	
	this.updateMovement = function() {
		if (this.visible) {
			this.locX += this.velX;
			this.locY += this.velY;
			
			this.headingDeg += this.rotSpeed;
			
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
	
	this.checkCollisions = function(roomNum) {
		if (this.visible) {
			var collisionRadius = this.radius * AST_COLLISION_PERCENT;
			var boundLeft = this.locX - collisionRadius;
			var boundRight = this.locX + collisionRadius;
			var boundTop = this.locY - collisionRadius;
			var boundBottom = this.locY + collisionRadius;
			
			//asteroids hits player
			//TODO: handle using array
			var collision = false;
			if (plr1Points) {
				var plr1Loc = {
					x: (plr1Points.topPointX + plr1Points.leftPointX + plr1Points.rightPointX) / 3,
					y: (plr1Points.topPointY + plr1Points.leftPointY + plr1Points.rightPointY) / 3
				};
				
				if (plr1Loc.x > boundLeft && plr1Loc.x < boundRight && plr1Loc.y > boundTop && plr1Loc.y < boundBottom) {
					//collision
					console.log("plr1 collision!");
					collision = true;
					io.sockets.in("room_" + roomNum).emit("playerHurt", {plrNum: 1, hurt: true});
					io.sockets.in("room_" + roomNum).emit("playerHurt", {plrNum: 1, hurt: false});
				}
			}
			
			if (plr2Points) {
				var plr2Loc = {
					x: (plr2Points.topPointX + plr2Points.leftPointX + plr2Points.rightPointX) / 3,
					y: (plr2Points.topPointY + plr2Points.leftPointY + plr2Points.rightPointY) / 3
				};
				
				if (plr2Loc.x > boundLeft && plr2Loc.x < boundRight && plr2Loc.y > boundTop && plr2Loc.y < boundBottom) {
					//collision
					console.log("plr2 collision!");
					collision = true;
					io.sockets.in("room_" + roomNum).emit("playerHurt", {plrNum: 2, hurt: true});
					io.sockets.in("room_" + roomNum).emit("playerHurt", {plrNum: 2, hurt: false});
				}
			}
			
			//make smaller asteroids
			if (collision) {
				this.makeSmallerAsteroids(2);
			}
		}
	}
	
	this.makeSmallerAsteroids = function(numNewAst) {
		this.visible = false;
		
		var newRadius;
		var newMaxSpeed;
		
		if (this.radius == AST_RADIUS_LARGE) {
			newRadius = AST_RADIUS_MEDIUM;
			newMaxSpeed = AST_MAX_SPEED_MEDIUM;
		} else if (this.radius == AST_RADIUS_MEDIUM) {
			newRadius = AST_RADIUS_SMALL;
			newMaxSpeed = AST_MAX_SPEED_SMALL;
		} else {
			return;
		}
		
		for (var i = 0; i < numNewAst; ++i) {
			asteroids.push(new Asteroid(this.locX, this.locY, newRadius, newMaxSpeed));
		}
	}
}

//update projectile movement
function updateProjectiles(roomNum) {
	if (plr1Points && plr2Points) {
		for (var i = 0; i < projectiles.length; ++i) {
			projectiles[i].updateMovement();
			projectiles[i].checkCollisions();
		}
	}
		
	io.sockets.in("room_" + roomNum).emit("projectiles", projectiles);
}

//update asteroids movement
function updateAsteroids(roomNum) {
	if (plr1Points && plr2Points) {
		for (var i = 0; i < asteroids.length; ++i) {
			asteroids[i].updateMovement();
			asteroids[i].checkCollisions(roomNum);
		}
	}
	
	io.sockets.in("room_" + roomNum).emit("asteroids", asteroids);
}

//client connect
io.on("connection", function(socket) {
	if (io.nsps["/"].adapter.rooms["room_" + roomNum] && io.nsps["/"].adapter.rooms["room_" + roomNum].length > 1) {
		++roomNum;
	}
	
	socket.join("room_" + roomNum);
	
	var playerNum = io.sockets.adapter.rooms["room_" + roomNum].length;
	
	console.log("a user connnected to room_" + roomNum);
	console.log("playerNum: " + playerNum);
	
	socket.emit("playerNum", playerNum);
	
	//output data to other client in room
	socket.on("otherPoints_" + playerNum, function(data) {
		if (playerNum == 1) {
			plr1Points = data;
		} else {
			plr2Points = data;
		}
		
		io.sockets.in("room_" + roomNum).emit("otherPoints_" + playerNum, data);
	});
	
	
	if (playerNum == 1) {
		//update projectile movement
		setInterval(function() {updateProjectiles(roomNum)}, 10);
		
		//make asteroids and update movement
		for (var i = 0; i < NUM_AST; ++i) {
			asteroids.push(new Asteroid(calcRand(0, WIDTH), calcRand(0, HEIGHT), AST_RADIUS_LARGE, AST_MAX_SPEED_LARGE));
		}
		
		setInterval(function() {updateAsteroids(roomNum)}, 10);
	}
	
	//make new projectile
	socket.on("makeProj", function(data) {
		projectiles.push(new Projectile(data.locX, data.locY, data.headingDeg));
	});
	
	//when a client disconnects
	var rNum = roomNum;
	socket.on("disconnect", function() {
		console.log("a user disconnected from room_" + rNum);
	});
});

//converts from degrees to radians
function degToRad(deg) {
	return (deg * Math.PI / 180);
}

//calculate a random integer from min (inclusive) to max (exclusive)
function calcRand(min, max) {
	return Math.floor(Math.random() * (max - min)) + min;
}