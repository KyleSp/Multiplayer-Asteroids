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

var roomNum = 1;

io.on("connection", function(socket) {
	if (io.nsps["/"].adapter.rooms["room_" + roomNum] && io.nsps["/"].adapter.rooms["room_" + roomNum].length > 1) {
		++roomNum;
	}
	
	socket.join("room_" + roomNum);
	
	var playerNum = io.sockets.adapter.rooms["room_" + roomNum].length;
	
	console.log("a user connnected to room_" + roomNum);
	console.log("playerNum: " + playerNum);
	
	socket.emit("playerNum", playerNum);
	
	//io.sockets.in("room_" + roomNum).emit("connectToRoom", "You are in room num " + roomNum);
	
	var rNum = roomNum;
	socket.on("disconnect", function() {
		console.log("a user disconnected from room_" + rNum);
	})
});