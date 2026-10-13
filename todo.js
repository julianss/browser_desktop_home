// Today's plan: the data -> HTML logic for the Today's plan widget.
//
// The plan is ~/bodhium/.claude/standup/suggested-todo.json, written every
// morning by /check-in and served verbatim by the feeds service's GET
// /api/todo (or the empty shape {date:null, items:[], weekly_goals:null,
// yesterday_summary:null} when there is no file). Ported from Command Center's
// loadTodo / todoItemHTML / todoTopicLabelHTML in command-center-server.py.
//
// The file is authored by /check-in only. Checkbox state is local to the
// widget (todo-widget.js keeps it in localStorage, keyed by date + text) and
// is never written back.
//
// Every string from the file goes through esc() / escA() (shared with
// boards.js) before it is part of the HTML; only http(s) links become hrefs.
//
// Pure: no DOM, no fetch, no clock. Callers pass `today` (YYYY-MM-DD, local).
(function (root) {
  'use strict';

  const B = root.FeedsBoards || require('./boards.js');
  const { esc, escA, safeUrl } = B;

  const EMPTY_MESSAGE = 'Nothing drafted yet -- /check-in writes this each morning.';

  function isObj(x) { return !!x && typeof x === 'object'; }
  function itemText(x) { return isObj(x) ? (x.text || '') : String(x == null ? '' : x); }

  // The localStorage key for one item's checkbox: the same text on another
  // day's plan is a different item.
  function todoCheckKey(date, text) { return String(date || '') + '|' + text; }

  function anchor(url, inner) {
    return '<a href="' + escA(safeUrl(url)) + '" target="_blank" rel="noopener">' + inner + '</a>';
  }

  function todoItemHTML(x) {
    // x is either a plain string or {topic,text,links:[{text,url}]}. Done items are
    // simply never written to suggested-todo.json — there is no "done" flag to render.
    // (The widget still honours a `done: true` as the checkbox's initial state.)
    let out = esc(itemText(x));
    if (isObj(x) && x.links && x.links.length) {
      x.links.forEach(function (l) {
        if (!l || !l.text || !l.url) return;
        const needle = esc(l.text);
        out = out.split(needle).join(anchor(l.url, needle));
      });
    }
    return out;
  }

  function todoTopicLabelHTML(topic, group) {
    let url = null;
    group.forEach(function (x) { if (!url && isObj(x) && x.topicUrl) url = x.topicUrl; });
    const label = esc(topic);
    return url ? anchor(url, label) : label;
  }

  // items are either plain strings (older suggested-todo.json) or {topic,text,done,links}
  // objects grouped by topic in the order topics first appear.
  function todoGroups(items) {
    const topics = [], byTopic = {};
    (items || []).forEach(function (x) {
      const topic = isObj(x) ? (x.topic || 'Other') : '__flat__';
      if (!byTopic[topic]) { byTopic[topic] = []; topics.push(topic); }
      byTopic[topic].push(x);
    });
    return topics.map(function (t) { return { topic: t, items: byTopic[t] }; });
  }

  function todoLiHTML(x, date, checks) {
    const key = todoCheckKey(date, itemText(x));
    const on = Object.prototype.hasOwnProperty.call(checks, key) ? !!checks[key] : !!(isObj(x) && x.done);
    return '<li class="todo-item' + (on ? ' done' : '') + '"><label><input type="checkbox" data-todo-key="' +
      escA(key) + '"' + (on ? ' checked' : '') + '> <span>' + todoItemHTML(x) + '</span></label></li>';
  }

  function todoStale(t, today) { return !!(t && t.date && today && t.date !== today); }

  // The whole widget body for one GET result. `res` is {down:true},
  // {httpError:'...'} or {data: payload}; opts is {today, checks}.
  function todoHtml(res, opts) {
    opts = opts || {};
    const checks = opts.checks || {};
    let head = '<div class="board-head"><span class="board-name">Today\'s plan</span>';
    let body = '';
    if (!res || res.down) {
      body = '<div class="board-state board-down">' + esc(B.DOWN_MESSAGE) + '</div>';
    } else if (res.httpError) {
      body = '<div class="board-state board-error">' + esc(res.httpError) + '</div>';
    } else {
      const t = res.data || {};
      if (t.date) head += '<span class="board-muted todo-date">(' + esc(t.date) + ')</span>';
      // /check-in did not run today: yesterday's plan is still useful, but say so.
      if (todoStale(t, opts.today)) {
        head += '<span class="badge warn todo-stale" title="suggested-todo.json is not from today">stale</span>';
      }
      if (t.yesterday_summary && t.yesterday_summary.text) {
        body += '<div class="todo-section board-muted">📋 <b>Yesterday</b> (' + esc(t.yesterday_summary.date || '') +
          ')<br>' + esc(t.yesterday_summary.text) + '</div>';
      }
      const wg = t.weekly_goals;
      if (wg && wg.items && wg.items.length) {
        body += '<div class="todo-section board-muted">🎯 <b>Weekly goals</b> (posted ' + esc(wg.posted || '') +
          ', week of ' + esc(wg.week_of || '') + ')</div>';
        body += '<ul class="todo-goals">' + wg.items.map(function (g) { return '<li>' + esc(g) + '</li>'; }).join('') + '</ul>';
      }
      if (t.items && t.items.length) {
        const groups = todoGroups(t.items);
        const li = function (x) { return todoLiHTML(x, t.date, checks); };
        if (groups.length === 1 && groups[0].topic === '__flat__') {
          body += '<ul class="todo-list">' + groups[0].items.map(li).join('') + '</ul>';
        } else {
          body += groups.map(function (g) {
            const label = g.topic === '__flat__' ? 'Other' : g.topic;
            return '<div class="todo-group"><div class="todo-topic">' + todoTopicLabelHTML(label, g.items) + '</div>' +
              '<ul class="todo-list">' + g.items.map(li).join('') + '</ul></div>';
          }).join('');
        }
      } else if (!body) {
        body = '<div class="board-muted board-empty">' + esc(EMPTY_MESSAGE) + '</div>';
      }
    }
    head += '<button class="board-refresh" data-action="refresh" title="Refresh">↻</button></div>';
    return head + '<div class="board-body">' + body + '</div>';
  }

  const api = { EMPTY_MESSAGE, todoCheckKey, todoItemHTML, todoTopicLabelHTML, todoGroups, todoStale, todoHtml };
  root.FeedsTodo = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
