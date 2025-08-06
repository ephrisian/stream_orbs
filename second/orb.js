// orb.js - Unified orb management and UI logic

const canvas = document.getElementById('bouncerCanvas');
const ctx = canvas.getContext('2d');
const orbs = [];

function updateCanvasBackground() {
  const colorPicker = document.getElementById('bgColorPicker');
  if (canvas && colorPicker) {
    canvas.style.backgroundColor = colorPicker.value;
  }
}

function applyAspectRatio() {
  canvas.width = 405;
  canvas.height = 720;
  canvas.style.width = "405px";
  canvas.style.height = "720px";
}

function addOrb({
  imgSrc = '', entryType = 'drop', role = 'none', label = '', ringColor = '#ffffff', ringWidth = 4, roleIcon = '', size = 32
} = {}) {
  const orb = {
    img: new Image(),
    x: Math.random() * (canvas.width - size),
    y: -size,
    dx: entryType === 'toss' ? (Math.random() < 0.5 ? -2 : 2) : 0,
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
    moveState: 'idle',
    size,
    shrinking: false,
    targetSize: size * 0.6,
    imgLoaded: false
  };
  orb.img.src = imgSrc;
  orb.img.onload = () => { orb.imgLoaded = true; };
  orbs.push(orb);
  updateOrbList();
}

function drawRoundedImage(img, x, y, size) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, x, y, size, size);
  ctx.restore();
}

