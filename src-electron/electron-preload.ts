/**
 * This file is used specifically for security reasons.
 * Here you can access Nodejs stuff and inject functionality into
 * the renderer thread (accessible there through the "window" object)
 */

import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  launchMimicChrome: () => ipcRenderer.invoke('launch-mimic-chrome'),
  getMimicServerPort: () => ipcRenderer.invoke('get-mimic-server-port'),
});
