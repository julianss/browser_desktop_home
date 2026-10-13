// One-time, idempotent merge of seed shortcuts (see seeds/) into the desktop.
//
// A seed shortcut is added only if its id is not on the desktop AND not in the
// "seeds applied" record. The record is what makes a deleted icon stay deleted:
// without it, every reload would bring back whatever the user removed.
// Existing shortcuts are never moved or changed, and new ones go in free grid
// cells, never on top of an existing icon.
//
// Pure: no DOM, no storage. index.html does the persisting.
(function (root) {
  'use strict';

  const CELL = 100; // default desktop spacing (see defaultShortcuts)
  const ICON = 48;

  // The box an icon (plus its label and breathing room) takes up.
  function footprint(s) {
    return {
      x: Number(s.x) || 0,
      y: Number(s.y) || 0,
      w: Math.max(Number(s.width) || ICON, ICON) + (CELL - ICON),
      h: Math.max(Number(s.height) || ICON, ICON) + (CELL - ICON),
    };
  }

  function overlaps(a, b) {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  }

  // First grid cell (row-major, `cols` wide) whose box overlaps nothing in `taken`.
  function freeCell(taken, cols) {
    for (let i = 0; ; i++) {
      const cell = { x: (i % cols) * CELL, y: Math.floor(i / cols) * CELL, w: CELL, h: CELL };
      if (!taken.some(t => overlaps(cell, t))) return cell;
    }
  }

  // shortcuts: the current state.shortcuts (not mutated)
  // seed:      { shortcuts: [{ id, name, url, parentId, isFolder, iconDataUrl }] }
  // applied:   ids recorded by earlier merges
  // opts.cols: grid width in cells (index.html derives it from the window)
  //
  // Returns { shortcuts, added, applied, icons } -- `shortcuts` is the existing
  // list (same objects) plus the new ones; `icons` are { id, dataUrl } to store.
  function mergeSeeds(shortcuts, seed, applied, opts) {
    const cols = Math.max(1, Math.floor((opts && opts.cols) || 10));
    const appliedSet = new Set(applied || []);
    const present = new Set(shortcuts.map(s => s.id));
    const out = shortcuts.slice();
    const added = [];
    const icons = [];

    const fresh = seed.shortcuts.filter(s => !present.has(s.id) && !appliedSet.has(s.id));
    const freshIds = new Set(fresh.map(s => s.id));

    for (const s of fresh) {
      // A seed whose folder the user deleted (or never got) lands on the desktop.
      const wanted = s.parentId || null;
      const parentId = wanted && (present.has(wanted) || freshIds.has(wanted)) ? wanted : null;
      const taken = out.filter(o => (o.parentId || null) === parentId).map(footprint);
      const cell = freeCell(taken, cols);
      const shortcut = {
        id: s.id,
        name: s.name,
        url: s.isFolder ? '#' : s.url,
        icon: null,
        width: ICON,
        height: ICON,
        x: cell.x,
        y: cell.y,
        isFolder: !!s.isFolder,
        parentId,
      };
      out.push(shortcut);
      added.push(shortcut);
      if (s.iconDataUrl) icons.push({ id: s.id, dataUrl: s.iconDataUrl });
    }

    seed.shortcuts.forEach(s => appliedSet.add(s.id));
    return { shortcuts: out, added, applied: Array.from(appliedSet), icons };
  }

  const api = { mergeSeeds, CELL };
  root.DesktopSeeds = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
