// STAGE.JS RESTORED WITH ORBS AND IMAGE FADE

const canvas = document.getElementById('bouncerCanvas');
const ctx = canvas.getContext('2d');
const orbs = [];
const images = [];

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const orb of orbs) {
    if (!orb.dragging) {
      orb.vy += 0.2;
      orb.y += orb.vy;
      orb.x += orb.vx;
      if (orb.y > canvas.height - orb.size) {
        orb.y = canvas.height - orb.size;
        orb.vy *= -0.6;
      }
    }
    ctx.beginPath();
    ctx.arc(orb.x + orb.size / 2, orb.y + orb.size / 2, orb.size / 2 + orb.ring, 0, 2 * Math.PI);
    ctx.strokeStyle = orb.ringColor;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.drawImage(orb.img, orb.x, orb.y, orb.size, orb.size);
  }

  const now = Date.now();
  for (let i = images.length - 1; i >= 0; i--) {
    const image = images[i];
    const progress = (now - image.start) / image.duration;
    if (progress >= 1) {
      images.splice(i, 1);
    } else {
      const alpha = progress < 0.2 ? progress * 5 : (progress > 0.8 ? (1 - progress) * 5 : 1);
      ctx.globalAlpha = alpha;
      ctx.drawImage(image.img, (canvas.width - image.img.width) / 2, 50);
      ctx.globalAlpha = 1;
    }
  }

  requestAnimationFrame(draw);
}

draw();

const channel = new BroadcastChannel('orbStage');
channel.addEventListener('message', (event) => {
  if (event.data.type === 'addOrb') {
    const { src, size = 64, ring = 4, ringColor = '#ffffff' } = event.data;
    const img = new Image();
    img.src = src;
    img.onload = () => {
      orbs.push({
        img,
        x: Math.random() * (canvas.width - size),
        y: canvas.height - size,
        vx: Math.random() * 2 - 1,
        vy: -2 - Math.random() * 2,
        size,
        ring,
        ringColor,
        dragging: false
      });
    };
  } else if (event.data.type === 'showImage') {
    const { src, duration = 3000 } = event.data;
    const img = new Image();
    img.src = src;
    img.onload = () => {
      images.push({ img, start: Date.now(), duration });
    };
  }
});
