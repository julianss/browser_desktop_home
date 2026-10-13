const test = require('node:test');
const assert = require('node:assert/strict');

const T = require('../todo.js');
const B = require('../boards.js');

const TODAY = '2026-10-13';

// Shaped like today's suggested-todo.json, as /check-in writes it.
function current(over) {
  return Object.assign({
    date: TODAY,
    yesterday_summary: { date: '2026-10-12', text: 'Merged the BYOK change.' },
    weekly_goals: { posted: '2026-10-12', week_of: '2026-10-12', items: ['Ship MCP report gaps', 'Retire CC'] },
    items: [
      { topic: 'Entity system', text: '🟡 BOD2-534: decide the activation cap.',
        links: [{ text: 'BOD2-534', url: 'https://linear.app/bodhiumlabs/issue/BOD2-534' }] },
      { topic: 'AI-traffic', text: 'Flag the /null 404s.', links: [] },
      { topic: 'Entity system', text: 'Review the v3 migration.', done: true },
      { text: 'No topic here.' }
    ]
  }, over);
}
const EMPTY = { date: null, items: [], weekly_goals: null, yesterday_summary: null };

function render(data, opts) { return T.todoHtml({ data }, Object.assign({ today: TODAY }, opts)); }

test('current shape: header date, yesterday, weekly goals, topics in first-appearance order', () => {
  const h = render(current());
  assert.match(h, /Today's plan/);
  assert.match(h, /\(2026-10-13\)/);
  assert.match(h, /<b>Yesterday<\/b> \(2026-10-12\)<br>Merged the BYOK change\./);
  assert.match(h, /<b>Weekly goals<\/b> \(posted 2026-10-12, week of 2026-10-12\)/);
  assert.match(h, /<li>Ship MCP report gaps<\/li><li>Retire CC<\/li>/);
  const topics = [...h.matchAll(/<div class="todo-topic">([^<]*)<\/div>/g)].map(m => m[1]);
  assert.deepEqual(topics, ['Entity system', 'AI-traffic', 'Other']);
  // Both Entity system items sit in the first group, the done one ticked.
  const first = h.split('<div class="todo-group">')[1];
  assert.match(first, /decide the activation cap/);
  assert.match(first, /<li class="todo-item done"><label><input type="checkbox" data-todo-key="2026-10-13\|Review the v3 migration\." checked>/);
  assert.doesNotMatch(h, /todo-stale/);
  assert.doesNotMatch(h, new RegExp(T.EMPTY_MESSAGE));
});

test('topicUrl makes the topic label a link', () => {
  const h = render(current({ items: [{ topic: 'MCP', topicUrl: 'https://linear.app/p/mcp', text: 'x' }] }));
  assert.match(h, /<div class="todo-topic"><a href="https:\/\/linear.app\/p\/mcp" target="_blank" rel="noopener">MCP<\/a><\/div>/);
});

test('topics named like Object.prototype members group like any other topic', () => {
  const names = ['__proto__', 'constructor', 'toString', 'hasOwnProperty'];
  const h = render(current({ items: names.flatMap(n => [{ topic: n, text: n + ' one' }, { topic: n, text: n + ' two' }]) }));
  const topics = [...h.matchAll(/<div class="todo-topic">([^<]*)<\/div>/g)].map(m => m[1]);
  assert.deepEqual(topics, names);
  for (const n of names) assert.match(h, new RegExp('<span>' + n + ' one</span>[\\s\\S]*<span>' + n + ' two</span>'));
});

test("an object item whose topic is '__flat__' is a topic group, not the legacy flat list", () => {
  const h = render(current({ items: [{ topic: '__flat__', text: 'x' }] }));
  assert.match(h, /<div class="todo-group"><div class="todo-topic">__flat__<\/div><ul class="todo-list">[\s\S]*<span>x<\/span>/);
  const mixed = render(current({ items: ['plain', { topic: '__flat__', text: 'x' }] }));
  const topics = [...mixed.matchAll(/<div class="todo-topic">([^<]*)<\/div>/g)].map(m => m[1]);
  assert.deepEqual(topics, ['Other', '__flat__']);
  assert.deepEqual(T.todoGroups(['a', { topic: '__flat__', text: 'b' }]).map(g => [g.topic, g.flat, g.items.length]),
    [['Other', true, 1], ['__flat__', false, 1]]);
});

test('legacy shape: plain string items render as one flat list, no topic headers', () => {
  const h = render({ date: TODAY, items: ['first thing', 'second thing'] });
  assert.doesNotMatch(h, /todo-topic/);
  assert.match(h, /<ul class="todo-list"><li class="todo-item"><label><input type="checkbox" data-todo-key="2026-10-13\|first thing"> <span>first thing<\/span><\/label><\/li>/);
  assert.match(h, /<span>second thing<\/span>/);
});

test('empty shape: the empty message, no date, not stale', () => {
  const h = render(EMPTY);
  assert.match(h, /Nothing drafted yet -- \/check-in writes this each morning\./);
  assert.doesNotMatch(h, /todo-date/);
  assert.doesNotMatch(h, /todo-stale/);
});

test('stale: a plan whose date is not today is marked stale', () => {
  assert.match(render(current({ date: '2026-10-09' })), /class="badge warn todo-stale"[^>]*>stale</);
  assert.doesNotMatch(render(current()), /stale/);
  assert.equal(T.todoStale({ date: '2026-10-09' }, TODAY), true);
  assert.equal(T.todoStale({ date: TODAY }, TODAY), false);
  assert.equal(T.todoStale(EMPTY, TODAY), false);
});

test('links render as anchors with rel=noopener; non-http urls are not linked', () => {
  const h = render(current());
  assert.match(h, /🟡 <a href="https:\/\/linear.app\/bodhiumlabs\/issue\/BOD2-534" target="_blank" rel="noopener">BOD2-534<\/a>: decide/);
  const bad = render(current({ items: [{ topic: 'x', text: 'see here', links: [{ text: 'here', url: 'javascript:alert(1)' }] }] }));
  assert.match(bad, /<a href="#" target="_blank" rel="noopener">here<\/a>/);
  assert.doesNotMatch(bad, /javascript:/);
  const quote = render(current({ items: [{ topic: 'x', text: 'see here', links: [{ text: 'here', url: 'https://a.example/"onmouseover="x' }] }] }));
  assert.doesNotMatch(quote, /"onmouseover="/);
});

test('escaping: an item containing <script> is inert everywhere it lands', () => {
  const evil = '<script>alert(1)</script>';
  const h = render({
    date: TODAY,
    yesterday_summary: { date: evil, text: evil },
    weekly_goals: { posted: evil, week_of: evil, items: [evil] },
    items: [{ topic: evil, text: evil }, evil]
  });
  assert.doesNotMatch(h, /<script>/);
  assert.match(h, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  const flat = render({ date: TODAY, items: [evil] });
  assert.doesNotMatch(flat, /<script>/);
  // The checkbox key is attribute-escaped too.
  const attr = render({ date: TODAY, items: ['a" onclick="x'] });
  assert.match(attr, /data-todo-key="2026-10-13\|a&quot; onclick=&quot;x">/);
});

test('checkbox state comes from local checks keyed by date + text, overriding done', () => {
  const k = T.todoCheckKey(TODAY, 'Flag the /null 404s.');
  const h = render(current(), { checks: { [k]: true, [T.todoCheckKey(TODAY, 'Review the v3 migration.')]: false } });
  assert.match(h, /<li class="todo-item done"><label><input type="checkbox" data-todo-key="2026-10-13\|Flag the \/null 404s\." checked>/);
  assert.match(h, /<li class="todo-item"><label><input type="checkbox" data-todo-key="2026-10-13\|Review the v3 migration\.">/);
  // Same text, another day's plan: yesterday's tick does not carry over.
  const other = render(current({ date: '2026-10-14' }), { checks: { [k]: true } });
  assert.doesNotMatch(other, /Flag the \/null 404s\." checked/);
});

test('down and http-error states', () => {
  const down = T.todoHtml({ down: true }, { today: TODAY });
  assert.match(down, /feeds service not running -- start it from the tool launcher/);
  assert.equal(B.DOWN_MESSAGE, 'feeds service not running -- start it from the tool launcher');
  assert.match(T.todoHtml({ httpError: 'feeds returned HTTP 500' }, { today: TODAY }), /board-error">feeds returned HTTP 500/);
});
