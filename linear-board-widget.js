/**
 * Linear Board Widget
 * Command Center's Linear board as a desktop widget: my open issues grouped by
 * state, closed-this-week collapsed at the bottom, from the feeds service's
 * /api/linear-board. Persisted in localStorage 'linearBoardWidgets'.
 */

(function() {
  FeedsBoardWidget.define({
    kind: 'linear-board-widget',
    storageKey: 'linearBoardWidgets',
    className: 'linear-board-widget',
    path: '/api/linear-board',
    refreshPath: '/api/linear-board/refresh',
    refreshDelay: 2500,
    menuId: 'add-linear-board',
    menuLabel: 'Add Linear Board',
    menuIcon: '▦',
    defaults: { closedOpen: false },
    render: (res, inst, now) => FeedsBoards.linBoardHtml(res, { now, closedOpen: inst.closedOpen })
  });
})();
