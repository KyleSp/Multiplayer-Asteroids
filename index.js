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

var asteroids = [];

io.on("connection", function() {
	console.log("a user connnected");
	
	
});