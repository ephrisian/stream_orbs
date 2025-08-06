const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function createEnv() {
  const elements = {};
  const document = {
    elements,
    listeners: {},
    getElementById(id) { return this.elements[id] || null; },
    createElement(tag) {
      const el = {
        tagName: tag,
        style: {},
        children: [],
        value: '',
        innerHTML: '',
        textContent: '',
        listeners: {},
        addEventListener(type, cb) { (this.listeners[type] || (this.listeners[type] = [])).push(cb); },
        appendChild(child) { this.children.push(child); },
        prepend(child) { this.children.unshift(child); },
        setAttribute() {},
        remove() {},
        click() { (this.listeners['click'] || []).forEach(cb => cb({})); },
      };
      if (tag === 'canvas') {
        el.width = 405;
        el.height = 720;
        el.getContext = () => ({
          clearRect() {},
          beginPath() {},
          arc() {},
          strokeStyle: '',
          lineWidth: 0,
          stroke() {},
          drawImage() {},
          save() {},
          restore() {},
        });
      }
      return el;
    },
    addEventListener(type, cb) { (this.listeners[type] || (this.listeners[type] = [])).push(cb); },
    dispatchEvent(evt) { (this.listeners[evt.type] || []).forEach(cb => cb(evt)); },
  };

  ['addOrbBtn','saveOrbsBtn','loadOrbsBtn','clearOrbsBtn','addSoundBtn','orbList','soundboard','bouncerCanvas','bgColorPicker','aspectRatio','soundList','stage'].forEach(id => {
    elements[id] = document.createElement(id === 'bouncerCanvas' ? 'canvas' : 'div');
  });
  elements['addOrbBtn'].tagName = 'button';
  elements['saveOrbsBtn'].tagName = 'button';
  elements['loadOrbsBtn'].tagName = 'button';
  elements['clearOrbsBtn'].tagName = 'button';
  elements['addSoundBtn'].tagName = 'button';
  elements['bgColorPicker'].tagName = 'input';
  elements['bgColorPicker'].value = '#00ff00';
  elements['aspectRatio'].tagName = 'select';
  elements['aspectRatio'].value = '16:9';

  const localStorage = {
    store: {},
    getItem(k) { return this.store[k] || null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; },
  };

  class FakeImage {
    constructor() { this._src = ''; this.onload = null; }
    set src(v) { this._src = v; setTimeout(() => this.onload && this.onload(), 0); }
    get src() { return this._src; }
  }

  const context = { document, localStorage, Image: FakeImage, requestAnimationFrame: fn => setTimeout(fn, 0), console, URL: { createObjectURL: () => 'blob:dummy', revokeObjectURL() {} }, prompt: () => 'test.png', AudioContext: class { constructor() {} }, setTimeout, clearTimeout };
  const window = {
    document,
    localStorage,
    requestAnimationFrame: context.requestAnimationFrame,
    Image: FakeImage,
    prompt: context.prompt,
    URL: context.URL,
    AudioContext: context.AudioContext,
    addEventListener: (...args) => document.addEventListener(...args),
    removeEventListener: () => {},
  };
  window.eval = code => vm.runInContext(code, context);
  window.window = window;
  context.window = window;
  return { context, window, document };
}

function loadScripts(env) {
  const dir = path.join(__dirname, '..', 'second');
  const scripts = ['shared.js', 'admin.js', 'sound.js', 'enhancements.js'];
  vm.createContext(env.context);
  for (const name of scripts) {
    const code = fs.readFileSync(path.join(dir, name), 'utf8');
    vm.runInContext(code, env.context);
  }
}

function wait(ms = 10) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

test('index buttons perform actions', async () => {
  const env = createEnv();
  loadScripts(env);
  env.document.dispatchEvent({ type: 'DOMContentLoaded' });
  await wait();

  const { document, window } = env;

  // Add Orb
  document.getElementById('addOrbBtn').click();
  await wait(50);
  assert.equal(window.eval('orbs').length, 1);

  // Save Setup
  document.getElementById('saveOrbsBtn').click();
  assert.ok(window.localStorage.getItem('orbData'));

  // Clear Orbs
  document.getElementById('clearOrbsBtn').click();
  assert.equal(window.eval('orbs').length, 0);
  assert.equal(window.localStorage.getItem('orbData'), null);
  assert.equal(document.getElementById('orbList').children[0].textContent, '🧹 Cleared all orbs');

  // Load Setup
  const sample = [{ x: 10, y: 20, dx: 0, dy: 0, radius: 32, ringWidth: 4, ringColor: '#fff', role: 'none', roleIcon: '', label: '', entry: 'drop', imgSrc: '' }];
  window.localStorage.setItem('orbData', JSON.stringify(sample));
  document.getElementById('loadOrbsBtn').click();
  await wait(50);
  assert.equal(window.eval('orbs').length, 1);

  // Add Sound Trigger
  document.getElementById('addSoundBtn').click();
  assert.equal(window.eval('soundTriggers').length, 1);
});
