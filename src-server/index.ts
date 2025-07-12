import express from 'express';
import { createServer } from 'http';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { setupRoutes } from './routes.js';
import { createMimicInterceptor } from './middleware.js';

let server: Server | null = null;

export async function startMimicServer(): Promise<number> {
  const app = express();

  // Middleware to parse JSON and raw body
  app.use(express.json());
  app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));
  app.use(express.text({ type: 'text/*', limit: '50mb' }));

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

