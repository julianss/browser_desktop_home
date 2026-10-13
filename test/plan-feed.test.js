const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const P = require('../plan-feed.js');
const { mergeWidgetSeeds } = require('../seed-merge.js');
const seed = require('../seeds/daily-plan.js');

function plan(date, items, over) {
  return Object.assign({ date, items, yesterday_summary: { date: '2026-10-12', text: 'Merged BYOK.' } }, over);
}
const A = { id: 'a', topic: 'MCP', text: 'Fix get_ai_traffic' };
const B = { id: 'b', topic: 'DB', text: 'Apply RDS params' };
const C = { id: 'c', topic: 'DB', text: 'Validate batching' };

function list(c) { return c.items.map(i => (i.planId || 'manual:' + i.text) + (i.done ? '+' : '')); }
function apply(c, data) {
  const r = P.mergePlan(c, data);
  return r ? Object.assign({}, c, r) : c;
}
function tick(c, planId) {
  return Object.assign({}, c, { items: c.items.map(i => i.planId === planId ? Object.assign({}, i, { done: true }) : i) });
}

test('first sync appends the plan in order, unticked, and records the date', () => {
  const r = P.mergePlan({ items: [] }, plan('2026-10-13', [A, B]));
  assert.equal(r.changed, true);
  assert.equal(r.planDate, '2026-10-13');
  assert.deepEqual(r.items.map(i => [i.id, i.planId, i.text, i.topic, i.done]),
    [['plan_a', 'a', 'Fix get_ai_traffic', 'MCP', false], ['plan_b', 'b', 'Apply RDS params', 'DB', false]]);
});

test('re-syncing the same plan changes nothing', () => {
  const c = apply({ items: [] }, plan('2026-10-13', [A, B]));
  const r = P.mergePlan(c, plan('2026-10-13', [A, B]));
  assert.equal(r.changed, false);
  assert.equal(r.items[0], c.items[0]); // same object: nothing rewritten
});

test('manual items are never touched, ticks stay, new items are appended', () => {
  let c = { items: [{ id: 'm1', text: 'Buy milk', done: false }] };
  c = apply(c, plan('2026-10-13', [A]));
  c = tick(c, 'a');
  c = apply(c, plan('2026-10-13', [A, B]));
  assert.deepEqual(list(c), ['manual:Buy milk', 'a+', 'b']);
});

test('same day: an item that left the plan goes if unticked, stays if ticked', () => {
  let c = apply({ items: [] }, plan('2026-10-13', [A, B, C]));
  c = tick(c, 'a');
  c = apply(c, plan('2026-10-13', [C]));
  assert.deepEqual(list(c), ['a+', 'c']);
});

test("a new day's plan replaces the old day's items, ticked or not; carried ids keep their tick", () => {
  let c = { items: [{ id: 'm1', text: 'Mine', done: true }] };
  c = apply(c, plan('2026-10-12', [A, B, C]));
  c = tick(tick(c, 'a'), 'c');
  c = apply(c, plan('2026-10-13', [C, { id: 'd', text: 'New thing' }]));
  assert.deepEqual(list(c), ['manual:Mine+', 'c+', 'd']);
  assert.equal(c.planDate, '2026-10-13');
});

test('plan rewording updates the text; a local edit survives until the plan rewords', () => {
  let c = apply({ items: [] }, plan('2026-10-13', [A]));
  c = Object.assign({}, c, { items: [Object.assign({}, c.items[0], { text: 'my wording' })] });
  c = apply(c, plan('2026-10-13', [A]));
  assert.equal(c.items[0].text, 'my wording');
  c = apply(c, plan('2026-10-13', [Object.assign({}, A, { text: 'Fix get_ai_traffic 3xx' })]));
  assert.equal(c.items[0].text, 'Fix get_ai_traffic 3xx');
});

test('an item removed by hand stays removed for that plan date only', () => {
  let c = apply({ items: [] }, plan('2026-10-13', [A, B]));
  c = Object.assign({}, c, { items: c.items.filter(i => i.planId !== 'a'), planDismissed: ['a'] });
  c = apply(c, plan('2026-10-13', [A, B]));
  assert.deepEqual(list(c), ['b']);
  c = apply(c, plan('2026-10-14', [A, B]));
  assert.deepEqual(list(c), ['b', 'a']);
  assert.deepEqual(c.planDismissed, []);
});

test('no plan date (no file / empty shape) leaves the checklist alone', () => {
  assert.equal(P.mergePlan({ items: [] }, { date: null, items: [], weekly_goals: null, yesterday_summary: null }), null);
  assert.equal(P.mergePlan({ items: [] }, null), null);
});

test('items without ids (legacy file) key on their text; strings and blanks are handled', () => {
  const items = P.planItems({ items: ['plain', { text: 'obj' }, { text: '  ' }, null, { text: 'obj' }] });
  assert.deepEqual(items.map(i => i.id), ['text:plain', 'text:obj']);
});

test('yesterdayText', () => {
  assert.equal(P.yesterdayText(plan('2026-10-13', [])), 'Yesterday (2026-10-12)\n\nMerged BYOK.');
  assert.equal(P.yesterdayText({ yesterday_summary: null }), null);
  assert.equal(P.yesterdayText({ yesterday_summary: { text: 'x' } }), 'Yesterday\n\nx');
});

test('the real suggested-todo.json (if present) merges with every item once', (t) => {
  const f = path.join(process.env.HOME || '', 'bodhium/.claude/standup/suggested-todo.json');
  if (!fs.existsSync(f)) return t.skip('no suggested-todo.json');
  const data = JSON.parse(fs.readFileSync(f, 'utf8'));
  const r = P.mergePlan({ items: [] }, data);
  assert.equal(r.items.length, P.planItems(data).length);
  assert.ok(r.items.length > 0);
  assert.ok(P.yesterdayText(data));
});

test('widget seeds: added once, never back after delete, existing ones untouched', () => {
  const mine = [{ id: 'checklist_1', name: 'Mine' }];
  const first = mergeWidgetSeeds(mine, seed.checklists, []);
  assert.deepEqual(first.added.map(s => s.id), ['seed_plan_checklist']);
  assert.equal(first.list[0], mine[0]);
  assert.equal(first.added[0].feed, 'plan');
  // Reload with it present: nothing new.
  assert.equal(mergeWidgetSeeds(first.list, seed.checklists, first.applied).added.length, 0);
  // Deleted, then reload: stays deleted.
  assert.equal(mergeWidgetSeeds(mine, seed.checklists, first.applied).added.length, 0);
  const notes = mergeWidgetSeeds([], seed.stickyNotes, first.applied);
  assert.deepEqual(notes.added.map(s => [s.id, s.feed]), [['seed_yesterday_sticky', 'yesterday']]);
  assert.deepEqual(notes.applied.sort(), ['seed_plan_checklist', 'seed_yesterday_sticky']);
});
