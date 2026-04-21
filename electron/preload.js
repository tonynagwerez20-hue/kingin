const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Add any IPC methods here if needed
  // Example: sendMessage: (message) => ipcRenderer.send('message', message)
});
