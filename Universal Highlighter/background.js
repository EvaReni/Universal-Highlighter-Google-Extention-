
const DEFAULT_COLOR = "yellow";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(
    ["enabled", "highlightColor"],
    (data) => {
      const settings = {};

      if (typeof data.enabled === "undefined") {
        settings.enabled = true;
      }

      if (typeof data.highlightColor === "undefined") {
        settings.highlightColor = DEFAULT_COLOR;
      }

      if (Object.keys(settings).length > 0) {
        chrome.storage.local.set(settings);
      }
    }
  );

  // Recreate the context menu safely.
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "highlight-selection",
      title: "Highlight selected text",
      contexts: ["selection"]
    });
  });
});

// Manual highlighting works whether enabled is true or false.
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (
    info.menuItemId !== "highlight-selection" ||
    tab?.id === undefined
  ) {
    return;
  }

  chrome.tabs.sendMessage(
    tab.id,
    {
      type: "highlightSelection",
      force: true,
      selectedText: info.selectionText || ""
    },
    {
      frameId: info.frameId
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error(
          "[USH] Could not communicate with the webpage:",
          chrome.runtime.lastError.message
        );
        return;
      }

      if (!response?.success) {
        console.warn(
          "[USH] The selected text could not be highlighted:",
          response?.reason || "No selection found."
        );
      }
    }
  );
});