function drawEffect(orb) {
  const cx = orb.x + orb.size / 2;
  const cy = orb.y + orb.size / 2;
  ctx.save();
  if (orb.ringColor && orb.ringWidth > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, orb.size / 2 + orb.ringWidth / 2, 0, Math.PI * 2);
    ctx.strokeStyle = orb.ringColor;
    ctx.lineWidth = orb.ringWidth;
    ctx.stroke();
  }
  if (orb.roleIcon) {
    ctx.font = `${Math.max(12, orb.size * 0.4)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(orb.roleIcon, cx, orb.y - 10);
  }
  if (orb.label) {
    ctx.font = `${Math.max(12, orb.size * 0.4)}px sans-serif`;
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
  if (orb.x <= 0 || orb.x + orb.size >= canvas.width) {
    orb.x = Math.max(0, Math.min(orb.x, canvas.width - orb.size));
    orb.vx *= -1;
  }
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let orb of orbs) {
    const groundY = canvas.height - orb.size - 10;
    if (orb.isEntering) {
      orb.dy += 0.5;
      orb.y += orb.dy;
      if (orb.y + orb.size >= groundY) {
        orb.y = groundY;
        orb.dy = -orb.dy * 0.5;
        orb.bounceCount++;
        if ((orb.entryType === 'drop' && orb.bounceCount > 1) || (orb.entryType === 'toss' && orb.bounceCount > 2)) {
          orb.y = groundY;
          orb.dy = 0;
          orb.isEntering = false;
          orb.shrinking = true;
          orb.moveTimer = Math.floor(Math.random() * 90 + 30);
        }
      }
      if (orb.entryType === 'toss') {
        orb.x += orb.dx;
        if (orb.x <= 0 || orb.x + orb.size >= canvas.width) orb.dx *= -1;
      }
    } else {
      updateMovement(orb);
    }
    if (orb.shrinking && orb.size > orb.targetSize) {
      orb.size -= (orb.size - orb.targetSize) * 0.1;
      if (Math.abs(orb.size - orb.targetSize) < 0.5) {
        orb.size = orb.targetSize;
        orb.shrinking = false;
      }
      orb.y = canvas.height - orb.size - 10 - orb.ringWidth / 2;
    }
    drawRoundedImage(orb.img, orb.x, orb.y, orb.size);
    drawEffect(orb);
  }
  requestAnimationFrame(animate);
}

function updateOrbList() {
  const orbList = document.getElementById('orbList');
  if (!orbList) return;
  orbList.innerHTML = '';
  // Create grid header
  const header = document.createElement('div');
  header.className = 'orb-row orb-header';
  header.innerHTML = '<span>Image</span><span>Label</span><span>Role</span><span>Icon</span><span>Color</span><span>Ring</span><span>Size</span><span>Remove</span>';
  orbList.appendChild(header);
  // Create grid rows
  orbs.forEach((orb, i) => {
    const row = document.createElement('div');
    row.className = 'orb-row';
    // Image URL
    const input = document.createElement('input');
    input.value = orb.img.src;
    input.onchange = () => orb.img.src = input.value;
    // Label
    const labelInput = document.createElement('input');
    labelInput.placeholder = "Label";
    labelInput.value = orb.label || '';
    labelInput.oninput = () => orb.label = labelInput.value;
    // Role
    const roleSelect = document.createElement('select');
    ['none', 'mod', 'lurker', 'passerby'].forEach(role => {
      const option = document.createElement('option');
      option.value = role;
      option.textContent = role.charAt(0).toUpperCase() + role.slice(1);
      if (orb.role === role) option.selected = true;
      roleSelect.appendChild(option);
    });
    roleSelect.onchange = () => orb.role = roleSelect.value;
    // Icon
    const iconInput = document.createElement('input');
    iconInput.placeholder = "Icon";
    iconInput.value = orb.roleIcon || '';
    iconInput.oninput = () => orb.roleIcon = iconInput.value;
    // Color
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = orb.ringColor || '#ffffff';
    colorInput.oninput = () => orb.ringColor = colorInput.value;
    // Ring Width
    const widthInput = document.createElement('input');
    widthInput.type = 'range';
    widthInput.min = 1;
    widthInput.max = 10;
    widthInput.value = orb.ringWidth || 4;
    widthInput.oninput = () => {
      orb.ringWidth = parseInt(widthInput.value);
      orb.y = canvas.height - orb.size - 10 - orb.ringWidth / 2;
    };
    // Size
    const sizeInput = document.createElement('input');
    sizeInput.type = 'range';
    sizeInput.min = 20;
    sizeInput.max = 200;
    sizeInput.value = orb.size || 64;
    sizeInput.oninput = () => {
      orb.size = parseInt(sizeInput.value);
      orb.y = canvas.height - orb.size - 10 - orb.ringWidth / 2;
    };
    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '🗑';
    removeBtn.onclick = () => {
      orbs.splice(i, 1);
      updateOrbList();
    };
    row.appendChild(input);
    row.appendChild(labelInput);
    row.appendChild(roleSelect);
    row.appendChild(iconInput);
    row.appendChild(colorInput);
    row.appendChild(widthInput);
    row.appendChild(sizeInput);
    row.appendChild(removeBtn);
    orbList.appendChild(row);
  });
}

function saveOrbs() {
  const saved = orbs.map(o => ({
    imgSrc: o.img.src,
    entryType: o.entryType,
    role: o.role,
    label: o.label,
    ringColor: o.ringColor,
    ringWidth: o.ringWidth,
    roleIcon: o.roleIcon,
    size: o.size
  }));
  localStorage.setItem('orbData', JSON.stringify(saved));
}

function loadOrbs() {
  const data = JSON.parse(localStorage.getItem('orbData') || '[]');
  orbs.length = 0;
  data.forEach(o => addOrb(o));
  updateOrbList();
}

window.addEventListener('DOMContentLoaded', () => {
  updateCanvasBackground();
  applyAspectRatio();
  loadOrbs();
  updateOrbList();
  animate();

  document.getElementById('saveOrbsBtn')?.addEventListener('click', saveOrbs);
  document.getElementById('loadOrbsBtn')?.addEventListener('click', loadOrbs);
  document.getElementById('clearOrbsBtn')?.addEventListener('click', () => {
    orbs.length = 0;
    updateOrbList();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    localStorage.setItem('orbData', '[]');
  });
  document.getElementById('addOrbBtn')?.addEventListener('click', () => {
    const url = prompt('Enter orb image URL:');
    if (!url) return;
    addOrb({ imgSrc: url });
  });

  // Remove aspect ratio dropdown if present
  const aspectDropdown = document.getElementById('aspectRatio');
  if (aspectDropdown) aspectDropdown.remove();
});
