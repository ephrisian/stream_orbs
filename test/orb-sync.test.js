const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');
const { BroadcastChannel } = require('node:worker_threads');

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
  const window = {
    document,
    location: { href: url },
    requestAnimationFrame: () => {},
    Image: class { constructor() { this.src = ''; } },
    BroadcastChannel,
    localStorage: {
      store: {},
      getItem(k) { return this.store[k] || null; },
      setItem(k, v) { this.store[k] = String(v); },
      removeItem(k) { delete this.store[k]; }
    }
  };
  window.window = window;
  const context = { window, document, location: window.location, console, BroadcastChannel, Image: window.Image, localStorage: window.localStorage, requestAnimationFrame: window.requestAnimationFrame };
  return { context, window };
}

const sharedCode = fs.readFileSync(require('node:path').join(__dirname, '..', 'shared.js'), 'utf8');

function runShared(env) {
  vm.runInNewContext(sharedCode, env.context);
}

function wait(ms = 20) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

test('stage can request sync from admin', async () => {
  const admin = createEnv('https://example.com/admin.html', false);
  runShared(admin);
  admin.context.addOrb('sync.png');

  const stage = createEnv('https://example.com/stage.html', true);
  runShared(stage);

  stage.context.window.requestOrbSync();
  await wait();
  assert.equal(stage.context.window.orbs.length, 1);
  assert.equal(stage.context.window.orbs[0].img.src, 'sync.png');
  admin.window.channel.close();
  stage.window.channel.close();
});

test('admin updates propagate to stage', async () => {
  const admin = createEnv('https://example.com/admin.html', false);
  runShared(admin);

  const stage = createEnv('https://example.com/stage.html', true);
  runShared(stage);

  admin.context.addOrb('live.png');
  await wait();
  assert.equal(stage.context.window.orbs.length, 1);
  assert.equal(stage.context.window.orbs[0].img.src, 'live.png');
  admin.window.channel.close();
  stage.window.channel.close();
});
