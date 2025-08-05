// shared.js

const canvas = document.getElementById('bouncerCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
const orbSize = 64;
const orbs = [];

const channel = new BroadcastChannel('orb-sync');

if (window.location.href.includes('admin')) {
  // Admin sends data when orbs are added or updated
  window.sendOrbsToStage = function () {
    const state = orbs.map(o => ({
      src: o.img.src,
      entryType: o.entryType,
      role: o.role,
      label: o.label,
      ringColor: o.ringColor,
      ringWidth: o.ringWidth,
      roleIcon: o.roleIcon
    }));
    channel.postMessage({ type: 'sync', data: state });
  };
} else {
  // Stage listens and syncs
  channel.onmessage = (event) => {
    if (event.data?.type === 'sync') {
      orbs.length = 0;
      event.data.data.forEach(o => {
        addOrb(o.src, o.entryType, o.role, o.label, o.ringColor, o.ringWidth, o.roleIcon);
      });
    }
  };
}

function updateCanvasBackground() {
  if (!canvas) return;
  const picker = document.getElementById('bgColorPicker');
  if (picker) canvas.style.backgroundColor = picker.value;
}

function applyAspectRatio() {
  if (!canvas) return;
  const aspectSelect = document.getElementById('aspectRatio');
  if (!aspectSelect) return;
  const setting = aspectSelect.value;
  let targetHeight = canvas.height;
  let targetWidth = (setting === '16:9') ? Math.floor(targetHeight * 16 / 9) : Math.floor(targetHeight * 9 / 16);
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  canvas.style.width = targetWidth + 'px';
  canvas.style.height = targetHeight + 'px';
}

function addOrb(src = '', entryType = 'drop', role = 'none', label = '', ringColor = '#ffffff', ringWidth = 4, roleIcon = '') {
  if (!canvas) return;
  const orb = {
    img: new Image(),
    x: Math.random() * (canvas.width - orbSize),
    y: -orbSize,
    dx: 0,
    dy: 0,
    vx: 2 + Math.random() * 2,
    dir: Math.random() < 0.5 ? -1 : 1,
    isEntering: true,
    entryType,
    bounceCount: 0,
    role,
    label,
    ringColor,
    ringWidth,
    roleIcon,
    moveTimer: 0,
    moveState: 'idle'
  };
  orb.img.src = src;
  orbs.push(orb);
  if (typeof updateOrbList === 'function') updateOrbList();
  if (typeof sendOrbsToStage === 'function') sendOrbsToStage();
}

function drawRoundedImage(img, x, y, size) {
  if (!ctx) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, x, y, size, size);
  ctx.restore();
}

function drawEffect(orb) {
  if (!ctx) return;
  const cx = orb.x + orbSize / 2;
  const cy = orb.y + orbSize / 2;
  ctx.save();
  if (orb.ringColor && orb.ringWidth > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, orbSize / 2 + orb.ringWidth / 2, 0, Math.PI * 2);
    ctx.strokeStyle = orb.ringColor;
    ctx.lineWidth = orb.ringWidth;
    ctx.stroke();
  }
  if (orb.roleIcon) {
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(orb.roleIcon, cx, orb.y - 10);
  }
  if (orb.label) {
    ctx.font = '16px sans-serif';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(orb.label, cx, orb.y - 30);
  }
  ctx.restore();
}

function updateMovement(orb) {
  orb.moveTimer--;
  if (orb.moveTimer <= 0) {
    const rand = Math.random();
    if (rand < 0.3) {
      orb.moveState = 'idle';
      orb.vx = 0;
    } else if (rand < 0.6) {
      orb.moveState = 'walk';
      orb.vx = (Math.random() * 1.5 + 1) * (Math.random() < 0.5 ? -1 : 1);
    } else {
      orb.moveState = 'dash';
      orb.vx = (Math.random() * 4 + 4) * (Math.random() < 0.5 ? -1 : 1);
    }
    orb.moveTimer = Math.floor(Math.random() * 90 + 30);
  }
  orb.x += orb.vx;
  if (canvas && (orb.x <= 0 || orb.x + orbSize >= canvas.width)) {
    orb.x = Math.max(0, Math.min(orb.x, canvas.width - orbSize));
    orb.vx *= -1;
  }
}

function animate() {
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const groundY = canvas.height - orbSize - 10;
  for (let orb of orbs) {
    if (orb.isEntering) {
      orb.dy += 0.5;
      orb.y += orb.dy;
      if (orb.y + orbSize >= groundY) {
        orb.y = groundY;
        orb.dy = -orb.dy * 0.5;
        orb.bounceCount++;
        if ((orb.entryType === 'drop' && orb.bounceCount > 1) || (orb.entryType === 'toss' && orb.bounceCount > 2)) {
          orb.y = groundY;
          orb.dy = 0;
          orb.isEntering = false;
          orb.moveTimer = Math.floor(Math.random() * 90 + 30);
        }
      }
      if (orb.entryType === 'toss') {
        orb.x += orb.dx;
        if (orb.x <= 0 || orb.x + orbSize >= canvas.width) orb.dx *= -1;
      }
    } else {
      updateMovement(orb);
    }
    drawRoundedImage(orb.img, orb.x, orb.y, orbSize);
    drawEffect(orb);
  }
  requestAnimationFrame(animate);
}

// Only auto-start animation if canvas exists (i.e. in stage.html)
if (canvas && ctx) {
  updateCanvasBackground();
  applyAspectRatio();
  animate();
}
