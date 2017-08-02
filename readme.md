# Multiplayer Asteroids

In 1979 Atari released an arcade space shooting game called Asteroids. Essentially you control a spaceship and fly around the screen shooting asteroids, increasing your total score. At certain times, an alien spaceship appears and shoots at you, and killing it yields a higher score. It has a two-player component, but it involves two people taking turns in front of the same device, the winner being the one with the highest score by the time each player runs out of lives.

Multiplayer Asteroids is very similar to Atari's Asteroids, however the two players play concurrently on separate devices, being able to interact with each other's spaceship.

## Getting Started

These instructions will help you setup the server with Node.js as well as explain how to connect to it from a client computer.

### Installing Node.js (Server-Side)

From [Node.js](https://nodejs.org/en/) download the latest version and follow the onscreen instructions to install properly.

### Setup of IP Address (Server-Side)

[TODO]

### Running the Server (Server-Side)

Open a console window and navigate to the root directory of where you downloaded this repository ("index.js" should be located here). Then type "node index.js" in the console and the server should be running. To verify it is running correctly, the console should prompt you for the number of players you want per game room. Enter in the number you would like, ranging from one to four.

### Connecting to Server (Client-Side)

In a web browser (preferably the latest version of Google Chrome), navigate to the IP address you setup in the "Setup of IP Address" step in order to connect a client to the server over LAN. You know it has successfully connected if in the client's browser it says "Waiting for Additional Players to Connect...", or the game starts (when the last client joins).

## Game Controls

```
w or up arrow		- accelerate spaceship forward
a or left arrow		- turn spaceship left
d or right arrow	- turn spaceship right
spacebar			- shoot projectile
```

## Known Issues

[TODO]

## Authors

Kyle Spurlock