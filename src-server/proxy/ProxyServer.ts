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

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Proxy } from 'http-mitm-proxy';
import { logger } from '../logger.js';
import { mimicMappingService } from '../service/MimicMappingService.js';
import { RequestHandler } from './RequestHandler.js';
import { silencePackageLogs } from '../utils/console-silencer.js';
import type { MitmProxyContext, MitmProxyInstance } from './types.js';

// Silence console logs from http-mitm-proxy (including Socket/parse errors from non-HTTP traffic)
silencePackageLogs('http-mitm-proxy', { silenceError: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

/**
 * Proxy server class that handles HTTP proxy requests using http-mitm-proxy
 */
export class ProxyServer {
  private proxy: MitmProxyInstance | null = null;
  private requestHandler: RequestHandler;
  private port: number | null = null;
  private caDir: string;

  constructor() {
    this.requestHandler = new RequestHandler(mimicMappingService);
    const certDir = join(projectRoot, 'certs');
    this.caDir = join(certDir, 'ca');
  }

  /**
   * Start the proxy server
   */
  public async start(): Promise<number> {
    if (this.proxy) {
      throw new Error('Proxy server is already running');
    }

    return new Promise((resolve, reject) => {
      const proxyInstance = new Proxy() as MitmProxyInstance;
      this.proxy = proxyInstance;

      proxyInstance.onError((ctx: MitmProxyContext | null, err: Error, errorKind: string) => {
        const url = ctx?.clientToProxyRequest?.url || 'unknown';
        const msg = err.message || String(err);
        const isCommonNoise =
          errorKind === 'HTTPS_CLIENT_ERROR' &&
          (msg.includes('ECONNRESET') ||
            msg.includes('socket hang up') ||
            msg.includes('Parse Error') ||
            msg.includes('HPE_INVALID_METHOD'));
        if (isCommonNoise) {
          logger.debug('Proxy client/parse noise (non-HTTP or closed connection)', {
            errorKind,
            url,
            error: msg,
          });
        } else {
          logger.error('Proxy error', { errorKind, url, error: msg });
        }
      });

      proxyInstance.use(Proxy.gunzip);

      proxyInstance.onRequest((ctx: MitmProxyContext, callback: () => void) => {
        ctx.proxyToServerRequestOptions.rejectUnauthorized = false;
        // Only handle URL redirections here, content substitution is done in onResponse
        this.requestHandler.handleRequest(ctx, callback);
      });

      // Intercept all responses to check if there is content substitution
      proxyInstance.onResponse((ctx: MitmProxyContext, callback: () => void) => {
        this.requestHandler.handleResponse(ctx, callback);
      });

      const listenOptions = {
        port: 0,
        host: '0.0.0.0',
        silent: false,
        sslCaDir: this.caDir,
      };

      proxyInstance.listen(listenOptions, () => {
        const server = proxyInstance.httpsServer || proxyInstance.httpServer;
        if (server) {
          const address = server.address();
          if (address && typeof address === 'object' && address.port) {
            this.port = address.port;
            logger.info(`Proxy server started on port ${this.port}`, { caDir: this.caDir });
            resolve(this.port);
          } else {
            reject(new Error('Could not determine proxy server port'));
          }
        } else {
          reject(new Error('Proxy server did not start correctly'));
        }
      });

    });
  }

  /**
   * Stop the proxy server
   */
  public stop(): void {
    if (this.proxy) {
      this.proxy = null;
      this.port = null;
      logger.info('Proxy server stopped');
    }
  }

  /**
   * Check if the server is running
   */
  public isRunning(): boolean {
    return this.proxy !== null && this.port !== null;
  }

  /**
   * Get the current port (null if not started)
   */
  public getPort(): number | null {
    return this.port;
  }

  /**
   * Get the CA directory path
   */
  public getCaDir(): string {
    return this.caDir;
  }
}

