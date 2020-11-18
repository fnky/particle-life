const resizeArray = require('./resizeArray');

function makeParticle(x = 0, y = 0, vx = 0, vy = 0, type = 0) {
  return { x, y, vx, vy, type };
}

class ParticleTypes {
  constructor(size = 0) {
    this.col = Array.from({ length: size }, () => ({ r: 0, g: 0, b: 0, a: 0 }));
    this.attract = Array(size * size).fill(0);
    this.minR = Array(size * size).fill(0);
    this.maxR = Array(size * size).fill(0);
  }

  resize(size) {
    resizeArray(this.col, size, { r: 0, g: 0, b: 0, a: 0 });
    resizeArray(this.attract, size * size, 0);
    resizeArray(this.minR, size * size, 0);
    resizeArray(this.maxR, size * size, 0);
  }

  size() {
    return this.col.length;
  }

  getColor(i) {
    return this.col[i];
  }

  setColor(i, value) {
    this.col[i] = value;
  }

  getAttract(i, j) {
    return this.attract[i * this.col.length + j];
  }

  setAttract(i, j, value) {
    this.attract[i * this.col.length + j] = value;
  }

  getMinR(i, j) {
    return this.minR[i * this.col.length + j];
  }

  setMinR(i, j, value) {
    this.minR[i * this.col.length + j] = value;
  }

  getMaxR(i, j) {
    return this.maxR[i * this.col.length + j];
  }

  setMaxR(i, j, value) {
    this.maxR[i * this.col.length + j] = value;
  }
}

module.exports = ParticleTypes;
module.exports.makeParticle = makeParticle;
