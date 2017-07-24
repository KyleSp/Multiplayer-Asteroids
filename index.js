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

const PLR_HIT_COOLDOWN = 2000;

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

const ALIEN_RADIUS = 20;
const ALIEN_MAX_SPEED = 0.001;
const ALIEN_RESPAWN_COOLDOWN = 10000;
const ALIEN_SHOOT_COOLDOWN = 1000;

//variables

var roomNum = 1;
var projectiles = [];
var asteroids = [];
var alien;
var plrPoints = [];
var plr1Points;
var plr2Points;
var plr1CanHit = true;
var plr2CanHit = true;

//classes

function Projectile(locX, locY, headingDeg, fromAlien) {
	this.locX = locX;
	this.locY = locY;
	
	this.radius = PROJ_RADIUS;
	
	var headingRad = degToRad(headingDeg);
	this.velX = PROJ_SPEED * Math.cos(headingRad - Math.PI / 2);
	this.velY = PROJ_SPEED * Math.sin(headingRad - Math.PI / 2);
	
	this.visible = true;
	
	this.fromAlien = fromAlien;
	
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
	
	this.checkCollisions = function(roomNum) {
		if (this.visible) {
			//projectile hits asteroid
			for (var i = 0; i < asteroids.length; ++i) {
				if (asteroids[i].visible) {
					var collisionRadius = asteroids[i].radius * AST_COLLISION_PERCENT;
					var bounds = {
						left: asteroids[i].locX - collisionRadius,
						right: asteroids[i].locX + collisionRadius,
						top: asteroids[i].locY - collisionRadius,
						bottom: asteroids[i].locY + collisionRadius
					};
					
					if (this.locX > bounds.left && this.locX < bounds.right && this.locY > bounds.top && this.locY < bounds.bottom) {
						//collision
						this.visible = false;
						
						asteroids[i].makeSmallerAsteroids(2);
						
						break;
					}
				}
			}
		}
		
		if (this.visible) {
			//projectile hits player
			var bounds = {
				left: this.locX - PROJ_RADIUS * 2,
				right: this.locX + PROJ_RADIUS * 2,
				top: this.locY - PROJ_RADIUS * 2,
				bottom: this.locY + PROJ_RADIUS * 2
			};
			
			if (checkPlayerCollisions(roomNum, bounds)) {
				this.visible = false;
			}
		}
		
		if (this.visible && !this.fromAlien) {
			//projectile hits alien
			var bounds = {
				left: alien.locX - ALIEN_RADIUS,
				right: alien.locX + ALIEN_RADIUS,
				top: alien.locY - ALIEN_RADIUS,
				bottom: alien.locY + ALIEN_RADIUS
			};
			
			if (this.locX > bounds.left && this.locX < bounds.right && this.locY > bounds.top && this.locY < bounds.bottom) {
				//collision
				this.visible = false;
				
				alien.visible = false;
				
				//move destroyed alien out of way
				alien.locX = -ALIEN_RADIUS * 2;
				alien.locY = -ALIEN_RADIUS * 2;
				
				setTimeout(function() {
					alien.generateNew();
				}, ALIEN_RESPAWN_COOLDOWN);
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
		//asteroid hits player
		if (this.visible) {
			var collisionRadius = this.radius * AST_COLLISION_PERCENT;
			
			var bounds = {
				left: this.locX - collisionRadius,
				right: this.locX + collisionRadius,
				top: this.locY - collisionRadius,
				bottom: this.locY + collisionRadius
			};
			
			if (checkPlayerCollisions(roomNum, bounds)) {
				this.visible = false;
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

function Alien() {
	this.locX = 0;
	this.locY = 0;
	this.velX = 0;
	this.velY = 0;
	this.visible = false;
	
	this.generateNew = function() {
		//choose random edge of screen to come from
		var randEdge = calcRand(0, 4);
		var randLoc = calcRand(0, 100) / 100;
		
		switch(randEdge) {
			case 0:
				//left
				this.locX = 0;
				this.locY = HEIGHT * randLoc;
				break;
			case 1:
				//right
				this.locX = WIDTH;
				this.locY = HEIGHT * randLoc;
				break;
			case 2:
				//top
				this.locX = WIDTH * randLoc;
				this.locY = 0;
				break;
			default:
				//bottom
				this.locX = WIDTH * randLoc;
				this.locY = HEIGHT;
		}
		
		//move toward center
		this.velX = ALIEN_MAX_SPEED * (WIDTH / 2 - this.locX);
		this.velY = ALIEN_MAX_SPEED * (HEIGHT / 2 - this.locY);
		
		this.visible = true;
	}
	
	this.updateMovement = function() {
		if (this.visible) {
			this.locX += this.velX;
			this.locY += this.velY;
			
			//TODO: make more complicated movements
			
			if (this.locX < 0 || this.locX > WIDTH || this.locY < 0 || this.locY > HEIGHT) {
				this.visible = false;
				var self = this;
				setTimeout(function() {self.generateNew()}, ALIEN_RESPAWN_COOLDOWN);
			}
		}
	}
	
	this.checkCollisions = function() {
		if (this.visible) {
			//alien hits player
			var bounds = {
				left: this.locX - ALIEN_RADIUS,
				right: this.locX + ALIEN_RADIUS,
				top: this.locY - ALIEN_RADIUS,
				bottom: this.locY + ALIEN_RADIUS
			};
			
			var self = this;
			
			if (checkPlayerCollisions(roomNum, bounds)) {
				this.visible = false;
				setTimeout(function() {self.generateNew()}, ALIEN_RESPAWN_COOLDOWN);
			}
		}
		
		if (this.visible) {
			//alien hits asteroid
			var bounds = {
				left: this.locX - ALIEN_RADIUS,
				right: this.locX + ALIEN_RADIUS,
				top: this.locY - ALIEN_RADIUS,
				bottom: this.locY + ALIEN_RADIUS
			};
			
			for (var i = 0; i < asteroids.length; ++i) {
				var astLoc = {x: asteroids[i].locX, y: asteroids[i].locY};
				
				if (astLoc.x > bounds.left && astLoc.x < bounds.right && astLoc.y > bounds.top && astLoc.y < bounds.bottom) {
					this.visible = false;
					asteroids[i].visible = false;
					asteroids[i].makeSmallerAsteroids(2);
					setTimeout(function() {self.generateNew()}, ALIEN_RESPAWN_COOLDOWN);
				}
			}
			
		}
	}
	
	this.shoot = function() {
		if (plr1Points && plr2Points && this.visible) {
			var target = calcRand(1, 3);
			var plrPoints;
			if (target == 1) {
				plrPoints = plr1Points;
			} else {
				plrPoints = plr2Points;
			}
			
			plrLoc = {
				x: (plrPoints.topPointX + plrPoints.leftPointX + plrPoints.rightPointX) / 3,
				y: (plrPoints.topPointY + plrPoints.leftPointY + plrPoints.rightPointY) / 3
			};
			
			//TODO: fix shooting direction
			
			var dx = plrLoc.x - this.locX;
			var dy = plrLoc.y - this.locY;
			var headingDeg = radToDeg(Math.atan(dx / dy));
			
			projectiles.push(new Projectile(this.locX, this.locY, headingDeg - 90, true));
		}
	}
}

//update projectile movement
function updateProjectiles(roomNum) {
	if (plr1Points && plr2Points) {
		for (var i = 0; i < projectiles.length; ++i) {
			projectiles[i].updateMovement();
			projectiles[i].checkCollisions(roomNum);
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

function updateAlien(roomNum) {
	if (plr1Points && plr2Points) {
		alien.updateMovement();
		alien.checkCollisions();
	}
	
	io.sockets.in("room_" + roomNum).emit("alien", alien);
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
		
		//make alien and update movement
		alien = new Alien();
		
		setTimeout(function() {alien.generateNew()}, ALIEN_RESPAWN_COOLDOWN);
		
		setInterval(function() {updateAlien(roomNum)}, 10);
		setInterval(function() {alien.shoot()}, ALIEN_SHOOT_COOLDOWN);
	} else {
		io.sockets.in("room_" + roomNum).emit("allPlayersJoined", true);
	}
	
	//make new projectile
	socket.on("makeProj", function(data) {
		projectiles.push(new Projectile(data.locX, data.locY, data.headingDeg, false));
	});
	
	//check for reset of room
	socket.on("reset", function(data) {
		if (data) {
			//remove asteroids and projectiles objects
			asteroids = [];
			projectiles = [];
			
			//make new objects
			for (var i = 0; i < NUM_AST; ++i) {
				asteroids.push(new Asteroid(calcRand(0, WIDTH), calcRand(0, HEIGHT), AST_RADIUS_LARGE, AST_MAX_SPEED_LARGE));
			}
			
			alien = new Alien();
			
			//reset players
			io.sockets.in("room_" + roomNum).emit("reset", true);
			io.sockets.in("room_" + roomNum).emit("reset", false);
		}
	});
	
	//when a client disconnects
	var rNum = roomNum;
	socket.on("disconnect", function() {
		console.log("a user disconnected from room_" + rNum);
	});
});

function checkPlayerCollisions(roomNum, bounds) {
	var plrPoints;
	var plrCanHit;
	var plrLoc;
	var collision = false;
	
	for (var i = 1; i < 3; ++i) {
		if (i == 1) {
			plrPoints = plr1Points;
			plrCanHit = plr1CanHit;
		} else {
			plrPoints = plr2Points;
			plrCanHit = plr2CanHit;
		}
		
		if (plrCanHit) {
			plrLoc = {
				x: (plrPoints.topPointX + plrPoints.leftPointX + plrPoints.rightPointX) / 3,
				y: (plrPoints.topPointY + plrPoints.leftPointY + plrPoints.rightPointY) / 3
			};
			
			if (plrLoc.x > bounds.left && plrLoc.x < bounds.right && plrLoc.y > bounds.top && plrLoc.y < bounds.bottom) {
				//collision
				(i == 1) ? plr1CanHit = false : plr2CanHit = false;
				io.sockets.in("room_" + roomNum).emit("playerHurt", {plrNum: i, hurt: true});
				io.sockets.in("room_" + roomNum).emit("playerHurt", {plrNum: i, hurt: false});
				
				var index = i;
				setTimeout(function() {(index == 1) ? plr1CanHit = true : plr2CanHit = true;}, PLR_HIT_COOLDOWN);
				
				collision = true;
			}
		}
	}
	
	return collision;
}

//converts from degrees to radians
function degToRad(deg) {
	return (deg * Math.PI / 180);
}

//converts from radians to degrees
function radToDeg(rad) {
	return (rad * 180 / Math.PI);
}

//calculate a random integer from min (inclusive) to max (exclusive)
function calcRand(min, max) {
	return Math.floor(Math.random() * (max - min)) + min;
}