import express from 'express';
import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import parseUrl from 'parse-url';
import { createRequestInterceptor } from './requestHandler.js';
import { logger } from '../logger.js';
import '../types.js'; // Import to register type extensions

let server: Server | null = null;

export async function startProxyServer(): Promise<number> {
  const app = express();

  // Enable trust proxy to handle proxy requests correctly
  app.set('trust proxy', true);

  // Middleware to capture full URL for HTTP proxy requests before Express parses it
  app.use((req, res, next) => {
    // For HTTP proxy requests, the full URL might be in req.url before Express parses it
    // Store it in a custom property if it looks like a full URL
    const rawUrl = req.url || '';
    if ((rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) && !req.originalTargetUrl) {
      req.originalTargetUrl = rawUrl;
    }
    next();
  });

  // CORS middleware - allow requests from Electron app
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }

    next();
  });

  // Middleware to parse JSON and text body (content is always text: js, json, html, etc.)
  app.use(express.json());
  app.use(express.text({ limit: '50mb' })); // Parse text/plain requests

  // Middleware to intercept all requests and check for mimic mappings
  // This must be after routes but before any default handlers
  app.use(createRequestInterceptor());

  return new Promise((resolve, reject) => {
    server = createServer((req: IncomingMessage, res: ServerResponse) => {
      // Intercept the request before Express parses it
      // For HTTP proxy requests, the full URL is in the request line
      // Store it in a custom property
      const originalUrl = req.url;
      if (originalUrl && (originalUrl.startsWith('http://') || originalUrl.startsWith('https://'))) {
        // Store the original URL in a custom property that Express will have access to
        (req as express.Request).originalTargetUrl = originalUrl;
        logger.info('Received proxy request with full URL', { originalUrl, method: req.method });
        // Extract just the path for Express to parse
        try {
          const urlObj = parseUrl(originalUrl);
          // parse-url returns search without the ?, so we need to add it
          const search = urlObj.search ? `?${urlObj.search}` : '';
          req.url = urlObj.pathname + search;
          logger.info('Parsed proxy URL', {
            originalUrl,
            pathname: urlObj.pathname,
            search: urlObj.search,
            finalUrl: req.url,
            protocol: urlObj.protocol,
            host: urlObj.host || urlObj.resource,
          });
        } catch (error) {
          // If URL parsing fails, keep original
          logger.warn('Failed to parse URL', { originalUrl, error: String(error) });
        }
      }

      // Pass to Express
      app(req as express.Request, res);
    });

    server.listen(0, () => {
      const port = (server!.address() as AddressInfo).port;
      logger.info(`Proxy server started on port ${port}`);
      resolve(port);
    });

    server.on('error', (error) => {
      logger.error('Proxy server error', { error });
      reject(error);
    });
  });
}

