// FILE: admin.js — Updated to wire SoundManager + OrbManager

import { initializeSoundPanel } from './soundManager.js';
import { OrbManager } from './orbManager.js';

document.addEventListener('DOMContentLoaded', () => {
  const orbManager = new OrbManager('bouncerCanvas', 'orbList');
  const fileInput = document.getElementById('fileInput');

  document.getElementById('addOrbBtn')?.addEventListener('click', () => fileInput.click());
  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) orbManager.addOrbFromFile(file);
  });

  initializeSoundPanel();
});