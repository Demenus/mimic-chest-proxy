import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const PROXY_PORT = process.env.PROXY_PORT || 8888;
const PROXY_URL = `http://localhost:${PROXY_PORT}`;

/**
 * Find Chrome executable path based on platform
 */
function findChromePath() {
  const platform = process.platform;

  if (platform === 'linux') {
    const possiblePaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
    ];

    for (const chromePath of possiblePaths) {
      if (existsSync(chromePath)) {
        return chromePath;
      }
    }
    return null;
  } else if (platform === 'darwin') {
    const macPath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    if (existsSync(macPath)) {
      return macPath;
    }
    return null;
  } else if (platform === 'win32') {
    const possiblePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];

    if (process.env.LOCALAPPDATA) {
      possiblePaths.push(
        `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`
      );
    }

    for (const chromePath of possiblePaths) {
      if (existsSync(chromePath)) {
        return chromePath;
      }
    }
    return null;
  }

  return null;
}

const chromePath = findChromePath();
if (!chromePath) {
  console.error('Chrome not found. Please install Google Chrome or Chromium.');
  process.exit(1);
}

console.log(`Using Chrome: ${chromePath}`);
console.log(`Proxy URL: ${PROXY_URL}`);
console.log('');

const args = [
  `--proxy-server=${PROXY_URL}`,
  '--disable-web-security',
  '--disable-features=IsolateOrigins,site-per-process',
  '--user-data-dir=/tmp/chrome-test-proxy',
  '--ignore-certificate-errors', // Ignore SSL certificate errors (for testing with MITM proxy)
  '--ignore-certificate-errors-spki-list', // Ignore certificate errors for specific SPKI list
  'http://httpforever.com/',
];

const chromeProcess = spawn(chromePath, args, {
  detached: false,
  stdio: 'inherit',
});

chromeProcess.on('error', (error) => {
  console.error('Failed to launch Chrome:', error);
  process.exit(1);
});

chromeProcess.on('exit', (code) => {
  console.log(`Chrome exited with code ${code}`);
});

