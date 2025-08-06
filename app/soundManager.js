// soundManager.js — Complete original code restored for ES module use

const soundTriggers = [];
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const activeGIFs = [];
const playingAudioMap = new Map();

function showSoundStatus(message, isError = false) {
  const status = document.createElement('div');
  status.textContent = message;
  status.style.color = isError ? 'red' : 'lime';
  status.style.marginBottom = '5px';
  document.getElementById('soundboard').prepend(status);

  setTimeout(() => {
    status.style.transition = 'opacity 0.5s ease';
    status.style.opacity = '0';
    setTimeout(() => status.remove(), 500);
  }, 2500);
}

function stopAllSounds() {
  playingAudioMap.forEach(audio => audio.pause());
  playingAudioMap.clear();
}

function createSoundButton(trigger) {
  const container = document.createElement('div');
  container.style.display = 'grid';
  container.style.gridTemplateColumns = '1fr 2fr 2fr 1fr 1fr 1fr auto auto';
  container.style.gap = '8px';

  const label = document.createElement('input');
  label.placeholder = 'Label';
  label.value = trigger.label;
  label.oninput = () => {
    trigger.label = label.value;
    saveTriggers();
  };

  const removeBtn = document.createElement('button');
  removeBtn.textContent = '🗑 Remove';
  removeBtn.onclick = () => {
    const index = soundTriggers.indexOf(trigger);
    if (index !== -1) {
      if (trigger._gifObjectUrl) URL.revokeObjectURL(trigger._gifObjectUrl);
      if (trigger._objectUrl) URL.revokeObjectURL(trigger._objectUrl);
      soundTriggers.splice(index, 1);
      updateSoundPanel();
      saveTriggers();
    }
  };

  const audioInput = document.createElement('input');
  audioInput.type = 'file';
  audioInput.accept = 'audio/*';
  audioInput.title = trigger.label || 'Upload audio';
  audioInput.addEventListener('change', () => {
    const file = audioInput.files[0];
    if (file) {
      trigger._file = file;
      trigger.soundUrl = file.name;
      trigger._objectUrl = URL.createObjectURL(file);
      audioInput.value = '';
      saveTriggers();
      showSoundStatus(`✅ Loaded ${file.name}`);
    }
  });

  const gifFileInput = document.createElement('input');
  gifFileInput.type = 'file';
  gifFileInput.accept = 'image/gif';
  gifFileInput.title = 'Upload GIF';
  gifFileInput.addEventListener('change', () => {
    const file = gifFileInput.files[0];
    if (file) {
      trigger._gifFile = file;
      trigger.gifUrl = file.name;
      trigger._gifObjectUrl = URL.createObjectURL(file);
      gifFileInput.value = '';
      saveTriggers();
      showSoundStatus(`✅ Loaded GIF ${file.name}`);
    }
  });

  const keyInput = document.createElement('button');
  keyInput.textContent = trigger.keyCombo || '🎹 Set Key Combo';
  keyInput.addEventListener('click', () => {
    keyInput.textContent = 'Listening... Press combo';
    const keyListener = (e) => {
      e.preventDefault();
      if (['Shift', 'Control', 'Alt'].includes(e.key)) return;
      const parts = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
      const lastPart = parts[parts.length - 1];
      if (!lastPart || ['Shift', 'Ctrl', 'Alt'].includes(lastPart)) {
        showSoundStatus("❌ Invalid key combo. Try again.", true);
        keyInput.textContent = trigger.keyCombo || '🎹 Set Key Combo';
        document.removeEventListener('keydown', keyListener, true);
        return;
      }
      const combo = parts.join('+');
      const conflict = soundTriggers.find(t => t !== trigger && t.keyCombo === combo);
      if (conflict) showSoundStatus(`⚠️ Key combo already used by "${conflict.label || 'unnamed'}"`, true);
      trigger.keyCombo = combo;
      keyInput.textContent = `🎹 ${combo}`;
      saveTriggers();
      showSoundStatus(`✅ Set key combo: ${combo}`);
      document.removeEventListener('keydown', keyListener, true);
    };
    document.addEventListener('keydown', keyListener, true);
  });

  const volume = createVolumeSlider(trigger);
  const gifPos = createGifPositionSelector(trigger);
  const previewBtn = document.createElement('button');
  previewBtn.textContent = '▶ Preview';
  previewBtn.onclick = () => playSoundAndGif(trigger);

  container.append(label, audioInput, gifFileInput, volume, gifPos, keyInput, previewBtn, removeBtn);
  container.style.border = '1px solid #444';
  container.style.margin = '5px 0'; container.style.padding = '5px';
  document.getElementById('soundList').append(container);
}

function saveTriggers() {
  localStorage.setItem('soundTriggers', JSON.stringify(soundTriggers));
}

function createVolumeSlider(trigger) {
  const slider = document.createElement('input');
  slider.type = 'range'; slider.min = 0; slider.max = 1;
  slider.step = 0.01; slider.value = trigger.volume ?? 1;
  slider.title = 'Volume';
  slider.oninput = () => {
    trigger.volume = parseFloat(slider.value);
    saveTriggers();
  };
  return slider;
}

function createGifPositionSelector(trigger) {
  const select = document.createElement('select');
  ['bottom-left','bottom-right','top-left','top-right','center'].forEach(pos => {
    const opt = document.createElement('option');
    opt.value = pos; opt.textContent = pos;
    if (trigger.gifPosition === pos) opt.selected = true;
    select.appendChild(opt);
  });
  select.onchange = () => {
    trigger.gifPosition = select.value;
    saveTriggers();
  };
  return select;
}

