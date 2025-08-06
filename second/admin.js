// admin.js

let orbs = [];

function updateCanvasBackground() {
  const canvas = document.getElementById("bouncerCanvas");
  const colorPicker = document.getElementById("bgColorPicker");
  if (canvas && colorPicker) {
    canvas.style.backgroundColor = colorPicker.value;
  }
}

function applyAspectRatio() {
  const canvas = document.getElementById("bouncerCanvas");
  const setting = document.getElementById("aspectRatio")?.value;
  if (!canvas || !setting) return;

  let targetHeight = canvas.height || 720; // <-- fix here
  let targetWidth = setting === "16:9"
    ? Math.floor(targetHeight * 16 / 9)
    : Math.floor(targetHeight * 9 / 16);

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  canvas.style.width = targetWidth + "px";
  canvas.style.height = targetHeight + "px";

  drawOrbs();
}

function addOrb(imgSrc, entry = "drop") {
  const canvas = document.getElementById("bouncerCanvas");
  if (!canvas) return;

  const radius = 32;
  const x = Math.random() * canvas.width;
  const y = canvas.height - 100;
  const dx = Math.random() * 2 - 1;
  const dy = Math.random() * -2;

  const orb = new Orb(x, y, radius, dx, dy, imgSrc);

  orb.ringColor = "#ffffff";
  orb.ringWidth = 4;
  orb.role = "none";
  orb.roleIcon = "";
  orb.label = "";
  orb.entry = entry;

  // ✅ Add orb now (not inside onload)
  orbs.push(orb);

  if (orb.img.complete) {
    drawOrbs();
    updateOrbList();
  } else {
    orb.img.onload = () => {
      drawOrbs();
      updateOrbList();
    };
  }
}


function drawOrbs() {
  const canvas = document.getElementById("bouncerCanvas");
  const ctx = canvas?.getContext("2d");

  if (!canvas || !ctx) {
    console.error("❌ drawOrbs: canvas or context missing.");
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  console.log("🎨 Drawing", orbs.length, "orbs");

  for (const orb of orbs) {
    console.log("🟢 Orb:", {
      x: orb.x,
      y: orb.y,
      size: orb.radius * 2,
      loaded: orb.img.complete,
    });

    if (!orb.img.complete) {
      console.warn("⏳ Image not fully loaded for orb.");
      continue;
    }

    ctx.save();

    // Draw ring
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.radius / 2 + orb.ringWidth, 0, Math.PI * 2);
    ctx.strokeStyle = orb.ringColor;
    ctx.lineWidth = orb.ringWidth;
    ctx.stroke();

    // Draw image
    ctx.drawImage(
      orb.img,
      orb.x - orb.radius,
      orb.y - orb.radius,
      orb.radius * 2,
      orb.radius * 2
    );

    ctx.restore();
  }
}

function updateOrbList() {
  const list = document.getElementById("orbList");
  if (!list) return;
  list.innerHTML = "";

  orbs.forEach((orb, index) => {
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
      orbs.splice(index, 1);
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

function saveOrbs() {
  const orbData = orbs.map(o => ({
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
}

function syncOrbsFromStorage() {
  const stored = localStorage.getItem("orbData");
  if (!stored) {
    orbs = [];
    updateOrbList();
    drawOrbs();
    return;
  }

  const data = JSON.parse(stored);
  orbs = [];

  for (const o of data) {
    const orb = new Orb(o.x, o.y, o.radius, o.dx, o.dy, o.imgSrc);
    orb.ringWidth = o.ringWidth;
    orb.ringColor = o.ringColor;
    orb.role = o.role;
    orb.roleIcon = o.roleIcon;
    orb.label = o.label;
    orb.entry = o.entry;

    orb.img.onload = () => {
      drawOrbs();
      updateOrbList();
    };

    orbs.push(orb);
  }

  drawOrbs();
  updateOrbList();
}

function loadOrbs() {
  const stored = localStorage.getItem("orbData");
  if (!stored) return;
  const data = JSON.parse(stored);
  orbs = [];

  for (const o of data) {
    const orb = new Orb(o.x, o.y, o.radius, o.dx, o.dy, o.imgSrc);
    orb.ringWidth = o.ringWidth;
    orb.ringColor = o.ringColor;
    orb.role = o.role;
    orb.roleIcon = o.roleIcon;
    orb.label = o.label;
    orb.entry = o.entry;

    orb.img.onload = () => {
      drawOrbs();
      updateOrbList(); // ✅ ensures UI updates when images are ready
    };

    orbs.push(orb);
  }

  updateOrbList(); // ✅ this ensures the controls render even if images load slowly
  drawOrbs();
  console.log("📂 Orbs loaded from localStorage");
}

window.addEventListener("DOMContentLoaded", () => {
  updateCanvasBackground();
  applyAspectRatio();
  syncOrbsFromStorage();
  updateOrbList();
  drawOrbs();

  document.getElementById("addOrbBtn")?.addEventListener("click", () => {
    const input = document.getElementById("imageUrlInput");
    const confirm = document.getElementById("confirmOrbBtn");

    input.style.display = "inline-block";
    confirm.style.display = "inline-block";
    input.focus();

    confirm.onclick = () => {
      const url = input.value.trim();
      if (url) addOrb(url);
      input.value = "";
      input.style.display = "none";
      confirm.style.display = "none";
    };
  });

  document.getElementById("saveOrbsBtn")?.addEventListener("click", saveOrbs);

  document.getElementById("loadOrbsBtn")?.addEventListener("click", () => {
    syncOrbsFromStorage();
    updateOrbList();
    drawOrbs();
  });

  document.getElementById("clearOrbsBtn")?.addEventListener("click", () => {
    localStorage.removeItem("orbData");
    orbs = [];
    // Defensive cleanup of async image events
    // (optional, depending on how Orb class works)
    // orbs.forEach(o => o.img.onload = null);

    const canvas = document.getElementById("bouncerCanvas");
    const ctx = canvas?.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

    updateOrbList();  // Wipe the UI
    drawOrbs();       // Wipe the canvas visuals again (double-confirm)

    const status = document.createElement('div');
    status.textContent = "🧹 Cleared all orbs";
    status.style.color = "orange";
    status.style.marginBottom = "5px";
    document.getElementById("orbList").prepend(status);
    setTimeout(() => status.remove(), 2000);
  });

});

// Export functions for global use
window.addOrb = addOrb;
window.drawOrbs = drawOrbs;
window.orbs = orbs;
window.updateOrbList = updateOrbList;
