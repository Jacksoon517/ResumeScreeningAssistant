// content_script.js - injected into every page to manage a floating panel

(function() {
  let panelContainer = null;

  /**
   * Create the floating panel overlay if it doesn't exist.
   * The panel is positioned fixed near the right edge and vertically centered.
   * A drag handle allows moving the panel around.
   */
  function createPanel() {
    if (panelContainer) {
      return;
    }
    panelContainer = document.createElement('div');
    panelContainer.id = 'resume-assistant-panel';
    // Basic styling
    panelContainer.style.position = 'fixed';
    panelContainer.style.right = '0';
    panelContainer.style.top = '50%';
    panelContainer.style.transform = 'translateY(-50%)';
    panelContainer.style.width = '420px';
    panelContainer.style.height = '90vh';
    panelContainer.style.maxHeight = '100vh';
    panelContainer.style.zIndex = '2147483647';
    panelContainer.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    panelContainer.style.borderRadius = '8px 0 0 8px';
    panelContainer.style.backgroundColor = 'transparent';
    panelContainer.style.overflow = 'hidden';

    // Drag handle
    const dragHandle = document.createElement('div');
    dragHandle.style.height = '28px';
    dragHandle.style.background = 'rgba(0,0,0,0.1)';
    dragHandle.style.cursor = 'move';
    dragHandle.style.display = 'flex';
    dragHandle.style.alignItems = 'center';
    dragHandle.style.justifyContent = 'flex-start';
    dragHandle.style.paddingLeft = '8px';
    dragHandle.style.userSelect = 'none';
    dragHandle.textContent = '';
    panelContainer.appendChild(dragHandle);

    // Close button inside handle
    const closeBtn = document.createElement('span');
    closeBtn.textContent = '×';
    closeBtn.style.fontSize = '18px';
    closeBtn.style.marginRight = '8px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.color = '#666';
    dragHandle.appendChild(closeBtn);
    closeBtn.addEventListener('click', () => {
      // Send message to toggle pin off
      chrome.runtime.sendMessage({ type: 'togglePin', value: false });
    });

    // Iframe to load panel content
    const iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('panel.html');
    iframe.style.width = '100%';
    iframe.style.height = 'calc(100% - 28px)';
    iframe.style.border = 'none';
    iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin');
    panelContainer.appendChild(iframe);

    document.body.appendChild(panelContainer);

    // Dragging logic
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;
    dragHandle.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = panelContainer.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      // Reset transform for proper dragging
      panelContainer.style.transform = 'none';
      panelContainer.style.right = 'auto';
    });
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      panelContainer.style.left = startLeft + dx + 'px';
      panelContainer.style.top = startTop + dy + 'px';
    });
    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  /**
   * Remove the floating panel if it exists.
   */
  function removePanel() {
    if (panelContainer) {
      panelContainer.remove();
      panelContainer = null;
    }
  }

  // Listen for messages from background to show or hide the panel
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.action) return;
    if (message.action === 'showPanel') {
      createPanel();
    } else if (message.action === 'hidePanel') {
      removePanel();
    }
  });
})();