function applyGifPosition(img, position) {
  if (activeGIFs.length > 0) {
    showSoundStatus("⏳ GIF already active", true); return;
  }
  img.style.position = 'absolute'; img.classList.add('bounce');
  img.style.bottom = img.style.top = img.style.left = img.style.right = img.style.transform = '';
  switch (position) {
    case 'bottom-left': img.style.bottom = '10px'; img.style.left = '10px'; break;
    case 'bottom-right': img.style.bottom = '10px'; img.style.right = '10px'; break;
    case 'top-left': img.style.top = '10px'; img.style.left = '10px'; break;
    case 'top-right': img.style.top = '10px'; img.style.right = '10px'; break;
    case 'center': img.style.top = '50%'; img.style.left = '50%'; img.style.transform = 'translate(-50%, -50%)'; break;
  }
}

function updateSoundPanel() {
  const list = document.getElementById('soundList'); if (!list) return;
  list.innerHTML = '';
  const header = document.createElement('div');
  header.style.display = 'grid';
  header.style.gridTemplateColumns = '1fr 2fr 2fr 1fr 1fr 1fr auto auto';
  header.style.fontWeight = 'bold'; header.style.padding = '5px 10px';
  header.style.gap = '8px'; header.style.color = '#ccc';
  ['Label','Sound URL','GIF URL','Volume','Position','Key','',''].forEach(text => {
    const span = document.createElement('div'); span.textContent = text; header.appendChild(span);
  });
  list.appendChild(header); soundTriggers.forEach(createSoundButton);
}

function playSoundAndGif(trigger) {
  trigger._lastPlayed = trigger._lastPlayed || 0;
  const now = Date.now();
  if (now - trigger._lastPlayed < 500) return;
  trigger._lastPlayed = now;

  const existing = playingAudioMap.get(trigger);
  if (existing && !existing.ended && !existing.paused && !existing.seeking) {
    if (!existing._startTime || now - existing._startTime < 10000) {
      showSoundStatus("⏳ Sound already playing", true); return;
    }
  }

  if (!trigger.keyCombo) showSoundStatus("⚠️ Trigger has no key binding", true);

  const audio = new Audio();
  audio.volume = trigger.volume ?? 1;
  if (trigger._objectUrl) {
    const source = document.createElement('source');
    source.src = trigger._objectUrl;
    source.type = trigger._file?.type || 'audio/mpeg';
    audio.appendChild(source);
    audio.load();
  } else if (isAudioUrlValid(trigger.soundUrl)) {
    audio.src = trigger.soundUrl;
  } else {
    showSoundStatus("❌ Invalid audio URL", true); return;
  }

  playingAudioMap.set(trigger, audio);
  audio._startTime = Date.now();

  audio.play().then(() => {
    showSoundStatus("🔊 Playing sound");
    audio.onended = () => playingAudioMap.delete(trigger);
    audio.onerror = () => {
      playingAudioMap.delete(trigger);
      showSoundStatus("❌ Audio playback error", true);
    };
    setTimeout(() => {
      if (playingAudioMap.get(trigger) === audio) playingAudioMap.delete(trigger);
    }, 10000);
  }).catch(err => {
    console.error("Audio play failed:", err);
    playingAudioMap.delete(trigger);
    showSoundStatus("❌ Failed to play audio: " + err.message, true);
  });

  if (trigger._gifObjectUrl) {
    if (activeGIFs.length > 0) return;
    const stage = document.getElementById('stage'); if (!stage) return;
    const img = document.createElement('img'); img.src = trigger._gifObjectUrl;
    img.style.position = 'absolute'; img.style.zIndex = 1000;
    img.style.maxHeight = '200px'; img.style.pointerEvents = 'none';
    img.style.opacity = '1'; img.style.transition = 'opacity 0.5s ease';
    applyGifPosition(img, trigger.gifPosition || 'bottom-left');
    stage.appendChild(img); activeGIFs.push(img);
    setTimeout(() => {
      img.style.opacity = '0'; setTimeout(() => {
        img.remove(); const i = activeGIFs.indexOf(img);
        if (i !== -1) activeGIFs.splice(i, 1);
      }, 500);
    }, 3500);
  }
}

function parseKeyCombo(comboStr) {
  if (!comboStr) return {};
  const parts = comboStr.toLowerCase().split('+');
  return {
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    ctrl: parts.includes('ctrl'),
    key: parts.find(p => !['shift', 'alt', 'ctrl'].includes(p))
  };
}

function isAudioUrlValid(url) {
  return /\.(mp3|wav|ogg|aac|m4a|webm)(\?.*)?$/.test(url);
}

document.addEventListener('keydown', (e) => {
  if (document.activeElement?.tagName === 'BUTTON' && document.activeElement.textContent.includes('Listening')) return;
  soundTriggers.forEach(trigger => {
    const combo = parseKeyCombo(trigger.keyCombo);
    if ((!combo.shift || e.shiftKey) && (!combo.alt || e.altKey) &&
        (!combo.ctrl || e.ctrlKey) && e.key.toLowerCase() === combo.key?.toLowerCase()) {
      playSoundAndGif(trigger);
    }
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('soundTriggers');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      soundTriggers.push(...parsed);
    } catch (e) {
      console.warn("Failed to load saved triggers:", e);
    }
  }
  updateSoundPanel();
});

document.getElementById('addSoundBtn')?.addEventListener('click', () => {
  soundTriggers.push({ label: '', soundUrl: '', gifUrl: '', keyCombo: '', volume: 1, gifPosition: 'bottom-left' });
  updateSoundPanel(); saveTriggers(); showSoundStatus("✅ Added new sound trigger");
});

document.getElementById('stopAllBtn')?.addEventListener('click', stopAllSounds);

// Required for ES Module
export {};