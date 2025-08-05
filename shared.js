// shared.js

const canvas = document.getElementById('bouncerCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
const orbSize = 64;
const orbs = [];
// expose orbs for other scripts and tests
window.orbs = orbs;

const channel = new BroadcastChannel('orb-sync');
// expose channel for tests to shut down
window.channel = channel;
// determine admin mode based on canvas presence
const isAdmin = !canvas;

if (isAdmin) {
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

  // Respond to stage requests for data
  channel.onmessage = (event) => {
    if (event.data?.type === 'request-sync') {
      window.sendOrbsToStage();
    }
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

  // Expose helper to request current orbs from any admin page
  window.requestOrbSync = () => channel.postMessage({ type: 'request-sync' });
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
  const orb = {
    img: new Image(),
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    vx: 0,
    dir: 1,
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
  if (canvas) {
    orb.x = Math.random() * (canvas.width - orbSize);
    orb.y = -orbSize;
    orb.vx = 2 + Math.random() * 2;
    orb.dir = Math.random() < 0.5 ? -1 : 1;
  }
  orb.img.src = src;
  orbs.push(orb);
  if (typeof updateOrbList === 'function') updateOrbList();
  if (typeof window.sendOrbsToStage === 'function') window.sendOrbsToStage();
}

function addOrbSmart() {
  const inputEl = document.getElementById('newOrbInput');
  if (!inputEl) return;
  const input = inputEl.value.trim();
  const roleEl = document.getElementById('userRole');
  const entryEl = document.getElementById('entryType');
  const labelEl = document.getElementById('orbLabel');
  const colorEl = document.getElementById('orbColor');
  const widthEl = document.getElementById('orbThickness');
  const iconEl = document.getElementById('roleIcon');
  const sourceTypeEl = document.getElementById('sourceType');
  const role = roleEl ? roleEl.value : 'none';
  const entryType = entryEl ? entryEl.value : 'drop';
  const label = labelEl ? labelEl.value.trim() : '';
  const ringColor = colorEl ? colorEl.value : '#ffffff';
  const ringWidth = widthEl ? parseInt(widthEl.value) : 4;
  const roleIcon = iconEl ? iconEl.value.trim() : '';
  const sourceType = sourceTypeEl ? sourceTypeEl.value : 'online';

  if (sourceType === 'online') {
    let finalUrl = '';
    if (input.startsWith('http')) {
      finalUrl = input;
    } else if (input.startsWith('users_')) {
      const parts = input.replace('.webp', '').split('_');
      const userId = parts[1];
      const hash = parts.slice(2).join('_') + '.webp';
      finalUrl = `https://images.whatnot.com/fit-in/1920x0/filters:format(webp)/users%2F${userId}%2F${hash}`;
    } else if (input.includes('/') && input.includes('.')) {
      const [userId, hash] = input.split('/');
      finalUrl = `https://images.whatnot.com/fit-in/1920x0/filters:format(webp)/users%2F${userId}%2F${hash}`;
    }
    if (finalUrl) {
      addOrb(finalUrl, entryType, role, label, ringColor, ringWidth, roleIcon);
      inputEl.value = '';
    }
  } else {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput) return;
    fileInput.click();
    fileInput.onchange = function () {
      const file = fileInput.files[0];
      if (file) {
        const localURL = URL.createObjectURL(file);
        addOrb(localURL, entryType, role, label, ringColor, ringWidth, roleIcon);
        fileInput.value = '';
      }
    };
  }
}

function updateOrbList() {
  const orbList = document.getElementById('orbList');
  if (!orbList) return;
  orbList.innerHTML = '';
  orbs.forEach((orb, i) => {
    const container = document.createElement('div');
    container.className = 'orb-row';

    const input = document.createElement('input');
    input.value = orb.img.src;
    input.onchange = () => { orb.img.src = input.value; if (typeof window.sendOrbsToStage === 'function') window.sendOrbsToStage(); };

    const labelInput = document.createElement('input');
    labelInput.placeholder = 'Label';
    labelInput.value = orb.label || '';
    labelInput.oninput = () => { orb.label = labelInput.value; if (typeof window.sendOrbsToStage === 'function') window.sendOrbsToStage(); };

    const roleSelect = document.createElement('select');
    ['none', 'mod', 'lurker', 'passerby'].forEach(role => {
      const option = document.createElement('option');
      option.value = role;
      option.textContent = role.charAt(0).toUpperCase() + role.slice(1);
      if (orb.role === role) option.selected = true;
      roleSelect.appendChild(option);
    });
    roleSelect.onchange = () => { orb.role = roleSelect.value; if (typeof window.sendOrbsToStage === 'function') window.sendOrbsToStage(); };

    const iconInput = document.createElement('input');
    iconInput.placeholder = 'Icon';
    iconInput.value = orb.roleIcon || '';
    iconInput.oninput = () => { orb.roleIcon = iconInput.value; if (typeof window.sendOrbsToStage === 'function') window.sendOrbsToStage(); };

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = orb.ringColor || '#ffffff';
    colorInput.oninput = () => { orb.ringColor = colorInput.value; if (typeof window.sendOrbsToStage === 'function') window.sendOrbsToStage(); };

    const widthInput = document.createElement('input');
    widthInput.type = 'range';
    widthInput.min = 1;
    widthInput.max = 10;
    widthInput.value = orb.ringWidth || 4;
    widthInput.oninput = () => { orb.ringWidth = parseInt(widthInput.value); if (typeof window.sendOrbsToStage === 'function') window.sendOrbsToStage(); };

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '🗑 Remove';
    removeBtn.onclick = () => {
      orbs.splice(i, 1);
      updateOrbList();
      if (typeof window.sendOrbsToStage === 'function') window.sendOrbsToStage();
    };

    container.appendChild(input);
    container.appendChild(labelInput);
    container.appendChild(roleSelect);
    container.appendChild(iconInput);
    container.appendChild(colorInput);
    container.appendChild(widthInput);
    container.appendChild(removeBtn);
    orbList.appendChild(container);
  });
}

function saveOrbs() {
  const saved = orbs.map(o => ({
    src: o.img.src,
    entryType: o.entryType,
    role: o.role,
    label: o.label,
    ringColor: o.ringColor,
    ringWidth: o.ringWidth,
    roleIcon: o.roleIcon
  }));
  localStorage.setItem('savedOrbs', JSON.stringify(saved));
}

function loadOrbs() {
  const data = JSON.parse(localStorage.getItem('savedOrbs') || '[]');
  orbs.length = 0;
  data.forEach(o => {
    addOrb(o.src, o.entryType, o.role, o.label, o.ringColor, o.ringWidth, o.roleIcon);
  });
  if (typeof updateOrbList === 'function') updateOrbList();
  if (typeof window.sendOrbsToStage === 'function') window.sendOrbsToStage();
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
