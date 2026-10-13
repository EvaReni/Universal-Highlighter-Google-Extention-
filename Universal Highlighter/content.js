
(() => {
  if (window.__USH_INITIALIZED__) return;
  window.__USH_INITIALIZED__ = true;

  const COLORS = {
    yellow: "rgba(255, 235, 59, 0.65)",
    blue: "rgba(100, 181, 246, 0.55)",
    green: "rgba(129, 199, 132, 0.55)",
    pink: "rgba(244, 143, 177, 0.60)"
  };

  const HIGHLIGHT_CLASS = "ush-highlight";

  let enabled = true;
  let highlightColor = "yellow";
  let isSelecting = false;
  let contextMenuRange = null;
  let restoreTimer = null;

  function pageKey() {
    return "ush:" + location.href;
  }

  // Load settings.
  chrome.storage.local.get(
    ["enabled", "highlightColor"],
    (data) => {
      enabled = data.enabled !== false;
      highlightColor = data.highlightColor || "yellow";
    }
  );

  // Sync settings with the popup.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;

    if (changes.enabled) {
      enabled = changes.enabled.newValue !== false;
    }

    if (changes.highlightColor) {
      highlightColor =
        changes.highlightColor.newValue || "yellow";
    }
  });

  function getSelectionInfo() {
    const selection = window.getSelection();

    if (
      !selection ||
      selection.rangeCount === 0 ||
      selection.isCollapsed
    ) {
      return null;
    }

    const range = selection.getRangeAt(0);

    if (!range.toString().trim()) return null;

    return {
      selection,
      range: range.cloneRange(),
      text: range.toString()
    };
  }

  function isAlreadyHighlighted(node) {
    if (!node) return false;

    const element =
      node.nodeType === Node.ELEMENT_NODE
        ? node
        : node.parentElement;

    return Boolean(element?.closest("." + HIGHLIGHT_CLASS));
  }

  function nodePath(node) {
    const path = [];

    while (
      node &&
      node !== document.body &&
      node.parentNode
    ) {
      let index = 0;
      let sibling = node;

      while ((sibling = sibling.previousSibling)) {
        index++;
      }

      path.unshift(index);
      node = node.parentNode;
    }

    return node === document.body ? path.join("/") : null;
  }

  function findNode(path) {
    if (!path) return null;

    let node = document.body;

    for (const part of path.split("/")) {
      const index = Number(part);

      if (!node?.childNodes[index]) return null;

      node = node.childNodes[index];
    }

    return node;
  }

  function createHighlight(fragment, color) {
    const mark = document.createElement("mark");

    mark.className = HIGHLIGHT_CLASS;
    mark.dataset.color = color;
    mark.style.backgroundColor =
      COLORS[color] || COLORS.yellow;
    mark.style.color = "inherit";
    mark.style.borderRadius = "2px";
    mark.style.padding = "0 1px";
    mark.style.boxDecorationBreak = "clone";
    mark.style.webkitBoxDecorationBreak = "clone";

    mark.appendChild(fragment);

    return mark;
  }

  function saveHighlight(data) {
    const key = pageKey();

    chrome.storage.local.get([key], (result) => {
      const highlights = Array.isArray(result[key])
        ? result[key]
        : [];

      highlights.push({
        ...data,
        url: location.href,
        savedAt: Date.now()
      });

      chrome.storage.local.set({
        [key]: highlights
      });
    });
  }

  function highlightRange(range) {
    if (!range || range.collapsed) return false;

    const text = range.toString();

    if (!text.trim()) return false;

    if (
      isAlreadyHighlighted(range.startContainer) ||
      isAlreadyHighlighted(range.endContainer)
    ) {
      return false;
    }

    const startPath = nodePath(range.startContainer);
    const endPath = nodePath(range.endContainer);
    const startOffset = range.startOffset;
    const endOffset = range.endOffset;
    const color = highlightColor;

    // Save context to help locate repeated phrases after reload.
    const beforeRange = range.cloneRange();
    beforeRange.selectNodeContents(document.body);
    beforeRange.setEnd(
      range.startContainer,
      range.startOffset
    );

    const afterRange = range.cloneRange();
    afterRange.selectNodeContents(document.body);
    afterRange.setStart(
      range.endContainer,
      range.endOffset
    );

    const prefix = beforeRange.toString().slice(-100);
    const suffix = afterRange.toString().slice(0, 100);

    try {
      const fragment = range.extractContents();
      const mark = createHighlight(fragment, color);

      range.insertNode(mark);

      saveHighlight({
        text,
        color,
        startPath,
        startOffset,
        endPath,
        endOffset,
        prefix,
        suffix
      });

      window.getSelection()?.removeAllRanges();

      return true;
    } catch (error) {
      console.error("[USH] Highlight failed:", error);
      return false;
    }
  }

  function highlightSelection(force = false, selectedText = "") {
    if (!enabled && !force) return false;

    let info = getSelectionInfo();

    if (
      force &&
      contextMenuRange &&
      !contextMenuRange.collapsed
    ) {
      info = {
        range: contextMenuRange.cloneRange(),
        text: contextMenuRange.toString()
      };
    }

    if (!info && force && selectedText) {
      const range = findTextRange(selectedText);

      if (range) {
        info = {
          range,
          text: range.toString()
        };
      }
    }

    if (!info?.range) return false;

    return highlightRange(info.range);
  }

  // Find an occurrence of text in the page.
  function findTextRange(text, prefix = "", suffix = "") {
    if (!text) return null;

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (
            node.parentElement?.closest(
              "script,style,noscript,textarea,input,select,option,." +
                HIGHLIGHT_CLASS
            )
          ) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodes = [];
    let fullText = "";
    let node;

    while ((node = walker.nextNode())) {
      nodes.push({
        node,
        start: fullText.length,
        end: fullText.length + node.textContent.length
      });

      fullText += node.textContent;
    }

    let bestRange = null;
    let bestScore = -1;
    let index = fullText.indexOf(text);

    while (index !== -1) {
      const endIndex = index + text.length;

      const startEntry = nodes.find(
        (entry) => index >= entry.start && index < entry.end
      );

      const endEntry = nodes.find(
        (entry) => endIndex > entry.start && endIndex <= entry.end
      );

      if (startEntry && endEntry) {
        try {
          const range = document.createRange();

          range.setStart(
            startEntry.node,
            index - startEntry.start
          );

          range.setEnd(
            endEntry.node,
            endIndex - endEntry.start
          );

          const actualText = range.toString();

          if (
            actualText === text &&
            !isAlreadyHighlighted(range.startContainer) &&
            !isAlreadyHighlighted(range.endContainer)
          ) {
            const contextBefore = fullText.slice(
              Math.max(0, index - prefix.length),
              index
            );

            const contextAfter = fullText.slice(
              endIndex,
              endIndex + suffix.length
            );

            let score = 0;

            if (prefix) {
              let i = 1;

              while (
                i <= prefix.length &&
                contextBefore.endsWith(prefix.slice(-i))
              ) {
                score++;
                i++;
              }
            }

            if (suffix) {
              let i = 1;

              while (
                i <= suffix.length &&
                contextAfter.startsWith(suffix.slice(0, i))
              ) {
                score++;
                i++;
              }
            }

            if (score > bestScore) {
              bestScore = score;
              bestRange = range.cloneRange();
            }
          }
        } catch (error) {
          // Ignore invalid candidate ranges.
        }
      }

      index = fullText.indexOf(text, index + 1);
    }

    return bestRange;
  }

  // Remember the selected range before the context menu opens.
  document.addEventListener(
    "contextmenu",
    () => {
      contextMenuRange = getSelectionInfo()?.range || null;
    },
    true
  );

  // Automatically highlight only when enabled.
  document.addEventListener("mousedown", () => {
    isSelecting = true;
  });

  document.addEventListener("mouseup", () => {
    if (!enabled) {
      isSelecting = false;
      return;
    }

    if (!isSelecting) return;

    isSelecting = false;

    setTimeout(() => {
      if (enabled) highlightSelection();
    }, 100);
  });

  // Keyboard selection support.
  document.addEventListener("keyup", (event) => {
    if (
      enabled &&
      (event.shiftKey || event.key === "Shift")
    ) {
      setTimeout(() => {
        if (enabled) highlightSelection();
      }, 100);
    }
  });

  // Handle commands from background.js.
  chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
      if (message.type === "highlightSelection") {
        const success = highlightSelection(
          message.force === true,
          message.selectedText || ""
        );

        contextMenuRange = null;

        sendResponse({
          success,
          reason: success ? undefined : "Selection unavailable"
        });

        return true;
      }

      if (message.type === "clearHighlights") {
        clearHighlights();
        sendResponse({ success: true });
        return true;
      }

      return false;
    }
  );

  function clearHighlights() {
    document
      .querySelectorAll("." + HIGHLIGHT_CLASS)
      .forEach((mark) => {
        const parent = mark.parentNode;
        if (!parent) return;

        while (mark.firstChild) {
          parent.insertBefore(mark.firstChild, mark);
        }

        mark.remove();
        parent.normalize();
      });

    chrome.storage.local.remove(pageKey());
  }

  function restoreOne(highlight) {
    if (!highlight?.text) return;

    // First try the original saved DOM position.
    const start = findNode(highlight.startPath);
    const end = findNode(highlight.endPath);

    if (start && end) {
      try {
        const range = document.createRange();

        const startMax =
          start.nodeType === Node.TEXT_NODE
            ? start.length
            : start.childNodes.length;

        const endMax =
          end.nodeType === Node.TEXT_NODE
            ? end.length
            : end.childNodes.length;

        range.setStart(
          start,
          Math.min(highlight.startOffset, startMax)
        );

        range.setEnd(
          end,
          Math.min(highlight.endOffset, endMax)
        );

        if (
          !range.collapsed &&
          range.toString() === highlight.text &&
          !isAlreadyHighlighted(range.startContainer) &&
          !isAlreadyHighlighted(range.endContainer)
        ) {
          range.insertNode(
            createHighlight(
              range.extractContents(),
              highlight.color
            )
          );

          return;
        }
      } catch (error) {
        // Fall back to text-based recovery.
      }
    }

    // If the DOM changed, locate the text using its content and context.
    const range = findTextRange(
      highlight.text,
      highlight.prefix || "",
      highlight.suffix || ""
    );

    if (!range) {
      console.warn(
        "[USH] Could not restore highlight:",
        highlight.text
      );
      return;
    }

    try {
      range.insertNode(
        createHighlight(
          range.extractContents(),
          highlight.color
        )
      );
    } catch (error) {
      console.warn("[USH] Restore failed:", error);
    }
  }

  function restoreHighlights() {
    clearTimeout(restoreTimer);

    // Wait briefly for the page to build its DOM.
    restoreTimer = setTimeout(() => {
      chrome.storage.local.get([pageKey()], (result) => {
        const highlights = Array.isArray(result[pageKey()])
          ? result[pageKey()]
          : [];

        // Restore one at a time. Saved paths can change after each insert,
        // so text/context recovery is available as a fallback.
        highlights.forEach((highlight) => {
          restoreOne(highlight);
        });
      });
    }, 500);
  }

  restoreHighlights();
})();
