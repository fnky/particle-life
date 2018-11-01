const Random = require('random-js');
const Prob = require('prob.js');
const ParticleTypes = require('./Particles');
const resizeArray = require('./resizeArray');
const { fromHSV } = require('./HSV');

const { makeParticle } = ParticleTypes;

const RADIUS = 5.0;
const DIAMETER = 2.0 * RADIUS;
const R_SMOOTH = 2.0;

class Universe {
	constructor(numTypes, numParticles, width, height) {
		this.randGen = Random.engines.mt19937().seed(Date.now());
		this.types = new ParticleTypes();
		this.particles = Array.from({ length: numParticles }, () => makeParticle());

		this.setSize(width, height);
		this.setPopulation(numTypes, numParticles);

		this.centerX = this.width * 0.5;
		this.centerY = this.height * 0.5;
		this.zoom = 1;
		this.attractMean = 0;
		this.attractStd = 0;
		this.minRLower = 0;
		this.minRUpper = 0;
		this.maxRLower = 0;
		this.maxRUpper = 0;
		this.friction = 0;
		this.flatForce = false;
		this.wrap = false;
	}

	reSeed(
		attractMean,
		attractStd,
		minRLower,
		minRUpper,
		maxRLower,
		maxRUpper,
		friction,
		flatForce
	) {
		this.attractMean = attractMean;
		this.attractStd = attractStd;
		this.minRLower = minRLower;
		this.minRUpper = minRUpper;
		this.maxRLower = maxRLower;
		this.maxRUpper = maxRUpper;
		this.friction = friction;
		this.flatForce = flatForce;
		this.setRandomTypes();
		this.setRandomParticles();
	}

	setPopulation(numTypes, numParticles) {
		this.types.resize(numTypes);
		resizeArray(this.particles, numParticles, makeParticle());
	}

	setSize(width, height) {
		this.width = width;
		this.height = height;
	}

	setRandomTypes() {
		const randAttr = Prob.normal(this.attractMean, this.attractStd);
		const randMinR = Prob.uniform(this.minRLower, this.minRUpper);
		const randMaxR = Prob.uniform(this.maxRLower, this.maxRUpper);

		for (let i = 0; i < this.types.size(); ++i) {
			this.types.setColor(
				i,
				fromHSV(i / this.types.size(), 1, (i % 2) * 0.5 + 0.5)
			);

			for (let j = 0; j < this.types.size(); ++j) {
				if (i === j) {
					this.types.setAttract(i, j, -Math.abs(randAttr(this.randGen)));
					this.types.setMinR(i, j, DIAMETER);
				} else {
					this.types.setAttract(i, j, randAttr(this.randGen));
					this.types.setMinR(i, j, Math.max(randMinR(this.randGen), DIAMETER));
				}

				this.types.setMaxR(
					i,
					j,
					Math.max(randMaxR(this.randGen), this.types.getMinR(i, j))
				);

				// Keep radii symmetric
				this.types.setMaxR(j, i, this.types.getMaxR(i, j));
				this.types.setMinR(j, i, this.types.getMinR(i, j));
			}
		}
	}

	setRandomParticles() {
		const randType = Prob.uniform(0, this.types.size() - 1);
		const randUni = Prob.uniform(0, 1);
		const randNorm = Prob.normal(0, 1);

		for (let i = 0; i < this.particles.length; ++i) {
			const p = this.particles[i];
			p.type = Math.round(randType(this.randGen));
			p.x = (randUni(this.randGen) * 0.5 + 0.25) * this.width;
			p.y = (randUni(this.randGen) * 0.5 + 0.25) * this.height;
			p.vx = randNorm(this.randGen) * 0.2;
			p.vy = randNorm(this.randGen) * 0.2;
		}
	}

