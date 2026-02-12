/*
 * Copyright (c) 2025 Aarón Negrín
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { execFileSync, execSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export interface LaunchResult {
  success: boolean;
  error?: string;
}

/** Saved proxy state to restore on close */
interface SavedProxyState {
  webEnabled: string;
  webServer: string;
  webPort: string;
  secureEnabled: string;
  secureServer: string;
  securePort: string;
}

/**
 * Safari launcher for macOS.
 * Safari does not support proxy or certificate flags via command line, so we:
 * 1. Set the system web/secure proxy via `networksetup` (affects Safari and other apps).
 * 2. Optionally add the MITM CA certificate to the user keychain so Safari trusts it.
 * 3. Open Safari.
 * On close(), we restore the previous proxy state and optionally remove the cert.
 */
/** Full path to networksetup; Electron/GUI apps often have a minimal PATH without /usr/sbin */
const NETWORKSETUP = '/usr/sbin/networksetup';

export class SafariLauncher {
  private savedProxyState: SavedProxyState | null = null;
  private activeNetworkService: string | null = null;
  private certAddedToKeychain = false;
  private caCertPathUsed: string | null = null;

  /**
   * Only supported on macOS (darwin). Safari + networksetup are macOS-specific.
   */
  public static isSupported(): boolean {
    return process.platform === 'darwin';
  }

  /**
   * Get all enabled network service names for networksetup.
   * List format: "* Ethernet" = disabled, "Wi-Fi" = enabled.
   */
  private getEnabledNetworkServices(): string[] {
    const services: string[] = [];
    try {
      const out = execFileSync(NETWORKSETUP, ['-listallnetworkservices'], {
        encoding: 'utf-8',
      });
      const lines = out.split('\n').filter((l) => l.trim());
      for (const line of lines) {
        const name = line.replace(/^\*\s*/, '').trim();
        if (!name || name === 'An asterisk (*) denotes that a network service is disabled') continue;
        if (!line.startsWith('*')) services.push(name);
      }
    } catch (err) {
      console.error('getEnabledNetworkServices failed:', err);
    }
    if (services.length === 0) services.push('Wi-Fi');
    return services;
  }

  /**
   * Parse networksetup -getwebproxy / -getsecurewebproxy output.
   * Example:
   *   Enabled: No
   *   Server:
   *   Port: 0
   *   Authenticated Proxy Enabled: 0
   */
  private parseProxyOutput(output: string): { enabled: string; server: string; port: string } {
    const enabled = (output.match(/Enabled:\s*(\S+)/)?.[1] ?? 'No').trim();
    const server = (output.match(/Server:\s*(.*)/)?.[1] ?? '').trim();
    const port = (output.match(/Port:\s*(\S+)/)?.[1] ?? '0').trim();
    return { enabled, server, port };
  }

