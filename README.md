
# Universal Highlighter (Google Extension)

## Idea

I originally developed this extension while practicing SAT Reading and Writing questions. The word bank I was using didn't have a highlighting option, making it difficult to mark important details in passages. Rather than repeatedly working around that limitation, I decided to build my own solution.

What started as a small tool for SAT preparation became something more generally useful: an extension that lets you highlight text almost anywhere on the web, choose different colors, and return to highlighted passages later.

## Features

- **Automatic Highlighting:** Select text with your mouse and release to highlight it automatically.
- **Four Highlight Colors:** Choose between yellow, blue, green, and pink.
- **Persistent Highlights:** Highlights are saved locally and restored when you revisit or reload a page, provided the original text and page structure remain compatible.
- **Enable/Disable Toggle:** Turn automatic highlighting on or off without uninstalling the extension.
- **Clear Highlights:** Remove all highlights created by the extension on the current page.
- **Saved Preferences:** Your enabled state and selected highlight color are stored locally.

## Technologies

- JavaScript
- HTML and CSS
- Chrome Extensions API (Manifest V3)
- Chrome Storage API
- DOM Selection and Range APIs

## Installation

To install the extension locally in Chrome:

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the folder containing all the files.

The extension should now appear in your Chrome extensions list.

## Usage

1. Open a webpage containing text you want to highlight.
2. Select text with your mouse and release. If highlighting is enabled, the selection will be highlighted automatically.
3. Click the extension icon (the puzzle piece to the right of the address bar) to open the settings popup.
4. Choose your preferred highlight color, disable automatic highlighting, or clear all highlights.
5. To highlight a selection manually, right-click the selected text and choose **Highlight selected text**.
6. To remove highlights from the current page, open the popup and click **Clear highlights on this page**.

The extension cannot run on certain browser-restricted pages, such as Chrome's internal settings pages.

## Project Structure

| File | Purpose |
| --- | --- |
| `manifest.json` | Defines the extension, permissions, popup, background service worker, and content scripts. |
| `background.js` | Initializes default settings and handles the right-click context menu. |
| `content.js` | Detects text selections, applies highlights, saves their positions, and restores them when possible. |
| `popup.html` | Defines the extension's settings interface. |
| `popup.js` | Handles the enabled toggle, color selection, status display, and clearing highlights. |

## Storage and Permissions

The extension uses Chrome's local storage to save preferences and page-specific highlight information. Highlight data is associated with the page URL and stored locally in the browser.

The extension requests the following permissions:

- **Storage:** Save settings and highlights locally.
- **Context Menus:** Add the right-click highlighting option.
- **Host Permissions:** Allow the content script to operate on supported webpages.

The extension is designed to store its settings and highlights locally rather than sending them to an external server.

## Development Notes

This project uses plain JavaScript, HTML, and CSS, with no external libraries required by the provided source files.

The extension uses the DOM Selection and Range APIs to wrap selected text in HTML `<mark>` elements. It records the selected text and its DOM position so that highlights can be restored when the page is revisited, provided the relevant page structure remains compatible.

The extension uses Chrome's Manifest V3 architecture, with a background service worker, a content script, and a popup interface.

## License

This project is licensed under the **Creative Commons Attribution 4.0 International (CC BY 4.0)** license.

You are free to share and adapt this work, provided that appropriate credit is given to the original author.

**Author:** Eva Mateev

**License:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
