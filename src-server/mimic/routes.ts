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

import type { Express, Request, Response, NextFunction } from 'express';
import {
  getMappings,
  getMappingById,
  createMapping,
  updateMappingContent,
  deleteMapping,
  fetchUrlContent,
} from './handlers.js';

/**
 * Wraps an async route handler so Express receives a void-returning function.
 * Rejected promises are forwarded to next().
 */
function asyncHandler<Req extends Request = Request>(
  handler: (req: Req, res: Response) => Promise<void>
): (req: Req, res: Response, next: NextFunction) => void {
  return (req: Req, res: Response, next: NextFunction) => {
    void handler(req, res).catch(next);
  };
}

/**
 * Setup all API routes
 */
export function setupRoutes(app: Express): void {
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/api/mimic', getMappings);
  app.post('/api/mimic/fetch-url', asyncHandler(fetchUrlContent));
  app.get('/api/mimic/:id', asyncHandler(getMappingById));
  app.post('/api/mimic/url', asyncHandler(createMapping));
  app.post('/api/mimic/:id', asyncHandler(updateMappingContent));
  app.delete('/api/mimic/:id', asyncHandler(deleteMapping));
}
