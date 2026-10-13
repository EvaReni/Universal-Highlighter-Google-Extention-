const enabledCheckbox =
  document.getElementById(
    "enabled"
  );

const status =
  document.getElementById(
    "status"
  );

const colorButtons =
  document.querySelectorAll(
    ".color-button"
  );

function updateStatus(enabled) {
  status.textContent =
    enabled
      ? "ON — select text to highlight it automatically."
      : "OFF — text selection will not be highlighted.";
}

function updateSelectedColor(color) {
  colorButtons.forEach(
    (button) => {
      button.classList.toggle(
        "selected",
        button.dataset.color === color
      );
    }
  );
}

// Load settings
chrome.storage.local.get(
  ["enabled", "highlightColor"],
  (data) => {
    const enabled =
      data.enabled !== false;

    const color =
      data.highlightColor ||
      "yellow";

    enabledCheckbox.checked =
      enabled;

    updateStatus(enabled);
    updateSelectedColor(color);
  }
);

// Enable / disable
enabledCheckbox.addEventListener(
  "change",
  () => {
    const enabled =
      enabledCheckbox.checked;

    chrome.storage.local.set({
      enabled
    });

    updateStatus(enabled);
  }
);

// Choose color ONCE
colorButtons.forEach(
  (button) => {
    button.addEventListener(
      "click",
      () => {
        const color =
          button.dataset.color;

        chrome.storage.local.set({
          highlightColor: color
        });

        updateSelectedColor(color);
      }
    );
  }
);

// Clear current page
document
  .getElementById("clear")
  .addEventListener(
    "click",
    async () => {
      const [tab] =
        await chrome.tabs.query({
          active: true,
          currentWindow: true
        });

      if (!tab?.id) {
        return;
      }

      chrome.tabs.sendMessage(
        tab.id,
        {
          type: "clearHighlights"
        }
      ).catch(() => {});

      window.close();
    }
  );
