/**
 * Digital Clock Widget
 * A customizable clock widget that supports multiple instances with individual timezones and appearances
 */

(function() {
  // Widget configuration
  const CONFIG = {
    defaultFont: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    defaultFontSize: 16,
    defaultColor: '#ffffff',
    defaultPosition: { x: 20, y: 20 },
    shadow: true,
    dateFontSize: 12,
    dateColor: '#cccccc',
    textAlign: 'left'
  };

  // Common timezones
  const TIMEZONES = [
    { value: '', label: 'System Local Time' },
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'New York (ET)' },
    { value: 'America/Chicago', label: 'Chicago (CT)' },
    { value: 'America/Denver', label: 'Denver (MT)' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (PT)' },
    { value: 'America/Anchorage', label: 'Alaska (AKT)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii (HST)' },
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'Europe/Paris', label: 'Paris (CET)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET)' },
    { value: 'Europe/Moscow', label: 'Moscow (MSK)' },
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
    { value: 'Asia/Kolkata', label: 'Mumbai (IST)' },
    { value: 'Asia/Bangkok', label: 'Bangkok (ICT)' },
    { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Seoul', label: 'Seoul (KST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AET)' },
    { value: 'Pacific/Auckland', label: 'Auckland (NZT)' }
  ];

  // Widget state - stores all clock instances
  let clocks = [];
  let activeClockId = null;
  let intervalId = null;

  /**
   * Load all clock settings from localStorage
   */
  function loadClocks() {
    try {
      const saved = localStorage.getItem('clockWidgets');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [parsed];
      }
    } catch (e) {
      console.error('Failed to load clock widget settings:', e);
    }
    return null;
  }

  /**
   * Save all clock settings to localStorage
   */
  function saveClocks() {
    try {
      localStorage.setItem('clockWidgets', JSON.stringify(clocks));
    } catch (e) {
      console.error('Failed to save clock widget settings:', e);
    }
  }

  /**
   * Generate unique ID for a new clock
   */
  function generateClockId() {
    return 'clock_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Create default clock settings
   */
  function createDefaultClock() {
    return {
      id: generateClockId(),
      name: 'Clock',
      timezone: '',
      font: CONFIG.defaultFont,
      fontSize: CONFIG.defaultFontSize,
      color: CONFIG.defaultColor,
      x: CONFIG.defaultPosition.x + (clocks.length * 30),
      y: CONFIG.defaultPosition.y + (clocks.length * 30),
      shadow: CONFIG.shadow,
      showName: false,
      namePosition: 'title',
      nameFont: CONFIG.defaultFont,
      nameFontSize: 10,
      nameColor: CONFIG.dateColor,
      showDate: true,
      dateFontSize: CONFIG.dateFontSize,
      dateColor: CONFIG.dateColor,
      textAlign: CONFIG.textAlign,
      hourFormat: '12',
      backgroundColor: '#000000',
      backgroundOpacity: 0.3
    };
  }

  /**
   * Format time for display
   */
  function formatTime(date, hourFormat = '12') {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const displayMinutes = minutes.toString().padStart(2, '0');

    if (hourFormat === '24') {
      const displayHours = hours.toString().padStart(2, '0');
      return `${displayHours}<span class="clock-colon">:</span>${displayMinutes}`;
    } else {
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}<span class="clock-colon">:</span>${displayMinutes} <span class="clock-ampm">${ampm}</span>`;
    }
  }

  /**
   * Format date for display
   */
  function formatDate(date) {
    return date.toLocaleDateString([], {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Get current time for a specific timezone
   */
  function getTimeForTimezone(timezone) {
    const now = new Date();
    if (!timezone) return now;

    try {
      const timeString = now.toLocaleString('en-US', { timeZone: timezone });
      return new Date(timeString);
    } catch (e) {
      console.error(`Invalid timezone: ${timezone}`, e);
      return now;
    }
  }

  /**
   * Update a specific clock display
   */
  function updateClock(clock) {
    const widget = document.getElementById(`clock-widget-${clock.id}`);
    if (!widget) return;

    const timeElement = widget.querySelector('.clock-widget-time');
    const dateElement = widget.querySelector('.clock-widget-date');

    if (!timeElement || !dateElement) return;

    const now = getTimeForTimezone(clock.timezone);
    timeElement.innerHTML = formatTime(now, clock.hourFormat || '12');
    dateElement.textContent = formatDate(now);
  }

  /**
   * Update all clocks
   */
  function updateAllClocks() {
    clocks.forEach(clock => updateClock(clock));
  }

  /**
   * Apply settings to a specific clock widget
   */
  function applyClockSettings(clock) {
    const widget = document.getElementById(`clock-widget-${clock.id}`);
    if (!widget) return;

    const timeRow = widget.querySelector('.clock-widget-time-row');
    const nameElement = widget.querySelector('.clock-widget-name');
    const timeElement = widget.querySelector('.clock-widget-time');
    const dateElement = widget.querySelector('.clock-widget-date');

    // Widget position and alignment
    widget.style.left = (clock.x || CONFIG.defaultPosition.x) + 'px';
    widget.style.top = (clock.y || CONFIG.defaultPosition.y) + 'px';
    widget.style.right = '';
    widget.style.textAlign = clock.textAlign || CONFIG.textAlign;
    
    // Widget dimensions
    if (clock.width) {
      widget.style.width = clock.width + 'px';
    }
    if (clock.height) {
      widget.style.height = clock.height + 'px';
    }

    // Background color and opacity
    const bgColor = clock.backgroundColor || '#000000';
    const bgOpacity = clock.backgroundOpacity ?? 0.3;
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

    // Update widget class for alignment
    widget.classList.remove('center', 'right');
    if (clock.textAlign === 'center') {
      widget.classList.add('center');
      // For center alignment, span widget across screen so justify-content works
      widget.style.right = '24px';
    } else if (clock.textAlign === 'right') {
      widget.classList.add('right');
      // For right alignment, span widget across screen so justify-content works
      widget.style.right = '24px';
    }

    // Handle name position
    const namePosition = clock.namePosition || 'title';
    const showName = clock.showName !== false;

    // Name element settings
    nameElement.textContent = clock.name || 'Clock';
    nameElement.style.fontFamily = clock.nameFont || clock.font || CONFIG.defaultFont;
    nameElement.style.fontSize = (clock.nameFontSize || 10) + 'px';
    nameElement.style.color = clock.nameColor || CONFIG.dateColor;
    nameElement.style.textShadow = clock.shadow !== false ? '1px 1px 3px rgba(0,0,0,0.8)' : 'none';

    // Clear inline styles
    nameElement.style.marginLeft = '';
    nameElement.style.marginRight = '';
    nameElement.style.order = '';

    if (!showName) {
      nameElement.style.display = 'none';
      timeElement.style.display = 'block';
      timeElement.style.width = '100%';
    } else if (namePosition === 'before') {
      nameElement.style.display = 'inline-block';
      timeElement.style.display = 'inline-block';
      timeElement.style.width = 'auto';
      nameElement.style.order = '1';
      timeElement.style.order = '2';
      nameElement.style.marginRight = '8px';
    } else if (namePosition === 'after') {
      nameElement.style.display = 'inline-block';
      timeElement.style.display = 'inline-block';
      timeElement.style.width = 'auto';
      nameElement.style.order = '2';
      timeElement.style.order = '1';
      nameElement.style.marginLeft = '8px';
    } else {
      // title position (default)
      nameElement.style.display = 'block';
      timeElement.style.display = 'block';
      timeElement.style.width = '100%';
      nameElement.style.order = '';
      timeElement.style.order = '';
    }

    // Time element settings
    timeElement.style.fontFamily = clock.font || CONFIG.defaultFont;
    timeElement.style.fontSize = (clock.fontSize || CONFIG.defaultFontSize) + 'px';
    timeElement.style.color = clock.color || CONFIG.defaultColor;
    timeElement.style.textShadow = clock.shadow !== false ? '1px 1px 3px rgba(0,0,0,0.8)' : 'none';

    // Date element settings
    dateElement.style.fontFamily = clock.dateFont || clock.font || CONFIG.defaultFont;
    dateElement.style.fontSize = (clock.dateFontSize || CONFIG.dateFontSize) + 'px';
    dateElement.style.color = clock.dateColor || CONFIG.dateColor;
    dateElement.style.textShadow = clock.shadow !== false ? '1px 1px 3px rgba(0,0,0,0.8)' : 'none';
    dateElement.style.display = clock.showDate !== false ? 'block' : 'none';

    // Ensure date is always after time row
    if (dateElement.parentNode !== widget || widget.lastChild !== dateElement) {
      widget.appendChild(dateElement);
    }
  }

  /**
   * Start the clock update interval
   */
  function startClocks() {
    if (intervalId) clearInterval(intervalId);
    updateAllClocks();
    intervalId = setInterval(updateAllClocks, 1000);
  }

  /**
   * Stop the clock update interval
   */
  function stopClocks() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  /**
   * Create a clock widget DOM element
   */
  function createClockWidget(clock) {
    const widget = document.createElement('div');
    widget.id = `clock-widget-${clock.id}`;
    widget.className = 'clock-widget';
    widget.dataset.clockId = clock.id;

    const timeRow = document.createElement('div');
    timeRow.className = 'clock-widget-time-row';

    const nameElement = document.createElement('div');
    nameElement.className = 'clock-widget-name';

    const timeElement = document.createElement('div');
    timeElement.className = 'clock-widget-time';

    const dateElement = document.createElement('div');
    dateElement.className = 'clock-widget-date';

    timeRow.appendChild(nameElement);
    timeRow.appendChild(timeElement);
    widget.appendChild(timeRow);
    widget.appendChild(dateElement);
    document.body.appendChild(widget);

    // Add drag and resize functionality
    let isDragging = false;
    let isResizing = false;
    let dragOffset = { x: 0, y: 0 };
    let resizeStartPos = { x: 0, y: 0 };
    let resizeStartSize = { width: 0, height: 0 };

    // Resize handle (bottom-right corner, like sticky notes and checklists)
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'clock-resize-handle';
    resizeHandle.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      isResizing = true;
      resizeStartPos = { x: e.clientX, y: e.clientY };
      resizeStartSize = { width: widget.offsetWidth, height: widget.offsetHeight };
      e.preventDefault();
      e.stopPropagation();
    });
    widget.appendChild(resizeHandle);

    widget.addEventListener('mousedown', (e) => {
      if (e.target === resizeHandle) return;
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
        clock.x = e.clientX - dragOffset.x;
        clock.y = e.clientY - dragOffset.y;
        saveClocks();
      }

      if (isResizing) {
        e.preventDefault();
        const newWidth = resizeStartSize.width + (e.clientX - resizeStartPos.x);
        const newHeight = resizeStartSize.height + (e.clientY - resizeStartPos.y);
        widget.style.width = Math.max(100, newWidth) + 'px';
        widget.style.height = Math.max(50, newHeight) + 'px';
        clock.width = Math.max(100, newWidth);
        clock.height = Math.max(50, newHeight);
        clock.x = widget.offsetLeft;
        clock.y = widget.offsetTop;
        saveClocks();
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      isResizing = false;
      widget.style.cursor = 'grab';
    });

    // Right-click for settings
    widget.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      activeClockId = clock.id;
      openSettingsModal(clock);
    });

    return widget;
  }

  /**
   * Remove a clock widget
   */
  function removeClockWidget(clockId) {
    const widget = document.getElementById(`clock-widget-${clockId}`);
    if (widget) {
      widget.remove();
    }
  }

  /**
   * Open settings modal for a specific clock
   */
  function openSettingsModal(clock) {
    const modal = document.getElementById('clock-widget-modal');
    const clockNameInput = document.getElementById('clock-widget-name');
    const timezoneSelect = document.getElementById('clock-widget-timezone');
    const fontSelect = document.getElementById('clock-widget-font');
    const fontSizeInput = document.getElementById('clock-widget-font-size');
    const colorInput = document.getElementById('clock-widget-color');
    const shadowCheckbox = document.getElementById('clock-widget-shadow');
    const showNameCheckbox = document.getElementById('clock-widget-show-name');
    const namePositionSelect = document.getElementById('clock-widget-name-position');
    const nameFontSelect = document.getElementById('clock-widget-name-font');
    const nameFontSizeInput = document.getElementById('clock-widget-name-font-size');
    const nameColorInput = document.getElementById('clock-widget-name-color');
    const showDateCheckbox = document.getElementById('clock-widget-show-date');
    const dateFontSelect = document.getElementById('clock-widget-date-font');
    const dateFontSizeInput = document.getElementById('clock-widget-date-font-size');
    const dateColorInput = document.getElementById('clock-widget-date-color');
    const textAlignSelect = document.getElementById('clock-widget-text-align');
    const hourFormatSelect = document.getElementById('clock-widget-hour-format');
    const backgroundColorInput = document.getElementById('clock-widget-background-color');
    const backgroundOpacityInput = document.getElementById('clock-widget-background-opacity');

    // Populate timezone options if empty
    if (timezoneSelect.options.length === 0) {
      TIMEZONES.forEach(tz => {
        const option = document.createElement('option');
        option.value = tz.value;
        option.textContent = tz.label;
        timezoneSelect.appendChild(option);
      });
    }

    clockNameInput.value = clock.name || 'Clock';
    timezoneSelect.value = clock.timezone || '';
    fontSelect.value = clock.font || CONFIG.defaultFont;
    fontSizeInput.value = clock.fontSize || CONFIG.defaultFontSize;
    colorInput.value = clock.color || CONFIG.defaultColor;
    shadowCheckbox.checked = clock.shadow !== false;
    showNameCheckbox.checked = clock.showName !== false;
    namePositionSelect.value = clock.namePosition || 'title';
    nameFontSelect.value = clock.nameFont || clock.font || CONFIG.defaultFont;
    nameFontSizeInput.value = clock.nameFontSize || 10;
    nameColorInput.value = clock.nameColor || CONFIG.dateColor;
    showDateCheckbox.checked = clock.showDate !== false;
    dateFontSelect.value = clock.dateFont || clock.font || CONFIG.defaultFont;
    dateFontSizeInput.value = clock.dateFontSize || CONFIG.dateFontSize;
    dateColorInput.value = clock.dateColor || CONFIG.dateColor;
    textAlignSelect.value = clock.textAlign || CONFIG.textAlign;
    hourFormatSelect.value = clock.hourFormat || '12';
    backgroundColorInput.value = clock.backgroundColor || '#000000';
    backgroundOpacityInput.value = clock.backgroundOpacity ?? 0.3;

    activeClockId = clock.id;
    modal.classList.add('visible');

    // Toggle name controls visibility based on current checkbox state
    const namePositionGroup = document.getElementById('name-position-group');
    const nameFontGroup = document.getElementById('name-font-group');
    const nameFontSizeRow = document.getElementById('name-font-size-row');
    const show = showNameCheckbox.checked;
    namePositionGroup.style.display = show ? 'block' : 'none';
    nameFontGroup.style.display = show ? 'block' : 'none';
    nameFontSizeRow.style.display = show ? 'flex' : 'none';
  }

  /**
   * Close settings modal
   */
  function closeSettingsModal() {
    document.getElementById('clock-widget-modal').classList.remove('visible');
    activeClockId = null;
  }

  /**
   * Save settings from modal for the active clock
   */
  function saveSettingsFromModal() {
    const clock = clocks.find(c => c.id === activeClockId);
    if (!clock) return;

    const clockNameInput = document.getElementById('clock-widget-name');
    const timezoneSelect = document.getElementById('clock-widget-timezone');
    const fontSelect = document.getElementById('clock-widget-font');
    const fontSizeInput = document.getElementById('clock-widget-font-size');
    const colorInput = document.getElementById('clock-widget-color');
    const shadowCheckbox = document.getElementById('clock-widget-shadow');
    const showNameCheckbox = document.getElementById('clock-widget-show-name');
    const namePositionSelect = document.getElementById('clock-widget-name-position');
    const nameFontSelect = document.getElementById('clock-widget-name-font');
    const nameFontSizeInput = document.getElementById('clock-widget-name-font-size');
    const nameColorInput = document.getElementById('clock-widget-name-color');
    const showDateCheckbox = document.getElementById('clock-widget-show-date');
    const dateFontSelect = document.getElementById('clock-widget-date-font');
    const dateFontSizeInput = document.getElementById('clock-widget-date-font-size');
    const dateColorInput = document.getElementById('clock-widget-date-color');
    const textAlignSelect = document.getElementById('clock-widget-text-align');
    const hourFormatSelect = document.getElementById('clock-widget-hour-format');
    const backgroundColorInput = document.getElementById('clock-widget-background-color');
    const backgroundOpacityInput = document.getElementById('clock-widget-background-opacity');

    clock.name = clockNameInput.value || 'Clock';
    clock.timezone = timezoneSelect.value;
    clock.font = fontSelect.value;
    clock.fontSize = parseInt(fontSizeInput.value, 10);
    clock.color = colorInput.value;
    clock.shadow = shadowCheckbox.checked;
    clock.showName = showNameCheckbox.checked;
    clock.namePosition = namePositionSelect.value;
    clock.nameFont = nameFontSelect.value;
    clock.nameFontSize = parseInt(nameFontSizeInput.value, 10);
    clock.nameColor = nameColorInput.value;
    clock.showDate = showDateCheckbox.checked;
    clock.dateFont = dateFontSelect.value;
    clock.dateFontSize = parseInt(dateFontSizeInput.value, 10);
    clock.dateColor = dateColorInput.value;
    clock.textAlign = textAlignSelect.value;
    clock.hourFormat = hourFormatSelect.value;
    clock.backgroundColor = backgroundColorInput.value;
    clock.backgroundOpacity = parseFloat(backgroundOpacityInput.value);

    saveClocks();
    applyClockSettings(clock);
    updateClock(clock);
    closeSettingsModal();
  }

  /**
   * Delete a clock
   */
  function deleteClock(clockId) {
    const index = clocks.findIndex(c => c.id === clockId);
    if (index === -1) return;

    removeClockWidget(clockId);
    clocks.splice(index, 1);
    saveClocks();

    // Update context menu registration
    registerContextMenuItems();
  }

  /**
   * Create settings modal
   */
  function createSettingsModal() {
    const modal = document.createElement('div');
    modal.id = 'clock-widget-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <h2>Clock Widget Settings</h2>

        <div class="settings-tabs">
          <button class="tab-button active" data-tab="clock-general">General</button>
          <button class="tab-button" data-tab="clock-appearance">Appearance</button>
          <button class="tab-button" data-tab="clock-name">Name & Date</button>
          <button class="tab-button" data-tab="clock-background">Background</button>
        </div>

        <div id="tab-clock-general" class="tab-panel active">
          <div class="form-row">
            <div class="form-group">
              <label>Clock Name</label>
              <input type="text" id="clock-widget-name" placeholder="e.g., Home Clock" maxlength="30">
            </div>
            <div class="form-group">
              <label>Time Zone</label>
              <select id="clock-widget-timezone" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;">
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Time Format</label>
            <select id="clock-widget-hour-format" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;">
              <option value="12">12-hour (with AM/PM)</option>
              <option value="24">24-hour</option>
            </select>
          </div>

          <div class="form-group">
            <label>Text Alignment</label>
            <select id="clock-widget-text-align" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;">
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
        </div>

        <div id="tab-clock-appearance" class="tab-panel">
          <h3 style="margin:16px 0 12px;font-size:14px;color:#666;">Time</h3>
          <div class="form-group">
            <label>Time Font Family</label>
            <select id="clock-widget-font" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;">
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
              <label>Time Font Size (px)</label>
              <input type="number" id="clock-widget-font-size" min="10" max="48" value="16">
            </div>
            <div class="form-group">
              <label>Time Font Color</label>
              <input type="color" id="clock-widget-color" value="#ffffff">
            </div>
          </div>

          <hr style="border:0;border-top:1px solid #ddd;margin:16px 0;">

          <h3 style="margin:16px 0 12px;font-size:14px;color:#666;">Date</h3>
          <div class="form-group">
            <label>Date Font Family</label>
            <select id="clock-widget-date-font" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;">
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
              <label>Date Font Size (px)</label>
              <input type="number" id="clock-widget-date-font-size" min="8" max="32" value="12">
            </div>
            <div class="form-group">
              <label>Date Font Color</label>
              <input type="color" id="clock-widget-date-color" value="#cccccc">
            </div>
          </div>

          <hr style="border:0;border-top:1px solid #ddd;margin:16px 0;">

          <div class="form-group">
            <label>Text Shadow</label>
            <div class="checkbox-group">
              <input type="checkbox" id="clock-widget-shadow" checked>
              <label for="clock-widget-shadow">Enable shadow for better readability</label>
            </div>
          </div>
        </div>

        <div id="tab-clock-name" class="tab-panel">
          <h3 style="margin:16px 0 12px;font-size:14px;color:#666;">Clock Name</h3>
          <div class="form-group">
            <div class="checkbox-group">
              <input type="checkbox" id="clock-widget-show-name">
              <label for="clock-widget-show-name">Show clock name</label>
            </div>
          </div>

          <div class="form-group" id="name-position-group">
            <label>Name Position</label>
            <select id="clock-widget-name-position" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;">
              <option value="title">Title (above time)</option>
              <option value="before">Before time (inline)</option>
              <option value="after">After time (inline)</option>
            </select>
          </div>

          <div class="form-group" id="name-font-group">
            <label>Name Font Family</label>
            <select id="clock-widget-name-font" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;">
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

          <div class="form-row" id="name-font-size-row">
            <div class="form-group">
              <label>Name Font Size (px)</label>
              <input type="number" id="clock-widget-name-font-size" min="8" max="24" value="10">
            </div>
            <div class="form-group">
              <label>Name Font Color</label>
              <input type="color" id="clock-widget-name-color" value="#cccccc">
            </div>
          </div>

          <hr style="border:0;border-top:1px solid #ddd;margin:16px 0;">

          <h3 style="margin:16px 0 12px;font-size:14px;color:#666;">Date Display</h3>
          <div class="form-group">
            <div class="checkbox-group">
              <input type="checkbox" id="clock-widget-show-date" checked>
              <label for="clock-widget-show-date">Show date below time</label>
            </div>
          </div>
        </div>

        <div id="tab-clock-background" class="tab-panel">
          <div class="form-row">
            <div class="form-group">
              <label>Background Color</label>
              <input type="color" id="clock-widget-background-color" value="#000000">
            </div>
            <div class="form-group">
              <label>Background Opacity</label>
              <input type="range" id="clock-widget-background-opacity" min="0" max="1" step="0.05" value="0.3">
              <div style="display:flex;justify-content:space-between;font-size:10px;color:#777;margin-top:4px;">
                <span>Transparent</span>
                <span>Solid</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-buttons">
          <button class="btn btn-secondary" onclick="ClockWidget.closeSettingsModal()">Cancel</button>
          <button class="btn btn-danger" onclick="ClockWidget.deleteActiveClock()" style="margin-right:auto;">Delete Clock</button>
          <button class="btn btn-primary" onclick="ClockWidget.saveSettingsFromModal()">Save</button>
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

    // Toggle name-related controls visibility
    const showNameCheckbox = document.getElementById('clock-widget-show-name');
    const namePositionGroup = document.getElementById('name-position-group');
    const nameFontGroup = document.getElementById('name-font-group');
    const nameFontSizeRow = document.getElementById('name-font-size-row');

    function toggleNameControls() {
      const show = showNameCheckbox.checked;
      namePositionGroup.style.display = show ? 'block' : 'none';
      nameFontGroup.style.display = show ? 'block' : 'none';
      nameFontSizeRow.style.display = show ? 'flex' : 'none';
    }

    showNameCheckbox.addEventListener('change', toggleNameControls);

    // Initialize visibility
    toggleNameControls();
  }

  /**
   * Add widget styles to the page
   */
  function addStyles() {
    const style = document.createElement('style');
    style.id = 'clock-widget-styles';
    style.textContent = `
      .clock-widget {
        position: fixed;
        padding: 16px 24px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 12px;
        backdrop-filter: blur(10px);
        cursor: grab;
        z-index: 9999;
        user-select: none;
        transition: background 0.2s ease;
        min-width: 100px;
        min-height: 50px;
      }

      .clock-widget .clock-resize-handle {
        position: absolute;
        bottom: 3px;
        right: 3px;
        width: 14px;
        height: 14px;
        cursor: se-resize;
        opacity: 0;
        transition: opacity 0.2s;
      }

      .clock-widget:hover .clock-resize-handle {
        opacity: 1;
      }

      .clock-widget .clock-resize-handle::after {
        content: '';
        position: absolute;
        bottom: 2px;
        right: 2px;
        width: 10px;
        height: 10px;
        border-right: 2px solid rgba(255, 255, 255, 0.5);
        border-bottom: 2px solid rgba(255, 255, 255, 0.5);
        border-radius: 0 0 2px 0;
      }

      .clock-widget-time-row {
        white-space: nowrap;
        display: flex;
        align-items: baseline;
      }

      /* For center alignment, center content within the full-width widget */
      .clock-widget.center .clock-widget-time-row {
        justify-content: center;
      }

      /* For right alignment, push content to the right */
      .clock-widget.right .clock-widget-time-row {
        justify-content: flex-end;
      }

      .clock-widget:hover {
        background: rgba(0, 0, 0, 0.5);
      }

      .clock-widget-time {
        font-weight: 600;
        line-height: 1.3;
        display: inline-block;
        vertical-align: baseline;
      }

      .clock-widget-time .clock-colon {
        animation: blink 1s steps(1) infinite;
      }

      @keyframes blink {
        0%, 49% { opacity: 1; }
        50%, 100% { opacity: 0; }
      }

      .clock-widget-date {
        font-size: 0.7em;
        opacity: 0.85;
        margin-top: 4px;
        font-weight: 400;
        display: block;
      }

      .clock-widget-name {
        font-size: 0.65em;
        opacity: 0.75;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        white-space: nowrap;
        display: inline-block;
        vertical-align: baseline;
      }

      #clock-widget-modal .modal {
        background: #fff;
        border-radius: 12px;
        padding: 24px;
        min-width: 450px;
        max-width: 600px;
        height: 600px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      }

      #clock-widget-modal .modal h2 {
        margin-bottom: 20px;
        font-size: 18px;
        color: #333;
      }

      /* Settings Tabs */
      #clock-widget-modal .settings-tabs {
        display: flex;
        gap: 4px;
        margin-bottom: 16px;
        border-bottom: 2px solid #e0e0e0;
        padding-bottom: 0;
      }

      #clock-widget-modal .tab-button {
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

      #clock-widget-modal .tab-button:hover {
        color: #333;
        background: rgba(0, 0, 0, 0.05);
      }

      #clock-widget-modal .tab-button.active {
        color: #4a90d9 !important;
        border-bottom-color: #4a90d9 !important;
        font-weight: 500 !important;
        background: rgba(74, 144, 217, 0.08);
      }

      #clock-widget-modal .tab-panel {
        display: none !important;
        flex: 1;
        overflow-y: auto;
      }

      #clock-widget-modal .tab-panel.active {
        display: block !important;
      }

      #clock-widget-modal .tab-panel h3 {
        margin: 16px 0 12px;
        font-size: 14px;
        color: #666;
        font-weight: 500;
      }

      #clock-widget-modal .tab-panel h3:first-child {
        margin-top: 0;
      }

      #clock-widget-modal .form-group {
        margin-bottom: 16px;
      }

      #clock-widget-modal .form-group label {
        display: block;
        margin-bottom: 6px;
        font-size: 13px;
        color: #555;
        font-weight: 500;
      }

      #clock-widget-modal .form-group input[type="text"],
      #clock-widget-modal .form-group input[type="number"],
      #clock-widget-modal .form-group select {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
      }

      #clock-widget-modal .form-group input[type="color"] {
        width: 60px;
        height: 36px;
        border: 1px solid #ddd;
        border-radius: 6px;
        cursor: pointer;
      }

      #clock-widget-modal .form-row {
        display: flex;
        gap: 16px;
      }

      #clock-widget-modal .form-row .form-group {
        flex: 1;
      }

      #clock-widget-modal .checkbox-group {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 0;
      }

      #clock-widget-modal .checkbox-group input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
      }

      #clock-widget-modal .checkbox-group label {
        cursor: pointer;
        font-size: 14px;
      }

      #clock-widget-modal .modal-buttons {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin-top: 24px;
      }

      #clock-widget-modal .btn {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        transition: background-color 0.15s;
      }

      #clock-widget-modal .btn-primary {
        background: #4a90d9;
        color: white;
      }

      #clock-widget-modal .btn-primary:hover {
        background: #3a7bc8;
      }

      #clock-widget-modal .btn-secondary {
        background: #e0e0e0;
        color: #333;
      }

      #clock-widget-modal .btn-secondary:hover {
        background: #d0d0d0;
      }

      #clock-widget-modal .btn-danger {
        background: #e74c3c;
        color: white;
      }

      #clock-widget-modal .btn-danger:hover {
        background: #c0392b;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Register context menu items for the clock widget
   */
  function registerContextMenuItems() {
    if (!window.ContextMenuService) {
      console.warn('ContextMenuService not available');
      return;
    }

    // Register "Add New Clock" action
    ContextMenuService.registerMenuItem({
      id: 'clock-add-new',
      label: 'Add New Clock',
      icon: '🕐',
      separator: true,
      action: () => {
        const newClock = createDefaultClock();
        clocks.push(newClock);
        createClockWidget(newClock);
        applyClockSettings(newClock);
        updateClock(newClock);
        saveClocks();

        // Re-register to update any visibility states
        registerContextMenuItems();

        // Open settings for the new clock
        setTimeout(() => {
          openSettingsModal(newClock);
        }, 100);
      }
    });

    // Register "Remove Clock" action (only if more than one clock exists)
    ContextMenuService.registerMenuItem({
      id: 'clock-remove',
      label: 'Remove Clock',
      icon: '🗑️',
      action: () => {
        if (activeClockId) {
          deleteClock(activeClockId);
        }
      },
      visible: () => clocks.length > 1 && activeClockId !== null
    });
  }

  /**
   * Initialize the clock widget
   */
  function init() {
    const savedClocks = loadClocks();

    if (savedClocks && savedClocks.length > 0) {
      clocks = savedClocks;
    } else {
      // Create default clock if none exist
      clocks = [createDefaultClock()];
      saveClocks();
    }

    addStyles();
    createSettingsModal();

    // Create all clock widgets
    clocks.forEach(clock => {
      createClockWidget(clock);
      applyClockSettings(clock);
    });

    startClocks();

    // Register context menu items
    registerContextMenuItems();

    console.log(`Clock widget initialized with ${clocks.length} clock(s)`);
  }

  // Public API
  window.ClockWidget = {
    init,
    startClocks,
    stopClocks,
    openSettingsModal,
    closeSettingsModal,
    saveSettingsFromModal,
    deleteActiveClock: () => {
      if (activeClockId) {
        deleteClock(activeClockId);
        closeSettingsModal();
      }
    },
    getClocks: () => clocks.map(c => ({ ...c })),
    getActiveClockId: () => activeClockId,
    addClock: () => {
      const newClock = createDefaultClock();
      clocks.push(newClock);
      createClockWidget(newClock);
      applyClockSettings(newClock);
      updateClock(newClock);
      saveClocks();
      registerContextMenuItems();
      return newClock;
    },
    removeClock: deleteClock,
    registerContextMenuItems
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
