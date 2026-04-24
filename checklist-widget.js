/**
 * Checklist Widget
 * A customizable checklist widget that supports multiple instances with individual settings
 */

(function() {
  // Widget configuration
  const CONFIG = {
    defaultFont: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    defaultFontSize: 14,
    defaultColor: '#ffffff',
    defaultPosition: { x: 20, y: 100 },
    defaultWidth: 250,
    defaultHeight: 200,
    itemFontSize: 13,
    itemColor: '#ffffff',
    doneColor: '#888888',
    backgroundColor: '#000000',
    backgroundOpacity: 0.3,
    particleEnabled: true,
    particleMinSize: 4,
    particleMaxSize: 8,
    particleMinDistance: 40,
    particleMaxDistance: 100,
    particleMinDuration: 0.5,
    particleMaxDuration: 1.0,
    particleColors: ['#4a90d9', '#5ba0e9', '#6ab0f9', '#7ac0ff', '#ffd700', '#ff6b6b', '#4ecdc4']
  };

  // Widget state - stores all checklist instances
  let checklists = [];
  let activeChecklistId = null;
  let editingItemId = null;

  /**
   * Load all checklist settings from localStorage
   */
  function loadChecklists() {
    try {
      const saved = localStorage.getItem('checklistWidgets');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [parsed];
      }
    } catch (e) {
      console.error('Failed to load checklist widget settings:', e);
    }
    return null;
  }

  /**
   * Save all checklist settings to localStorage
   */
  function saveChecklists() {
    try {
      localStorage.setItem('checklistWidgets', JSON.stringify(checklists));
    } catch (e) {
      console.error('Failed to save checklist widget settings:', e);
    }
  }

  /**
   * Generate unique ID for a new checklist
   */
  function generateChecklistId() {
    return 'checklist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate unique ID for a checklist item
   */
  function generateItemId() {
    return 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Create default checklist settings
   */
  function createDefaultChecklist() {
    return {
      id: generateChecklistId(),
      name: 'Checklist',
      font: CONFIG.defaultFont,
      fontSize: CONFIG.defaultFontSize,
      color: CONFIG.defaultColor,
      x: CONFIG.defaultPosition.x + (checklists.length * 30),
      y: CONFIG.defaultPosition.y + (checklists.length * 30),
      width: CONFIG.defaultWidth,
      height: CONFIG.defaultHeight,
      shadow: true,
      backgroundColor: CONFIG.backgroundColor,
      backgroundOpacity: CONFIG.backgroundOpacity,
      itemFontSize: CONFIG.itemFontSize,
      itemColor: CONFIG.itemColor,
      itemShadow: true,
      doneColor: CONFIG.doneColor,
      items: [],
      particleEnabled: CONFIG.particleEnabled,
      particleMinSize: CONFIG.particleMinSize,
      particleMaxSize: CONFIG.particleMaxSize,
      particleMinDistance: CONFIG.particleMinDistance,
      particleMaxDistance: CONFIG.particleMaxDistance,
      particleMinDuration: CONFIG.particleMinDuration,
      particleMaxDuration: CONFIG.particleMaxDuration,
      particleColors: [...CONFIG.particleColors]
    };
  }

  /**
   * Update a specific checklist display
   */
  function updateChecklistDisplay(checklist) {
    const widget = document.getElementById(`checklist-widget-${checklist.id}`);
    if (!widget) return;

    const itemsContainer = widget.querySelector('.checklist-items');
    if (!itemsContainer) return;

    itemsContainer.innerHTML = '';

    checklist.items.forEach(item => {
      const itemElement = createChecklistItemElement(item, checklist);
      itemsContainer.appendChild(itemElement);
    });

    // Update widget dimensions
    widget.style.width = checklist.width + 'px';
    widget.style.height = checklist.height + 'px';
  }

  /**
   * Create a checklist item DOM element
   */
  function createChecklistItemElement(item, checklist) {
    const itemElement = document.createElement('div');
    itemElement.className = 'checklist-item' + (item.done ? ' done' : '');
    itemElement.dataset.itemId = item.id;

    // Custom checkbox container
    const checkboxContainer = document.createElement('div');
    checkboxContainer.className = 'checklist-custom-checkbox';
    checkboxContainer.innerHTML = `
      <div class="checkbox-box">
        <svg class="checkbox-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
    `;
    checkboxContainer.addEventListener('click', () => toggleItemDone(checklist, item.id));

    const label = document.createElement('span');
    label.className = 'checklist-item-label';
    label.textContent = item.text;
    label.style.color = item.done ? (checklist.doneColor || CONFIG.doneColor) : (checklist.itemColor || CONFIG.itemColor);
    label.style.textShadow = checklist.itemShadow !== false ? '1px 1px 3px rgba(0,0,0,0.8)' : 'none';
    label.addEventListener('dblclick', () => editItem(checklist, item.id));

    const removeBtn = document.createElement('button');
    removeBtn.className = 'checklist-item-remove';
    removeBtn.innerHTML = '×';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeItem(checklist, item.id);
    });

    itemElement.appendChild(checkboxContainer);
    itemElement.appendChild(label);
    itemElement.appendChild(removeBtn);

    // Trigger particle animation if item is done
    if (item.done) {
      const box = checkboxContainer.querySelector('.checkbox-box');
      if (box) {
        box.classList.add('checked');
      }
    }

    return itemElement;
  }

  /**
   * Toggle item done status
   */
  function toggleItemDone(checklist, itemId) {
    const item = checklist.items.find(i => i.id === itemId);
    if (item) {
      const wasDone = item.done;
      item.done = !item.done;
      saveChecklists();
      updateChecklistDisplay(checklist);

      // Trigger particle animation when checking (not unchecking)
      if (item.done && !wasDone && checklist.particleEnabled !== false) {
        const widget = document.getElementById(`checklist-widget-${checklist.id}`);
        const itemElement = widget.querySelector(`[data-item-id="${itemId}"]`);
        const checkbox = itemElement.querySelector('.checkbox-box');
        if (checkbox) {
          createParticles(checkbox, checklist);
        }
      }
    }
  }

  /**
   * Create particle explosion effect
   */
  function createParticles(checkbox, checklist) {
    const rect = checkbox.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Create multiple particles
    const particleCount = 12 + Math.random() * 6;
    const colors = checklist.particleColors && checklist.particleColors.length > 0 
      ? checklist.particleColors 
      : CONFIG.particleColors;
    
    for (let i = 0; i < particleCount; i++) {
      createParticle(centerX, centerY, colors[Math.floor(Math.random() * colors.length)], checklist);
    }
  }

  /**
   * Create a single particle
   */
  function createParticle(x, y, color, checklist) {
    const particle = document.createElement('div');
    particle.className = 'checklist-particle';
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    particle.style.backgroundColor = color;
    
    // Particle size
    const minSize = checklist.particleMinSize || CONFIG.particleMinSize;
    const maxSize = checklist.particleMaxSize || CONFIG.particleMaxSize;
    const size = minSize + Math.random() * (maxSize - minSize);
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    
    particle.style.boxShadow = `0 0 ${size * 1.5}px ${color}, 0 0 ${size * 3}px ${color}`;
    
    // Random angle and distance
    const angle = Math.random() * Math.PI * 2;
    const minDistance = checklist.particleMinDistance || CONFIG.particleMinDistance;
    const maxDistance = checklist.particleMaxDistance || CONFIG.particleMaxDistance;
    const distance = minDistance + Math.random() * (maxDistance - minDistance);
    
    const minDuration = checklist.particleMinDuration || CONFIG.particleMinDuration;
    const maxDuration = checklist.particleMaxDuration || CONFIG.particleMaxDuration;
    const duration = minDuration + Math.random() * (maxDuration - minDuration);
    
    const destX = Math.cos(angle) * distance;
    const destY = Math.sin(angle) * distance;
    
    particle.style.setProperty('--dest-x', destX + 'px');
    particle.style.setProperty('--dest-y', destY + 'px');
    particle.style.setProperty('--duration', duration + 's');
    
    document.body.appendChild(particle);
    
    // Remove particle after animation
    setTimeout(() => {
      particle.remove();
    }, duration * 1000 + 100);
  }

  /**
   * Edit an item
   */
  function editItem(checklist, itemId) {
    const item = checklist.items.find(i => i.id === itemId);
    if (!item) return;

    const widget = document.getElementById(`checklist-widget-${checklist.id}`);
    const itemElement = widget.querySelector(`[data-item-id="${itemId}"]`);
    const label = itemElement.querySelector('.checklist-item-label');

    editingItemId = itemId;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'checklist-item-edit-input';
    input.value = item.text;

    const saveEdit = () => {
      if (input.value.trim()) {
        item.text = input.value.trim();
        saveChecklists();
      }
      updateChecklistDisplay(checklist);
      editingItemId = null;
    };

    input.addEventListener('blur', saveEdit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        input.blur();
      } else if (e.key === 'Escape') {
        editingItemId = null;
        updateChecklistDisplay(checklist);
      }
    });

    label.innerHTML = '';
    label.appendChild(input);
    input.focus();
    input.select();
  }

  /**
   * Remove an item
   */
  function removeItem(checklist, itemId) {
    checklist.items = checklist.items.filter(i => i.id !== itemId);
    saveChecklists();
    updateChecklistDisplay(checklist);
  }

  /**
   * Add a new item
   */
  function addItem(checklist, text) {
    if (!text.trim()) return;
    checklist.items.push({
      id: generateItemId(),
      text: text.trim(),
      done: false
    });
    saveChecklists();
    updateChecklistDisplay(checklist);
  }

  /**
   * Apply settings to a specific checklist widget
   */
  function applyChecklistSettings(checklist) {
    const widget = document.getElementById(`checklist-widget-${checklist.id}`);
    if (!widget) return;

    // Widget position
    widget.style.left = (checklist.x || CONFIG.defaultPosition.x) + 'px';
    widget.style.top = (checklist.y || CONFIG.defaultPosition.y) + 'px';
    widget.style.width = (checklist.width || CONFIG.defaultWidth) + 'px';
    widget.style.height = (checklist.height || CONFIG.defaultHeight) + 'px';

    // Background
    const bgColor = checklist.backgroundColor || CONFIG.backgroundColor;
    const bgOpacity = checklist.backgroundOpacity ?? CONFIG.backgroundOpacity;
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 0, b: 0 };
    };
    const rgb = hexToRgb(bgColor);
    widget.style.background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${bgOpacity})`;

    // Header
    const headerElement = widget.querySelector('.checklist-header');
    if (headerElement) {
      headerElement.textContent = checklist.name || 'Checklist';
      headerElement.style.fontFamily = checklist.font || CONFIG.defaultFont;
      headerElement.style.fontSize = (checklist.fontSize || CONFIG.defaultFontSize) + 'px';
      headerElement.style.color = checklist.color || CONFIG.defaultColor;
      headerElement.style.textShadow = checklist.shadow !== false ? '1px 1px 3px rgba(0,0,0,0.8)' : 'none';
    }

    // Items
    const itemsContainer = widget.querySelector('.checklist-items');
    if (itemsContainer) {
      itemsContainer.style.fontFamily = checklist.font || CONFIG.defaultFont;
      itemsContainer.style.fontSize = (checklist.itemFontSize || CONFIG.itemFontSize) + 'px';
    }

    updateChecklistDisplay(checklist);
  }

  /**
   * Create a checklist widget DOM element
   */
  function createChecklistWidget(checklist) {
    const widget = document.createElement('div');
    widget.id = `checklist-widget-${checklist.id}`;
    widget.className = 'checklist-widget';
    widget.dataset.checklistId = checklist.id;

    // Header with name
    const header = document.createElement('div');
    header.className = 'checklist-header';
    header.textContent = checklist.name || 'Checklist';

    // Add item input
    const addItemContainer = document.createElement('div');
    addItemContainer.className = 'checklist-add-item';

    const addItemInput = document.createElement('input');
    addItemInput.type = 'text';
    addItemInput.className = 'checklist-add-input';
    addItemInput.placeholder = 'Add item...';
    addItemInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        addItem(checklist, addItemInput.value);
        addItemInput.value = '';
      }
    });

    const addItemBtn = document.createElement('button');
    addItemBtn.className = 'checklist-add-btn';
    addItemBtn.textContent = '+';
    addItemBtn.addEventListener('click', () => {
      addItem(checklist, addItemInput.value);
      addItemInput.value = '';
    });

    addItemContainer.appendChild(addItemInput);
    addItemContainer.appendChild(addItemBtn);

    // Items container
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'checklist-items';

    widget.appendChild(header);
    widget.appendChild(addItemContainer);
    widget.appendChild(itemsContainer);
    document.body.appendChild(widget);

    // Add drag functionality
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    let isResizing = false;
    let resizeStartPos = { x: 0, y: 0 };
    let resizeStartSize = { width: 0, height: 0 };

    header.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
      if (e.button !== 0) return;
      isDragging = true;
      dragOffset.x = e.clientX - widget.offsetLeft;
      dragOffset.y = e.clientY - widget.offsetTop;
      widget.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        e.preventDefault();
        widget.style.left = (e.clientX - dragOffset.x) + 'px';
        widget.style.top = (e.clientY - dragOffset.y) + 'px';
        checklist.x = e.clientX - dragOffset.x;
        checklist.y = e.clientY - dragOffset.y;
        saveChecklists();
      }

      if (isResizing) {
        e.preventDefault();
        const newWidth = resizeStartSize.width + (e.clientX - resizeStartPos.x);
        const newHeight = resizeStartSize.height + (e.clientY - resizeStartPos.y);
        widget.style.width = Math.max(150, newWidth) + 'px';
        widget.style.height = Math.max(100, newHeight) + 'px';
        checklist.width = Math.max(150, newWidth);
        checklist.height = Math.max(100, newHeight);
        saveChecklists();
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      isResizing = false;
      widget.style.cursor = 'grab';
    });

    // Resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'checklist-resize-handle';
    resizeHandle.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      isResizing = true;
      resizeStartPos = { x: e.clientX, y: e.clientY };
      resizeStartSize = { width: widget.offsetWidth, height: widget.offsetHeight };
      e.preventDefault();
      e.stopPropagation();
    });
    widget.appendChild(resizeHandle);

    // Right-click for settings
    widget.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      activeChecklistId = checklist.id;
      openSettingsModal(checklist);
    });

    return widget;
  }

  /**
   * Remove a checklist widget
   */
  function removeChecklistWidget(checklistId) {
    const widget = document.getElementById(`checklist-widget-${checklistId}`);
    if (widget) {
      widget.remove();
    }
  }

  /**
   * Open settings modal for a specific checklist
   */
  function openSettingsModal(checklist) {
    const modal = document.getElementById('checklist-widget-modal');
    const checklistNameInput = document.getElementById('checklist-widget-name');
    const fontSelect = document.getElementById('checklist-widget-font');
    const fontSizeInput = document.getElementById('checklist-widget-font-size');
    const colorInput = document.getElementById('checklist-widget-color');
    const shadowCheckbox = document.getElementById('checklist-widget-shadow');
    const itemFontSizeInput = document.getElementById('checklist-widget-item-font-size');
    const itemColorInput = document.getElementById('checklist-widget-item-color');
    const itemShadowCheckbox = document.getElementById('checklist-widget-item-shadow');
    const doneColorInput = document.getElementById('checklist-widget-done-color');
    const backgroundColorInput = document.getElementById('checklist-widget-background-color');
    const backgroundOpacityInput = document.getElementById('checklist-widget-background-opacity');
    const particleEnabledCheckbox = document.getElementById('checklist-widget-particle-enabled');
    const particleMinSizeInput = document.getElementById('checklist-widget-particle-min-size');
    const particleMaxSizeInput = document.getElementById('checklist-widget-particle-max-size');
    const particleMinDistanceInput = document.getElementById('checklist-widget-particle-min-distance');
    const particleMaxDistanceInput = document.getElementById('checklist-widget-particle-max-distance');
    const particleMinDurationInput = document.getElementById('checklist-widget-particle-min-duration');
    const particleMaxDurationInput = document.getElementById('checklist-widget-particle-max-duration');
    const particleColorsInput = document.getElementById('checklist-widget-particle-colors');

    checklistNameInput.value = checklist.name || 'Checklist';
    fontSelect.value = checklist.font || CONFIG.defaultFont;
    fontSizeInput.value = checklist.fontSize || CONFIG.defaultFontSize;
    colorInput.value = checklist.color || CONFIG.defaultColor;
    shadowCheckbox.checked = checklist.shadow !== false;
    itemFontSizeInput.value = checklist.itemFontSize || CONFIG.itemFontSize;
    itemColorInput.value = checklist.itemColor || CONFIG.itemColor;
    itemShadowCheckbox.checked = checklist.itemShadow !== false;
    doneColorInput.value = checklist.doneColor || CONFIG.doneColor;
    backgroundColorInput.value = checklist.backgroundColor || CONFIG.backgroundColor;
    backgroundOpacityInput.value = checklist.backgroundOpacity ?? CONFIG.backgroundOpacity;
    particleEnabledCheckbox.checked = checklist.particleEnabled !== false;
    particleMinSizeInput.value = checklist.particleMinSize || CONFIG.particleMinSize;
    particleMaxSizeInput.value = checklist.particleMaxSize || CONFIG.particleMaxSize;
    particleMinDistanceInput.value = checklist.particleMinDistance || CONFIG.particleMinDistance;
    particleMaxDistanceInput.value = checklist.particleMaxDistance || CONFIG.particleMaxDistance;
    particleMinDurationInput.value = checklist.particleMinDuration || CONFIG.particleMinDuration;
    particleMaxDurationInput.value = checklist.particleMaxDuration || CONFIG.particleMaxDuration;

    // Initialize particle color swatches
    const settingsModal = document.getElementById('checklist-widget-modal');
    if (settingsModal && settingsModal.renderColorSwatches) {
      settingsModal.currentColors = checklist.particleColors || [...CONFIG.particleColors];
      settingsModal.renderColorSwatches();
    }

    activeChecklistId = checklist.id;
    modal.classList.add('visible');
  }

  /**
   * Close settings modal
   */
  function closeSettingsModal() {
    document.getElementById('checklist-widget-modal').classList.remove('visible');
    activeChecklistId = null;
  }

  /**
   * Save settings from modal for the active checklist
   */
  function saveSettingsFromModal() {
    const checklist = checklists.find(c => c.id === activeChecklistId);
    if (!checklist) return;

    const checklistNameInput = document.getElementById('checklist-widget-name');
    const fontSelect = document.getElementById('checklist-widget-font');
    const fontSizeInput = document.getElementById('checklist-widget-font-size');
    const colorInput = document.getElementById('checklist-widget-color');
    const shadowCheckbox = document.getElementById('checklist-widget-shadow');
    const itemFontSizeInput = document.getElementById('checklist-widget-item-font-size');
    const itemColorInput = document.getElementById('checklist-widget-item-color');
    const itemShadowCheckbox = document.getElementById('checklist-widget-item-shadow');
    const doneColorInput = document.getElementById('checklist-widget-done-color');
    const backgroundColorInput = document.getElementById('checklist-widget-background-color');
    const backgroundOpacityInput = document.getElementById('checklist-widget-background-opacity');
    const particleEnabledCheckbox = document.getElementById('checklist-widget-particle-enabled');
    const particleMinSizeInput = document.getElementById('checklist-widget-particle-min-size');
    const particleMaxSizeInput = document.getElementById('checklist-widget-particle-max-size');
    const particleMinDistanceInput = document.getElementById('checklist-widget-particle-min-distance');
    const particleMaxDistanceInput = document.getElementById('checklist-widget-particle-max-distance');
    const particleMinDurationInput = document.getElementById('checklist-widget-particle-min-duration');
    const particleMaxDurationInput = document.getElementById('checklist-widget-particle-max-duration');
    const particleColorsInput = document.getElementById('checklist-widget-particle-colors');

    checklist.name = checklistNameInput.value || 'Checklist';
    checklist.font = fontSelect.value;
    checklist.fontSize = parseInt(fontSizeInput.value, 10);
    checklist.color = colorInput.value;
    checklist.shadow = shadowCheckbox.checked;
    checklist.itemFontSize = parseInt(itemFontSizeInput.value, 10);
    checklist.itemColor = itemColorInput.value;
    checklist.itemShadow = itemShadowCheckbox.checked;
    checklist.doneColor = doneColorInput.value;
    checklist.backgroundColor = backgroundColorInput.value;
    checklist.backgroundOpacity = parseFloat(backgroundOpacityInput.value);
    checklist.particleEnabled = particleEnabledCheckbox.checked;
    checklist.particleMinSize = parseInt(particleMinSizeInput.value, 10);
    checklist.particleMaxSize = parseInt(particleMaxSizeInput.value, 10);
    checklist.particleMinDistance = parseInt(particleMinDistanceInput.value, 10);
    checklist.particleMaxDistance = parseInt(particleMaxDistanceInput.value, 10);
    checklist.particleMinDuration = parseFloat(particleMinDurationInput.value);
    checklist.particleMaxDuration = parseFloat(particleMaxDurationInput.value);

    // Parse colors from comma-separated string (from hidden input)
    const colorsStr = particleColorsInput.value.trim();
    if (colorsStr) {
      const parsedColors = colorsStr.split(',').map(c => c.trim()).filter(c => /^#?[0-9a-f]{6}$/i.test(c));
      // Add # prefix if missing
      checklist.particleColors = parsedColors.map(c => c.startsWith('#') ? c : '#' + c);
    } else {
      checklist.particleColors = [...CONFIG.particleColors];
    }

    saveChecklists();
    applyChecklistSettings(checklist);
    closeSettingsModal();
  }

  /**
   * Delete a checklist
   */
  function deleteChecklist(checklistId) {
    const index = checklists.findIndex(c => c.id === checklistId);
    if (index === -1) return;

    removeChecklistWidget(checklistId);
    checklists.splice(index, 1);
    saveChecklists();

    // Re-register context menu items
    registerContextMenuItems();
  }

  /**
   * Create settings modal
   */
  function createSettingsModal() {
    const modal = document.createElement('div');
    modal.id = 'checklist-widget-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <h2>Checklist Widget Settings</h2>

        <div class="settings-tabs">
          <button class="tab-button active" data-tab="checklist-general">General</button>
          <button class="tab-button" data-tab="checklist-appearance">Appearance</button>
          <button class="tab-button" data-tab="checklist-items">Items</button>
          <button class="tab-button" data-tab="checklist-background">Background</button>
        </div>

        <div id="tab-checklist-general" class="tab-panel active">
          <div class="form-group">
            <label>Checklist Name</label>
            <input type="text" id="checklist-widget-name" placeholder="e.g., Shopping List" maxlength="30">
          </div>
        </div>

        <div id="tab-checklist-appearance" class="tab-panel">
          <h3 style="margin:16px 0 12px;font-size:14px;color:#666;">Header</h3>
          <div class="form-group">
            <label>Header Font Family</label>
            <select id="checklist-widget-font" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;">
              <option value="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">System Default</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="'Courier New', monospace">Courier New</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="'Times New Roman', serif">Times New Roman</option>
              <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
              <option value="Verdana, sans-serif">Verdana</option>
              <option value="'Comic Sans MS', cursive">Comic Sans MS</option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Header Font Size (px)</label>
              <input type="number" id="checklist-widget-font-size" min="10" max="48" value="14">
            </div>
            <div class="form-group">
              <label>Header Font Color</label>
              <input type="color" id="checklist-widget-color" value="#ffffff">
            </div>
          </div>

          <hr style="border:0;border-top:1px solid #ddd;margin:16px 0;">

          <div class="form-group">
            <label>Text Shadow</label>
            <div class="checkbox-group">
              <input type="checkbox" id="checklist-widget-shadow" checked>
              <label for="checklist-widget-shadow">Enable shadow for better readability</label>
            </div>
          </div>
        </div>

        <div id="tab-checklist-items" class="tab-panel">
          <h3 style="margin:16px 0 12px;font-size:14px;color:#666;">Item Styling</h3>
          <div class="form-row">
            <div class="form-group">
              <label>Item Font Size (px)</label>
              <input type="number" id="checklist-widget-item-font-size" min="8" max="32" value="13">
            </div>
            <div class="form-group">
              <label>Item Text Color</label>
              <input type="color" id="checklist-widget-item-color" value="#ffffff">
            </div>
          </div>

          <div class="form-group">
            <label>Completed Item Color</label>
            <input type="color" id="checklist-widget-done-color" value="#888888">
          </div>

          <hr style="border:0;border-top:1px solid #ddd;margin:16px 0;">

          <div class="form-group">
            <label>Item Text Shadow</label>
            <div class="checkbox-group">
              <input type="checkbox" id="checklist-widget-item-shadow" checked>
              <label for="checklist-widget-item-shadow">Enable shadow for better readability</label>
            </div>
          </div>

          <hr style="border:0;border-top:1px solid #ddd;margin:16px 0;">

          <h3 style="margin:16px 0 12px;font-size:14px;color:#666;">Particle Explosion</h3>
          <div class="form-group">
            <div class="checkbox-group">
              <input type="checkbox" id="checklist-widget-particle-enabled" checked>
              <label for="checklist-widget-particle-enabled">Enable particle explosion on check</label>
            </div>
          </div>

          <h4 style="margin:16px 0 10px;font-size:13px;color:#777;">Particle Size (px)</h4>
          <div class="form-row">
            <div class="form-group">
              <label>Min</label>
              <input type="number" id="checklist-widget-particle-min-size" min="2" max="20" value="4">
            </div>
            <div class="form-group">
              <label>Max</label>
              <input type="number" id="checklist-widget-particle-max-size" min="2" max="20" value="8">
            </div>
          </div>

          <h4 style="margin:16px 0 10px;font-size:13px;color:#777;">Explosion Distance (px)</h4>
          <div class="form-row">
            <div class="form-group">
              <label>Min</label>
              <input type="number" id="checklist-widget-particle-min-distance" min="20" max="200" value="40">
            </div>
            <div class="form-group">
              <label>Max</label>
              <input type="number" id="checklist-widget-particle-max-distance" min="20" max="300" value="100">
            </div>
          </div>

          <h4 style="margin:16px 0 10px;font-size:13px;color:#777;">Animation Speed (seconds)</h4>
          <div class="form-row">
            <div class="form-group">
              <label>Min</label>
              <input type="number" id="checklist-widget-particle-min-duration" min="0.2" max="2" step="0.1" value="0.5">
            </div>
            <div class="form-group">
              <label>Max</label>
              <input type="number" id="checklist-widget-particle-max-duration" min="0.3" max="3" step="0.1" value="1.0">
            </div>
          </div>

          <div class="form-group" style="margin-top:16px;">
            <label>Particle Colors</label>
            <div id="checklist-widget-particle-color-picker" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">
              <!-- Color swatches will be rendered here -->
            </div>
            <div style="display:flex;gap:8px;margin-top:10px;align-items:center;">
              <input type="color" id="checklist-widget-particle-add-color" value="#4a90d9" style="width:40px;height:36px;border:1px solid #ddd;border-radius:6px;cursor:pointer;">
              <button id="checklist-widget-particle-add-btn" style="padding:8px 16px;border:none;border-radius:6px;background:#4a90d9;color:white;font-size:13px;cursor:pointer;">Add Color</button>
            </div>
            <input type="hidden" id="checklist-widget-particle-colors">
          </div>
        </div>

        <div id="tab-checklist-background" class="tab-panel">
          <div class="form-row">
            <div class="form-group">
              <label>Background Color</label>
              <input type="color" id="checklist-widget-background-color" value="#000000">
            </div>
            <div class="form-group">
              <label>Background Opacity</label>
              <input type="range" id="checklist-widget-background-opacity" min="0" max="1" step="0.05" value="0.3">
              <div style="display:flex;justify-content:space-between;font-size:10px;color:#777;margin-top:4px;">
                <span>Transparent</span>
                <span>Solid</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-buttons">
          <button class="btn btn-secondary" onclick="ChecklistWidget.closeSettingsModal()">Cancel</button>
          <button class="btn btn-danger" onclick="ChecklistWidget.deleteActiveChecklist()" style="margin-right:auto;">Delete Checklist</button>
          <button class="btn btn-primary" onclick="ChecklistWidget.saveSettingsFromModal()">Save</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Tab switching functionality
    const tabButtons = modal.querySelectorAll('.tab-button');
    const tabPanels = modal.querySelectorAll('.tab-panel');

    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabId = 'tab-' + button.dataset.tab;

        // Update button states
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Update panel visibility
        tabPanels.forEach(panel => {
          if (panel.id === tabId) {
            panel.classList.add('active');
          } else {
            panel.classList.remove('active');
          }
        });
      });
    });

    // Particle color picker functionality
    const colorPickerContainer = modal.querySelector('#checklist-widget-particle-color-picker');
    const addColorInput = modal.querySelector('#checklist-widget-particle-add-color');
    const addColorBtn = modal.querySelector('#checklist-widget-particle-add-btn');
    const hiddenColorsInput = modal.querySelector('#checklist-widget-particle-colors');
    let currentColors = [...CONFIG.particleColors];

    function renderColorSwatches() {
      colorPickerContainer.innerHTML = '';
      currentColors.forEach((color, index) => {
        const swatch = document.createElement('div');
        swatch.className = 'particle-color-swatch';
        swatch.style.backgroundColor = color;
        swatch.dataset.color = color;
        swatch.dataset.index = index;
        swatch.title = color + ' (click to remove)';
        colorPickerContainer.appendChild(swatch);
      });
      hiddenColorsInput.value = currentColors.join(', ');
    }

    colorPickerContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('particle-color-swatch')) {
        const index = parseInt(e.target.dataset.index, 10);
        currentColors.splice(index, 1);
        if (currentColors.length === 0) {
          currentColors = [...CONFIG.particleColors];
        }
        renderColorSwatches();
      }
    });

    addColorBtn.addEventListener('click', () => {
      const color = addColorInput.value;
      if (color && !currentColors.includes(color)) {
        currentColors.push(color);
        renderColorSwatches();
      }
    });

    // Store currentColors on modal for access from openSettingsModal
    modal.currentColors = currentColors;
    modal.renderColorSwatches = renderColorSwatches;
    modal.hiddenColorsInput = hiddenColorsInput;
  }

  /**
   * Add widget styles to the page
   */
  function addStyles() {
    const style = document.createElement('style');
    style.id = 'checklist-widget-styles';
    style.textContent = `
      .checklist-widget {
        position: fixed;
        padding: 12px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 12px;
        backdrop-filter: blur(10px);
        cursor: grab;
        z-index: 9999;
        user-select: none;
        transition: background 0.2s ease;
        min-width: 200px;
        min-height: 100px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .checklist-widget:hover {
        background: rgba(0, 0, 0, 0.5);
      }

      .checklist-header {
        font-weight: 600;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        cursor: grab;
      }

      .checklist-add-item {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
      }

      .checklist-add-input {
        flex: 1;
        padding: 6px 10px;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
        font-size: 13px;
        outline: none;
      }

      .checklist-add-input::placeholder {
        color: rgba(255, 255, 255, 0.5);
      }

      .checklist-add-input:focus {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.5);
      }

      .checklist-add-btn {
        width: 28px;
        height: 28px;
        border: none;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.2);
        color: #ffffff;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s;
      }

      .checklist-add-btn:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .checklist-items {
        display: flex;
        flex-direction: column;
        gap: 6px;
        overflow-y: auto;
        flex: 1;
        min-height: 0;
      }

      .checklist-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 6px;
        border-radius: 6px;
        transition: background 0.15s;
      }

      .checklist-item:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .checklist-item.done .checklist-item-label {
        text-decoration: line-through;
        opacity: 0.6;
      }

      /* Custom Checkbox */
      .checklist-custom-checkbox {
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        flex-shrink: 0;
        width: 20px;
        height: 20px;
      }

      .checkbox-box {
        width: 18px;
        height: 18px;
        border: 2px solid rgba(255, 255, 255, 0.5);
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        background: rgba(255, 255, 255, 0.1);
      }

      .checkbox-box:hover {
        border-color: rgba(255, 255, 255, 0.8);
        background: rgba(255, 255, 255, 0.15);
      }

      .checkbox-box.checked {
        background: linear-gradient(135deg, #4a90d9 0%, #6ab0f9 100%);
        border-color: #4a90d9;
        animation: checkbox-pop 0.3s ease;
      }

      .checkbox-box.checked .checkbox-check {
        opacity: 1;
        transform: scale(1);
      }

      .checkbox-check {
        width: 14px;
        height: 14px;
        color: #ffffff;
        opacity: 0;
        transform: scale(0);
        transition: all 0.15s ease;
      }

      @keyframes checkbox-pop {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
      }

      /* Particles */
      .checklist-particle {
        position: fixed;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        pointer-events: none;
        z-index: 10000;
        transform: translate(-50%, -50%);
        animation: particle-fly var(--duration) ease-out forwards;
      }

      @keyframes particle-fly {
        0% {
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
        }
        100% {
          transform: translate(calc(-50% + var(--dest-x)), calc(-50% + var(--dest-y))) scale(0);
          opacity: 0;
        }
      }

      .checklist-item-label {
        flex: 1;
        cursor: pointer;
        word-break: break-word;
      }

      .checklist-item-edit-input {
        width: 100%;
        padding: 4px 8px;
        border: 1px solid rgba(255, 255, 255, 0.5);
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.2);
        color: #ffffff;
        font-size: inherit;
        outline: none;
      }

      .checklist-item-edit-input:focus {
        background: rgba(255, 255, 255, 0.25);
      }

      .checklist-item-remove {
        width: 20px;
        height: 20px;
        border: none;
        border-radius: 4px;
        background: transparent;
        color: rgba(255, 255, 255, 0.5);
        font-size: 16px;
        cursor: pointer;
        opacity: 0;
        transition: all 0.15s;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .checklist-item:hover .checklist-item-remove {
        opacity: 1;
      }

      .checklist-item-remove:hover {
        background: rgba(255, 0, 0, 0.3);
        color: #ff6b6b;
      }

      .checklist-resize-handle {
        position: absolute;
        bottom: 2px;
        right: 2px;
        width: 12px;
        height: 12px;
        cursor: nwse-resize;
        opacity: 0;
        transition: opacity 0.15s;
      }

      .checklist-widget:hover .checklist-resize-handle {
        opacity: 1;
      }

      .checklist-resize-handle::after {
        content: '';
        position: absolute;
        bottom: 0;
        right: 0;
        border-bottom: 6px solid rgba(255, 255, 255, 0.6);
        border-right: 6px solid rgba(255, 255, 255, 0.6);
        border-bottom-left-radius: 2px;
      }

      #checklist-widget-modal .modal {
        background: #fff;
        border-radius: 12px;
        padding: 24px;
        min-width: 450px;
        max-width: 600px;
        height: 500px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      }

      #checklist-widget-modal .modal h2 {
        margin-bottom: 20px;
        font-size: 18px;
        color: #333;
      }

      /* Settings Tabs */
      #checklist-widget-modal .settings-tabs {
        display: flex;
        gap: 4px;
        margin-bottom: 16px;
        border-bottom: 2px solid #e0e0e0;
        padding-bottom: 0;
      }

      #checklist-widget-modal .tab-button {
        padding: 10px 16px;
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        margin-bottom: -2px;
        cursor: pointer;
        font-size: 14px;
        color: #666;
        transition: all 0.2s;
        border-radius: 6px 6px 0 0;
      }

      #checklist-widget-modal .tab-button:hover {
        color: #333;
        background: rgba(0, 0, 0, 0.05);
      }

      #checklist-widget-modal .tab-button.active {
        color: #4a90d9 !important;
        border-bottom-color: #4a90d9 !important;
        font-weight: 500 !important;
        background: rgba(74, 144, 217, 0.08);
      }

      #checklist-widget-modal .tab-panel {
        display: none !important;
        flex: 1;
        overflow-y: auto;
      }

      #checklist-widget-modal .tab-panel.active {
        display: block !important;
      }

      #checklist-widget-modal .tab-panel h3 {
        margin: 16px 0 12px;
        font-size: 14px;
        color: #666;
        font-weight: 500;
      }

      #checklist-widget-modal .tab-panel h3:first-child {
        margin-top: 0;
      }

      #checklist-widget-modal .form-group {
        margin-bottom: 16px;
      }

      #checklist-widget-modal .form-group label {
        display: block;
        margin-bottom: 6px;
        font-size: 13px;
        color: #555;
        font-weight: 500;
      }

      #checklist-widget-modal .form-group input[type="text"],
      #checklist-widget-modal .form-group input[type="number"],
      #checklist-widget-modal .form-group select {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
      }

      #checklist-widget-modal .form-group input[type="color"] {
        width: 60px;
        height: 36px;
        border: 1px solid #ddd;
        border-radius: 6px;
        cursor: pointer;
      }

      #checklist-widget-modal .form-group input[type="range"] {
        width: 100%;
      }

      #checklist-widget-modal .form-row {
        display: flex;
        gap: 16px;
      }

      #checklist-widget-modal .form-row .form-group {
        flex: 1;
      }

      #checklist-widget-modal .checkbox-group {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 0;
      }

      #checklist-widget-modal .checkbox-group input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
      }

      #checklist-widget-modal .checkbox-group label {
        cursor: pointer;
        font-size: 14px;
      }

      /* Particle Color Swatches */
      #checklist-widget-modal .particle-color-swatch {
        width: 36px;
        height: 36px;
        border-radius: 6px;
        cursor: pointer;
        border: 2px solid rgba(0, 0, 0, 0.2);
        transition: all 0.15s ease;
        position: relative;
      }

      #checklist-widget-modal .particle-color-swatch:hover {
        transform: scale(1.1);
        border-color: rgba(0, 0, 0, 0.4);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }

      #checklist-widget-modal .particle-color-swatch::after {
        content: '×';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-size: 20px;
        font-weight: bold;
        opacity: 0;
        text-shadow: 0 0 3px rgba(0, 0, 0, 0.8);
        transition: opacity 0.15s;
      }

      #checklist-widget-modal .particle-color-swatch:hover::after {
        opacity: 1;
      }

      #checklist-widget-modal .modal-buttons {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin-top: 24px;
      }

      #checklist-widget-modal .btn {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        transition: background-color 0.15s;
      }

      #checklist-widget-modal .btn-primary {
        background: #4a90d9;
        color: white;
      }

      #checklist-widget-modal .btn-primary:hover {
        background: #3a7bc8;
      }

      #checklist-widget-modal .btn-secondary {
        background: #e0e0e0;
        color: #333;
      }

      #checklist-widget-modal .btn-secondary:hover {
        background: #d0d0d0;
      }

      #checklist-widget-modal .btn-danger {
        background: #e74c3c;
        color: white;
      }

      #checklist-widget-modal .btn-danger:hover {
        background: #c0392b;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Register context menu items for the checklist widget
   */
  function registerContextMenuItems() {
    if (!window.ContextMenuService) {
      console.warn('ContextMenuService not available');
      return;
    }

    // Register "Add New Checklist" action
    ContextMenuService.registerMenuItem({
      id: 'checklist-add-new',
      label: 'Add New Checklist',
      icon: '📝',
      separator: true,
      action: () => {
        const newChecklist = createDefaultChecklist();
        checklists.push(newChecklist);
        createChecklistWidget(newChecklist);
        applyChecklistSettings(newChecklist);
        saveChecklists();

        // Re-register to update any visibility states
        registerContextMenuItems();

        // Open settings for the new checklist
        setTimeout(() => {
          openSettingsModal(newChecklist);
        }, 100);
      }
    });

    // Register "Remove Checklist" action (only if more than one checklist exists)
    ContextMenuService.registerMenuItem({
      id: 'checklist-remove',
      label: 'Remove Checklist',
      icon: '🗑️',
      action: () => {
        if (activeChecklistId) {
          deleteChecklist(activeChecklistId);
        }
      },
      visible: () => checklists.length > 1 && activeChecklistId !== null
    });
  }

  /**
   * Initialize the checklist widget
   */
  function init() {
    const savedChecklists = loadChecklists();

    if (savedChecklists && savedChecklists.length > 0) {
      checklists = savedChecklists;
    } else {
      // Create default checklist if none exist
      checklists = [createDefaultChecklist()];
      saveChecklists();
    }

    addStyles();
    createSettingsModal();

    // Create all checklist widgets
    checklists.forEach(checklist => {
      createChecklistWidget(checklist);
      applyChecklistSettings(checklist);
    });

    // Register context menu items
    registerContextMenuItems();

    console.log(`Checklist widget initialized with ${checklists.length} checklist(s)`);
  }

  // Public API
  window.ChecklistWidget = {
    init,
    openSettingsModal,
    closeSettingsModal,
    saveSettingsFromModal,
    deleteActiveChecklist: () => {
      if (activeChecklistId) {
        deleteChecklist(activeChecklistId);
        closeSettingsModal();
      }
    },
    getChecklists: () => checklists.map(c => ({ ...c })),
    getActiveChecklistId: () => activeChecklistId,
    addChecklist: () => {
      const newChecklist = createDefaultChecklist();
      checklists.push(newChecklist);
      createChecklistWidget(newChecklist);
      applyChecklistSettings(newChecklist);
      saveChecklists();
      registerContextMenuItems();
      return newChecklist;
    },
    removeChecklist: deleteChecklist,
    registerContextMenuItems
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
