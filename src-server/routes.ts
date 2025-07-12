import type { Express, Request, Response } from 'express';
import {
  createMapping,
  getMapping,
  getAllMappings,
  updateMappingContent,
} from './storage.js';
import { parseContentFromBody } from './utils.js';
import type {
  CreateMappingRequest,
  CreateMappingResponse,
  UpdateContentResponse,
  ErrorResponse,
} from './types.js';

/**
 * Setup all API routes
 */
export function setupRoutes(app: Express): void {
  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  // GET /api/mimic - Get all mappings
  app.get('/api/mimic', (req: Request, res: Response) => {
    try {
      const mappings = getAllMappings();
      res.status(200).json(
        mappings.map((m) => ({
          id: m.id,
          url: m.url,
          regexUrl: m.regex?.toString(),
          hasContent: !!m.content,
          contentLength: m.content?.length || 0,
        }))
      );
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get mappings',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // GET /api/mimic/:id - Get a specific mapping with content
  app.get('/api/mimic/:id', (req: Request<{ id: string }>, res: Response) => {
    try {
      const { id } = req.params;
      const mapping = getMapping(id);

      if (!mapping) {
        res.status(404).json({ error: 'Mapping not found' });
        return;
      }

      res.status(200).json({
        id: mapping.id,
        url: mapping.url,
        regexUrl: mapping.regex?.toString(),
        content: mapping.content ? mapping.content.toString('utf-8') : '',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get mapping',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // POST /api/mimic/url - Register URL or regex
  app.post(
    '/api/mimic/url',
    (req: Request<unknown, CreateMappingResponse | ErrorResponse, CreateMappingRequest>, res: Response) => {
      try {
        const { url, regexUrl } = req.body;

        if (!url && !regexUrl) {
          res.status(400).json({ error: 'Either url or regexUrl must be provided' });
          return;
        }

        const mapping = createMapping(url, regexUrl);

        const response: CreateMappingResponse = { id: mapping.id };
        if (url) {
          response.url = url;
        } else if (regexUrl) {
          response.regexUrl = regexUrl;
        }

        res.status(201).json(response);
      } catch (error) {
        res.status(400).json({
          error: 'Failed to create mapping',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  // POST /api/mimic/:id - Assign content to a mapping (expects text content)
  app.post(
    '/api/mimic/:id',
    (req: Request<{ id: string }, UpdateContentResponse | ErrorResponse>, res: Response) => {
      try {
        const { id } = req.params;
        const mapping = getMapping(id);

        if (!mapping) {
          res.status(404).json({ error: 'Mapping not found' });
          return;
        }

        // Content is expected as plain text (js, json, html, etc.)
        const content = parseContentFromBody(req.body);

        updateMappingContent(id, content);

        res.status(200).json({
          success: true,
          id,
          contentLength: content.length,
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'Mapping not found') {
          res.status(404).json({ error: error.message });
          return;
        }
        res.status(400).json({
          error: 'Failed to update content',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );
}

