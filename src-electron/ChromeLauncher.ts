import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';

export interface LaunchResult {
  success: boolean;
  error?: string;
}

export class ChromeLauncher {
  private chromeProcess: ChildProcess | null = null;

  /**
   * Find Chrome executable path based on platform
   */
  private findChromePath(): string | null {
    const platform = process.platform;

    if (platform === 'linux') {
      // Try common Chrome/Chromium paths on Linux
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
      // macOS
      const macPath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      if (existsSync(macPath)) {
        return macPath;
      }
      return null;
    } else if (platform === 'win32') {
      // Windows - common installation paths
      const possiblePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      ];

      // Add user-specific path if LOCALAPPDATA is available
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

  /**
   * Launch Chrome with proxy configuration
   */
  public launch(proxyPort: number): LaunchResult {
    // Close existing Chrome process if any
    this.close();

    const chromePath = this.findChromePath();
    if (!chromePath) {
      return {
        success: false,
        error: 'Chrome not found. Please install Google Chrome or Chromium.',
      };
    }

    try {
      const proxyUrl = `http://localhost:${proxyPort}`;
      const args = [
        `--proxy-server=${proxyUrl}`,
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--user-data-dir=/tmp/chrome-mimic-proxy',
        '--ignore-certificate-errors', // Ignore SSL certificate errors (for testing with MITM proxy)
        '--ignore-certificate-errors-spki-list', // Ignore certificate errors for specific SPKI list
      ];

      this.chromeProcess = spawn(chromePath, args, {
        detached: false,
        stdio: 'ignore',
      });

      this.chromeProcess.on('error', (error) => {
        console.error('Failed to launch Chrome:', error);
      });

      this.chromeProcess.unref(); // Allow the parent process to exit independently

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Close the Chrome process if it's running
   */
  public close(): void {
    if (this.chromeProcess) {
      try {
        this.chromeProcess.kill();
      } catch (error) {
        console.error('Error closing Chrome process:', error);
      } finally {
        this.chromeProcess = null;
      }
    }
  }

  /**
   * Check if Chrome is currently running
   */
  public isRunning(): boolean {
    return this.chromeProcess !== null && !this.chromeProcess.killed;
  }
}

