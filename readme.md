# Multiplayer Asteroids

In 1979 Atari released an arcade space shooting game called Asteroids. Essentially you control a spaceship and fly around the screen shooting asteroids, increasing your total score. At certain times, an alien spaceship appears and shoots at you, and killing it yields a higher score. It has a two-player component, but it involves two people taking turns in front of the same device, the winner being the one with the highest score by the time each player runs out of lives.

Multiplayer Asteroids is very similar to Atari's Asteroids, however the two players play concurrently on separate devices, being able to interact with each other's spaceship.

## Getting Started

These instructions will help you setup the server with Node.js as well as explain how to connect to it from a client computer.

### Installing Node.js (Server-Side)

From [Node.js](https://nodejs.org/en/) download the latest version and follow the onscreen instructions to install properly.

### Setup of IP Address (Server-Side)

Get the LAN IP address of the computer that will be the server. On Windows, you can run the command "ipconfig" in your terminal and use the "IPv4 Address". Please update the "SERVER" constant in the "game.js" file with this IP address and use the port "3000", which is the default port number used by the server. For example: "http://192.168.1.101:3000".

### Running the Server (Server-Side)

Optional: Currently the game will run with two players. Please update the "PLAYERS_PER_ROOM" and "PLAYER_COLORS" constants in the "game.js" file to support more than two players.

Open a console window and navigate to the root directory of where you downloaded this repository ("index.js" should be located here). Then type "node index.js" in the console and the server should be running.

### Connecting to Server (Client-Side)

In a web browser (preferably the latest version of Google Chrome), navigate to the IP address you setup in the "Setup of IP Address" step in order to connect a client to the server over LAN. You know it has successfully connected if in the client's browser it says "Waiting for Additional Players to Connect...", or the game starts (when the last client joins).

If a client is unable to join the game, please check the browser logs to identify what the issue is.

## Game Controls

```
w or up arrow		- accelerate spaceship forward
a or left arrow		- turn spaceship left
d or right arrow	- turn spaceship right
spacebar		- shoot projectile
```

## Known Issues

[TODO]

## Authors

Kyle Spurlock