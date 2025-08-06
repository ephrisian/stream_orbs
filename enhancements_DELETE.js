// enhancements.js

// Extend trigger structure:
// { label, soundUrl, gifUrl, keyCombo, volume (0-1), gifPosition }

const defaultGIFPosition = 'bottom-left';

function createVolumeSlider(trigger) {
  const volume = document.createElement('input');
  volume.type = 'range';
  volume.min = 0;
  volume.max = 1;
  volume.step = 0.01;
  volume.value = trigger.volume ?? 1;
  volume.oninput = () => {
    trigger.volume = parseFloat(volume.value);
    saveTriggers();
  };
  return volume;
}

function createGifPositionSelector(trigger) {
  const select = document.createElement('select');
  ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'].forEach(pos => {
    const opt = document.createElement('option');
    opt.value = pos;
    opt.textContent = pos;
    if ((trigger.gifPosition || defaultGIFPosition) === pos) opt.selected = true;
    select.appendChild(opt);
  });

  select.onchange = () => {
    trigger.gifPosition = select.value;
    saveTriggers();
  };

  return select;
}

function applyGifPosition(img, position) {
  const pos = position || defaultGIFPosition;
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
}

function checkForHotkeyClash(combo, currentTrigger) {
  return soundTriggers.some(t => t !== currentTrigger && t.keyCombo === combo);
}

function showClashWarning() {
  showSoundStatus("⚠️ That key combo is already in use.", true);
}
