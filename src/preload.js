const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getClientId: () => ipcRenderer.invoke('get-clientid'),
    getPyPort: () => ipcRenderer.invoke('get-pyport'),
    getArgs: () => ipcRenderer.invoke('get-args'),
    launchChildProcessServer: () => ipcRenderer.invoke('launchChildProcessServer'),
    ignoreArgs: () => ipcRenderer.invoke('ignoreArgs'),
    setIgnoreArgs: () => ipcRenderer.invoke('setIgnoreArgs'),
    testAutofigInstalled: () => ipcRenderer.invoke('testAutofigInstalled'),
    launchCommand: () => ipcRenderer.invoke('launchCommand'),
});