	step() {
		for (let i = 0; i < this.particles.length; ++i) {
			// Current particle
			const p = this.particles[i];

			// Interactions
			for (let j = 0; j < this.particles.length; ++j) {
				// Other particle
				const q = this.particles[j];

				// Get deltas
				let dx = q.x - p.x;
				let dy = q.y - p.y;

				if (this.wrap) {
					if (dx > this.width * 0.5) {
						dx -= this.width;
					} else if (dx < -this.width * 0.5) {
						dx += this.width;
					}

					if (dy > this.height * 0.5) {
						dy -= this.height;
					} else if (dy < -this.height * 0.5) {
						dy += this.height;
					}
				}

				// Get distance squared
				const r2 = dx * dx + dy * dy;
				const minR = this.types.getMinR(p.type, q.type);
				const maxR = this.types.getMaxR(p.type, q.type);

				if (r2 > maxR * maxR || r2 < 0.01) {
					continue;
				}

				// Normalize displacement
				const r = Math.sqrt(r2);
				dx /= r;
				dy /= r;

				// Calculate force
				let f = 0.0;
				if (r > minR) {
					if (this.flatForce) {
						f = this.types.getAttract(p.type, q.type);
					} else {
						const numer = 2.0 * Math.abs(r - 0.5 * (maxR + minR));
						const denom = maxR - minR;
						f = this.types.getAttract(p.type, q.type) * (1.0 - numer / denom);
					}
				} else {
					f =
						R_SMOOTH * minR * (1.0 / (minR + R_SMOOTH) - 1.0 / (r + R_SMOOTH));
				}

				p.vx += f * dx;
				p.vy += f * dy;
			}

			this.particles[i] = p;
		}

		// Update position
		for (let i = 0; i < this.particles.length; ++i) {
			// Current particle
			const p = this.particles[i];

			// Update position and velocity
			p.x += p.vx;
			p.y += p.vy;
			p.vx *= 1.0 - this.friction;
			p.vy *= 1.0 - this.friction;

			// Check for wall collisions
			if (this.wrap) {
				if (p.x < 0) {
					p.x += this.width;
				} else if (p.x >= this.width) {
					p.x -= this.width;
				}

				if (p.y < 0) {
					p.y += this.height;
				} else if (p.y >= this.height) {
					p.y -= this.height;
				}
			} else {
				if (p.x < DIAMETER) {
					p.vx = -p.vx;
					p.x = DIAMETER;
				} else if (p.x >= this.width - DIAMETER) {
					p.vx = -p.vx;
					p.x = this.width - DIAMETER;
				}

				if (p.y < DIAMETER) {
					p.vy = -p.vy;
					p.y = DIAMETER;
				} else if (p.y >= this.height - DIAMETER) {
					p.vy = -p.vy;
					p.y = this.height - DIAMETER;
				}
			}

			this.particles[i] = p;
		}
	}

	draw(ctx, opacity) {
		const circleRadius = RADIUS * this.zoom;
		for (let i = 0; i < this.particles.length; ++i) {
			const p = this.particles[i];
			const x = (p.x - this.centerX) * this.zoom + this.width / 2;
			const y = (p.y - this.centerY) * this.zoom + this.height / 2;

			ctx.beginPath();
			ctx.arc(x, y, circleRadius, 0, 2 * Math.PI);
			ctx.closePath();
			const col = this.types.getColor(p.type);
			col.a = opacity;
			ctx.fillStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${col.a})`;
			ctx.fill();
		}
	}

	getIndex(x, y) {
		const [cx, cy] = this.toCenter(x, y);

		for (let i = 0; i < this.particles.length; ++i) {
			const dx = this.particles[i].x - cx;
			const dy = this.particles[i].y - cy;

			if (dx * dx + dy * dy < RADIUS * RADIUS) {
				return i;
			}
		}

		return -1;
	}

	getParticleX(index) {
		return this.particles[index].x;
	}

	getParticleY(index) {
		return this.particles[index].y;
	}

	toCenter(x, y) {
		const cx = this.centerX + (x - this.width / 2) / this.zoom;
		const cy = this.centerY + (y - this.height / 2) / this.zoom;
		return [cx, cy];
	}

	setZoom(cx, cy, zoom) {
		// Apply the zoom
		this.centerX = cx;
		this.centerY = cy;
		this.zoom = Math.max(1, zoom);

		// Clamp to make sure camera doesn't go out of bounds
		this.centerX = Math.min(this.centerX, this.width * (1.0 - 0.5 / this.zoom));
		this.centerY = Math.min(
			this.centerY,
			this.height * (1.0 - 0.5 / this.zoom)
		);
		this.centerX = Math.min(this.centerX, this.width * (0.5 / this.zoom));
		this.centerY = Math.min(this.centerY, this.height * (0.5 / this.zoom));
	}

	printParams() {
		console.log('Attract:');
		for (let i = 0; i < this.types.size(); ++i) {
			for (let j = 0; j < this.types.size(); ++j) {
				console.log(this.types.getAttract(i, j));
			}
			console.log('');
		}

		console.log('MinR:');
		for (let i = 0; i < this.types.size(); ++i) {
			for (let j = 0; j < this.types.size(); ++j) {
				console.log(this.types.getMinR(i, j));
			}
			console.log('');
		}

		console.log('MaxR:');
		for (let i = 0; i < this.types.size(); ++i) {
			for (let j = 0; j < this.types.size(); ++j) {
				console.log(this.types.getMaxR(i, j));
			}
			console.log('');
		}
	}
}

module.exports = Universe;
