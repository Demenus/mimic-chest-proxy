import type { IncomingMessage } from 'http';

/**
 * Extract target URL from HTTP proxy request
 * Handles different scenarios: HTTP proxy requests (GET http://...), CONNECT method
 */
export function extractTargetUrlFromProxyRequest(req: IncomingMessage): string | null {
  const method = req.method || 'GET';
  const url = req.url || '';

  // For CONNECT method (HTTPS), the target is in req.url (e.g., "example.com:443")
  if (method === 'CONNECT') {
    return `https://${url}`;
  }

  // For HTTP proxy requests, req.url contains the full URL: "http://example.com/path"
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Check if the path starts with /http:// or /https:// (some proxy formats)
  if (url.startsWith('/http://') || url.startsWith('/https://')) {
    return url.substring(1); // Remove leading slash
  }

  // For regular HTTP requests (not proxy), try to reconstruct from headers
  const host = req.headers.host;
  if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    // Check if connection is secure (HTTPS)
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const protocol = (req.socket as any).encrypted ? 'https' : 'http';
    return `${protocol}://${host}${url}`;
  }

  return null;
}

/**
 * Extract target URL from http-mitm-proxy context
 */
export function extractTargetUrlFromMitmProxyContext(ctx: {
  clientToProxyRequest: {
    url?: string;
    headers: Record<string, string | string[] | undefined>;
  };
  isSSL?: boolean;
}): string {
  const hostHeader = ctx.clientToProxyRequest.headers.host;
  const host = Array.isArray(hostHeader) ? hostHeader[0] : (hostHeader || '');
  const url = ctx.clientToProxyRequest.url || '';
  const protocol = ctx.isSSL ? 'https' : 'http';

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return `${protocol}://${host}${url}`;
}

