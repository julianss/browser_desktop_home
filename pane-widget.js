/**
 * Pane Widget
 * A simple resizable, movable pane with configurable color, opacity,
 * and backdrop blur. Icons always render above panes.
 */

(function() {
  const CONFIG = {
    defaultColor: '#ffffff',
    defaultOpacity: 0.25,
    defaultBlur: 10,
    defaultPosition: { x: 60, y: 60 },
    defaultWidth: 420,
    defaultHeight: 280,
    minWidth: 80,
    minHeight: 60
  };

  let panes = [];
  let activePaneId = null;

  /**
   * Load all pane settings from localStorage
   */
  function loadPanes() {
    try {
      const saved = localStorage.getItem('paneWidgets');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.error('Failed to load pane widget settings:', e);
    }
    return null;
  }

  /**
   * Save all pane settings to localStorage
   */
  function savePanes() {
    try {
      localStorage.setItem('paneWidgets', JSON.stringify(panes));
    } catch (e) {
      console.error('Failed to save pane widget settings:', e);
    }
  }

  /**
   * Generate unique ID for a new pane
   */
  function generatePaneId() {
    return 'pane_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Create default pane settings
   */
  function createDefaultPane() {
    const offset = panes.length * 30;
    return {
      id: generatePaneId(),
      x: CONFIG.defaultPosition.x + offset,
      y: CONFIG.defaultPosition.y + offset,
      width: CONFIG.defaultWidth,
      height: CONFIG.defaultHeight,
      color: CONFIG.defaultColor,
      opacity: CONFIG.defaultOpacity,
      blur: CONFIG.defaultBlur
    };
  }

  /**
   * Convert hex color to RGB
   */
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  }

  /**
   * Apply settings to a specific pane widget
   */
  function applyPaneSettings(pane) {
    const widget = document.getElementById(`pane-widget-${pane.id}`);
    if (!widget) return;

    widget.style.left = (pane.x || CONFIG.defaultPosition.x) + 'px';
    widget.style.top = (pane.y || CONFIG.defaultPosition.y) + 'px';
    widget.style.width = (pane.width || CONFIG.defaultWidth) + 'px';
    widget.style.height = (pane.height || CONFIG.defaultHeight) + 'px';

    const rgb = hexToRgb(pane.color || CONFIG.defaultColor);
    const opacity = pane.opacity ?? CONFIG.defaultOpacity;
    widget.style.backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;

    const blur = pane.blur ?? CONFIG.defaultBlur;
    const filter = blur > 0 ? `blur(${blur}px)` : 'none';
    widget.style.backdropFilter = filter;
    widget.style.webkitBackdropFilter = filter;
  }

  /**
   * Create a pane widget DOM element
   */
  function createPaneWidget(pane) {
    const widget = document.createElement('div');
    widget.id = `pane-widget-${pane.id}`;
    widget.className = 'pane-widget';
    widget.dataset.paneId = pane.id;

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'pane-delete';
    deleteBtn.innerHTML = '×';
    deleteBtn.title = 'Delete pane';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deletePane(pane.id);
    });
    widget.appendChild(deleteBtn);

    // Resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'pane-resize-handle';
    resizeHandle.title = 'Resize';
    widget.appendChild(resizeHandle);

    document.body.appendChild(widget);

    // Drag and resize state
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    let isResizing = false;
    let resizeStartPos = { x: 0, y: 0 };
    let resizeStartSize = { width: 0, height: 0 };

    widget.addEventListener('mousedown', (e) => {
      if (e.target === deleteBtn || e.target === resizeHandle) return;
      if (e.button !== 0) return;
      isDragging = true;
      dragOffset.x = e.clientX - widget.offsetLeft;
      dragOffset.y = e.clientY - widget.offsetTop;
      widget.style.cursor = 'grabbing';
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        e.preventDefault();
        widget.style.left = (e.clientX - dragOffset.x) + 'px';
        widget.style.top = (e.clientY - dragOffset.y) + 'px';
        pane.x = e.clientX - dragOffset.x;
        pane.y = e.clientY - dragOffset.y;
        savePanes();
      }

      if (isResizing) {
        e.preventDefault();
        const newWidth = Math.max(CONFIG.minWidth, resizeStartSize.width + (e.clientX - resizeStartPos.x));
        const newHeight = Math.max(CONFIG.minHeight, resizeStartSize.height + (e.clientY - resizeStartPos.y));
        widget.style.width = newWidth + 'px';
        widget.style.height = newHeight + 'px';
        pane.width = newWidth;
        pane.height = newHeight;
        savePanes();
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      isResizing = false;
      widget.style.cursor = 'grab';
    });

    resizeHandle.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      isResizing = true;
      resizeStartPos = { x: e.clientX, y: e.clientY };
      resizeStartSize = { width: widget.offsetWidth, height: widget.offsetHeight };
      e.preventDefault();
      e.stopPropagation();
    });

    // Right-click for settings
    widget.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      activePaneId = pane.id;
      openSettingsModal(pane);
    });

    return widget;
  }

  /**
   * Remove a pane widget
   */
  function removePaneWidget(paneId) {
    const widget = document.getElementById(`pane-widget-${paneId}`);
    if (widget) {
      widget.remove();
    }
  }

  /**
   * Open settings modal for a specific pane
   */
  function openSettingsModal(pane) {
    const modal = document.getElementById('pane-widget-modal');
    document.getElementById('pane-color').value = pane.color || CONFIG.defaultColor;
    document.getElementById('pane-opacity').value = pane.opacity ?? CONFIG.defaultOpacity;
    document.getElementById('pane-blur').value = pane.blur ?? CONFIG.defaultBlur;

    activePaneId = pane.id;
    modal.classList.add('visible');
  }

  /**
   * Close settings modal
   */
  function closeSettingsModal() {
    document.getElementById('pane-widget-modal').classList.remove('visible');
    activePaneId = null;
  }

  /**
   * Save settings from modal for the active pane
   */
  function saveSettingsFromModal() {
    const pane = panes.find(p => p.id === activePaneId);
    if (!pane) return;

    pane.color = document.getElementById('pane-color').value;
    pane.opacity = parseFloat(document.getElementById('pane-opacity').value);
    pane.blur = parseFloat(document.getElementById('pane-blur').value);

    savePanes();
    applyPaneSettings(pane);
    closeSettingsModal();
  }

  /**
   * Delete a pane
   */
  function deletePane(paneId) {
    const index = panes.findIndex(p => p.id === paneId);
    if (index === -1) return;

    removePaneWidget(paneId);
    panes.splice(index, 1);
    savePanes();
  }

  /**
   * Create settings modal
   */
  function createSettingsModal() {
    const modal = document.createElement('div');
    modal.id = 'pane-widget-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="height: auto; max-height: 80vh;">
        <h2>Pane Settings</h2>

        <div class="form-row">
          <div class="form-group">
            <label>Color</label>
            <input type="color" id="pane-color" value="#ffffff">
          </div>
          <div class="form-group">
            <label>Opacity</label>
            <input type="range" id="pane-opacity" min="0" max="1" step="0.05" value="0.25" style="width:100%;">
            <div style="display:flex;justify-content:space-between;font-size:10px;color:#777;margin-top:4px;">
              <span>Transparent</span>
              <span>Solid</span>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>Backdrop Blur (px)</label>
          <input type="range" id="pane-blur" min="0" max="40" step="1" value="10" style="width:100%;">
          <div style="display:flex;justify-content:space-between;font-size:10px;color:#777;margin-top:4px;">
            <span>No blur</span>
            <span>Heavy blur</span>
          </div>
        </div>

        <div class="modal-buttons">
          <button class="btn btn-secondary" data-action="cancel">Cancel</button>
          <button class="btn btn-primary" data-action="save">Save</button>
        </div>
      </div>
    `;

    modal.querySelector('[data-action="cancel"]').addEventListener('click', closeSettingsModal);
    modal.querySelector('[data-action="save"]').addEventListener('click', saveSettingsFromModal);

    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeSettingsModal();
      }
    });

    document.body.appendChild(modal);
  }

  /**
   * Add a new pane
   */
  function addPane() {
    const pane = createDefaultPane();
    panes.push(pane);
    createPaneWidget(pane);
    applyPaneSettings(pane);
    savePanes();
    return pane;
  }

  /**
   * Register context menu items for panes
   */
  function registerContextMenuItems() {
    if (typeof ContextMenuService !== 'undefined') {
      ContextMenuService.unregisterMenuItem('add-pane');

      ContextMenuService.registerMenuItem({
        id: 'add-pane',
        label: 'Add Pane',
        icon: '▭',
        action: () => {
          addPane();
        }
      });
    }
  }

  /**
   * Initialize the pane widget
   */
  function init() {
    // Load saved panes or create one default pane
    const savedPanes = loadPanes();
    if (savedPanes && savedPanes.length > 0) {
      panes = savedPanes;
      panes.forEach(pane => {
        createPaneWidget(pane);
        applyPaneSettings(pane);
      });
    } else {
      const pane = createDefaultPane();
      panes = [pane];
      createPaneWidget(pane);
      applyPaneSettings(pane);
    }

    // Create settings modal
    createSettingsModal();

    // Register context menu items
    registerContextMenuItems();

    console.log('Pane Widget initialized with', panes.length, 'pane(s)');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
