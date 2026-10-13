// Today's plan -> checklist, yesterday -> sticky note.
//
// The plan is ~/bodhium/.claude/standup/suggested-todo.json, rewritten each
// weekday morning by the daily-todo job (~/bodhium/.claude/bin/daily-todo.sh)
// and served by the feeds service's GET /api/todo, which gives every item a
// stable `id`. A checklist with `feed: 'plan'` and a sticky note with
// `feed: 'yesterday'` are kept in step with it (seeds/daily-plan.js seeds one
// of each). Nothing is written back: ticks live in the checklist's own
// localStorage, like any other checklist.
//
// The merge rule (mergePlan), applied on load, every 5 minutes and on focus:
//   1. Items you added by hand (no planId) are never touched.
//   2. A plan item already on the list keeps its tick and its place. Its text
//      follows the plan only when the plan's wording changes, so an edit of
//      yours survives until the plan rewords that item.
//   3. A plan item not on the list is appended, unticked, in plan order --
//      unless you removed it (x) while this plan date was current.
//   4. A plan-owned item that has left the plan is dropped if unticked. A
//      ticked one stays until the plan's date moves on, then it goes too: a
//      new day's plan replaces the old day's items, done or not.
//
// The yesterday note's text is the plan's yesterday_summary, replaced whole on
// every refresh (the note is read-only while bound).
//
// The merge functions are pure (no DOM, no fetch, no clock); the poller at the
// bottom only runs in a browser.
(function (root) {
  'use strict';

  const PLAN_PATH = '/api/todo';
  const POLL_MS = 5 * 60 * 1000;

  function isObj(x) { return !!x && typeof x === 'object'; }

  // The plan's items as [{ id, text, topic }]. Items without an id (a file
  // written before ids, served by an older feeds) fall back to their text.
  function planItems(data) {
    const items = isObj(data) && Array.isArray(data.items) ? data.items : [];
    const out = [];
    const seen = new Set();
    items.forEach(function (x) {
      const text = String(isObj(x) ? (x.text || '') : (x == null ? '' : x)).trim();
      if (!text) return;
      const id = String(isObj(x) && x.id ? x.id : 'text:' + text);
      if (seen.has(id)) return;
      seen.add(id);
      out.push({ id: id, text: text, topic: isObj(x) && x.topic ? String(x.topic) : '' });
    });
    return out;
  }

  function itemId(planId) { return 'plan_' + planId; }

  // checklist: a checklist instance ({ items, planDate, planDismissed }), not
  // mutated. Returns { items, planDate, planDismissed, changed } -- the fields
  // to assign back -- or null when `data` has no plan date (no file yet, or
  // feeds down: leave the list as it is).
  function mergePlan(checklist, data) {
    if (!isObj(data) || !data.date) return null;
    const date = String(data.date);
    const plan = planItems(data);
    const byId = new Map(plan.map(function (p) { return [p.id, p]; }));
    const newDay = (checklist.planDate || null) !== date;
    const dismissed = new Set(newDay ? [] : (checklist.planDismissed || []));
    const onList = new Set();
    let changed = newDay;

    const items = [];
    (checklist.items || []).forEach(function (it) {
      if (!it.planId) { items.push(it); return; }                  // rule 1
      const p = byId.get(it.planId);
      if (p) {                                                     // rule 2
        onList.add(p.id);
        if (it.planText !== p.text || (it.topic || '') !== p.topic) {
          const next = Object.assign({}, it, { planText: p.text, topic: p.topic });
          if (it.planText !== p.text) next.text = p.text;
          items.push(next);
          changed = true;
        } else {
          items.push(it);
        }
        return;
      }
      if (it.done && !newDay) { items.push(it); return; }          // rule 4
      changed = true;
    });

    plan.forEach(function (p) {                                    // rule 3
      if (onList.has(p.id) || dismissed.has(p.id)) return;
      items.push({ id: itemId(p.id), planId: p.id, text: p.text, planText: p.text, topic: p.topic, done: false });
      changed = true;
    });

    // Only dismissals of items still in this plan are worth keeping.
    const planDismissed = Array.from(dismissed).filter(function (id) { return byId.has(id); });
    if (planDismissed.length !== (checklist.planDismissed || []).length) changed = true;
    return { items: items, planDate: date, planDismissed: planDismissed, changed: changed };
  }

  // The yesterday note's text, or null when the plan has no summary.
  function yesterdayText(data) {
    const y = isObj(data) && isObj(data.yesterday_summary) ? data.yesterday_summary : null;
    if (!y || !y.text) return null;
    return 'Yesterday' + (y.date ? ' (' + y.date + ')' : '') + '\n\n' + String(y.text);
  }

  const api = { PLAN_PATH, POLL_MS, planItems, mergePlan, yesterdayText };
  root.PlanFeed = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  // ---- Browser: poll /api/todo and hand the result to the two widgets -------
  if (typeof document === 'undefined') return;

  let busy = false;
  function refresh() {
    if (busy || !root.FeedsBoards) return;
    busy = true;
    fetch(root.FeedsBoards.FEEDS_BASE + PLAN_PATH, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;
        if (root.ChecklistWidget) root.ChecklistWidget.syncFeed('plan', function (c) { return mergePlan(c, data); });
        const text = yesterdayText(data);
        if (text != null && root.StickyNoteWidget) root.StickyNoteWidget.syncFeed('yesterday', text);
      })
      .catch(function () { /* feeds down: keep what is on screen */ })
      .then(function () { busy = false; });
  }

  // Seed the plan checklist and the yesterday note once (see seeds/daily-plan.js).
  const SEEDS_KEY = 'widgetSeedsApplied';
  function applyWidgetSeeds() {
    const seed = root.DAILY_PLAN_SEED;
    if (!seed || !root.DesktopSeeds || !root.ChecklistWidget || !root.StickyNoteWidget) return;
    let applied = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(SEEDS_KEY) || '[]');
      if (Array.isArray(parsed)) applied = parsed;
    } catch (e) { /* treat as none */ }
    const merge = root.DesktopSeeds.mergeWidgetSeeds;
    const c = merge(root.ChecklistWidget.getChecklists(), seed.checklists, applied);
    c.added.forEach(function (s) { root.ChecklistWidget.addChecklist(s); });
    const n = merge(root.StickyNoteWidget.getNotes(), seed.stickyNotes, c.applied);
    n.added.forEach(function (s) { root.StickyNoteWidget.addNote(s); });
    try { localStorage.setItem(SEEDS_KEY, JSON.stringify(n.applied)); } catch (e) { /* retried next load */ }
  }

  function registerMenu() {
    if (!root.ContextMenuService) return;
    root.ContextMenuService.registerMenuItem({
      id: 'add-plan-checklist',
      label: "Add Today's Plan checklist",
      icon: '☑',
      action: function () { root.ChecklistWidget.addChecklist({ name: "Today's plan", feed: 'plan', width: 420, height: 420 }); refresh(); }
    });
    root.ContextMenuService.registerMenuItem({
      id: 'add-yesterday-note',
      label: 'Add Yesterday note',
      icon: '📋',
      action: function () { root.StickyNoteWidget.addNote({ feed: 'yesterday', width: 340, height: 220, fontSize: 13 }); refresh(); }
    });
  }

  function init() {
    // The retired "Today's plan" feed widget's state (todo-widget.js).
    try { localStorage.removeItem('todoWidgets'); localStorage.removeItem('todoChecks'); } catch (e) { /* ignore */ }
    applyWidgetSeeds();
    registerMenu();
    refresh();
    setInterval(function () { if (!document.hidden) refresh(); }, POLL_MS);
    root.addEventListener('focus', refresh);
  }

  // After the widgets' own DOMContentLoaded init.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 0); });
  } else {
    setTimeout(init, 0);
  }
})(typeof window !== 'undefined' ? window : globalThis);
