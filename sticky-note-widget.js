/**
 * Sticky Note Widget
 * A customizable sticky note widget that supports multiple notes with individual settings
 * including colors, fonts, sizes, and image backgrounds
 */

(function() {
  // Widget configuration
  const CONFIG = {
    defaultFont: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    defaultFontSize: 14,
    defaultColor: '#333333',
    defaultPosition: { x: 100, y: 100 },
    defaultWidth: 250,
    defaultHeight: 200,
    backgroundColor: '#fef3c7',
    backgroundOpacity: 0.95,
    backgroundImage: null,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    textAlign: 'left',
    padding: 12,
    borderRadius: 8,
    shadow: true
  };

  // Font family options
  const FONT_OPTIONS = [
    { value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", label: 'System Default' },
    { value: "Arial, sans-serif", label: 'Arial' },
    { value: "'Courier New', monospace", label: 'Courier New' },
    { value: "Georgia, serif", label: 'Georgia' },
    { value: "'Times New Roman', serif", label: 'Times New Roman' },
    { value: "'Trebuchet MS', sans-serif", label: 'Trebuchet MS' },
    { value: "Verdana, sans-serif", label: 'Verdana' },
    { value: "'Comic Sans MS', cursive", label: 'Comic Sans MS' },
    { value: "'Impact', sans-serif", label: 'Impact' },
    { value: "'Lucida Console', monospace", label: 'Lucida Console' }
  ];

  // Widget state - stores all sticky note instances
  let notes = [];
  let activeNoteId = null;

  /**
   * Load all sticky note settings from localStorage
   */
  function loadNotes() {
    try {
      const saved = localStorage.getItem('stickyNoteWidgets');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [parsed];
      }
    } catch (e) {
      console.error('Failed to load sticky note widget settings:', e);
    }
    return null;
  }

  /**
   * Save all sticky note settings to localStorage
   */
  function saveNotes() {
    try {
      localStorage.setItem('stickyNoteWidgets', JSON.stringify(notes));
    } catch (e) {
      console.error('Failed to save sticky note widget settings:', e);
    }
  }

  /**
   * Generate unique ID for a new note
   */
  function generateNoteId() {
    return 'sticky_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Create default note settings
   */
  function createDefaultNote() {
    const offset = notes.length * 30;
    return {
      id: generateNoteId(),
      content: '',
      font: CONFIG.defaultFont,
      fontSize: CONFIG.defaultFontSize,
      color: CONFIG.defaultColor,
      x: CONFIG.defaultPosition.x + offset,
      y: CONFIG.defaultPosition.y + offset,
      width: CONFIG.defaultWidth,
      height: CONFIG.defaultHeight,
      backgroundColor: CONFIG.backgroundColor,
      backgroundOpacity: CONFIG.backgroundOpacity,
      backgroundImage: CONFIG.backgroundImage,
      backgroundSize: CONFIG.backgroundSize,
      backgroundPosition: CONFIG.backgroundPosition,
      textAlign: CONFIG.textAlign,
      padding: CONFIG.padding,
      borderRadius: CONFIG.borderRadius,
      shadow: CONFIG.shadow,
      bold: false,
      italic: false,
      underline: false,
      textMarginTop: 10,
      textMarginRight: 10,
      textMarginBottom: 10,
      textMarginLeft: 10
    };
  }

  /**
   * Apply settings to a specific sticky note widget
   */
  function applyNoteSettings(note) {
    const widget = document.getElementById(`sticky-note-widget-${note.id}`);
    if (!widget) return;

    // Widget position
    widget.style.left = (note.x || CONFIG.defaultPosition.x) + 'px';
    widget.style.top = (note.y || CONFIG.defaultPosition.y) + 'px';
    widget.style.width = (note.width || CONFIG.defaultWidth) + 'px';
    widget.style.height = (note.height || CONFIG.defaultHeight) + 'px';

    // Content area styling
    const contentArea = widget.querySelector('.sticky-note-content');
    if (contentArea) {
      contentArea.style.fontFamily = note.font || CONFIG.defaultFont;
      contentArea.style.fontSize = (note.fontSize || CONFIG.defaultFontSize) + 'px';
      contentArea.style.color = note.color || CONFIG.defaultColor;
      contentArea.style.textAlign = note.textAlign || CONFIG.textAlign;
      
      // Only apply padding, border-radius, and shadow if no custom background image
      const hasCustomBackground = !!note.backgroundImage;
      
      if (hasCustomBackground) {
        contentArea.style.padding = '0';
        contentArea.style.borderRadius = '0';
        contentArea.style.boxShadow = 'none';
      } else {
        contentArea.style.padding = (note.padding || CONFIG.padding) + 'px';
        contentArea.style.borderRadius = (note.borderRadius || CONFIG.borderRadius) + 'px';
        
        // Shadow
        if (note.shadow !== false) {
          contentArea.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        } else {
          contentArea.style.boxShadow = 'none';
        }
      }

      // Font style
      contentArea.style.fontWeight = note.bold ? 'bold' : 'normal';
      contentArea.style.fontStyle = note.italic ? 'italic' : 'normal';
      contentArea.style.textDecoration = note.underline ? 'underline' : 'none';

      // Background - image or color
      if (note.backgroundImage) {
        contentArea.style.backgroundImage = `url("${note.backgroundImage}")`;
        contentArea.style.backgroundSize = note.backgroundSize || 'cover';
        contentArea.style.backgroundPosition = note.backgroundPosition || 'center';
        contentArea.style.backgroundRepeat = 'no-repeat';
        contentArea.style.backgroundColor = 'transparent';
      } else {
        contentArea.style.backgroundImage = 'none';
        const bgColor = hexToRgb(note.backgroundColor || CONFIG.backgroundColor);
        contentArea.style.backgroundColor = `rgba(${bgColor.r}, ${bgColor.g}, ${bgColor.b}, ${note.backgroundOpacity ?? CONFIG.backgroundOpacity})`;
      }
    }

    // Update textarea content
    const textarea = widget.querySelector('.sticky-note-textarea');
    if (textarea) {
      textarea.value = note.content || '';
      textarea.style.fontFamily = note.font || CONFIG.defaultFont;
      textarea.style.fontSize = (note.fontSize || CONFIG.defaultFontSize) + 'px';
      textarea.style.color = note.color || CONFIG.defaultColor;
      textarea.style.textAlign = note.textAlign || CONFIG.textAlign;

      // Apply text margins for custom background images, or regular padding otherwise
      const hasCustomBackground = !!note.backgroundImage;
      const contentArea = widget.querySelector('.sticky-note-content');
      if (hasCustomBackground && contentArea) {
        // Calculate available height and width for text area
        const widgetWidth = widget.offsetWidth;
        const widgetHeight = widget.offsetHeight;
        const availableWidth = widgetWidth - (note.textMarginLeft || 0) - (note.textMarginRight || 0);
        const availableHeight = widgetHeight - (note.textMarginTop || 0) - (note.textMarginBottom || 0);
        
        textarea.style.padding = '4px 8px';
        textarea.style.marginTop = '0';
        textarea.style.marginRight = '0';
        textarea.style.marginBottom = '0';
        textarea.style.marginLeft = '0';
        textarea.style.width = Math.max(50, availableWidth) + 'px';
        textarea.style.height = Math.max(50, availableHeight) + 'px';
        textarea.style.overflowY = 'scroll';
        textarea.style.position = 'absolute';
        textarea.style.left = (note.textMarginLeft || 0) + 'px';
        textarea.style.top = (note.textMarginTop || 0) + 'px';
        textarea.style.maxHeight = availableHeight + 'px';
      } else {
        textarea.style.padding = (note.padding || CONFIG.padding) + 'px';
        textarea.style.marginTop = '0';
        textarea.style.marginRight = '0';
        textarea.style.marginBottom = '0';
        textarea.style.marginLeft = '0';
        textarea.style.height = '100%';
        textarea.style.width = '100%';
        textarea.style.overflowY = 'scroll';
        textarea.style.position = 'relative';
        textarea.style.left = 'auto';
        textarea.style.top = 'auto';
        textarea.style.maxHeight = 'none';
      }

      textarea.style.fontWeight = note.bold ? 'bold' : 'normal';
      textarea.style.fontStyle = note.italic ? 'italic' : 'normal';
      textarea.style.textDecoration = note.underline ? 'underline' : 'none';
    }
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
    } : { r: 254, g: 243, b: 199 };
  }

  /**
   * Detect opaque region margins from an image using alpha channel analysis
   * Similar to pretext (https://github.com/chenglou/pretext)
   * @param {string} dataUrl - Base64 encoded image
   * @param {number} alphaThreshold - Alpha value threshold (0-255) for considering a pixel opaque
   * @returns {Promise<{top: number, right: number, bottom: number, left: number}>}
   */
  function detectImageMargins(dataUrl, alphaThreshold = 128) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const data = imageData.data;
          const width = img.width;
          const height = img.height;

          let top = height;
          let bottom = 0;
          let left = width;
          let right = 0;
          let foundOpaque = false;

          // Scan for opaque pixels (pixels that are mostly opaque)
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const alpha = data[(y * width + x) * 4 + 3];
              if (alpha >= alphaThreshold) {
                foundOpaque = true;
                if (x < left) left = x;
                if (x > right) right = x;
                if (y < top) top = y;
                if (y > bottom) bottom = y;
              }
            }
          }

          if (!foundOpaque) {
            resolve(null);
            return;
          }

          // Calculate margins based on detected opaque region
          // Add small padding for visual comfort
          const padding = 2;
          const margins = {
            top: Math.max(0, top - padding),
            right: Math.max(0, width - right - 1 - padding),
            bottom: Math.max(0, height - bottom - 1 - padding),
            left: Math.max(0, left - padding)
          };

          resolve(margins);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  /**
   * Create a sticky note widget DOM element
   */
  function createNoteWidget(note) {
    const widget = document.createElement('div');
    widget.id = `sticky-note-widget-${note.id}`;
    widget.className = 'sticky-note-widget';
    widget.dataset.noteId = note.id;

    // Content area (visual display)
    const contentArea = document.createElement('div');
    contentArea.className = 'sticky-note-content';

    // Textarea for editing
    const textarea = document.createElement('textarea');
    textarea.className = 'sticky-note-textarea';
    textarea.placeholder = 'Type your note here...';
    textarea.value = note.content || '';

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'sticky-note-delete';
    deleteBtn.innerHTML = '×';
    deleteBtn.title = 'Delete note';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteNote(note.id);
    });

    contentArea.appendChild(textarea);
    contentArea.appendChild(deleteBtn);
    widget.appendChild(contentArea);
    document.body.appendChild(widget);

    // Auto-resize textarea
    const autoResize = () => {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    };

    textarea.addEventListener('input', () => {
      note.content = textarea.value;
      saveNotes();
      autoResize();
    });

    // Initial resize
    setTimeout(autoResize, 0);

    // Add drag functionality
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    let isResizing = false;
    let resizeStartPos = { x: 0, y: 0 };
    let resizeStartSize = { width: 0, height: 0 };

    contentArea.addEventListener('mousedown', (e) => {
      if (e.target === textarea || e.target === deleteBtn) return;
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
        note.x = e.clientX - dragOffset.x;
        note.y = e.clientY - dragOffset.y;
        saveNotes();
      }

      if (isResizing) {
        e.preventDefault();
        const newWidth = resizeStartSize.width + (e.clientX - resizeStartPos.x);
        const newHeight = resizeStartSize.height + (e.clientY - resizeStartPos.y);
        widget.style.width = Math.max(150, newWidth) + 'px';
        widget.style.height = Math.max(100, newHeight) + 'px';
        note.width = Math.max(150, newWidth);
        note.height = Math.max(100, newHeight);
        saveNotes();
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      isResizing = false;
      widget.style.cursor = 'grab';
    });

    // Resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'sticky-note-resize-handle';
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
      activeNoteId = note.id;
      openSettingsModal(note);
    });

    return widget;
  }

  /**
   * Remove a note widget
   */
  function removeNoteWidget(noteId) {
    const widget = document.getElementById(`sticky-note-widget-${noteId}`);
    if (widget) {
      widget.remove();
    }
  }

  /**
   * Open settings modal for a specific note
   */
  function openSettingsModal(note) {
    const modal = document.getElementById('sticky-note-widget-modal');
    const fontSelect = document.getElementById('sticky-note-font');
    const fontSizeInput = document.getElementById('sticky-note-font-size');
    const colorInput = document.getElementById('sticky-note-color');
    const boldCheckbox = document.getElementById('sticky-note-bold');
    const italicCheckbox = document.getElementById('sticky-note-italic');
    const underlineCheckbox = document.getElementById('sticky-note-underline');
    const textAlignSelect = document.getElementById('sticky-note-text-align');
    const paddingInput = document.getElementById('sticky-note-padding');
    const borderRadiusInput = document.getElementById('sticky-note-border-radius');
    const shadowCheckbox = document.getElementById('sticky-note-shadow');
    const backgroundColorInput = document.getElementById('sticky-note-background-color');
    const backgroundOpacityInput = document.getElementById('sticky-note-background-opacity');
    const backgroundImageInput = document.getElementById('sticky-note-background-image');
    const backgroundSizeSelect = document.getElementById('sticky-note-background-size');
    const backgroundPositionSelect = document.getElementById('sticky-note-background-position');
    const removeBgImageBtn = document.getElementById('sticky-note-remove-bg-image');
    const textMarginTopInput = document.getElementById('sticky-note-text-margin-top');
    const textMarginRightInput = document.getElementById('sticky-note-text-margin-right');
    const textMarginBottomInput = document.getElementById('sticky-note-text-margin-bottom');
    const textMarginLeftInput = document.getElementById('sticky-note-text-margin-left');

    fontSelect.value = note.font || CONFIG.defaultFont;
    fontSizeInput.value = note.fontSize || CONFIG.defaultFontSize;
    colorInput.value = note.color || CONFIG.defaultColor;
    boldCheckbox.checked = note.bold || false;
    italicCheckbox.checked = note.italic || false;
    underlineCheckbox.checked = note.underline || false;
    textAlignSelect.value = note.textAlign || CONFIG.textAlign;
    paddingInput.value = note.padding || CONFIG.padding;
    borderRadiusInput.value = note.borderRadius || CONFIG.borderRadius;
    shadowCheckbox.checked = note.shadow !== false;
    backgroundColorInput.value = note.backgroundColor || CONFIG.backgroundColor;
    backgroundOpacityInput.value = note.backgroundOpacity ?? CONFIG.backgroundOpacity;
    backgroundSizeSelect.value = note.backgroundSize || CONFIG.backgroundSize;
    backgroundPositionSelect.value = note.backgroundPosition || CONFIG.backgroundPosition;
    textMarginTopInput.value = note.textMarginTop || 10;
    textMarginRightInput.value = note.textMarginRight || 10;
    textMarginBottomInput.value = note.textMarginBottom || 10;
    textMarginLeftInput.value = note.textMarginLeft || 10;

    // Show/hide remove image button
    if (removeBgImageBtn) {
      removeBgImageBtn.style.display = note.backgroundImage ? 'inline-block' : 'none';
    }

    activeNoteId = note.id;
    modal.classList.add('visible');
  }

  /**
   * Close settings modal
   */
  function closeSettingsModal() {
    document.getElementById('sticky-note-widget-modal').classList.remove('visible');
    activeNoteId = null;
  }

  /**
   * Save settings from modal for the active note
   */
  function saveSettingsFromModal() {
    const note = notes.find(n => n.id === activeNoteId);
    if (!note) return;

    const fontSelect = document.getElementById('sticky-note-font');
    const fontSizeInput = document.getElementById('sticky-note-font-size');
    const colorInput = document.getElementById('sticky-note-color');
    const boldCheckbox = document.getElementById('sticky-note-bold');
    const italicCheckbox = document.getElementById('sticky-note-italic');
    const underlineCheckbox = document.getElementById('sticky-note-underline');
    const textAlignSelect = document.getElementById('sticky-note-text-align');
    const paddingInput = document.getElementById('sticky-note-padding');
    const borderRadiusInput = document.getElementById('sticky-note-border-radius');
    const shadowCheckbox = document.getElementById('sticky-note-shadow');
    const backgroundColorInput = document.getElementById('sticky-note-background-color');
    const backgroundOpacityInput = document.getElementById('sticky-note-background-opacity');
    const backgroundSizeSelect = document.getElementById('sticky-note-background-size');
    const backgroundPositionSelect = document.getElementById('sticky-note-background-position');
    const textMarginTopInput = document.getElementById('sticky-note-text-margin-top');
    const textMarginRightInput = document.getElementById('sticky-note-text-margin-right');
    const textMarginBottomInput = document.getElementById('sticky-note-text-margin-bottom');
    const textMarginLeftInput = document.getElementById('sticky-note-text-margin-left');

    note.font = fontSelect.value;
    note.fontSize = parseInt(fontSizeInput.value, 10);
    note.color = colorInput.value;
    note.bold = boldCheckbox.checked;
    note.italic = italicCheckbox.checked;
    note.underline = underlineCheckbox.checked;
    note.textAlign = textAlignSelect.value;
    note.padding = parseInt(paddingInput.value, 10);
    note.borderRadius = parseInt(borderRadiusInput.value, 10);
    note.shadow = shadowCheckbox.checked;
    note.backgroundColor = backgroundColorInput.value;
    note.backgroundOpacity = parseFloat(backgroundOpacityInput.value);
    note.backgroundSize = backgroundSizeSelect.value;
    note.backgroundPosition = backgroundPositionSelect.value;
    note.textMarginTop = parseInt(textMarginTopInput.value, 10);
    note.textMarginRight = parseInt(textMarginRightInput.value, 10);
    note.textMarginBottom = parseInt(textMarginBottomInput.value, 10);
    note.textMarginLeft = parseInt(textMarginLeftInput.value, 10);

    saveNotes();
    applyNoteSettings(note);
    closeSettingsModal();
  }

  /**
   * Delete a note
   */
  function deleteNote(noteId) {
    const index = notes.findIndex(n => n.id === noteId);
    if (index === -1) return;

    removeNoteWidget(noteId);
    notes.splice(index, 1);
    saveNotes();

    // Re-register context menu items
    registerContextMenuItems();
  }

  /**
   * Create settings modal
   */
  function createSettingsModal() {
    const modal = document.createElement('div');
    modal.id = 'sticky-note-widget-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <h2>Sticky Note Settings</h2>

        <div class="settings-tabs">
          <button class="tab-button active" data-tab="sticky-font">Font</button>
          <button class="tab-button" data-tab="sticky-appearance">Appearance</button>
          <button class="tab-button" data-tab="sticky-background">Background</button>
        </div>

        <div id="tab-sticky-font" class="tab-panel active">
          <div class="form-group">
            <label>Font Family</label>
            <select id="sticky-note-font" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;">
              ${FONT_OPTIONS.map(f => `<option value="${f.value}">${f.label}</option>`).join('')}
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Font Size (px)</label>
              <input type="number" id="sticky-note-font-size" min="10" max="72" value="14">
            </div>
            <div class="form-group">
              <label>Text Color</label>
              <input type="color" id="sticky-note-color" value="#333333">
            </div>
          </div>

          <hr style="border:0;border-top:1px solid #ddd;margin:16px 0;">

          <div class="form-group">
            <label>Font Style</label>
            <div class="checkbox-group">
              <input type="checkbox" id="sticky-note-bold">
              <label for="sticky-note-bold">Bold</label>
            </div>
            <div class="checkbox-group">
              <input type="checkbox" id="sticky-note-italic">
              <label for="sticky-note-italic">Italic</label>
            </div>
            <div class="checkbox-group">
              <input type="checkbox" id="sticky-note-underline">
              <label for="sticky-note-underline">Underline</label>
            </div>
          </div>

          <div class="form-group">
            <label>Text Alignment</label>
            <select id="sticky-note-text-align" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;">
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
              <option value="justify">Justify</option>
            </select>
          </div>
        </div>

        <div id="tab-sticky-appearance" class="tab-panel">
          <div class="form-row">
            <div class="form-group">
              <label>Padding (px)</label>
              <input type="number" id="sticky-note-padding" min="0" max="50" value="12">
            </div>
            <div class="form-group">
              <label>Border Radius (px)</label>
              <input type="number" id="sticky-note-border-radius" min="0" max="50" value="8">
            </div>
          </div>

          <div class="form-group">
            <label>Shadow</label>
            <div class="checkbox-group">
              <input type="checkbox" id="sticky-note-shadow" checked>
              <label for="sticky-note-shadow">Enable shadow</label>
            </div>
          </div>
        </div>

        <div id="tab-sticky-background" class="tab-panel">
          <h3 style="margin:16px 0 12px;font-size:14px;color:#666;">Solid Color</h3>
          <div class="form-row">
            <div class="form-group">
              <label>Background Color</label>
              <input type="color" id="sticky-note-background-color" value="#fef3c7">
            </div>
            <div class="form-group">
              <label>Opacity</label>
              <input type="range" id="sticky-note-background-opacity" min="0" max="1" step="0.05" value="0.95" style="width:100%;">
              <div style="display:flex;justify-content:space-between;font-size:10px;color:#777;margin-top:4px;">
                <span>Transparent</span>
                <span>Solid</span>
              </div>
            </div>
          </div>

          <hr style="border:0;border-top:1px solid #ddd;margin:16px 0;">

          <h3 style="margin:16px 0 12px;font-size:14px;color:#666;">Image Background</h3>
          <div class="form-group">
            <label>Upload Image</label>
            <input type="file" id="sticky-note-background-image" accept="image/*" style="margin-top:8px;">
            <button id="sticky-note-remove-bg-image" class="btn btn-secondary" style="margin-top:8px;font-size:12px;padding:6px 12px;display:none;">Remove Image</button>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Background Size</label>
              <select id="sticky-note-background-size" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;">
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="auto">Auto</option>
              </select>
            </div>
            <div class="form-group">
              <label>Background Position</label>
              <select id="sticky-note-background-position" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;">
                <option value="center">Center</option>
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
                <option value="top left">Top Left</option>
                <option value="top right">Top Right</option>
                <option value="bottom left">Bottom Left</option>
                <option value="bottom right">Bottom Right</option>
              </select>
            </div>
          </div>

          <hr style="border:0;border-top:1px solid #ddd;margin:16px 0;">

          <h3 style="margin:16px 0 12px;font-size:14px;color:#666;">Text Area Margins</h3>
          <p style="font-size:12px;color:#777;margin-bottom:12px;">Adjust these to confine text within the opaque area of your image</p>
          <button id="sticky-note-auto-detect-margins" class="btn btn-secondary" style="margin-bottom:12px;font-size:12px;padding:6px 12px;">Auto-detect from Image</button>
          <div class="form-row">
            <div class="form-group">
              <label>Top (px)</label>
              <input type="number" id="sticky-note-text-margin-top" min="0" max="200" value="10">
            </div>
            <div class="form-group">
              <label>Bottom (px)</label>
              <input type="number" id="sticky-note-text-margin-bottom" min="0" max="200" value="10">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Left (px)</label>
              <input type="number" id="sticky-note-text-margin-left" min="0" max="200" value="10">
            </div>
            <div class="form-group">
              <label>Right (px)</label>
              <input type="number" id="sticky-note-text-margin-right" min="0" max="200" value="10">
            </div>
          </div>
        </div>

        <div class="modal-buttons">
          <button class="btn btn-secondary" data-action="cancel">Cancel</button>
          <button class="btn btn-primary" data-action="save">Save</button>
        </div>
      </div>
    `;

    // Tab switching
    const tabButtons = modal.querySelectorAll('.tab-button');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = 'tab-' + btn.dataset.tab;
        modal.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        modal.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        modal.querySelector(`#${tabId}`).classList.add('active');
      });
    });

    // Background image upload
    const bgImageInput = modal.querySelector('#sticky-note-background-image');
    const removeBgImageBtn = modal.querySelector('#sticky-note-remove-bg-image');

    bgImageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const note = notes.find(n => n.id === activeNoteId);
        if (note) {
          note.backgroundImage = event.target.result;
          saveNotes();
          applyNoteSettings(note);
          removeBgImageBtn.style.display = 'inline-block';
        }
      };
      reader.readAsDataURL(file);
    });

    removeBgImageBtn.addEventListener('click', () => {
      const note = notes.find(n => n.id === activeNoteId);
      if (note) {
        note.backgroundImage = null;
        saveNotes();
        applyNoteSettings(note);
        removeBgImageBtn.style.display = 'none';
        bgImageInput.value = '';
      }
    });

    // Button actions
    modal.querySelector('[data-action="cancel"]').addEventListener('click', closeSettingsModal);
    modal.querySelector('[data-action="save"]').addEventListener('click', saveSettingsFromModal);

    // Auto-detect margins from image
    const autoDetectBtn = modal.querySelector('#sticky-note-auto-detect-margins');
    autoDetectBtn.addEventListener('click', () => {
      const note = notes.find(n => n.id === activeNoteId);
      if (!note || !note.backgroundImage) {
        alert('Please upload an image first.');
        return;
      }

      autoDetectBtn.textContent = 'Detecting...';
      autoDetectBtn.disabled = true;

      detectImageMargins(note.backgroundImage).then(margins => {
        if (margins) {
          document.getElementById('sticky-note-text-margin-top').value = margins.top;
          document.getElementById('sticky-note-text-margin-bottom').value = margins.bottom;
          document.getElementById('sticky-note-text-margin-left').value = margins.left;
          document.getElementById('sticky-note-text-margin-right').value = margins.right;
        } else {
          alert('Could not detect opaque region. Image may be fully transparent or fully opaque.');
        }
        autoDetectBtn.textContent = 'Auto-detect from Image';
        autoDetectBtn.disabled = false;
      }).catch(err => {
        console.error('Error detecting margins:', err);
        alert('Error analyzing image.');
        autoDetectBtn.textContent = 'Auto-detect from Image';
        autoDetectBtn.disabled = false;
      });
    });

    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeSettingsModal();
      }
    });

    document.body.appendChild(modal);
  }

  /**
   * Add a new sticky note
   */
  function addNote() {
    const note = createDefaultNote();
    notes.push(note);
    createNoteWidget(note);
    applyNoteSettings(note);
    saveNotes();
    registerContextMenuItems();
    return note;
  }

  /**
   * Register context menu items for sticky notes
   */
  function registerContextMenuItems() {
    if (typeof ContextMenuService !== 'undefined') {
      // Remove existing items
      ContextMenuService.unregisterMenuItem('add-sticky-note');
      ContextMenuService.unregisterMenuItem('sticky-notes-separator');

      // Add "Add Sticky Note" option to main context menu
      ContextMenuService.registerMenuItem({
        id: 'add-sticky-note',
        label: 'Add Sticky Note',
        icon: '📝',
        action: () => {
          addNote();
        }
      });
    }
  }

  /**
   * Initialize the sticky note widget
   */
  function init() {
    // Load saved notes or create default
    const savedNotes = loadNotes();
    if (savedNotes && savedNotes.length > 0) {
      notes = savedNotes;
      notes.forEach(note => {
        createNoteWidget(note);
        applyNoteSettings(note);
      });
    } else {
      // Create one default note
      notes = [createDefaultNote()];
      createNoteWidget(notes[0]);
      applyNoteSettings(notes[0]);
    }

    // Create settings modal
    createSettingsModal();

    // Register context menu items
    registerContextMenuItems();

    console.log('Sticky Note Widget initialized with', notes.length, 'note(s)');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
