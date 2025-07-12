import express from 'express';
import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import parseUrl from 'parse-url';
import { setupRoutes } from './routes.js';
import { createMimicInterceptor } from './middleware.js';
import { logger } from './logger.js';
import './types.js'; // Import to register type extensions

let server: Server | null = null;

export async function startMimicServer(): Promise<number> {
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

  // Setup API routes
  setupRoutes(app);

  // Middleware to intercept all requests and check for mimic mappings
  // This must be after routes but before any default handlers
  app.use(createMimicInterceptor());

  return new Promise((resolve, reject) => {
    server = createServer((req: IncomingMessage, res: ServerResponse) => {
      // Intercept the request before Express parses it
      // For HTTP proxy requests, the full URL is in the request line
      // Store it in a custom property
      const originalUrl = req.url;
      if (originalUrl && (originalUrl.startsWith('http://') || originalUrl.startsWith('https://'))) {
        // Store the original URL in a custom property that Express will have access to
        (req as express.Request).originalTargetUrl = originalUrl;
        // Extract just the path for Express to parse
        try {
          const urlObj = parseUrl(originalUrl);
          req.url = urlObj.pathname + (urlObj.search || '');
          logger.debug('Parsed proxy URL', { originalUrl, pathname: urlObj.pathname, search: urlObj.search });
        } catch (error) {
          // If URL parsing fails, keep original
          logger.warn('Failed to parse URL', { originalUrl, error });
        }
      }

      // Pass to Express
      app(req as express.Request, res);
    });

    server.listen(0, () => {
      const port = (server!.address() as AddressInfo).port;
      logger.info(`Mimic server started on port ${port}`);
      resolve(port);
    });

    server.on('error', (error) => {
      logger.error('Server error', { error });
      reject(error);
    });
  });
}

