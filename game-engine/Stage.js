const Pair = require("./environment/Pair.js");
const Circle = require("./environment/Circle.js");
const Crate = require("./environment/Crate.js");
const BushEnv = require("./environment/BushEnv.js");
const AmmoEnv = require("./environment/AmmoEnv.js");
const PistolEnv = require("./environment/PistolEnv.js");
const BurstRifleEnv = require("./environment/BurstRifleEnv.js");
const SpeedBoostEnv = require("./environment/SpeedBoostEnv.js");
const HealthPotEnv = require("./environment/HealthPotEnv.js");
const ScopeEnv = require("./environment/ScopeEnv.js");
const Bullet = require("./environment/Bullet.js");
const Gun = require("./environment/Gun.js");
const Line = require("./environment/Line.js");

const Player = require('./Player.js');
const CollisionEngine = require("./CollisionEngine.js");

// Return a random integer between 0 and n, inclusive
function randInt(n) { return Math.round(Math.random() * n); }

// Return a random float between 0 and n, inclusive
function rand(n) { return Math.random() * n; }

// Return the distance between two points, given the x and y coordinate of each point
function distanceBetweenTwoPoints(startingX, startingY, endingX, endingY) {
	return Math.sqrt((startingX - endingX) ** 2 + (startingY - endingY) ** 2);
}

// Return the distance between two Pairs
function distanceBetweenTwoPairs(startingPair, endingPair) {
	return Math.sqrt((startingPair.x - endingPair.x) ** 2 + (startingPair.y - endingPair.y) ** 2);
}

// Random color generator
function getRandomColor() {
	let red = Math.floor(Math.random() * 255);
	let green = Math.floor(Math.random() * 255);
	let blue = Math.floor(Math.random() * 255);
	let color = "rgb(" + red + ", " + green + ", " + blue + ")";
	return color;
}

