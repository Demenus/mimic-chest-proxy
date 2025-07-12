import express from 'express';
import { createServer } from 'http';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { setupRoutes } from './routes.js';
import { createMimicInterceptor } from './middleware.js';

let server: Server | null = null;

export async function startMimicServer(): Promise<number> {
  const app = express();

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
    server = createServer(app);

    server.listen(0, () => {
      const port = (server!.address() as AddressInfo).port;
      console.log(`Mimic server started on port ${port}`);
      resolve(port);
    });

    server.on('error', reject);
  });
}

