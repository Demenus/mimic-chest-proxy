import type { Request } from 'express';

/**
 * Detect content type from buffer
 */
export function detectContentType(buffer: Buffer): string {
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

/**
 * Extract target URL from request
 * Handles different scenarios: direct requests, proxy requests, CONNECT method
 */
export function extractTargetUrl(req: Request): string | undefined {
  // For CONNECT method (HTTPS), the target is in req.url
  if (req.method === 'CONNECT') {
    return `https://${req.url}`;
  }

  // Try to get URL from Host header (for HTTP proxy)
  const host = req.get('host');
  if (host) {
    // Check if it's a proxy request (host might be the target domain)
    // For proxy requests, the host header contains the target domain
    const protocol = req.secure ? 'https' : 'http';
    return `${protocol}://${host}${req.originalUrl || req.url}`;
  }

  // Fallback: try to construct from request
  if (req.originalUrl) {
    const protocol = req.secure ? 'https' : req.protocol;
    const host = req.get('host') || 'localhost';
    return `${protocol}://${host}${req.originalUrl}`;
  }

  return undefined;
}

/**
 * Parse content from request body (always expects text content)
 */
export function parseContentFromBody(body: unknown): Buffer {
  if (typeof body === 'string') {
    return Buffer.from(body, 'utf-8');
  }
  if (body && typeof body === 'object' && 'content' in body) {
    const content = (body as { content: unknown }).content;
    if (typeof content === 'string') {
      return Buffer.from(content, 'utf-8');
    }
  }
  throw new Error('Content must be provided as text in the request body');
}

