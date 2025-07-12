import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { startServers, type ServerPorts } from '../src-server/index.js';
import { ChromeLauncher } from './ChromeLauncher.js';

// needed in case process is undefined under Linux
const platform = process.platform || os.platform();

const currentDir = fileURLToPath(new URL('.', import.meta.url));

let mainWindow: BrowserWindow | undefined;
let serverPorts: ServerPorts | null = null;
const chromeLauncher = new ChromeLauncher();

async function createWindow() {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    icon: path.resolve(currentDir, 'icons/icon.png'), // tray icon
    width: 1240,
    height: 935,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      // More info: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/electron-preload-script
      preload: path.resolve(
        currentDir,
        path.join(
          process.env.QUASAR_ELECTRON_PRELOAD_FOLDER || '',
          'electron-preload' + (process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION || '')
        )
      ),
    },
  });

  if (process.env.DEV) {
    await mainWindow.loadURL(process.env.APP_URL || 'http://localhost:9000');
  } else {
    await mainWindow.loadFile('index.html');
  }

  // DevTools: not opened automatically, but can be opened manually (Ctrl+Shift+I / Cmd+Option+I)

  mainWindow.on('closed', () => {
    mainWindow = undefined;
  });
}

// IPC handlers
ipcMain.handle('launch-mimic-chrome', () => {
  if (!serverPorts) {
    return {
      success: false,
      error: 'Servers are not running',
    };
  }

  // Use proxy port for Chrome since that's the proxy server
  return chromeLauncher.launch(serverPorts.proxyPort);
});

ipcMain.handle('get-mimic-server-port', () => {
  return serverPorts?.mimicPort ?? null;
});

ipcMain.handle('get-proxy-server-port', () => {
  return serverPorts?.proxyPort ?? null;
});

void app.whenReady().then(async () => {
  await createWindow();
  serverPorts = await startServers();
  console.log(`Mimic server started on port ${serverPorts.mimicPort}`);
  console.log(`Proxy server started on port ${serverPorts.proxyPort}`);
});

// Cleanup Chrome process on app quit
app.on('before-quit', () => {
  chromeLauncher.close();
});

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === undefined) {
    void createWindow();
  }
});
