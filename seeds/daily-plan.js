// The daily plan as two ordinary widgets, replacing the "Today's plan" feed
// widget: a checklist bound to the plan (feed: 'plan') and a sticky note bound
// to the yesterday summary (feed: 'yesterday'). Both are fed from the feeds
// service's /api/todo by plan-feed.js.
//
// Applied once per id by DesktopSeeds.mergeWidgetSeeds (the ids are recorded in
// localStorage 'widgetSeedsApplied'): a widget you delete stays deleted.
// Ids are stable: never rename one, or the widget comes back as a duplicate.
(function (root) {
  'use strict';

  const seed = {
    name: 'daily-plan',
    checklists: [
      { id: 'seed_plan_checklist', name: "Today's plan", feed: 'plan', x: 20, y: 330, width: 420, height: 420 }
    ],
    stickyNotes: [
      { id: 'seed_yesterday_sticky', feed: 'yesterday', x: 460, y: 330, width: 340, height: 220, fontSize: 13 }
    ]
  };

  root.DAILY_PLAN_SEED = seed;
  if (typeof module !== 'undefined' && module.exports) module.exports = seed;
})(typeof window !== 'undefined' ? window : globalThis);
