// floater.js - inject a floating button in all webpages to open side panel

(function() {
  // Only inject in top-level frames and avoid extension pages
  if (window.top !== window.self) return;
  if (window.location.protocol === 'chrome:' || window.location.protocol === 'chrome-extension:') return;
  const existing = document.getElementById('__resume_side_floater');
  if (existing) return;

  // Use base64-encoded icon to ensure it loads correctly
  const iconUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAADtElEQVR4nO2W34sVZRjHv88zM2fmnNnd456jspGUpWUJBWIb1R9QNxt100Vt0E3bBgp2FSIhoQlCF6KxUgpR3mh0VRcS/RAticp+rottiCGkqOxu69mz58yZeX88XZwhXc/M6oG1qx5e5uZ95/3w/Po+LxUr9+F2Gt/W2/8LgJu7Q/k/yZIAbP41zHAY1i525iYAAtycLYG0WtKIqFSkYgBjugQwS6vlrb2n+uE+YgAWYokACCgNm9Tq0be/1D/4WJ89T+W+xRl0Y5kySxR569et+OITYhCEwiIRgQQAtcNvFJjN1N8zo69HR79cnJERBwLEiLmaEDOMUid/htJpuRGIyV27hvv7yenpf+8dPfScOjNJxSKsvVVAO3FGMXmezM3PvrLZTk3B8yACIog4K1eU9+zxHhmkoBSOjF7dvAmlUp4HOX0gZGIyMZmEyfepGFAQUBCQ71MYmr8uzO3cZRpG1xSv38DV5VAKlF3XGQACRKATUjHpmEQE1y9jqFy2ly+pSzNGO9YNKQzz4pPjAQECk5BJyCQAGETXFjuozeKOVbZ3uYmsqTVlfh6cqwjZxS4CkwAWUEDSQtKCtRBJvbv7XmfLDuOWqAD94w8yO4O+ZXmF1AGQ9KsVQVtwSd44IFqBiJgBgevyw4MUNfTE7yg4+sgBFPxFQtQBoNQDm0AggIeHHk0DGQME8oD9b+nTJ2nVAC5ctBO/UaUCydWMLA/SHECIYRT9MQ6jIVbuWodq1d05asuOs/9dt37FuXOlOfp5vH0XisU8Rq7gGAU4jEbTf3sEc7PUrOvhrfbBx9GYNtvfpy0vxhPjNDDgHz7kjl7R+8ZQqWSmITv7AoiCKBJFcH04nvRVnWMfeYd2mGdG6OBefH8CvWU592e89U089TSKQRednBIUxIJUm2bhFhA16PJ56y3j6Wn4JTAjDKVW08pL+zzL8joZiC1ig8S2dRQiYIbr8qnj6slX4Xk0fZGiOT30kv3pV2o2wE43HoDFDeEAbt+/GgqjpVT2PjtoV29s7T7BZ76xqx+wTzwWbBtu6ytsRg46AQJmxA1n/Cuwi3ge+jqdIRJif+xlMzhk7t/gHjtMx4/Em8b82jBPnpLeaiejYx6kFAvVah+AFywQMiIA1KxBKXgFJLF+9rXk+W3+7hd48jv4JciCbOeNTIbfcw22gC0AJOxvtwt6yP10r4QVu2ajM/G1BOENT4IcD7oyYkR1OA4KGe2W/6q4dROLUm8q5h22FACgy3mwpPY/4Kb2D1OPuB5Ov9mCAAAAAElFTkSuQmCC';
  const floatBtn = document.createElement('img');
  floatBtn.id = '__resume_side_floater';
  floatBtn.src = iconUrl;
  floatBtn.style.position = 'fixed';
  floatBtn.style.right = '12px';
  floatBtn.style.bottom = '120px';
  floatBtn.style.width = '32px';
  floatBtn.style.height = '32px';
  floatBtn.style.zIndex = '2147483647';
  floatBtn.style.cursor = 'pointer';
  floatBtn.style.borderRadius = '50%';
  floatBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
  floatBtn.style.backgroundColor = 'transparent';
  // Slight fade to avoid blocking content
  floatBtn.style.opacity = '0.9';
  floatBtn.addEventListener('mouseenter', () => {
    floatBtn.style.opacity = '1';
  });
  floatBtn.addEventListener('mouseleave', () => {
    floatBtn.style.opacity = '0.9';
  });
  // Dragging variables
  let dragging = false;
  let startX, startY;
  let startRight, startBottom;
  floatBtn.addEventListener('mousedown', (e) => {
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    // Capture current right and bottom (remove 'px')
    startRight = parseInt(floatBtn.style.right, 10);
    startBottom = parseInt(floatBtn.style.bottom, 10);
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    floatBtn.style.right = (startRight - dx) + 'px';
    floatBtn.style.bottom = (startBottom - dy) + 'px';
  });
  document.addEventListener('mouseup', () => {
    dragging = false;
  });

  function openOverlayPanel() {
    if (document.getElementById('__resume_sidepanel_overlay')) return;
    const container = document.createElement('div');
    container.id = '__resume_sidepanel_overlay';
    container.style.position = 'fixed';
    container.style.right = '0';
    container.style.top = '0';
    container.style.width = '420px';
    container.style.height = '100vh';
    container.style.zIndex = '2147483646';
    container.style.boxShadow = '0 0 8px rgba(0,0,0,0.3)';
    container.style.backgroundColor = 'transparent';
    // Header with close button
    const header = document.createElement('div');
    header.style.height = '24px';
    header.style.backgroundColor = 'rgba(0,0,0,0.1)';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'flex-end';
    header.style.cursor = 'move';
    container.appendChild(header);
    const closeBtn = document.createElement('span');
    closeBtn.textContent = '×';
    closeBtn.style.marginRight = '8px';
    closeBtn.style.fontSize = '18px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.addEventListener('click', () => {
      container.remove();
    });
    header.appendChild(closeBtn);
    // Iframe
    const iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('panel.html');
    iframe.style.width = '100%';
    iframe.style.height = 'calc(100% - 24px)';
    iframe.style.border = 'none';
    iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin');
    container.appendChild(iframe);
    document.documentElement.appendChild(container);
    // Drag overlay panel via header
    let draggingPanel = false;
    let pStartX, pStartY;
    let pStartRight, pStartTop;
    header.addEventListener('mousedown', (e) => {
      draggingPanel = true;
      pStartX = e.clientX;
      pStartY = e.clientY;
      const rect = container.getBoundingClientRect();
      pStartRight = window.innerWidth - rect.right;
      pStartTop = rect.top;
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!draggingPanel) return;
      const dx = e.clientX - pStartX;
      const dy = e.clientY - pStartY;
      container.style.right = (pStartRight - dx) + 'px';
      container.style.top = (pStartTop + dy) + 'px';
    });
    document.addEventListener('mouseup', () => {
      draggingPanel = false;
    });
  }

  floatBtn.addEventListener('click', () => {
    // Attempt to open side panel via background. If fails (no support), fallback to overlay.
    try {
      chrome.runtime.sendMessage({ type: 'openSidePanelFromPage' }, (res) => {
        const err = chrome.runtime.lastError;
        if (err || !res || !res.opened) {
          openOverlayPanel();
        }
      });
    } catch (e) {
      openOverlayPanel();
    }
  });
  document.documentElement.appendChild(floatBtn);
})();