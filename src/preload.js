const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

let isOfflineMode = false;
let gameDir;

// Listen for the offline mode status message from the main process
ipcRenderer.on('offline-mode-status', (event, status) => {
  isOfflineMode = status[0];
  gameDir = status[1]
});

// Override the global fetch function when in offline mode to fix broken move issues (and more?)
const originalFetch = window.fetch;
window.fetch = async (url, options) => {
  if (isOfflineMode && (url.startsWith('./') || url.startsWith('../'))) {
    const filePath = path.join(gameDir, url.split('?')[0]);
    console.log("Fetching file:", filePath);

    try {
      const data = await fs.promises.readFile(filePath, 'utf-8');
      console.log("File read successfully:", filePath);
      return new Response(data, { status: 200, statusText: 'OK' });
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log("File not found:", filePath);

          const fileExtension = path.extname(filePath);
          let fallbackFileContents = '';

          if (fileExtension === '.json') {
            fallbackFileContents = "[]";
          } else if (fileExtension === '.png') {
            // Create a transparent 1x1 pixel image
            fallbackFileContents = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
          }

          console.warn("Serving fallback response for file:", filePath);
          return new Response(fallbackFileContents, {
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': fileExtension === '.json' ? 'application/json' : 'image/png' },
          });
      } else {
        console.error("Error reading file:", error);
        return originalFetch(url, options);
      }
    }
  } else {
    console.log("Fetching URL:", url);
    return originalFetch(url, options);
  }
};