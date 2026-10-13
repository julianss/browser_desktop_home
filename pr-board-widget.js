/**
 * PR Board Widget
 * Command Center's PR board as a desktop widget: open PRs (mine and review
 * requested), newest activity first, from the feeds service's /api/pr-board.
 * Persisted in localStorage 'prBoardWidgets'.
 */

(function() {
  FeedsBoardWidget.define({
    kind: 'pr-board-widget',
    storageKey: 'prBoardWidgets',
    className: 'pr-board-widget',
    path: '/api/pr-board',
    // pr_refresh runs ~20 `gh` calls in the background; give it a moment.
    refreshPath: '/api/pr-board/refresh',
    refreshDelay: 4000,
    menuId: 'add-pr-board',
    menuLabel: 'Add PR Board',
    menuIcon: '⇄',
    defaults: { filter: 'all' },
    render: (res, inst, now) => FeedsBoards.prBoardHtml(res, { now, filter: inst.filter })
  });
})();
