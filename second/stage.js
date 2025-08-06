// stage.js — displays only the visuals (orbs + gifs)
(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('bouncerCanvas');
    const ctx = canvas.getContext('2d');

    canvas.width = 405;
    canvas.height = 720;
    const bgColor = localStorage.getItem('canvasBg') || '#00ff00';
    canvas.style.backgroundColor = bgColor;

    class Orb {
      constructor(x, y, radius, dx, dy, imgSrc) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.dx = dx;
        this.dy = dy;
        this.img = new Image();
        this.imgLoaded = false;

        this.img.onload = () => (this.imgLoaded = true);
        this.img.onerror = () => console.warn('⚠️ Failed to load orb image:', imgSrc);
        this.img.src = imgSrc;
      }

      draw() {
        if (this.imgLoaded) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(this.img, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
          ctx.restore();
        }
      }

      update() {
        if (this.x + this.radius > canvas.width || this.x - this.radius < 0) this.dx *= -1;
        if (this.y + this.radius > canvas.height || this.y - this.radius < 0) this.dy *= -1;
        this.x += this.dx;
        this.y += this.dy;
        this.draw();
      }
    }

    // Load saved orb data
    const savedData = JSON.parse(localStorage.getItem('orbData') || '[]');
    const orbs = savedData.map(data => new Orb(data.x, data.y, data.radius, data.dx, data.dy, data.imgSrc));

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      orbs.forEach(orb => orb.update());
      requestAnimationFrame(animate);
    }

    animate();
  });
})();
