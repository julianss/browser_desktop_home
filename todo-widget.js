/**
 * Today's Plan Widget
 * Command Center's "Today's plan" as a desktop widget: suggested-todo.json
 * (written each morning by /check-in) from the feeds service's /api/todo.
 * Persisted in localStorage 'todoWidgets'.
 *
 * Ticking an item is local to this browser: the state lives in localStorage
 * 'todoChecks' (keyed by plan date + item text) and is never written back --
 * the file is authored by /check-in only.
 */

(function() {
  const CHECKS_KEY = 'todoChecks';

  function loadChecks() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CHECKS_KEY) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  // Keep only the ticks for the plan being ticked: older plans' ticks can
  // never be shown again (the key includes the date), so they would just pile up.
  function saveCheck(key, on) {
    const date = key.slice(0, key.indexOf('|') + 1);
    const checks = {};
    Object.entries(loadChecks()).forEach(([k, v]) => { if (k.indexOf(date) === 0) checks[k] = v; });
    checks[key] = on;
    try {
      localStorage.setItem(CHECKS_KEY, JSON.stringify(checks));
    } catch (e) {
      console.error('Failed to save ' + CHECKS_KEY + ':', e);
    }
  }

  function localToday() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  FeedsBoardWidget.define({
    kind: 'todo-widget',
    storageKey: 'todoWidgets',
    className: 'todo-widget',
    path: '/api/todo',
    // No refreshPath: the file only changes when /check-in runs, so the
    // refresh button just re-reads it.
    menuId: 'add-todo',
    menuLabel: "Add Today's Plan",
    menuIcon: '☑',
    defaults: { width: 380 },
    render: (res) => FeedsTodo.todoHtml(res, { today: localToday(), checks: loadChecks() }),
    onContentClick: (e, inst, rerender) => {
      const box = e.target.closest('input[data-todo-key]');
      if (!box) return false;
      saveCheck(box.getAttribute('data-todo-key'), box.checked);
      rerender();
      return true;
    }
  });
})();
