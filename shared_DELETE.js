// ✅ shared.js — shared orb logic

// --- UBER SCRIPT: all canvas/orb logic centralized ---
const canvas = document.getElementById('bouncerCanvas');
const ctx = canvas.getContext('2d');
window.orbs = window.orbs || [];
canvas.width = 405;
canvas.height = 720;
canvas.style.backgroundColor = localStorage.getItem('canvasBg') || '#00ff00';

class Orb {
  constructor({
    imgSrc = '', entryType = 'drop', role = 'none', label = '', ringColor = '#ffffff', ringWidth = 4, roleIcon = '', size = 32
  } = {}) {
    this.img = new Image();
    this.img.src = imgSrc;
    this.x = Math.random() * (canvas.width - size);
    this.y = -size;
    this.dx = entryType === 'toss' ? (Math.random() < 0.5 ? -2 : 2) : 0;
    this.dy = 0;
    this.vx = 2 + Math.random() * 2;
    this.dir = Math.random() < 0.5 ? -1 : 1;
    this.isEntering = true;
    this.entryType = entryType;
    this.bounceCount = 0;
    this.role = role;
    this.label = label;
    this.ringColor = ringColor;
    this.ringWidth = ringWidth;
    this.roleIcon = roleIcon;
    this.moveTimer = 0;
    this.moveState = 'idle';
    this.size = size;
    this.shrinking = false;
    this.targetSize = size * 0.6;
    this.imgLoaded = false;
    this.img.onload = () => {
      this.imgLoaded = true;
    };
  }
  update() {
    const groundY = canvas.height - this.size - 10;
    if (this.isEntering) {
      this.dy += 0.5;
      this.y += this.dy;
      if (this.y + this.size >= groundY) {
        this.y = groundY;
        this.dy = -this.dy * 0.5;
        this.bounceCount++;
        if ((this.entryType === 'drop' && this.bounceCount > 1) || (this.entryType === 'toss' && this.bounceCount > 2)) {
          this.y = groundY;
          this.dy = 0;
          this.isEntering = false;
          this.shrinking = true;
          this.moveTimer = Math.floor(Math.random() * 90 + 30);
        }
      }
      if (this.entryType === 'toss') {
        this.x += this.dx;
        if (this.x <= 0 || this.x + this.size >= canvas.width) this.dx *= -1;
      }
    } else {
      this.updateMovement();
    }
    if (this.shrinking && this.size > this.targetSize) {
      this.size -= (this.size - this.targetSize) * 0.1;
      if (Math.abs(this.size - this.targetSize) < 0.5) {
        this.size = this.targetSize;
        this.shrinking = false;
      }
      this.y = canvas.height - this.size - 10 - this.ringWidth / 2;
    }
  }
  updateMovement() {
    this.moveTimer--;
    if (this.moveTimer <= 0) {
      const rand = Math.random();
      if (rand < 0.3) {
        this.moveState = 'idle';
        this.vx = 0;
      } else if (rand < 0.6) {
        this.moveState = 'walk';
        this.vx = (Math.random() * 1.5 + 1) * (Math.random() < 0.5 ? -1 : 1);
      } else {
        this.moveState = 'dash';
        this.vx = (Math.random() * 4 + 4) * (Math.random() < 0.5 ? -1 : 1);
      }
      this.moveTimer = Math.floor(Math.random() * 90 + 30);
    }
    this.x += this.vx;
    if (this.x <= 0 || this.x + this.size >= canvas.width) {
      this.x = Math.max(0, Math.min(this.x, canvas.width - this.size));
      this.vx *= -1;
    }
  }
  draw() {
    if (!this.imgLoaded || !ctx) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x + this.size / 2, this.y + this.size / 2, this.size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(this.img, this.x, this.y, this.size, this.size);
    ctx.restore();
    this.drawEffect();
  }
  drawEffect() {
    const cx = this.x + this.size / 2;
    const cy = this.y + this.size / 2;
    ctx.save();
    if (this.ringColor && this.ringWidth > 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, this.size / 2 + this.ringWidth / 2, 0, Math.PI * 2);
      ctx.strokeStyle = this.ringColor;
      ctx.lineWidth = this.ringWidth;
      ctx.stroke();
    }
    if (this.roleIcon) {
      ctx.font = `${Math.max(12, this.size * 0.4)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(this.roleIcon, cx, this.y - 10);
    }
    if (this.label) {
      ctx.font = `${Math.max(12, this.size * 0.4)}px sans-serif`;
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.fillText(this.label, cx, this.y - 30);
    }
    ctx.restore();
  }
}
window.Orb = Orb;

window.addOrb = function(imgSrc, entryType = 'drop', role = 'none', label = '', ringColor = '#ffffff', ringWidth = 4, roleIcon = '', size = 32) {
  const orb = new Orb({ imgSrc, entryType, role, label, ringColor, ringWidth, roleIcon, size });
  window.orbs.push(orb);
  window.drawOrbs();
};

window.drawOrbs = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const orb of window.orbs) {
    orb.draw();
  }
};

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const orb of window.orbs) {
    if (typeof orb.update === 'function') orb.update();
    if (typeof orb.draw === 'function') orb.draw();
  }
  requestAnimationFrame(animate);
}
animate();

window.clearOrbs = () => {
  window.orbs.length = 0;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  localStorage.setItem('orbData', '[]');
};

window.saveOrbs = function() {
  const orbData = window.orbs.map(o => ({
    x: o.x,
    y: o.y,
    dx: o.dx,
    dy: o.dy,
    radius: o.radius,
    ringWidth: o.ringWidth,
    ringColor: o.ringColor,
    role: o.role,
    roleIcon: o.roleIcon,
    label: o.label,
    entry: o.entry,
    imgSrc: o.img?.src || ""
  }));
  localStorage.setItem("orbData", JSON.stringify(orbData));
  console.log("💾 Orbs saved to localStorage");
};

window.loadOrbs = function() {
  const stored = localStorage.getItem("orbData");
  if (!stored) return;
  const data = JSON.parse(stored);
  window.orbs.length = 0;
  for (const o of data) {
    const orb = new Orb(o.x, o.y, o.radius, o.dx, o.dy, o.imgSrc);
    orb.ringWidth = o.ringWidth;
    orb.ringColor = o.ringColor;
    orb.role = o.role;
    orb.roleIcon = o.roleIcon;
    orb.label = o.label;
    orb.entry = o.entry;
    window.orbs.push(orb);
  }
  window.drawOrbs();
  console.log("📂 Orbs loaded from localStorage");
};

window.validateOrbVisible = function(orb) {
  if (!window.canvas || !window.ctx) return;
  const x = Math.floor(orb.x);
  const y = Math.floor(orb.y);
  const size = Math.max(2, Math.floor(orb.radius / 2));
  try {
    const imageData = window.ctx.getImageData(x - size, y - size, size * 2, size * 2);
    let nonBgPixel = false;
    for (let i = 0; i < imageData.data.length; i += 4) {
      const alpha = imageData.data[i + 3];
      if (alpha > 0) {
        nonBgPixel = true;
        break;
      }
    }
    if (nonBgPixel) {
      console.log('✅ Orb is visible on canvas (pixel check passed).');
    } else {
      console.warn('⚠️ Orb may not be visible (pixel check failed).');
    }
  } catch (e) {
    console.warn('⚠️ Cannot validate orb visibility due to browser security (CORS). Orb is likely drawn if no errors above.', e);
  }
};

// --- ENHANCEMENTS ---
window.defaultGIFPosition = 'bottom-left';

window.createVolumeSlider = function(trigger) {
  const volume = document.createElement('input');
  volume.type = 'range';
  volume.min = 0;
  volume.max = 1;
  volume.step = 0.01;
  volume.value = trigger.volume ?? 1;
  volume.oninput = () => {
    trigger.volume = parseFloat(volume.value);
    window.saveTriggers?.();
  };
  return volume;
};

window.createGifPositionSelector = function(trigger) {
  const select = document.createElement('select');
  ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'].forEach(pos => {
    const opt = document.createElement('option');
    opt.value = pos;
    opt.textContent = pos;
    if ((trigger.gifPosition || window.defaultGIFPosition) === pos) opt.selected = true;
    select.appendChild(opt);
  });

  select.onchange = () => {
    trigger.gifPosition = select.value;
    window.saveTriggers?.();
  };

  return select;
};

window.applyGifPosition = function(img, position) {
  const pos = position || window.defaultGIFPosition;
  img.style.position = 'absolute';
  img.style.zIndex = 1000;
  img.style.maxHeight = '200px';
  img.style.pointerEvents = 'none';

  switch (pos) {
    case 'top-left':
      img.style.top = '10px';
      img.style.left = '10px';
      break;
    case 'top-right':
      img.style.top = '10px';
      img.style.right = '10px';
      break;
    case 'bottom-right':
      img.style.bottom = '10px';
      img.style.right = '10px';
      break;
    case 'center':
      img.style.top = '50%';
      img.style.left = '50%';
      img.style.transform = 'translate(-50%, -50%)';
      break;
    default:
      img.style.bottom = '10px';
      img.style.left = '10px';
  }
};

window.checkForHotkeyClash = function(combo, currentTrigger) {
  return window.soundTriggers?.some(t => t !== currentTrigger && t.keyCombo === combo);
};

window.showClashWarning = function() {
  window.showSoundStatus?.("⚠️ That key combo is already in use.", true);
};
