// ✅ shared.js — shared orb logic

const canvas = document.getElementById('bouncerCanvas');
const ctx = canvas?.getContext('2d');
const bgColor = localStorage.getItem('canvasBg') || '#00ff00';
if (canvas) canvas.style.background = bgColor;

window.orbs = window.orbs || [];

class Orb {
  constructor(x, y, radius, dx, dy, imgSrc) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.dx = dx;
    this.dy = dy;
    this.img = new Image();
    this.imgLoaded = false;

    this.img.onload = () => this.imgLoaded = true;
    this.img.onerror = () => console.warn("⚠️ Failed to load orb image:", imgSrc);
    this.img.src = imgSrc;
  }

  draw() {
    if (!this.imgLoaded || !ctx) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(
      this.img,
      this.x - this.radius,
      this.y - this.radius,
      this.radius * 2,
      this.radius * 2
    );
    ctx.restore();
  }

  update() {
    if (!canvas) return;
    if (this.x + this.radius > canvas.width || this.x - this.radius < 0) this.dx *= -1;
    if (this.y + this.radius > canvas.height || this.y - this.radius < 0) this.dy *= -1;
    this.x += this.dx;
    this.y += this.dy;
    this.draw();
  }
}

window.animateOrbs = () => {
  if (!ctx || !canvas) return;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    window.orbs.forEach(orb => orb.update());
    requestAnimationFrame(animate);
  }
  animate();
};

window.loadOrbsFromStorage = () => {
  const savedData = JSON.parse(localStorage.getItem('orbData') || '[]');
  window.orbs = savedData.map(data => new Orb(
    data.x, data.y, data.radius, data.dx, data.dy, data.imgSrc
  ));
  if (typeof window.animateOrbs === 'function') window.animateOrbs();
};

window.sendOrbsToStage = () => {
  try {
    const data = JSON.stringify(window.orbs.map(o => ({
      x: o.x,
      y: o.y,
      radius: o.radius,
      dx: o.dx,
      dy: o.dy,
      imgSrc: o.img?.src || ''
    })));
    localStorage.setItem('orbData', data);
    console.log('✅ Sent orbs to stage via localStorage:', data);
  } catch (err) {
    console.error('Failed to send orbs:', err);
  }
};

window.addOrb = (src, entryType = 'drop') => {
  const radius = 30;
  const x = Math.random() * (canvas?.width || 400);
  const y = Math.random() * (canvas?.height || 700);
  const dx = (Math.random() - 0.5) * 2;
  const dy = (Math.random() - 0.5) * 2;
  const orb = new Orb(x, y, radius, dx, dy, src);
  window.orbs.push(orb);
};
