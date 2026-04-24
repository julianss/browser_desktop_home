/**
 * Context Menu Service
 * Provides a service for widgets to register actions in the contextual menu
 */

(function() {
  // Store registered menu items
  let menuItems = [];

  /**
   * Register a new menu item
   * @param {Object} options - Menu item configuration
   * @param {string} options.id - Unique identifier for the menu item
   * @param {string} options.label - Display text for the menu item
   * @param {string} [options.icon] - Optional icon (emoji or unicode)
   * @param {Function} options.action - Callback function when item is clicked
   * @param {boolean} [options.separator] - Whether to show a separator before this item
   * @param {Function} [options.visible] - Optional function to determine visibility
   */
  function registerMenuItem(options) {
    if (!options.id || !options.label || !options.action) {
      console.error('MenuItem must have id, label, and action');
      return;
    }

    // Remove existing item with same id
    menuItems = menuItems.filter(item => item.id !== options.id);

    menuItems.push({
      id: options.id,
      label: options.label,
      icon: options.icon || '🔌',
      action: options.action,
      separator: options.separator || false,
      visible: options.visible || null
    });

    console.log(`ContextMenuItem registered: ${options.id}`);
  }

  /**
   * Unregister a menu item
   * @param {string} id - The id of the menu item to remove
   */
  function unregisterMenuItem(id) {
    const before = menuItems.length;
    menuItems = menuItems.filter(item => item.id !== id);
    if (before > menuItems.length) {
      console.log(`ContextMenuItem unregistered: ${id}`);
    }
  }

  /**
   * Get all registered menu items
   * @returns {Array} Array of menu item objects
   */
  function getMenuItems() {
    return menuItems;
  }

  /**
   * Render registered menu items into the context menu
   * @param {HTMLElement} menuElement - The context menu DOM element
   */
  function renderMenuItems(menuElement) {
    // Remove existing widget items
    const existingWidgetItems = menuElement.querySelectorAll('.widget-menu-item');
    existingWidgetItems.forEach(el => el.remove());

    // Get visible items
    const visibleItems = menuItems.filter(item => {
      if (!item.visible) return true;
      try {
        return item.visible();
      } catch (e) {
        console.error(`Error checking visibility for ${item.id}:`, e);
        return true;
      }
    });

    if (visibleItems.length === 0) return;

    // Create a separator before widget items if there are existing items
    const hasStandardItems = menuElement.querySelectorAll('[data-action="add-shortcut"], [data-action="toggle-mode"]').length > 0;
    if (hasStandardItems) {
      const separator = document.createElement('div');
      separator.className = 'context-menu-separator widget-menu-item';
      menuElement.appendChild(separator);
    }

    // Add widget menu items
    visibleItems.forEach(item => {
      if (item.separator) {
        const separator = document.createElement('div');
        separator.className = 'context-menu-separator widget-menu-item';
        menuElement.appendChild(separator);
      }

      const menuItem = document.createElement('div');
      menuItem.className = 'context-menu-item widget-menu-item';
      menuItem.dataset.action = `widget:${item.id}`;
      menuItem.innerHTML = `
        <span class="context-menu-icon">${item.icon}</span>
        <span>${item.label}</span>
      `;
      menuElement.appendChild(menuItem);
    });
  }

  /**
   * Handle widget menu item action
   * @param {string} itemId - The id of the widget menu item
   */
  function handleWidgetAction(itemId) {
    const item = menuItems.find(i => i.id === itemId);
    if (item) {
      try {
        item.action();
      } catch (e) {
        console.error(`Error executing widget action ${itemId}:`, e);
      }
    }
  }

  // Public API
  window.ContextMenuService = {
    registerMenuItem,
    unregisterMenuItem,
    getMenuItems,
    renderMenuItems,
    handleWidgetAction
  };

  console.log('ContextMenuService initialized');
})();
