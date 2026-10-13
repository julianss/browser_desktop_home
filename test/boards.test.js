const test = require('node:test');
const assert = require('node:assert/strict');

const B = require('../boards.js');

const NOW = Date.parse('2026-10-13T12:00:00Z') / 1000;
const XSS = '<img src=x onerror=alert(1)>';

// Shaped like feeds' GET /api/pr-board: _pr_card's dict plus activity /
// last_activity, the mail block and the webhook block.
function prCard(over) {
  return Object.assign({
    number: 1, title: 'A PR', url: 'https://github.com/bodhiumlabs/bodhium-caliper/pull/1',
    repo: 'bodhium-caliper', author: 'julian', role: 'my PR', draft: false,
    createdAt: '2026-10-10T12:00:00Z', updatedAt: '2026-10-12T12:00:00Z', age_days: 3.0,
    additions: 10, deletions: 2, churn: 12, files: 1, comments_issue: 0, comments_inline: 0,
    comments_total: 0, reviews_total: 0, approvals: 0, branch: 'up to date', ci: 'passing',
    review_state: 'unreviewed', last_commit: '', review_requested_at: '', last_other_weighin: '',
    activity: [], last_activity: 0
  }, over);
}

function prPayload(over) {
  return Object.assign({
    cards: [
      // updatedAt 2d ago, no mail
      prCard({ number: 11, title: 'old update' }),
      // updatedAt 5d ago, but mail activity 1h ago -> newest
      prCard({
        number: 12, title: 'recent mail', role: 'review requested', author: 'vinnie',
        updatedAt: '2026-10-08T12:00:00Z', last_activity: NOW - 3600,
        review_state: 'unaddressed review', ci: 'failing', approvals: 1,
        activity: [{ at: NOW - 3600, event: 'approved', from_name: 'Vinnie', repo: 'bodhiumlabs/bodhium-caliper', number: 12 },
                   { at: NOW - 7200, event: 'commented', from_name: 'Sam' }]
      }),
      // updatedAt 6h ago
      prCard({ number: 13, title: 'slack ask', role: 'review requested (Slack)', author: 'Slack request',
               updatedAt: '2026-10-13T06:00:00Z', ci: 'unknown', review_state: 'addressed review', approvals: 2 })
    ],
    fetched_at: NOW - 120, error: null,
    mail: { state: 'connected', last_checked: NOW - 60, activity: [] },
    webhook: { last_at: null, last_event: '', last_repo: '', count: 0 },
    unmatched_activity: 0
  }, over);
}

// Shaped like feeds' GET /api/linear-board: _lin_card dicts with linked PRs
// already carrying the PR board's badges.
function linCard(over) {
  const id = (over && over.identifier) || 'BOD-1';
  return Object.assign({
    identifier: id, title: 'An issue', url: 'https://linear.app/bodhium/issue/' + id,
    team: 'BOD', role: 'assigned', state: 'Todo', state_type: 'unstarted', state_color: '#e2e2e2',
    state_pos: 1, priority: 3, priority_label: 'Medium', estimate: null, project: '', cycle: '',
    labels: [], assignee: 'Julian', creator: 'Julian', createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-10T00:00:00.000Z', closedAt: '', dueDate: '', age_days: 12,
    comments_total: 0, needs_reply: false, events: [], prs: []
  }, over);
}

function linPayload(over) {
  return Object.assign({
    cards: [
      linCard({ identifier: 'BOD-1', title: 'todo none', priority: 0, priority_label: 'No priority' }),
      linCard({ identifier: 'BOD-2', title: 'todo urgent', priority: 1, priority_label: 'Urgent', needs_reply: true }),
      linCard({ identifier: 'BOD-3', title: 'todo low', priority: 4, priority_label: 'Low' }),
      linCard({ identifier: 'BOD-4', title: 'in progress', state: 'In Progress', state_type: 'started', state_pos: 2,
                priority: 2, priority_label: 'High',
                prs: [{ url: 'https://github.com/bodhiumlabs/ai-traffic/pull/7', repo: 'ai-traffic', number: 7, title: '',
                        open: true, ci: 'failing', review_state: 'unaddressed review', approvals: 0 },
                      { url: 'https://github.com/bodhiumlabs/ai-traffic/pull/3', repo: 'ai-traffic', number: 3, title: '', open: false }] }),
      linCard({ identifier: 'BOD-5', title: 'backlog item', state: 'Backlog', state_type: 'backlog', state_pos: 0 }),
      linCard({ identifier: 'BOD-6', title: 'shipped', state: 'Done', state_type: 'completed', state_pos: 3,
                closedAt: '2026-10-11T00:00:00.000Z', needs_reply: true }),
      linCard({ identifier: 'BOD-7', title: 'dropped', state: 'Canceled', state_type: 'canceled', state_pos: 4,
                closedAt: '2026-10-12T00:00:00.000Z' })
    ],
    fetched_at: NOW - 30, error: null, busy: false
  }, over);
}

