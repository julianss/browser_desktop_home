/**
 * Board Widget shell
 * The DOM half shared by the PR board and Linear board widgets: a movable,
 * resizable panel per instance, persisted in its own localStorage key, fed by
 * one GET against the feeds service per board type (not per instance).
 *
 * Polls every 60s only while the tab is visible. The HTML comes from the pure
 * functions in boards.js, which escape every payload string.
 */

(function() {
  const POLL_MS = 60000;
  const CONFIG = {
    defaultPosition: { x: 80, y: 80 },
    defaultWidth: 420,
    defaultHeight: 480,
    minWidth: 260,
    minHeight: 160
  };

  /**
   * Define a board widget type.
   * spec: { kind, storageKey, className, path, refreshPath, refreshDelay,
   *         menuId, menuLabel, menuIcon, render(res, inst, nowSeconds), defaults }
   */
  function define(spec) {
    let boards = [];
    let res = null;          // last GET result: {down} | {httpError} | {data}
    let pollTimer = null;
    let busyTimer = null;

    function load() {
      try {
        const saved = localStorage.getItem(spec.storageKey);
        const parsed = saved ? JSON.parse(saved) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error('Failed to load ' + spec.storageKey + ':', e);
        return [];
      }
    }

    function save() {
      try {
        localStorage.setItem(spec.storageKey, JSON.stringify(boards));
      } catch (e) {
        console.error('Failed to save ' + spec.storageKey + ':', e);
      }
    }

    function renderOne(inst) {
      const widget = document.getElementById(spec.kind + '-' + inst.id);
      if (!widget) return;
      const content = widget.querySelector('.board-content');
      const prev = content.querySelector('.board-body');
      const scroll = prev ? prev.scrollTop : 0;
      content.innerHTML = res ? spec.render(res, inst, Date.now() / 1000)
        : '<div class="board-body"><div class="board-state">loading…</div></div>';
      const body = content.querySelector('.board-body');
      if (body) body.scrollTop = scroll;
    }

    function renderAll() { boards.forEach(renderOne); }

    async function fetchBoard() {
      try {
        const r = await fetch(FeedsBoards.FEEDS_BASE + spec.path, { cache: 'no-store' });
        res = r.ok ? { data: await r.json() } : { httpError: 'feeds returned HTTP ' + r.status };
      } catch (e) {
        res = { down: true };
      }
      renderAll();
      // A first load (or a stale cache) kicked a background fetch: pick it up.
      if (res.data && res.data.busy && !busyTimer) {
        busyTimer = setTimeout(() => { busyTimer = null; fetchBoard(); }, 2500);
      }
    }

    async function refresh() {
      // feeds sends no CORS headers on POSTs, so the response is opaque; the
      // re-GET a few seconds later is what shows the result.
      try {
        await fetch(FeedsBoards.FEEDS_BASE + spec.refreshPath, { method: 'POST', mode: 'no-cors' });
      } catch (e) {
        fetchBoard();
        return;
      }
      setTimeout(fetchBoard, spec.refreshDelay);
    }

    function syncPolling() {
      const want = boards.length > 0 && !document.hidden;
      if (want && !pollTimer) {
        pollTimer = setInterval(fetchBoard, POLL_MS);
        fetchBoard();
      } else if (!want && pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    }

    function createWidget(inst) {
      const widget = document.createElement('div');
      widget.id = spec.kind + '-' + inst.id;
      widget.className = 'board-widget ' + spec.className;
      widget.style.left = inst.x + 'px';
      widget.style.top = inst.y + 'px';
      widget.style.width = inst.width + 'px';
      widget.style.height = inst.height + 'px';

      const content = document.createElement('div');
      content.className = 'board-content';
      widget.appendChild(content);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'board-delete';
      deleteBtn.textContent = '×';
      deleteBtn.title = 'Remove board';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeBoard(inst.id);
      });
      widget.appendChild(deleteBtn);

      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'board-resize-handle';
      resizeHandle.title = 'Resize';
      widget.appendChild(resizeHandle);

      document.body.appendChild(widget);

      content.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-filter]');
        if (chip) {
          inst.filter = chip.getAttribute('data-filter');
          save();
          renderOne(inst);
          return;
        }
        if (e.target.closest('[data-action="refresh"]')) refresh();
      });
      // 'toggle' does not bubble; capture it so the closed list stays as left.
      content.addEventListener('toggle', (e) => {
        if (e.target.classList && e.target.classList.contains('board-closed')) {
          inst.closedOpen = e.target.open;
          save();
        }
      }, true);
      // Leave the browser's own menu (open link in new tab, copy link).
      widget.addEventListener('contextmenu', (e) => e.stopPropagation());

      let isDragging = false;
      let dragOffset = { x: 0, y: 0 };
      let isResizing = false;
      let resizeStartPos = { x: 0, y: 0 };
      let resizeStartSize = { width: 0, height: 0 };

      // Drag by the header only: the body scrolls and holds links.
      widget.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        if (!e.target.closest('.board-head') || e.target.closest('a, button')) return;
        isDragging = true;
        dragOffset.x = e.clientX - widget.offsetLeft;
        dragOffset.y = e.clientY - widget.offsetTop;
        e.preventDefault();
        e.stopPropagation();
      });

      resizeHandle.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        isResizing = true;
        resizeStartPos = { x: e.clientX, y: e.clientY };
        resizeStartSize = { width: widget.offsetWidth, height: widget.offsetHeight };
        e.preventDefault();
        e.stopPropagation();
      });

      document.addEventListener('mousemove', (e) => {
        if (isDragging) {
          e.preventDefault();
          inst.x = e.clientX - dragOffset.x;
          inst.y = e.clientY - dragOffset.y;
          widget.style.left = inst.x + 'px';
          widget.style.top = inst.y + 'px';
          save();
        }
        if (isResizing) {
          e.preventDefault();
          inst.width = Math.max(CONFIG.minWidth, resizeStartSize.width + (e.clientX - resizeStartPos.x));
          inst.height = Math.max(CONFIG.minHeight, resizeStartSize.height + (e.clientY - resizeStartPos.y));
          widget.style.width = inst.width + 'px';
          widget.style.height = inst.height + 'px';
          save();
        }
      });

      document.addEventListener('mouseup', () => {
        isDragging = false;
        isResizing = false;
      });

      renderOne(inst);
      return widget;
    }

    function addBoard() {
      const offset = boards.length * 30;
      const inst = Object.assign({
        id: spec.kind + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        x: CONFIG.defaultPosition.x + offset,
        y: CONFIG.defaultPosition.y + offset,
        width: CONFIG.defaultWidth,
        height: CONFIG.defaultHeight
      }, spec.defaults || {});
      boards.push(inst);
      save();
      createWidget(inst);
      syncPolling();
      return inst;
    }

    function removeBoard(id) {
      const widget = document.getElementById(spec.kind + '-' + id);
      if (widget) widget.remove();
      boards = boards.filter(b => b.id !== id);
      save();
      syncPolling();
    }

    function init() {
      boards = load();
      boards.forEach(createWidget);
      document.addEventListener('visibilitychange', syncPolling);
      syncPolling();

      if (typeof ContextMenuService !== 'undefined') {
        ContextMenuService.registerMenuItem({
          id: spec.menuId,
          label: spec.menuLabel,
          icon: spec.menuIcon,
          action: () => addBoard()
        });
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  window.FeedsBoardWidget = { define };
})();