  /**
   * Save current proxy state for a given network service.
   * Returns null on success, or an error message string on failure.
   */
  private saveProxyState(service: string): string | null {
    try {
      const webOut = execFileSync(NETWORKSETUP, ['-getwebproxy', service], {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const secureOut = execFileSync(NETWORKSETUP, ['-getsecurewebproxy', service], {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const web = this.parseProxyOutput(webOut);
      const secure = this.parseProxyOutput(secureOut);
      this.savedProxyState = {
        webEnabled: web.enabled,
        webServer: web.server,
        webPort: web.port,
        secureEnabled: secure.enabled,
        secureServer: secure.server,
        securePort: secure.port,
      };
      this.activeNetworkService = service;
      return null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const e = err as { stderr?: string | Buffer; stdout?: string | Buffer };
      const stderr = e.stderr != null ? (typeof e.stderr === 'string' ? e.stderr : e.stderr.toString()) : '';
      const extra = stderr.trim() ? ` Stderr: ${stderr.trim()}` : '';
      return `${msg}${extra}`;
    }
  }

  private restoreProxyState(): void {
    if (!this.savedProxyState || !this.activeNetworkService) return;
    const s = this.savedProxyState;
    const svc = this.activeNetworkService;
    try {
      execFileSync(NETWORKSETUP, ['-setwebproxy', svc, s.webServer, s.webPort, 'off'], {
        stdio: 'ignore',
      });
      execFileSync(NETWORKSETUP, ['-setsecurewebproxy', svc, s.secureServer, s.securePort, 'off'], {
        stdio: 'ignore',
      });
      execFileSync(NETWORKSETUP, ['-setwebproxystate', svc, s.webEnabled === 'Yes' ? 'on' : 'off'], {
        stdio: 'ignore',
      });
      execFileSync(NETWORKSETUP, ['-setsecurewebproxystate', svc, s.secureEnabled === 'Yes' ? 'on' : 'off'], {
        stdio: 'ignore',
      });
    } catch (err) {
      console.error('Failed to restore proxy state:', err);
    } finally {
      this.savedProxyState = null;
      this.activeNetworkService = null;
    }
  }

  /**
   * Add CA certificate to the user's login keychain so Safari trusts it.
   * Uses security add-trusted-cert (no sudo). If it fails, we still return success
   * and the user can install the cert manually.
   */
  private addCertToKeychain(certPath: string): boolean {
    try {
      const home = process.env.HOME || '';
      const keychain = existsSync(`${home}/Library/Keychains/login.keychain-db`)
        ? `${home}/Library/Keychains/login.keychain-db`
        : `${home}/Library/Keychains/login.keychain`;
      if (!existsSync(keychain)) return false;
      execSync(
        `security add-trusted-cert -d -r trustAsRoot -k "${keychain}" "${certPath}"`,
        { stdio: 'ignore' }
      );
      this.certAddedToKeychain = true;
      this.caCertPathUsed = certPath;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Remove the CA cert we added from the keychain (by path).
   * Note: security delete-certificate matches by identity name; we may need to find
   * the cert by path. For simplicity we only clear our flag; removing by path is not
   * trivial with the security CLI. Caller can document manual removal if needed.
   */
  private removeCertFromKeychain(): void {
    if (!this.certAddedToKeychain || !this.caCertPathUsed) return;
    try {
      // Try to delete by reading the cert and finding its common name, then delete by label
      const out = execSync(`security find-certificate -c "NodeMITMProxyCA" -a "${process.env.HOME}/Library/Keychains/login.keychain-db" 2>/dev/null || true`, {
        encoding: 'utf-8',
      });
      const hashMatch = out.match(/SHA-1 hash: (\S+)/);
      if (hashMatch) {
        execSync(
          `security delete-certificate -Z "${hashMatch[1]}" "${process.env.HOME}/Library/Keychains/login.keychain-db" 2>/dev/null || true`,
          { stdio: 'ignore' }
        );
      }
    } catch {
      // ignore
    }
    this.certAddedToKeychain = false;
    this.caCertPathUsed = null;
  }

  /**
   * Resolve the path to the CA certificate file (http-mitm-proxy uses caDir/certs/ca.pem).
   */
  private resolveCaCertPath(caDir: string): string | null {
    const candidates = [
      join(caDir, 'certs', 'ca.pem'),
      join(caDir, 'ca.pem'),
    ];
    for (const p of candidates) {
      if (existsSync(p)) return p;
    }
    return null;
  }

  /**
   * Launch Safari with proxy and optional certificate trust.
   * - proxyPort: port of the local proxy (e.g. from ServerPorts.proxyPort).
   * - options.caDir: directory where the proxy stores its CA (e.g. from getProxyCaDir()). If provided and ca.pem exists, we add it to the keychain so Safari trusts HTTPS through the proxy.
   */
  public launch(proxyPort: number, options?: { caDir?: string | null }): LaunchResult {
    if (process.platform !== 'darwin') {
      return {
        success: false,
        error: 'Safari launcher is only supported on macOS.',
      };
    }

    this.close();

    const services = this.getEnabledNetworkServices();
    let lastError: string | null = null;
    for (const service of services) {
      lastError = this.saveProxyState(service);
      if (lastError === null) break;
    }
    if (lastError !== null) {
      return {
        success: false,
        error: `Could not read current proxy state to restore later. ${lastError}`,
      };
    }
    const service = this.activeNetworkService!;

    try {
      const host = '127.0.0.1';
      const portStr = String(proxyPort);
      execFileSync(NETWORKSETUP, ['-setwebproxy', service, host, portStr, 'off'], {
        stdio: 'ignore',
      });
      execFileSync(NETWORKSETUP, ['-setsecurewebproxy', service, host, portStr, 'off'], {
        stdio: 'ignore',
      });
      execFileSync(NETWORKSETUP, ['-setwebproxystate', service, 'on'], { stdio: 'ignore' });
      execFileSync(NETWORKSETUP, ['-setsecurewebproxystate', service, 'on'], { stdio: 'ignore' });
    } catch (err) {
      this.restoreProxyState();
      return {
        success: false,
        error: `Failed to set system proxy: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    if (options?.caDir) {
      const certPath = this.resolveCaCertPath(options.caDir);
      if (certPath) this.addCertToKeychain(certPath);
      // If cert not found or add failed, we still launch Safari; user may see cert warnings until they install the CA manually.
    }

    try {
      spawn('open', ['-a', 'Safari'], { detached: true, stdio: 'ignore' }).unref();
    } catch (err) {
      this.restoreProxyState();
      this.removeCertFromKeychain();
      return {
        success: false,
        error: `Failed to open Safari: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    return { success: true };
  }

  /**
   * Restore previous proxy state and optionally remove the CA cert we added.
   * Call this when the user "stops" Safari mode or when the app quits.
   */
  public close(): void {
    this.restoreProxyState();
    this.removeCertFromKeychain();
  }

  /**
   * Check if we currently have saved proxy state (i.e. we have redirected Safari to our proxy).
   */
  public isRunning(): boolean {
    return this.savedProxyState !== null && this.activeNetworkService !== null;
  }
}
