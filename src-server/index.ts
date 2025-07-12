import express from 'express';
import { createServer } from 'http';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { randomUUID } from 'crypto';
import proxy from 'express-http-proxy';

let server: Server | null = null;

// Structure to store mimic mappings
interface MimicMapping {
  id: string;
  url?: string;
  regex?: RegExp;
  content?: Buffer;
}

// In-memory storage for mimic mappings
const mimicMappings = new Map<string, MimicMapping>();

// Helper function to find matching mapping by URL
function findMatchingMapping(url: string): MimicMapping | undefined {
  for (const mapping of mimicMappings.values()) {
    if (mapping.url && mapping.url === url) {
      return mapping;
    }
    if (mapping.regex && mapping.regex.test(url)) {
      return mapping;
    }
  }
  return undefined;
}

// Helper function to detect content type from buffer
function detectContentType(buffer: Buffer): string {
  // Check for common file signatures
  if (buffer.length >= 4) {
    // JSON
    try {
      const text = buffer.toString('utf-8');
      JSON.parse(text);
      return 'application/json';
    } catch {
      // Not JSON
    }

    // HTML
    if (buffer.toString('utf-8', 0, 5) === '<html') {
      return 'text/html';
    }

    // Check for image signatures
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return 'image/png';
    }
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }
  }

  // Default to text/plain
  return 'text/plain';
}

export async function startMimicServer(): Promise<number> {
  const app = express();

  // Middleware to parse JSON and raw body
  app.use(express.json());
  app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));
  app.use(express.text({ type: 'text/*', limit: '50mb' }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // POST /api/mimic/url - Register URL or regex
  app.post('/api/mimic/url', (req, res) => {
    try {
      const { url, regexUrl } = req.body;

      if (!url && !regexUrl) {
        return res.status(400).json({ error: 'Either url or regexUrl must be provided' });
      }

      const id = randomUUID();
      const mapping: MimicMapping = {
        id,
      };

      if (url) {
        mapping.url = url;
      } else if (regexUrl) {
        try {
          mapping.regex = new RegExp(regexUrl);
        } catch (error) {
          return res.status(400).json({ error: 'Invalid regex pattern', details: String(error) });
        }
      }

      mimicMappings.set(id, mapping);

      const response: { id: string; url?: string; regexUrl?: string } = { id };
      if (url) {
        response.url = url;
      } else if (regexUrl) {
        response.regexUrl = regexUrl;
      }

      res.status(201).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error', details: String(error) });
    }
  });

  // POST /api/mimic/:id - Assign content to a mapping
  app.post('/api/mimic/:id', (req, res) => {
    try {
      const { id } = req.params;
      const mapping = mimicMappings.get(id);

      if (!mapping) {
        return res.status(404).json({ error: 'Mapping not found' });
      }

      // Get content from body
      let content: Buffer;

      if (Buffer.isBuffer(req.body)) {
        content = req.body;
      } else if (typeof req.body === 'string') {
        content = Buffer.from(req.body, 'utf-8');
      } else if (req.body && typeof req.body.content === 'string') {
        content = Buffer.from(req.body.content, 'utf-8');
      } else if (req.body && Buffer.isBuffer(req.body.content)) {
        content = req.body.content;
      } else {
        return res.status(400).json({ error: 'Content must be provided in the request body' });
      }

      mapping.content = content;
      mimicMappings.set(id, mapping);

      res.status(200).json({ success: true, id, contentLength: content.length });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error', details: String(error) });
    }
  });

  // Middleware to intercept GET requests and check for mimic mappings
  app.use((req, res, next) => {
    // Only intercept GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Get the full URL
    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    // Find matching mapping
    const mapping = findMatchingMapping(fullUrl);

    if (mapping) {
      if (mapping.content) {
        // Return mimicked content
        const contentType = detectContentType(mapping.content);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', mapping.content.length.toString());
        res.status(200).send(mapping.content);
        return;
      } else if (mapping.url) {
        // Has mapping with exact URL but no content, proxy to original URL
        // Parse the target URL to get base and path
        const targetUrlObj = new URL(mapping.url);
        const baseUrl = `${targetUrlObj.protocol}//${targetUrlObj.host}`;

        // Use express-http-proxy to proxy the request
        return proxy(baseUrl, {
          proxyReqPathResolver: () => {
            // Use the path from the original target URL
            return targetUrlObj.pathname + targetUrlObj.search;
          },
        })(req, res, next);
      } else {
        // Has regex mapping but no content, cannot proxy (no target URL)
        // Continue to next middleware
        return next();
      }
    }

    // No mapping found, continue to next middleware
    next();
  });

  // Default proxy for any unmatched routes (optional - can be removed if not needed)
  // This would proxy all other requests, but based on the plan, we only proxy
  // when there's a mapping without content

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

