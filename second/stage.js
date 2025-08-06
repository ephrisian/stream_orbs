// stage.js — displays only the visuals (orbs + gifs)
(() => {
  // Patch: robust image loading and error handling for Orb
  // This should be in shared.js, but for clarity, add here for now
  function createOrbWithLogging(x, y, radius, dx, dy, imgSrc) {
    const orb = new window.Orb(x, y, radius, dx, dy, imgSrc);
    orb.img.onload = () => {
      orb.imgLoaded = true;
      console.log('✅ Image loaded:', imgSrc);
    };
    orb.img.onerror = (e) => {
      orb.imgLoaded = false;
      console.warn('❌ Failed to load orb image:', imgSrc, e);
      // Optionally, set a placeholder image
      orb.img.src = 'https://via.placeholder.com/64?text=Error';
    };
    return orb;
  }

  function checkOrbsLoaded(orbs) {
    let loadedCount = 0;
    for (const orb of orbs) {
      if (orb.imgLoaded) {
        loadedCount++;
      } else {
        console.error('❌ Orb image not loaded:', orb.img.src);
      }
    }
    if (loadedCount === 0) {
      console.error('❌ No orbs loaded or visible on canvas.');
    } else {
      console.log(`✅ ${loadedCount} orb(s) loaded and ready.`);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('bouncerCanvas');
    const ctx = canvas.getContext('2d');

    canvas.width = 405;
    canvas.height = 720;
    const bgColor = localStorage.getItem('canvasBg') || '#00ff00';
    canvas.style.backgroundColor = bgColor;

    // Use shared Orb class from window
    const Orb = window.Orb;

    // Load saved orb data
    const savedData = JSON.parse(localStorage.getItem('orbData') || '[]');
    const orbs = savedData.map(data => createOrbWithLogging(data.x, data.y, data.radius, data.dx, data.dy, data.imgSrc));

    // Check orbs only when added
    function addOrbAndCheck(x, y, radius, dx, dy, imgSrc) {
      const orb = createOrbWithLogging(x, y, radius, dx, dy, imgSrc);
      orbs.push(orb);
      checkOrbsLoaded(orbs);
    }
    window.addOrbAndCheck = addOrbAndCheck;

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      orbs.forEach(orb => {
        window.ctx = ctx;
        if (typeof orb.update === 'function') {
          orb.update();
        } else if (typeof orb.draw === 'function') {
          orb.draw();
        }
      });
      requestAnimationFrame(animate);
    }

    animate();
  });
})();
