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

  // Check if we stored the original target URL (for HTTP proxy requests)
  const originalTargetUrl = req.originalTargetUrl;
  if (originalTargetUrl && (originalTargetUrl.startsWith('http://') || originalTargetUrl.startsWith('https://'))) {
    return originalTargetUrl;
  }

  // For HTTP proxy requests, req.url might already contain the full URL
  // Check if req.url or req.originalUrl starts with http:// or https://
  const url = req.originalUrl || req.url || '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Check if the path starts with /http:// or /https:// (some proxy formats)
  if (url.startsWith('/http://') || url.startsWith('/https://')) {
    return url.substring(1); // Remove leading slash
  }

  // For HTTP proxy requests, when Chrome sends GET http://domain.com/ HTTP/1.1
  // Express parses it and req.url becomes just the path
  // We need to reconstruct from the Host header, but Host is the proxy server
  // So we can't use it. Instead, we need to check if this is an API route
  const host = req.get('host');
  if (host && (host.includes('localhost') || host.includes('127.0.0.1'))) {
    // This is likely a direct request to the proxy API (not a proxy request)
    // Skip extraction for API routes
    if (url.startsWith('/api/') || url.startsWith('/health')) {
      return undefined;
    }

    // For proxy requests to localhost, we can't determine the target
    // This shouldn't happen in normal proxy usage
    return undefined;
  }

  // If host is not localhost, construct URL from host + path
  if (host) {
    const protocol = req.secure ? 'https' : 'http';
    return `${protocol}://${host}${url}`;
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

