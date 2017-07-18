/*
	Made by Kyle Spurlock
	
	Server Code
*/

//TODO: only send essential properties of objects to clients for asteroids and projectiles

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

const PROJ_RADIUS = 2;
const PROJ_SPEED = 3;
const PROJ_TIME = 2000;

const NUM_AST = 4;
const AST_MAX_SPEED = 0.5;
const AST_MAX_ROT_SPEED = 1;

//variables

var roomNum = 1;
var projectiles = [];
var asteroids = [];

//classes

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
}

function Asteroid() {
	this.locX = calcRand(0, WIDTH);
	this.locY = calcRand(0, HEIGHT);
	
	this.velX = AST_MAX_SPEED * (2 * Math.random() - 1);
	this.velY = AST_MAX_SPEED * (2 * Math.random() - 1);
	
	this.headingDeg = calcRand(0, 359);
	
	this.rotSpeed = AST_MAX_ROT_SPEED * (2 * Math.random() - 1);
	
	this.updateMovement = function() {
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

//update projectile movement
function updateProjectiles(roomNum) {
	for (var i = 0; i < projectiles.length; ++i) {
		projectiles[i].updateMovement();
	}
		
	io.sockets.in("room_" + roomNum).emit("projectiles", projectiles);
}

//update asteroids movement
function updateAsteroids(roomNum) {
	for (var i = 0; i < asteroids.length; ++i) {
		asteroids[i].updateMovement();
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
		io.sockets.in("room_" + roomNum).emit("otherPoints_" + playerNum, data);
	});
	
	
	if (playerNum == 1) {
		//update projectile movement
		setInterval(function() {updateProjectiles(roomNum)}, 10);
		
		//make asteroids and update movement
		for (var i = 0; i < NUM_AST; ++i) {
			asteroids.push(new Asteroid());
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