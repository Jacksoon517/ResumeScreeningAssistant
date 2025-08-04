// background.js - service worker for side panel behaviour

// Set default behaviour so clicking the action icon opens the side panel.
chrome.runtime.onInstalled.addListener(() => {
  // On install, configure the side panel to open when the user clicks the action icon.
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  }
});

// Also listen for action clicks to programmatically open the side panel (for browsers that require explicit call)
chrome.action.onClicked.addListener(async (tab) => {
  try {
    if (chrome.sidePanel && chrome.sidePanel.open) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    }
  } catch (err) {
    // ignore errors if API not available
  }
});

// Handle messages from content scripts requesting to open the side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'openSidePanelFromPage' && sender.tab) {
    const tabId = sender.tab.id;
    // Ensure the side panel loads our panel.html for this tab
    if (chrome.sidePanel && chrome.sidePanel.setOptions && chrome.sidePanel.open) {
      chrome.sidePanel.setOptions({ tabId, path: 'panel.html', enabled: true })
        .then(() => {
          chrome.sidePanel.open({ tabId }).then(() => {
            if (sendResponse) sendResponse({ opened: true });
          }).catch(() => {
            if (sendResponse) sendResponse({ opened: false });
          });
        })
        .catch(() => {
          chrome.sidePanel.open({ tabId }).then(() => {
            if (sendResponse) sendResponse({ opened: true });
          }).catch(() => {
            if (sendResponse) sendResponse({ opened: false });
          });
        });
      return true; // keep message channel open for async response
    } else {
      // API not available
      if (sendResponse) sendResponse({ opened: false });
    }
  }
});