// admin.js

function updateCanvasBackground() {
  const canvas = document.getElementById("bouncerCanvas");
  const colorPicker = document.getElementById("bgColorPicker");
  if (canvas && colorPicker) {
    canvas.style.backgroundColor = colorPicker.value;
  }
}

function applyAspectRatio() {
  const canvas = document.getElementById("bouncerCanvas");
  if (!canvas) return;
  // Lock to 9:16 aspect ratio (405x720)
  canvas.width = 405;
  canvas.height = 720;
  canvas.style.width = "405px";
  canvas.style.height = "720px";
  drawOrbs();
}

function updateOrbList() {
  const list = document.getElementById("orbList");
  if (!list) return;
  list.innerHTML = "";

  window.orbs.forEach((orb, index) => {
    const row = document.createElement("div");
    row.className = "orbRow";

    const urlInput = document.createElement("input");
    urlInput.value = orb.img.src;
    urlInput.oninput = () => {
      orb.img.src = urlInput.value;
      orb.img.onload = drawOrbs;
    };

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = orb.ringColor;
    colorInput.oninput = () => {
      orb.ringColor = colorInput.value;
      drawOrbs();
    };

    const sizeInput = document.createElement("input");
    sizeInput.type = "range";
    sizeInput.min = 20;
    sizeInput.max = 200;
    sizeInput.value = orb.radius;
    sizeInput.oninput = () => {
      orb.radius = parseInt(sizeInput.value);
      drawOrbs();
    };

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "🗑";
    removeBtn.onclick = () => {
      window.orbs.splice(index, 1);
      updateOrbList();
      drawOrbs();
    };

    row.appendChild(urlInput);
    row.appendChild(colorInput);
    row.appendChild(sizeInput);
    row.appendChild(removeBtn);

    list.appendChild(row);
  });
}

function syncOrbsFromStorage() {
  const stored = localStorage.getItem("orbData");
  window.orbs = [];
  if (!stored) {
    updateOrbList();
    drawOrbs();
    return;
  }
  const data = JSON.parse(stored);
  for (const o of data) {
    window.orbs.push(new Orb({
      imgSrc: o.imgSrc || '',
      entryType: o.entry || 'drop',
      role: o.role || 'none',
      label: o.label || '',
      ringColor: o.ringColor || '#ffffff',
      ringWidth: o.ringWidth || 4,
      roleIcon: o.roleIcon || '',
      size: o.radius || 32
    }));
  }
  drawOrbs();
  updateOrbList();
}

window.addEventListener("DOMContentLoaded", () => {
  // Ensure canvas/context are set globally
  window.canvas = document.getElementById("bouncerCanvas");
  window.ctx = window.canvas?.getContext("2d");

  updateCanvasBackground();
  applyAspectRatio();
  syncOrbsFromStorage();
  updateOrbList();
  drawOrbs();

  // Remove aspect ratio dropdown if present
  const aspectDropdown = document.getElementById("aspectRatio");
  if (aspectDropdown) aspectDropdown.remove();

  document.getElementById("saveOrbsBtn")?.addEventListener("click", () => {
    window.saveOrbs();
    updateOrbList();
    drawOrbs();
  });

  document.getElementById("loadOrbsBtn")?.addEventListener("click", () => {
    window.loadOrbs();
    updateOrbList();
    drawOrbs();
  });

  document.getElementById("clearOrbsBtn")?.addEventListener("click", () => {
    window.clearOrbs();
    updateOrbList();
    drawOrbs();
    const status = document.createElement('div');
    status.textContent = "🧹 Cleared all orbs";
    status.style.color = "orange";
    status.style.marginBottom = "5px";
    document.getElementById("orbList").prepend(status);
    setTimeout(() => status.remove(), 2000);
  });

  document.getElementById("addOrbBtn")?.addEventListener("click", () => {
    const url = prompt("Enter orb image URL:");
    if (!url) return;
    window.addOrb(url, 'drop', 'none', '', '#ffffff', 4, '', 32);
    updateOrbList();
  });

  // Export functions for global use
  window.orbs = window.orbs;
  window.updateOrbList = updateOrbList;
});
