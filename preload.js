const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  checkForUpdates: () => ipcRenderer.invoke('app:check-for-updates'),
  quitAndInstall: () => ipcRenderer.invoke('app:quit-and-install'),
  onUpdateStatus: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('app:update-status', handler);
    return () => ipcRenderer.removeListener('app:update-status', handler);
  }
});