function idsInOrder(html, re) {
  return [...html.matchAll(re)].map(m => m[1]);
}
const prNums = html => idsInOrder(html, /bodhium-caliper#(\d+)/g);
const linIds = html => idsInOrder(html, />(BOD-\d+)</g);

// ---- PR board ------------------------------------------------------------------

test('PR feed order is newest activity first (mail, else updatedAt)', () => {
  const html = B.prBoardHtml({ data: prPayload() }, { now: NOW });
  assert.deepEqual(prNums(html), ['12', '13', '11']);
  assert.equal(B.prLastTs(prCard({ updatedAt: '2026-10-12T12:00:00Z', last_activity: 0 })), NOW - 86400);
});

test('PR feed order: stale mail beats a newer updatedAt (mail, else updatedAt)', () => {
  // Mail 3d ago, updatedAt 1h ago: ranks by the mail (3d), so below a PR
  // updated 2d ago with no mail. A max() of the two would put it first.
  const cards = [prCard({ number: 11, updatedAt: '2026-10-11T12:00:00Z' }),
                 prCard({ number: 14, updatedAt: '2026-10-13T11:00:00Z', last_activity: NOW - 3 * 86400 })];
  assert.equal(B.prLastTs(cards[1]), NOW - 3 * 86400);
  assert.deepEqual(prNums(B.prBoardHtml({ data: prPayload({ cards }) }, { now: NOW })), ['11', '14']);
});

test('PR filters: mine / review requested (incl. Slack) / all', () => {
  const p = { data: prPayload() };
  assert.deepEqual(prNums(B.prBoardHtml(p, { now: NOW, filter: 'mine' })), ['11']);
  assert.deepEqual(prNums(B.prBoardHtml(p, { now: NOW, filter: 'review' })), ['12', '13']);
  assert.deepEqual(prNums(B.prBoardHtml(p, { now: NOW, filter: 'all' })), ['12', '13', '11']);
  assert.match(B.prBoardHtml(p, { now: NOW, filter: 'mine' }), /class="board-chip on" data-filter="mine"/);
});

test('PR badges use CC vocabulary classes', () => {
  assert.equal(B.prCiClass('passing'), 'run');
  assert.equal(B.prCiClass('failing'), 'stop');
  assert.equal(B.prCiClass('running'), 'warn');
  assert.equal(B.prCiClass('unknown'), 'warn');   // nothing ran is not a pass
  assert.equal(B.prReviewClass('addressed review'), 'run');
  assert.equal(B.prReviewClass('unaddressed review'), 'stop');
  assert.equal(B.prReviewClass('unreviewed'), 'warn');
  const row = B.prRowHtml(prPayload().cards[1], NOW);
  assert.match(row, /<span class="badge stop">unaddressed review<\/span>/);
  assert.match(row, /<span class="badge stop">CI failing<\/span>/);
  assert.match(row, /1 approval ·/);
  assert.match(row, /3d old/);
  assert.match(row, /bodhium-caliper#12<\/a> · vinnie · review requested/);
  // newest activity line only
  assert.match(row, /✓ approved · Vinnie · 1h ago/);
  assert.doesNotMatch(row, /Sam/);
  assert.match(B.prRowHtml(prCard(), NOW), /no activity yet/);
});

test('PR header shows fetched age and mail state', () => {
  const html = B.prBoardHtml({ data: prPayload() }, { now: NOW });
  assert.match(html, /fetched 2m ago/);
  assert.match(html, /badge run">mail connected/);
  const re = B.prBoardHtml({ data: prPayload({ mail: { state: 'needs_reconnect', error: 'scope' } }) }, { now: NOW });
  assert.match(re, /mail needs reconnect/);
  assert.match(re, /href="http:\/\/127\.0\.0\.1:7426\/oauth\/google\/start"/);
  assert.match(B.prBoardHtml({ data: prPayload({ mail: { state: 'error', error: 'boom' } }) }, { now: NOW }), /badge stop" title="boom">mail error/);
  assert.match(html, /data-action="refresh"/);
});

test('down and error states are honest', () => {
  for (const fn of [B.prBoardHtml, B.linBoardHtml]) {
    const down = fn({ down: true }, { now: NOW });
    assert.match(down, /feeds service not running — start it from the tool launcher/);
    assert.doesNotMatch(down, /board-row/);
    assert.match(fn({ httpError: 'feeds returned HTTP 503' }, { now: NOW }), /board-error">feeds returned HTTP 503/);
  }
  const pr = B.prBoardHtml({ data: prPayload({ error: 'gh: auth required' }) }, { now: NOW });
  assert.match(pr, /board-error">gh: auth required/);
  assert.match(pr, /board-row/);   // cached cards still shown under the error
  const lin = B.linBoardHtml({ data: linPayload({ cards: [], error: 'No Linear key' }) }, { now: NOW });
  assert.match(lin, /board-error">No Linear key/);
});

test('links open in a new tab with rel=noopener, and only http(s)', () => {
  const html = B.prBoardHtml({ data: prPayload() }, { now: NOW }) + B.linBoardHtml({ data: linPayload() }, { now: NOW });
  const anchors = html.match(/<a [^>]*>/g);
  assert.ok(anchors.length > 5);
  for (const a of anchors) {
    assert.match(a, /target="_blank"/);
    assert.match(a, /rel="noopener[^"]*"/);
  }
  const js = B.prRowHtml(prCard({ url: 'javascript:alert(1)' }), NOW);
  assert.doesNotMatch(js, /javascript:/);
  assert.equal(B.FEEDS_BASE, 'http://127.0.0.1:7426');
});

test('PR title, author and activity containing markup are escaped', () => {
  const card = prCard({ title: XSS, author: XSS, role: XSS, url: 'https://x/"onmouseover="alert(1)',
                        activity: [{ at: NOW, event: XSS, from_name: XSS }] });
  const html = B.prBoardHtml({ data: prPayload({ cards: [card], error: XSS, mail: { state: 'error', error: '"><img onerror=x>' } }) }, { now: NOW });
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /"onmouseover="/);
  assert.match(html, /&quot;onmouseover=&quot;/);
});

// ---- Linear board ----------------------------------------------------------------

test('Linear groups open issues by state order, priority sort with none last', () => {
  assert.equal(B.linPrioRank(0), 9);
  assert.equal(B.linPrioRank(1), 1);
  const g = B.linGroups(linPayload().cards, NOW);
  assert.deepEqual(g.groups.map(x => x.state), ['Backlog', 'Todo', 'In Progress']);
  assert.deepEqual(g.groups[1].items.map(c => c.identifier), ['BOD-2', 'BOD-3', 'BOD-1']);
  assert.deepEqual(g.closed.map(c => c.identifier), ['BOD-7', 'BOD-6']);
  const html = B.linBoardHtml({ data: linPayload() }, { now: NOW });
  assert.deepEqual(linIds(html), ['BOD-5', 'BOD-2', 'BOD-3', 'BOD-1', 'BOD-4', 'BOD-7', 'BOD-6']);
});

test('Linear state_pos orders states of the same type', () => {
  const cards = [linCard({ identifier: 'BOD-1', state: 'Review', state_type: 'started', state_pos: 5 }),
                 linCard({ identifier: 'BOD-2', state: 'Doing', state_type: 'started', state_pos: 2 })];
  assert.deepEqual(B.linGroups(cards, NOW).groups.map(x => x.state), ['Doing', 'Review']);
});

test('Linear closed section keeps only the last seven days', () => {
  const cards = linPayload().cards.concat([
    linCard({ identifier: 'BOD-8', title: 'old close', state: 'Done', state_type: 'completed', state_pos: 3,
              closedAt: '2026-10-05T12:00:00.000Z' }),      // 8 days before NOW
    linCard({ identifier: 'BOD-9', title: 'edge', state: 'Done', state_type: 'completed', state_pos: 3,
              closedAt: '2026-10-06T12:00:00.000Z' }),      // exactly 7 days
    linCard({ identifier: 'BOD-10', title: 'no date', state: 'Done', state_type: 'completed', state_pos: 3, closedAt: '' })
  ]);
  assert.deepEqual(B.linGroups(cards, NOW).closed.map(c => c.identifier), ['BOD-7', 'BOD-6', 'BOD-9']);
  const html = B.linBoardHtml({ data: linPayload({ cards }) }, { now: NOW });
  assert.match(html, /closed this week \(3\)/);
  assert.doesNotMatch(html, /BOD-8<|BOD-10</);
});

test('Linear closed-this-week is collapsed at the bottom', () => {
  const html = B.linBoardHtml({ data: linPayload() }, { now: NOW });
  assert.match(html, /<details class="board-closed"><summary>closed this week \(2\)<\/summary>/);
  assert.ok(html.indexOf('board-closed') > html.indexOf('BOD-4'));
  assert.match(B.linBoardHtml({ data: linPayload() }, { now: NOW, closedOpen: true }), /<details class="board-closed" open>/);
  // a closed issue never shows needs reply
  const closedPart = html.slice(html.indexOf('board-closed'));
  assert.doesNotMatch(closedPart, /needs reply/);
});

test('Linear row: identifier link, priority, needs reply, linked PR badges', () => {
  const html = B.linBoardHtml({ data: linPayload() }, { now: NOW });
  assert.match(html, /href="https:\/\/linear\.app\/bodhium\/issue\/BOD-2"[^>]*>BOD-2<\/a> <span class="badge stop" title="priority">⚠ Urgent<\/span> <span class="badge stop">needs reply<\/span>/);
  const row4 = B.linRowHtml(linPayload().cards[3]);
  assert.match(row4, /ai-traffic#7<\/a> <span class="badge stop">CI failing<\/span> <span class="badge stop">unaddressed review<\/span>/);
  // a PR not on the PR board gets a plain link, no invented badges
  assert.match(row4, /ai-traffic#3<\/a><\/div>/);
  assert.match(html, /fetched just now|fetched 0m ago/);
  assert.match(B.linBoardHtml({ data: linPayload({ busy: true }) }, { now: NOW }), /refreshing…/);
});

test('Linear title, state and PR repo containing markup are escaped', () => {
  const card = linCard({ title: XSS, state: XSS, identifier: XSS, priority_label: XSS, state_color: '"><img>',
                         prs: [{ url: 'https://github.com/a/b/pull/1', repo: XSS, number: 1, open: true, ci: XSS, review_state: XSS }] });
  const html = B.linBoardHtml({ data: linPayload({ cards: [card], error: XSS }) }, { now: NOW });
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test('esc and escA', () => {
  assert.equal(B.esc('<a href="x">&</a>'), '&lt;a href="x"&gt;&amp;&lt;/a&gt;');
  assert.equal(B.escA('"\'<'), '&quot;&#39;&lt;');
  assert.equal(B.esc(null), '');
});

test('both widgets persist in their own key and the layout export/import carries it', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const [file, key] of [['pr-board-widget.js', 'prBoardWidgets'], ['linear-board-widget.js', 'linearBoardWidgets']]) {
    assert.match(fs.readFileSync(path.join(root, file), 'utf8'), new RegExp(`storageKey: '${key}'`));
    assert.match(html, new RegExp(`${key}: readArrayStorage\\('${key}'\\)`));           // export
    assert.match(html, new RegExp(`Array\\.isArray\\(payload\\.${key}\\)`));             // import reads it
    assert.match(html, new RegExp(`localStorage\\.setItem\\('${key}'`));                 // import writes it
    assert.match(html, new RegExp(`<script src="${file}"></script>`));
  }
  assert.ok(html.indexOf('src="boards.js"') < html.indexOf('src="board-widget.js"'));
  assert.ok(html.indexOf('src="board-widget.js"') < html.indexOf('src="pr-board-widget.js"'));
});
