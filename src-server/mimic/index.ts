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