// A Stage stores all actors (all environment objects). It is also responsible for calculating game logic (eg. collisions)
module.exports = class Stage {
	constructor(gameId, players, numPlayers, setPlayerStatus, generationSettings) {
        this.gameId = gameId;
        this.players = players;
        this.numPlayers = numPlayers;
        this.numAlive = numPlayers;
        this.gameHasEnded = false;
		this.winningPID = null;
		this.setPlayerStatus = setPlayerStatus;

		// Each actor is stored in different arrays to handle collisions differently
		this.playerActors = []; // includes all Players
		this.bulletActors = []; // stores Bullets
		this.crateActors = []; // Crates and Bushes
		this.environmentActors = []; // these actors cannot collide. Includes Lines, buffs (HP, ammo, speed boost, RDS)
        
        // The logical width and height of the stage
		this.stageWidth = generationSettings.stageWidth;
        this.stageHeight = generationSettings.stageHeight;
        
        // Initialize each player in the stage
        for (let i = 0; i < this.numPlayers; i++) {
            // console.log("Adding player with id " + this.players[i].pid);
            // Player spawns in a random spot (they spawn away from the border)
            let xSpawn = (this.stageWidth / 2) - randInt(this.stageWidth / 4) + randInt(this.stageWidth / 4);
            let ySpawn = (this.stageHeight / 2) - randInt(this.stageHeight / 4) + randInt(this.stageHeight / 4);
            
            // Check to see if the would collide with another player
			const playerRadius = 30;
            let collides = this.checkForGenerationCollisions(xSpawn, ySpawn, playerRadius * 2);
            let attemptsToMake = 3;
            while (collides || attemptsToMake > 0) {
                xSpawn = (this.stageWidth / 2) - randInt(this.stageWidth / 4) + randInt(this.stageWidth / 4);
                ySpawn = (this.stageHeight / 2) - randInt(this.stageHeight / 4) + randInt(this.stageWidth / 4);
                attemptsToMake--;
                collides = this.checkForGenerationCollisions(xSpawn, ySpawn, playerRadius * 2);
            }
            
            const playerStartingPosition = new Pair(xSpawn, ySpawn);
            const playerColour = getRandomColor(); // each player has a different color
            const playerHP = 100;
            const playerMovementSpeed = 8; // default is 8; debug is 15
            let player = new Player(this, playerStartingPosition, playerColour, playerRadius, playerHP, playerMovementSpeed, this.players[i].pid);
            this.addActor(player);
        }

		// Generate environment (bushes, crates, buffs) and add them to the corresponding actors lists
		this.generateCrates(generationSettings.numCrates);
		this.generateBushes(generationSettings.numBushes);
		this.generateBuffs(generationSettings);

		this.startTime = Math.round(new Date().getTime() / 1000);
    }
    
    // Given a player ID, return that player
    getPlayer(pid) {
        for (let i = 0; i < this.playerActors.length; i++) {
            if (this.playerActors[i].getPlayerID() == pid) {
                return this.playerActors[i];
            }
        }
        return null;
	}
	
	// Given a player ID, remove that player from the game
	// This is called from MultiplayerGame if the player leaves the game or disconnects (leaves page)
	removePlayer(pid, reason) {
		// disconnection
		for (let i = 0; i < this.playerActors.length; i++) {
            if (this.playerActors[i].getPlayerID() == pid) {
				this.removeActor(this.playerActors[i]);
				this.numAlive -= 1;

				// This means the player quit game (but remains in lobby)
				if (reason === "quit") {
					this.setPlayerStatus(pid, "In Lobby");
				}

				// There is only one player left in the game; he wins automatically
				if (this.numAlive == 1) {
					this.gameHasEnded = true;
					// TODO: Insert this record into the leaderboards 
					this.winningPID = this.playerActors[0].getPlayerID();
					// console.log("The player who won is " + this.winningPID);
				}

				// If this.numAlive == 0, then no one wins game, as all clients disconnected
				return true;
            }
		}
        return null;
	}

    // Return the initial state of the actors lists
    getInitialStageState() {
        let players = [];
        let bullets = [];
        let crates = [];
        let environmentObjs = [];
        
        // Get JSON representation (only stores information necessary for client-side)
        this.playerActors.forEach(player => players.push(player.getJSONRepresentation()));
        this.bulletActors.forEach(bullet => bullets.push(bullet.getJSONRepresentation()));
		this.crateActors.forEach(crate => crates.push(crate.getJSONRepresentation()));
        this.environmentActors.forEach(environment => environmentObjs.push(environment.getJSONRepresentation()));

        let state = {
			width: this.stageWidth,
			height: this.stageHeight,
            players: players,
            bullets: bullets,
            crates: crates,
            environment: environmentObjs,
            gameStartTime: this.startTime,
            numAlive: this.numAlive,
            numPlayers: this.numPlayers
        }
        return state;
    }

    // Return the current state of the actors lists
    getUpdatedStageState() {
        // This does not return the crates list (as they are static, and cannot be changed)
        // Eventually, add Bushes so that they are not part of environmentObjs (as they are static)
        let players = [];
        let bullets = [];
        let environmentObjs = [];
        
        // Get JSON representation (only stores information necessary for client-side)
        this.playerActors.forEach(player => players.push(player.getJSONRepresentation()));
		this.bulletActors.forEach(bullet => bullets.push(bullet.getJSONRepresentation()));
        this.environmentActors.forEach(environment => environmentObjs.push(environment.getJSONRepresentation()));

        let state = {
            players: players,
            bullets: bullets,
            environment: environmentObjs,
            numAlive: this.numAlive,
            hasEnded: this.gameHasEnded
        }
        return state;
    }


	// Generate bushes in random locations throughout the map
	generateBushes(numBushes) {
		for (let i = 0; i < numBushes; i++) {
			// console.log("Generating bush");
			let validGeneration = false;
			let attemptsToMake = 5;
			const colour = "rgba(0,61,17,0.95)", radius = 80;
			while (!validGeneration && attemptsToMake > 0) {
				let startingX = randInt(this.stageWidth - 250);
				let startingY = randInt(this.stageHeight - 250);
				if (CollisionEngine.checkObjectToBorderCollision(startingX, startingY, radius, this.stageWidth, this.stageHeight)) { continue; }

				// Check if this bush would collide any other actors
				let collides = this.checkForGenerationCollisions(startingX, startingY, radius * 2);
				if (!collides) {
					let bush = new BushEnv(new Pair(startingX, startingY), colour, radius)
					this.addActor(bush);
					validGeneration = true;
					// console.log(`Bush generated at (${startingX}, ${startingY})`);
				}
				attemptsToMake -= 1;
			}

		}
	}

    // Generate crates in random locations throughout the map
	generateCrates(numCrates) {
		for (let i = 0; i < numCrates; i++) {
			let validGeneration = false;
			let attemptsToMake = 5; // after n attempts, stops trying to generate this crate
			const colour = "rgb(128,128,128,1)";
			let width = 220, height = 220;
			const playerRadius = 30; // used so that crates don't spawn with small gaps that players can't access
			while (!validGeneration && attemptsToMake > 0) {
				let startingX = randInt(this.stageWidth - width);
				let startingY = randInt(this.stageHeight - width);
				if (CollisionEngine.checkObjectToBorderCollision(startingX, startingY, width + playerRadius, this.stageWidth, this.stageHeight)) { continue; }

				// Check if this crate would collide any other actors
				let collides = this.checkForGenerationCollisions(startingX, startingY, width * 2);
				if (!collides) {
					let crate = new Crate(startingX, startingY, colour, width, height)
					this.addActor(crate);
					validGeneration = true;
					// console.log(`Crate generated at (${startingX}, ${startingY})`);
				}
				attemptsToMake -= 1;
			}
		}
	}

	// Generate buffs in random locations throughout the map
	generateBuffs(generationSettings) {
        // Generate RDS buffs
        for (let i = 0; i < generationSettings.numRDS; i++) {
            let validGeneration = false;
            let attemptsToMake = 5;
            let colour = "rgba(255,255,0,1)", radius = 20;
            while (!validGeneration && attemptsToMake > 0) {
                let startingX = randInt(this.stageWidth - 250);
                let startingY = randInt(this.stageHeight - 250);
                if (CollisionEngine.checkObjectToBorderCollision(startingX, startingY, radius, this.stageWidth, this.stageHeight)) { continue; }
    
                // Check if this scope buff would collide any other actors
                let collides = this.checkForGenerationCollisions(startingX, startingY, radius);
                if (!collides) {
                    let scope = new ScopeEnv(new Pair(startingX, startingY), colour, radius)
                    this.addActor(scope);
                    validGeneration = true;
                    // console.log(`Scope generated at (${startingX}, ${startingY})`);
                }
                attemptsToMake -= 1;
            }
        }
		

        // Generate speed buffs
        for (let i = 0; i < generationSettings.numSpeedBoost; i++) {
            let validGeneration = false;
            let attemptsToMake = 5;
            let colour = "rgba(0,0,255,1)", radius = 20;
            while (!validGeneration && attemptsToMake > 0) {
                let startingX = randInt(this.stageWidth - 250);
                let startingY = randInt(this.stageHeight - 250);
                if (CollisionEngine.checkObjectToBorderCollision(startingX, startingY, radius, this.stageWidth, this.stageHeight)) { continue; }
    
                // Check if this speed buff would collide any other actors
                let collides = this.checkForGenerationCollisions(startingX, startingY, radius);
                if (!collides) {
                    let speedBoost = new SpeedBoostEnv(new Pair(startingX, startingY), colour, radius)
                    this.addActor(speedBoost);
                    validGeneration = true;
                    // console.log(`Speed Buff generated at (${startingX}, ${startingY})`);
                }
                attemptsToMake -= 1;
            }
        }

        // Generate small guns
        for (let i = 0; i < generationSettings.numSmallGun; i++) {
            let validGeneration = false;
            let attemptsToMake = 5;
            let colour = "rgba(255,255,0,1)", radius = 20;
            while (!validGeneration && attemptsToMake > 0) {
                let startingX = randInt(this.stageWidth - 250);
                let startingY = randInt(this.stageHeight - 250);
                if (CollisionEngine.checkObjectToBorderCollision(startingX, startingY, radius, this.stageWidth, this.stageHeight)) { continue; }
    
                // Check if this small gun would collide any other actors
                let collides = this.checkForGenerationCollisions(startingX, startingY, radius);
                if (!collides) {
                    let smallGun = new PistolEnv(new Pair(startingX, startingY), colour, radius)
                    this.addActor(smallGun);
                    validGeneration = true;
                    // console.log(`Small gun generated at (${startingX}, ${startingY})`);
                }
                attemptsToMake -= 1;
            }
        }

        // Generate big guns
        for (let i = 0; i< generationSettings.numBigGun; i++) {
            let validGeneration = false;
            let attemptsToMake = 5;
            let colour = "rgba(255,255,0,1)", radius = 20;
            while (!validGeneration && attemptsToMake > 0) {
                let startingX = randInt(this.stageWidth - 250);
                let startingY = randInt(this.stageHeight - 250);
                if (CollisionEngine.checkObjectToBorderCollision(startingX, startingY, radius, this.stageWidth, this.stageHeight)) { continue; }
    
                // Check if this big gun would collide any other actors
                let collides = this.checkForGenerationCollisions(startingX, startingY, radius);
                if (!collides) {
                    let bigGun = new BurstRifleEnv(new Pair(startingX, startingY), colour, radius)
                    this.addActor(bigGun);
                    validGeneration = true;
                    // console.log(`Big gun generated at (${startingX}, ${startingY})`);
                }
                attemptsToMake -= 1;
            }
        }

		// Generate numBuffs number of ammo
		for (let i = 0; i < generationSettings.numAmmo; i++) {
			let validGeneration = false;
			let attemptsToMake = 5;
			const colour = "rgba(0,0,0,1)", radius = 20;
			while (!validGeneration && attemptsToMake > 0) {
				let startingX = randInt(this.stageWidth - 250);
				let startingY = randInt(this.stageHeight - 250);
				if (CollisionEngine.checkObjectToBorderCollision(startingX, startingY, radius, this.stageWidth, this.stageHeight)) { continue; }

				// Check if this ammo would collide any other actors
				let collides = this.checkForGenerationCollisions(startingX, startingY, radius);
				if (!collides) {
					let ammo = new AmmoEnv(new Pair(startingX, startingY), colour, radius)
					this.addActor(ammo);
					validGeneration = true;
					// console.log(`Ammo generated at (${startingX}, ${startingY})`);
				}
				attemptsToMake -= 1;
			}
		}

		// Generate numBuffs number of HP pots
		for (let i = 0; i < generationSettings.numHPPots; i++) {
			let validGeneration = false;
			let attemptsToMake = 5;
			const colour = "rgba(255,0,0,1)", radius = 20;
			while (!validGeneration && attemptsToMake > 0) {
				let startingX = randInt(this.stageWidth - 250);
				let startingY = randInt(this.stageHeight - 250);
				if (CollisionEngine.checkObjectToBorderCollision(startingX, startingY, radius, this.stageWidth, this.stageHeight)) { continue; }

				// Check if this HP pot would collide any other actors
				let collides = this.checkForGenerationCollisions(startingX, startingY, radius);
				if (!collides) {
					let hpPot = new HealthPotEnv(new Pair(startingX, startingY), colour, radius)
					this.addActor(hpPot);
					validGeneration = true;
					// console.log(`hpPot generated at (${startingX}, ${startingY})`);
				}
				attemptsToMake -= 1;
			}
		}
	}

	// Check for generation collisions 
	checkForGenerationCollisions(destinationX, destinationY, objectRadius) {
		// Check if our structure will collide with other players
		let playersList = this.getPlayerActors();
		for (let i = 0; i < playersList.length; i++) {
			let playerPosition = playersList[i].getPlayerPosition();
			let dx = destinationX - playerPosition.x;
			let dy = destinationY - playerPosition.y;
			let distance = Math.sqrt(dx * dx + dy * dy);

			// Player collides with another player
			if (distance < playersList[i].getRadius() + objectRadius) {
				return true;
			}
		}

		// Check if our structure will collide with other crate structures
		let crateList = this.getCrateActors();
		for (let i = 0; i < crateList.length; i++) {
			// Check for collision with Crates
			if (crateList[i] instanceof Crate) {
				let objectPosition = crateList[i].getStartingPosition();
				let structureCenterX = crateList[i].getWidth() / 2;
				let structureCenterY = crateList[i].getHeight() / 2;
				let dx = destinationX - objectPosition.x - structureCenterX;
				let dy = destinationY - objectPosition.y - structureCenterY;
				let distance = Math.sqrt(dx * dx + dy * dy);

				// Player collides with crate
				if (distance < crateList[i].getWidth() + objectRadius) {
					return true;
				}
			}
		}

		// Check generation collision with environment objects, etc.
		let actorsList = this.getEnvironmentActors();
		for (let i = 0; i < actorsList.length; i++) {
			if (actorsList[i] instanceof Line) { continue; }
			
			let envPosition = actorsList[i].getStartingPosition();
			let dx = destinationX - envPosition.x;
			let dy = destinationY - envPosition.y;
			let distance = Math.sqrt(dx * dx + dy * dy);

			// player collides with the player
			if (distance < actorsList[i].getRadius() + objectRadius) {
				return true;
			}
		}
		return false;
	}

	// Add an actor (eg. enemy, boxes) to the stage (actor spawns)
	addActor(actor) {
		// Each actor is stored in different arrays to handle collisions differently
		if (actor instanceof Player) {
			this.playerActors.push(actor);
		} else if (actor instanceof Bullet) {
			this.bulletActors.push(actor);
		} else if (actor instanceof Crate) {
			this.crateActors.push(actor);
		}
		// This environment actors list stores items/buffs the user can pick up (eg. ammo, health pots, speed buff, line sight, guns)
		else {
			this.environmentActors.push(actor);
		}
	}

	// Remove an actor (eg. enemy, boxes) to the stage (actor despawns/dies)
	removeActor(actor) {
		// Determine which actors list to remove this object from
		if (actor instanceof Player) {
			let index = this.playerActors.indexOf(actor);
			if (index != -1) {
				// console.log("Removing actor " + this.playerActors[index]);
				this.playerActors.splice(index, 1);
			}

		} else if (actor instanceof Bullet) {
			let index = this.bulletActors.indexOf(actor);
			if (index != -1) {
				// console.log("Removing actor " + this.bulletActors[index]);
				this.bulletActors.splice(index, 1);
			}
		} else if (actor instanceof Crate) {
			let index = this.crateActors.indexOf(actor);
			if (index != -1) {
				// console.log("Removing actor " + this.crateActors[index]);
				this.crateActors.splice(index, 1);
			}
		} else {
			let index = this.environmentActors.indexOf(actor);
			if (index != -1) {
				// console.log("Removing actor " + this.environmentActors[index]);
				this.environmentActors.splice(index, 1);
			}
		}
	}

	getPlayerActors() {
		return this.playerActors;
	}

	getCrateActors() {
		return this.crateActors;
	}

	getBulletActors() {
		return this.bulletActors;
	}

	getEnvironmentActors() {
		return this.environmentActors;
	}
    
    // Return the PID of the player who won the game, else null
    getWinner() {
        return this.winningPID;
    }

    // Take one step in the animation of the game.  Do this by asking each of the actors to take a single step. 
	// NOTE: Careful if an actor died, this may break!
	step() {
		// Take a step for each player actor
		for (let i = 0; i < this.playerActors.length; i++) {
			// console.log(`Actors list: ${this.environmentActors}`);
			this.playerActors[i].step();
		}
		// Take a step for each bullet actor, passing in the stage for the bullets to be able to access
		for (let i = 0; i < this.bulletActors.length; i++) {
			this.bulletActors[i].step(this);
		}
		// Take a step for each crate actor
		for (let i = 0; i < this.crateActors.length; i++) {
			this.crateActors[i].step();
		}
		// Take a step for each environment actor
		for (let i = 0; i < this.environmentActors.length; i++) {
			this.environmentActors[i].step();
		}

		// Check if any player actors died
		for (let i = 0; i < this.playerActors.length; i++) {
			// TODO: Implement this a bit better
            // Dead players get removed from the player actors list
			if (this.playerActors[i].isDead()) {
				this.setPlayerStatus(this.playerActors[i].getPlayerID(), "Spectating");
				this.removeActor(this.playerActors[i]);
                this.numAlive -= 1;
            }
            
			// Game ends (only one person is left)
			// NOTE: Set this value to be 0 for single player mode, and 1 for multiplayer mode. Setting the incorrect value will BUG OUT THE GAME!! (specifically the intervals in socket-server.js)
            if (this.numAlive <= 1) {
                this.gameHasEnded = true;
                
                // TODO: Insert this record into the leaderboards 
				this.winningPID = this.playerActors[0].getPlayerID();
				this.setPlayerStatus(this.playerActors[0].getPlayerID(), "Winner!");
            }
		}

		// Update elapsed time (in seconds)
		let currentTime = Math.round(new Date().getTime() / 1000);
		this.elapsedTime = Math.round(currentTime) - this.startTime;
	}
}