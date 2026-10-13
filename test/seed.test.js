const test = require('node:test');
const assert = require('node:assert/strict');

const { mergeSeeds, CELL } = require('../seed-merge.js');
const seed = require('../seeds/command-center.js');

const seedIds = seed.shortcuts.map(s => s.id);

function deepFreeze(o) {
  Object.values(o).forEach(v => { if (v && typeof v === 'object') deepFreeze(v); });
  return Object.freeze(o);
}

// A lived-in desktop: the app defaults, a moved icon, a big icon, a folder
// with a child, and a custom icon at an off-grid spot.
function existingDesktop() {
  return [
    { id: '1', name: 'Google', url: 'https://google.com', icon: null, width: 48, height: 48, x: 0, y: 0, isFolder: false, parentId: null },
    { id: '2', name: 'X (Twitter)', url: 'https://x.com', icon: null, width: 48, height: 48, x: 100, y: 0, isFolder: false, parentId: null },
    { id: '3', name: 'YouTube', url: 'https://youtube.com', icon: null, width: 48, height: 48, x: 200, y: 0, isFolder: false, parentId: null },
    { id: '4', name: 'GitHub', url: 'https://github.com', icon: null, width: 48, height: 48, x: 0, y: 100, isFolder: false, parentId: null },
    { id: '5', name: 'Reddit', url: 'https://reddit.com', icon: null, width: 120, height: 120, x: 130, y: 110, isFolder: false, parentId: null },
    { id: 'f1', name: 'Work', url: '#', icon: null, width: 48, height: 48, x: 340, y: 20, isFolder: true, parentId: null },
    { id: 'c1', name: 'Docs', url: 'https://docs.example', icon: null, width: 48, height: 48, x: 0, y: 0, isFolder: false, parentId: 'f1' },
  ];
}

function box(s) {
  return { x: s.x, y: s.y, w: Math.max(s.width, 48) + CELL - 48, h: Math.max(s.height, 48) + CELL - 48 };
}

function overlaps(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

test('first merge adds every seed id', () => {
  const r = mergeSeeds(existingDesktop(), seed, [], { cols: 6 });
  assert.deepEqual(r.added.map(s => s.id).sort(), [...seedIds].sort());
  assert.deepEqual([...r.applied].sort(), [...seedIds].sort());
  // Workspace links go in Bodhium, localhost services in Caliper local.
  const byId = new Map(r.shortcuts.map(s => [s.id, s]));
  assert.equal(byId.get('cc:folder:bodhium').isFolder, true);
  assert.equal(byId.get('cc:linear').parentId, 'cc:folder:bodhium');
  assert.equal(byId.get('cc:linear').url, 'https://linear.app/bodhiumlabs');
  assert.equal(byId.get('cc:svc:3001').parentId, 'cc:folder:caliper-local');
  assert.equal(byId.get('cc:svc:8000').name, 'Caliper API');
  assert.equal(byId.get('cc:svc:8001').name, 'ai-traffic API');
});

test('localhost services carry a data-URL icon, public sites do not', () => {
  const r = mergeSeeds([], seed, [], {});
  const iconIds = new Set(r.icons.map(i => i.id));
  for (const s of r.added) {
    if (s.isFolder) continue;
    const host = new URL(s.url).hostname;
    const local = host === 'localhost' || host === '127.0.0.1';
    assert.equal(iconIds.has(s.id), local, s.id);
    assert.equal(s.icon, null, s.id); // blobs go to IndexedDB, never localStorage
  }
  for (const i of r.icons) assert.match(i.dataUrl, /^data:image\/svg\+xml;base64,/);
});

test('second merge adds nothing', () => {
  const first = mergeSeeds(existingDesktop(), seed, [], { cols: 6 });
  const second = mergeSeeds(first.shortcuts, seed, first.applied, { cols: 6 });
  assert.equal(second.added.length, 0);
  assert.equal(second.icons.length, 0);
  assert.deepEqual(second.shortcuts, first.shortcuts);
});

test('a deleted seed id is not re-added', () => {
  const first = mergeSeeds(existingDesktop(), seed, [], { cols: 6 });
  const afterDelete = first.shortcuts.filter(s => s.id !== 'cc:svc:5555' && s.id !== 'cc:linear');
  const r = mergeSeeds(afterDelete, seed, first.applied, { cols: 6 });
  assert.deepEqual(r.added, []);
  assert.ok(!r.shortcuts.some(s => s.id === 'cc:svc:5555' || s.id === 'cc:linear'));
});

test('a deleted seed folder is not re-added, nor are its children', () => {
  const first = mergeSeeds([], seed, [], {});
  const afterDelete = first.shortcuts.filter(s => s.id !== 'cc:folder:caliper-local' && s.parentId !== 'cc:folder:caliper-local');
  const r = mergeSeeds(afterDelete, seed, first.applied, {});
  assert.deepEqual(r.added, []);
});

test('a new seed whose folder was deleted lands on the desktop', () => {
  const first = mergeSeeds([], seed, [], {});
  const afterDelete = first.shortcuts.filter(s => s.id !== 'cc:folder:bodhium' && s.parentId !== 'cc:folder:bodhium');
  const grown = { shortcuts: seed.shortcuts.concat([{ id: 'cc:new', name: 'New', url: 'https://new.example', parentId: 'cc:folder:bodhium', isFolder: false, iconDataUrl: null }]) };
  const r = mergeSeeds(afterDelete, grown, first.applied, {});
  assert.deepEqual(r.added.map(s => s.id), ['cc:new']);
  assert.equal(r.added[0].parentId, null);
});

test('no existing shortcut is moved or changed', () => {
  const before = deepFreeze(existingDesktop()); // throws if the merge mutates
  const snapshot = JSON.parse(JSON.stringify(before));
  const r = mergeSeeds(before, seed, [], { cols: 6 });
  assert.deepEqual(r.shortcuts.slice(0, before.length), snapshot);
  assert.deepEqual(JSON.parse(JSON.stringify(before)), snapshot);
});

test('new icons never overlap occupied slots', () => {
  for (const cols of [1, 3, 6, 19]) {
    const existing = existingDesktop();
    const r = mergeSeeds(existing, seed, [], { cols });
    const parents = new Set(r.shortcuts.map(s => s.parentId || null));
    for (const parent of parents) {
      const siblings = r.shortcuts.filter(s => (s.parentId || null) === parent);
      for (let i = 0; i < siblings.length; i++) {
        for (let j = i + 1; j < siblings.length; j++) {
          const a = siblings[i], b = siblings[j];
          if (!r.added.includes(a) && !r.added.includes(b)) continue;
          assert.ok(!overlaps(box(a), box(b)), `cols=${cols}: ${a.id} overlaps ${b.id}`);
        }
      }
    }
    for (const s of r.added) assert.ok(s.x >= 0 && s.y >= 0 && s.x < cols * CELL, `${s.id} off-grid`);
  }
});

test('127.0.0.1 urls keep their host', () => {
  const r = mergeSeeds([], seed, [], {});
  const byId = new Map(r.added.map(s => [s.id, s]));
  for (const port of [7422, 7424, 7430, 7440]) {
    assert.equal(byId.get('cc:svc:' + port).url, `http://127.0.0.1:${port}/`);
  }
  assert.equal(byId.get('cc:svc:4000').url, 'http://localhost:4000');
});
