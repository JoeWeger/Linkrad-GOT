// Brücke zwischen Oberfläche und Hauptprogramm. Die Seiten bekommen nur diese Funktionen.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('linkrad', {
  data: () => ipcRenderer.invoke('data'),
  save: (d) => ipcRenderer.invoke('save', d),
  open: (url) => ipcRenderer.invoke('open', String(url)),
  hide: () => ipcRenderer.send('hide'),
  edit: () => ipcRenderer.send('edit'),
  tryWheel: () => ipcRenderer.send('try'),
  exportFile: () => ipcRenderer.invoke('export'),
  importFile: () => ipcRenderer.invoke('import'),
  showFile: () => ipcRenderer.send('show-file'),
  onShow: (cb) => ipcRenderer.on('show', (_e, d) => cb(d)),
  onHide: (cb) => ipcRenderer.on('hide', () => cb()),
});
