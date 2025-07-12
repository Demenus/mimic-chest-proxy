import express from 'express';
import { createServer, type Server } from 'http';
import type { AddressInfo } from 'net';
import { setupRoutes } from './routes.js';
import { logger } from '../logger.js';
import '../types.js'; // Import to register type extensions

let server: Server | null = null;

export async function startMimicServer(): Promise<number> {
  const app = express();

  // Enable trust proxy to handle proxy requests correctly
  app.set('trust proxy', true);

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

  return new Promise((resolve, reject) => {
    server = createServer(app);

    server.listen(0, () => {
      const port = (server!.address() as AddressInfo).port;
      logger.info(`Mimic server started on port ${port}`);
      resolve(port);
    });

    server.on('error', (error) => {
      logger.error('Mimic server error', { error });
      reject(error);
    });
  });
}

