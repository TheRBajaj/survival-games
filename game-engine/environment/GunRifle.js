const Bullet = require("./Bullet.js");
const Gun = require("./Gun.js");
const Pair = require("./Pair.js");

// A Gun object of type Rifle, that inherits from Gun
module.exports = class GunRifle extends Gun {
	constructor(stage, owner) {
		const rifleProps = {
			startingBullets: 50,
			bulletCapacity: 200,
			bulletSpeed: 45,
			bulletDamage: 6,
			bulletRadius: 3,
			range: 2000,
			cooldown: 0
		}
		
		super(stage, owner, rifleProps);
	}

	// Return True if the gun is able to create and shoot a Bullet, else False
	shoot(position, cursorDirection, firingProps, colour) {
		if (this.numberBullets < 1) {
			return false;
		} else {
			const firingVector = new Pair(firingProps.x, firingProps.y);
			firingVector.normalize();

			// 3-burst fire behaviour
			// TODO: Cooldown code currently not used for human players
			if (this.numberBullets > 0 && (new Date().getTime() - this.previousFireTime >= this.cooldown)) {
				this._burstHelper(position, cursorDirection, firingVector, colour);
				if (this.numberBullets > 0) {
					setTimeout( () => {
						this._burstHelper(position, cursorDirection, firingVector, colour);
						if (this.numberBullets > 0) {
							setTimeout( () => {
								this._burstHelper(position, cursorDirection, firingVector, colour);
							}, 50);
						}
					}, 50);
				}
				this.previousFireTime = new Date().getTime();
			}
			return true;
		}
	}

	_burstHelper(position, cursorDirection, firingVector, colour) {
		let bullet = new Bullet(position, cursorDirection, firingVector, colour, this.bulletRadius, this.range, this.bulletSpeed, this.bulletDamage, this.owner);
		this.stage.addActor(bullet);
		this.numberBullets -= 1;
	}
}