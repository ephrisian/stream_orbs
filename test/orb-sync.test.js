const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');

function createEnv(url, hasCanvas) {
  const document = {
    elements: {},
    getElementById(id) { return this.elements[id] || null; },
    createElement(tag) { return { tagName: tag, style: {}, appendChild() {}, setAttribute() {}, oninput: null, onchange: null, onclick: null }; },
    get defaultView() { return window; }
  };
  const canvas = hasCanvas ? {
    width: 300,
    height: 300,
    style: {},
    getContext() {
      return {
        clearRect() {}, save() {}, beginPath() {}, arc() {}, closePath() {}, clip() {}, drawImage() {}, restore() {}, stroke() {}, fillText() {}, strokeStyle: '', lineWidth: 0, font: '', textAlign: '', fillStyle: ''
      };
    }
  } : null;
  if (hasCanvas) document.elements['bouncerCanvas'] = canvas;
  let openChannels = [];
  let openTimeouts = [];
  // Mock BroadcastChannel
  class MockBroadcastChannel {
    constructor(name) { this.name = name; openChannels.push(this); }
    postMessage(msg) {}
    close() { openChannels = openChannels.filter(c => c !== this); }
    addEventListener() {}
    removeEventListener() {}
  }
  const window = {
    document,
    location: { href: url },
    requestAnimationFrame: () => {}, // No-op
    Image: class {
      constructor() {
        this.src = '';
        this.onload = null;
        const tid = setTimeout(() => { if (this.onload) this.onload(); }, 0);
        openTimeouts.push(tid);
      }
    },
    BroadcastChannel: MockBroadcastChannel,
    localStorage: {
      store: {},
      getItem(k) { return this.store[k] || null; },
      setItem(k, v) { this.store[k] = String(v); },
      removeItem(k) { delete this.store[k]; }
    }
  };
  window.window = window;
  const context = { window, document, location: window.location, console, BroadcastChannel: window.BroadcastChannel, Image: window.Image, localStorage: window.localStorage, requestAnimationFrame: window.requestAnimationFrame };
  context._cleanup = () => {
    openChannels.forEach(c => c.close());
    openChannels = [];
    openTimeouts.forEach(tid => clearTimeout(tid));
    openTimeouts = [];
  };
  return { context, window };
}

const sharedCode = fs.readFileSync(require('node:path').join(__dirname, '..', 'shared.js'), 'utf8');
function runShared(env) { vm.runInNewContext(sharedCode, env.context); }
function wait(ms = 20) { return new Promise(resolve => setTimeout(resolve, ms)); }

// Only test local orb creation and rendering

test('addOrb creates an orb in local state', async () => {
  const env = createEnv('https://example.com/admin.html', true);
  runShared(env);
  env.context.window.orbs.length = 0;
  env.context.window.localStorage.store = {};

  env.context.window.addOrb('test.png');
  await wait();

  assert.equal(env.context.window.orbs.length, 1, 'Orb should be added');
  assert.equal(env.context.window.orbs[0].img.src, 'test.png', 'Orb image src should match');
  env.context._cleanup?.();
});

test('orb appears on canvas after addOrb', async () => {
  const env = createEnv('https://example.com/admin.html', true);
  runShared(env);
  env.context.window.orbs.length = 0;
  env.context.window.localStorage.store = {};

  // Spy on drawImage
  let drawCalled = false;
  env.context.window.document.elements['bouncerCanvas'].getContext = function() {
    return {
      clearRect() {},
      save() {},
      beginPath() {},
      arc() {},
      closePath() {},
      clip() {},
      drawImage() { drawCalled = true; },
      restore() {},
      stroke() {},
      fillText() {},
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      textAlign: '',
      fillStyle: ''
    };
  };

  // Force image to be loaded
  env.context.window.Image = class {
    constructor() {
      this.src = '';
      this.onload = null;
      const tid = setTimeout(() => { if (this.onload) this.onload(); }, 0);
      openTimeouts.push(tid);
    }
  };

  env.context.window.addOrb('test.png');
  await wait();

  assert.equal(env.context.window.orbs.length, 1, 'Orb should be added');
  assert.ok(drawCalled, 'drawImage should be called to render orb');
  env.context._cleanup?.();
});