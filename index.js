/*
	Made by Kyle Spurlock
	
	Server Code
*/

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

//variables

var roomNum = 1;
var projectiles = [];

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

//update projectile movement
function updateProjectiles(roomNum) {
	for (var i = 0; i < projectiles.length; ++i) {
		projectiles[i].updateMovement();
	}
		
	io.sockets.in("room_" + roomNum).emit("projectiles", projectiles);
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
	
	//update projectile movement and output data to clients in room
	if (playerNum == 1) {
		setInterval(function() {updateProjectiles(roomNum)}, 10);
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

function degToRad(deg) {
	return (deg * Math.PI / 180);
}