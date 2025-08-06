export class OrbManager {
  constructor(canvasId, listContainerId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.orbs = [];
    this.orbList = document.getElementById(listContainerId);
    this._setupCanvas();
    requestAnimationFrame(() => this._draw());
  }

  _setupCanvas() {
    this.canvas.addEventListener('mousedown', this._onMouseDown.bind(this));
    this.canvas.addEventListener('mouseup', this._onMouseUp.bind(this));
    this.canvas.addEventListener('mousemove', this._onMouseMove.bind(this));
    this.dragging = null;
  }

  addOrbFromFile(file) {
    const url = URL.createObjectURL(file);
    this._addOrb(url, file.name);
  }

  addOrbFromURL(url) {
    this._addOrb(url, url);
  }

  _addOrb(url, label) {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      const orb = {
        img,
        x: Math.random() * (this.canvas.width - 100),
        y: this.canvas.height - 100,
        vx: Math.random() * 2 - 1,
        vy: -2 - Math.random() * 2,
        size: 64,
        dragging: false
      };
      this.orbs.push(orb);
      this._addToUI(label, orb);
    };
  }

  _addToUI(label, orb) {
    const wrapper = document.createElement('div');
    wrapper.className = 'orb-entry';
    wrapper.textContent = label;
    this.orbList.appendChild(wrapper);
  }

  _draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const orb of this.orbs) {
      if (!orb.dragging) {
        orb.vy += 0.2;
        orb.y += orb.vy;
        orb.x += orb.vx;
        if (orb.y > this.canvas.height - orb.size) {
          orb.y = this.canvas.height - orb.size;
          orb.vy *= -0.6;
        }
      }
      this.ctx.drawImage(orb.img, orb.x, orb.y, orb.size, orb.size);
    }
    requestAnimationFrame(() => this._draw());
  }

  _onMouseDown(e) {
    const { offsetX, offsetY } = e;
    for (const orb of this.orbs) {
      if (offsetX >= orb.x && offsetX <= orb.x + orb.size &&
          offsetY >= orb.y && offsetY <= orb.y + orb.size) {
        this.dragging = orb;
        orb.dragging = true;
        break;
      }
    }
  }

  _onMouseUp() {
    if (this.dragging) {
      this.dragging.dragging = false;
      this.dragging = null;
    }
  }

  _onMouseMove(e) {
    if (this.dragging) {
      const { offsetX, offsetY } = e;
      this.dragging.x = offsetX - this.dragging.size / 2;
      this.dragging.y = offsetY - this.dragging.size / 2;
    }
  }
}
