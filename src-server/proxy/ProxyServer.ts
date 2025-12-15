import { createRequire } from 'module';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Server } from 'net';
import { logger } from '../logger.js';
import { RequestHandler } from './RequestHandler.js';
import { silencePackageLogs } from '../utils/console-silencer.js';

// Silence console logs from http-mitm-proxy before importing it
silencePackageLogs('http-mitm-proxy');

const require = createRequire(import.meta.url);
const Proxy = require('http-mitm-proxy').Proxy;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Type for http-mitm-proxy context
interface MitmProxyContext {
  clientToProxyRequest: {
    url?: string;
    method?: string;
    headers: Record<string, string | string[] | undefined>;
  };
  proxyToServerRequestOptions: {
    host?: string;
    port?: number;
    protocol?: string;
    path?: string;
    rejectUnauthorized?: boolean;
  };
  proxyToClientResponse: {
    writeHead: (statusCode: number, statusMessage?: string, headers?: Record<string, string>) => void;
    write: (chunk: unknown) => void;
    end: (chunk?: unknown) => void;
    headersSent: boolean;
  };
  serverToProxyResponse?: {
    statusCode?: number;
    headers?: Record<string, string | string[] | undefined>;
  };
  onResponseData: (handler: (ctx: MitmProxyContext, chunk: Buffer, callback: (err: Error | null, chunk: Buffer | null) => void) => void) => void;
  onResponseEnd: (handler: (ctx: MitmProxyContext, callback: () => void) => void) => void;
  isSSL?: boolean;
}

// Type for http-mitm-proxy instance
interface MitmProxyInstance {
  onError: (handler: (ctx: MitmProxyContext | null, err: Error, errorKind: string) => void) => void;
  use: (middleware: unknown) => void;
  onRequest: (handler: (ctx: MitmProxyContext, callback: () => void) => void) => void;
  onResponse: (handler: (ctx: MitmProxyContext, callback: () => void) => void) => void;
  listen: (options: { port: number; host: string; silent: boolean; sslCaDir: string }, callback: () => void) => void;
  httpsServer?: Server;
  httpServer?: Server;
}

/**
 * Proxy server class that handles HTTP proxy requests using http-mitm-proxy
 */
export class ProxyServer {
  private proxy: MitmProxyInstance | null = null;
  private requestHandler: RequestHandler;
  private port: number | null = null;
  private caDir: string;

  constructor() {
    this.requestHandler = new RequestHandler();
    const projectRoot = join(__dirname, '../../..');
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
        logger.error('Proxy error', { errorKind, url, error: err.message || String(err) });
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

