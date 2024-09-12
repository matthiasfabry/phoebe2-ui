const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInIsolatedWorld(999, 'electronAPI', {
    getClientId: () => ipcRenderer.invoke('get-clientid'),
    getPyPort: () => ipcRenderer.invoke('get-pyport'),
});