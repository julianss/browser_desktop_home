// PR board and Linear board: the data -> HTML logic for the two board widgets.
//
// Both boards read the feeds service (tool-launcher apps/feeds, which serves
// Command Center's /api/pr-board and /api/linear-board shapes). The ordering,
// badge vocabulary and row lines are ported from CC's frontend (pr* / lin*
// functions in command-center-server.py); the comments that explain them came
// along.
//
// Every string from the feeds payload is user content (PR titles, Linear
// titles, author names, error text) and goes through esc() before it is part
// of the HTML, escA() when it lands inside an attribute.
//
// Pure: no DOM, no fetch, no clock. Callers pass `now` (epoch seconds).
// pr-board-widget.js and linear-board-widget.js do the rendering.
(function (root) {
  'use strict';

  // The one place the feeds address lives. Both widgets read it from here.
  const FEEDS_BASE = 'http://127.0.0.1:7426';

  const DOWN_MESSAGE = 'feeds service not running — start it from the tool launcher';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  // esc() for text between tags; escA() for anything landing INSIDE an attribute
  // (the quote is what closes the attribute early).
  function escA(s) { return esc(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

  // Only http(s) links become hrefs: a javascript: URL in a payload must not
  // turn into a clickable script.
  function safeUrl(u) {
    return /^https?:\/\//i.test(String(u || '')) ? String(u) : '#';
  }
  function link(url, text) {
    return '<a href="' + escA(safeUrl(url)) + '" target="_blank" rel="noopener noreferrer">' + text + '</a>';
  }

  function ago(ts, now) {
    if (!ts) return '';
    const m = Math.floor((now - ts) / 60);
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
    if (m < 1440) return Math.floor(m / 60) + 'h ago';
    return Math.floor(m / 1440) + 'd ago';
  }
  function isoTs(iso) { const t = iso ? Date.parse(iso) / 1000 : 0; return isFinite(t) ? t : 0; }

  // The two honest non-data states, shared by both boards. `down` means the
  // fetch itself failed (nothing listening on FEEDS_BASE); an HTTP error or a
  // payload `error` is the service talking, so it is shown as what it said.
  function downHtml() {
    return '<div class="board-state board-down">' + esc(DOWN_MESSAGE) + '</div>';
  }
  function errorHtml(msg) {
    return '<div class="board-state board-error">' + esc(msg) + '</div>';
  }

  // ---- PR board -------------------------------------------------------------

  // CI: statusCheckRollup is null when NOTHING ran, so "unknown" is a real state
  // and reads amber, never as a pass.
  function prCiClass(ci) { return ci === 'passing' ? 'run' : (ci === 'failing' ? 'stop' : 'warn'); }
  // unreviewed / unaddressed review are the two states that need Julian; an
  // addressed review is waiting on someone else, so it reads calm, not amber.
  // "reviewed" here means any human weigh-in — a formal review, an issue comment
  // or an inline reply — see _pr_weigh_ins.
  function prReviewClass(st) {
    if (st === 'addressed review') return 'run';
    if (st === 'unaddressed review') return 'stop';
    return 'warn';
  }

  // Feed order: most recent activity first — the newest mail notification,
  // else GitHub's updatedAt. Mail wins when there is any: updatedAt also moves
  // on bot pushes and label churn, which is not activity worth surfacing.
  function prLastTs(x) {
    return x.last_activity ? x.last_activity : isoTs(x.updatedAt);
  }
  function prTurnSorted(list) {
    return list.slice().sort((a, b) => prLastTs(b) - prLastTs(a));
  }

  const PR_FILTERS = ['all', 'mine', 'review'];
  const PR_FILTER_LABEL = { all: 'all', mine: 'mine', review: 'review requested' };
  // "review requested (Slack)" cards are review requests too.
  function prFiltered(cards, filter) {
    return (cards || []).filter(c => {
      if (filter === 'mine') return c.role === 'my PR';
      if (filter === 'review') return String(c.role || '').indexOf('review requested') === 0;
      return true;
    });
  }

  // What happened, one line per mail notification: "✓ approved · Vinnie · 5m ago".
  const PR_EV_ICON = {
    'approved': '✓', 'changes requested': '✗', 'review requested': '👀', 'commented': '💬',
    'reviewed': '💬', 'merged': '⇄', 'closed': '⊘', 'reopened': '↺', 'pushed': '↑',
    'force-pushed': '↑', 'mentioned you': '@', 'assigned': '●', 'ready for review': '●',
    'converted to draft': '○'
  };
  function prEvLine(a, now) {
    const ev = a.event || a.reason || 'activity';
    return esc(PR_EV_ICON[ev] || '•') + ' ' + esc(ev) + (a.from_name ? ' · ' + esc(a.from_name) : '') +
      ' · ' + esc(ago(a.at, now));
  }

  function prMailState(m) {
    const st = (m && m.state) || 'not_connected';
    if (st === 'connected') return { cls: 'run', text: 'mail connected' };
    if (st === 'needs_reconnect') return { cls: 'stop', text: 'mail needs reconnect' };
    if (st === 'error') return { cls: 'stop', text: 'mail error' };
    return { cls: 'warn', text: 'mail not connected' };
  }

  function prRowHtml(x, now) {
    const act = x.activity || [];
    const hot = x.review_state === 'unaddressed review' || x.review_state === 'unreviewed';
    let h = '<div class="board-row' + (hot ? ' hot' : '') + '">';
    h += '<div class="board-meta">' + link(x.url, esc(x.repo) + '#' + esc(x.number)) +
      ' · ' + esc(x.author) + ' · ' + esc(x.role) + (x.draft ? ' · draft' : '') + '</div>';
    h += '<div class="board-title">' + esc(x.title) + '</div>';
    h += '<div class="board-badges">' +
      '<span class="badge ' + prReviewClass(x.review_state) + '">' + esc(x.review_state) + '</span> ' +
      '<span class="badge ' + prCiClass(x.ci) + '">CI ' + esc(x.ci) + '</span> ' +
      '<span class="board-muted">' + esc(x.approvals || 0) + ' approval' + (x.approvals === 1 ? '' : 's') +
      ' · ' + esc(Math.round(x.age_days || 0)) + 'd old</span></div>';
    h += '<div class="board-activity">' +
      (act.length ? prEvLine(act[0], now) : '<span class="board-muted">no activity yet</span>') + '</div>';
    return h + '</div>';
  }

  // The whole PR widget body for one GET result. `res` is {down:true},
  // {httpError:'...'} or {data: payload}.
  function prBoardHtml(res, opts) {
    const now = opts.now, filter = opts.filter || 'all';
    let head = '<div class="board-head"><span class="board-name">PRs</span>';
    let body = '';
    if (!res || res.down) {
      body = downHtml();
    } else if (res.httpError) {
      body = errorHtml(res.httpError);
    } else {
      const p = res.data || {};
      const mail = prMailState(p.mail);
      head += '<span class="board-muted">' + (p.fetched_at ? esc('fetched ' + ago(p.fetched_at, now)) : 'not fetched yet') + '</span>';
      head += '<span class="badge ' + mail.cls + '"' + (p.mail && p.mail.error ? ' title="' + escA(p.mail.error) + '"' : '') + '>' + esc(mail.text) + '</span>';
      if (p.mail && p.mail.state === 'needs_reconnect') head += link(FEEDS_BASE + '/oauth/google/start', 'reconnect');
      if (p.error) body += errorHtml(p.error);
      const chips = PR_FILTERS.map(f => '<button class="board-chip' + (f === filter ? ' on' : '') +
        '" data-filter="' + f + '">' + esc(PR_FILTER_LABEL[f]) + '</button>').join('');
      body += '<div class="board-chips">' + chips + '</div>';
      const list = prTurnSorted(prFiltered(p.cards, filter));
      body += list.length ? list.map(x => prRowHtml(x, now)).join('') : '<div class="board-muted board-empty">no PRs</div>';
    }
    head += '<button class="board-refresh" data-action="refresh" title="Refresh">↻</button></div>';
    return head + '<div class="board-body">' + body + '</div>';
  }

  // ---- Linear board -----------------------------------------------------------

  const LIN_TYPE_ORDER = ['triage', 'backlog', 'unstarted', 'started', 'completed', 'canceled'];
  const LIN_PRIO_ICON = { 0: '·', 1: '⚠', 2: '▲', 3: '■', 4: '▽' };

  function linClosed(c) { return c.state_type === 'completed' || c.state_type === 'canceled'; }
  function linPrioRank(p) { return p === 0 ? 9 : p; }          // "no priority" sorts last
  // Linear's own column order: workflow type, then the state's position.
  function linStateCmp(a, b) {
    return (LIN_TYPE_ORDER.indexOf(a.state_type) - LIN_TYPE_ORDER.indexOf(b.state_type)) || ((a.state_pos || 0) - (b.state_pos || 0));
  }

  // Open issues grouped by state in Linear's order, urgent first within a state
  // (no priority last), then most recently updated. Closed-this-week is its own
  // list, newest close first; anything closed more than a week before `now`
  // (or with no closedAt) is dropped.
  const LIN_CLOSED_WINDOW = 7 * 86400;
  function linGroups(cards, now) {
    const groups = [], byState = {}, closed = [];
    (cards || []).slice().sort(linStateCmp).forEach(c => {
      if (linClosed(c)) {
        const t = isoTs(c.closedAt);
        if (t && t >= now - LIN_CLOSED_WINDOW) closed.push(c);
        return;
      }
      if (!byState[c.state]) { byState[c.state] = { state: c.state, color: c.state_color, items: [] }; groups.push(byState[c.state]); }
      byState[c.state].items.push(c);
    });
    groups.forEach(g => g.items.sort((a, b) =>
      (linPrioRank(a.priority) - linPrioRank(b.priority)) || (isoTs(b.updatedAt) - isoTs(a.updatedAt))));
    closed.sort((a, b) => isoTs(b.closedAt) - isoTs(a.closedAt));
    return { groups, closed };
  }

  function linPrioBadge(c) {
    const cls = c.priority === 1 ? 'stop' : (c.priority === 2 ? 'warn' : '');
    return '<span class="badge ' + cls + '" title="priority">' + esc(LIN_PRIO_ICON[c.priority] || '·') + ' ' +
      esc(c.priority_label || 'No priority') + '</span>';
  }
  // Linked PRs carry CI / review badges when the PR board has the PR (`open`).
  function linPrHtml(p) {
    const b = p.open ? ' <span class="badge ' + prCiClass(p.ci) + '">CI ' + esc(p.ci) + '</span>' +
      ' <span class="badge ' + prReviewClass(p.review_state) + '">' + esc(p.review_state) + '</span>' +
      (p.approvals > 0 ? ' <span class="board-ok">✓</span>' : '') : '';
    return link(p.url, esc(p.repo) + '#' + esc(p.number)) + b;
  }
  function linRowHtml(c) {
    const reply = c.needs_reply && !linClosed(c);
    let h = '<div class="board-row' + (reply ? ' hot' : '') + '">';
    h += '<div class="board-meta">' + link(c.url, esc(c.identifier)) + ' ' + linPrioBadge(c) +
      (reply ? ' <span class="badge stop">needs reply</span>' : '') + '</div>';
    h += '<div class="board-title">' + esc(c.title) + '</div>';
    if ((c.prs || []).length) h += '<div class="board-prs">' + c.prs.map(linPrHtml).join(' · ') + '</div>';
    return h + '</div>';
  }

  function linBoardHtml(res, opts) {
    const now = opts.now;
    let head = '<div class="board-head"><span class="board-name">Linear</span>';
    let body = '';
    if (!res || res.down) {
      body = downHtml();
    } else if (res.httpError) {
      body = errorHtml(res.httpError);
    } else {
      const p = res.data || {};
      head += '<span class="board-muted">' + (p.fetched_at ? esc('fetched ' + ago(p.fetched_at, now)) : 'not fetched yet') +
        (p.busy ? ' · refreshing…' : '') + '</span>';
      if (p.error) body += errorHtml(p.error);
      const g = linGroups(p.cards, now);
      body += g.groups.map(gr =>
        '<div class="board-group"><div class="board-group-head"><span class="board-dot" style="background:' +
        escA(/^#[0-9a-f]{3,8}$/i.test(gr.color || '') ? gr.color : '#888') + '"></span>' + esc(gr.state) +
        ' <span class="board-muted">' + gr.items.length + '</span></div>' + gr.items.map(linRowHtml).join('') + '</div>'
      ).join('') || '<div class="board-muted board-empty">no open issues</div>';
      if (g.closed.length) {
        body += '<details class="board-closed"' + (opts.closedOpen ? ' open' : '') + '><summary>closed this week (' +
          g.closed.length + ')</summary>' + g.closed.map(linRowHtml).join('') + '</details>';
      }
    }
    head += '<button class="board-refresh" data-action="refresh" title="Refresh">↻</button></div>';
    return head + '<div class="board-body">' + body + '</div>';
  }

  const api = {
    FEEDS_BASE, DOWN_MESSAGE, esc, escA, safeUrl, ago,
    prCiClass, prReviewClass, prLastTs, prTurnSorted, prFiltered, prEvLine, prMailState, prRowHtml, prBoardHtml,
    PR_FILTERS, linClosed, linPrioRank, linStateCmp, linGroups, linPrHtml, linRowHtml, linBoardHtml
  };
  root.FeedsBoards = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
