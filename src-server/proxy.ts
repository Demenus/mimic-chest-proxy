import type { Request, Response, NextFunction } from 'express';
import proxy from 'express-http-proxy';

/**
 * Create a proxy handler for a target URL
 */
export function createProxyHandler(targetUrl: string) {
  try {
    const targetUrlObj = new URL(targetUrl);
    const baseUrl = `${targetUrlObj.protocol}//${targetUrlObj.host}`;

    return proxy(baseUrl, {
      proxyReqPathResolver: (req: Request) => {
        // Use the path from the original target URL
        return targetUrlObj.pathname + targetUrlObj.search;
      },
      proxyErrorHandler: (err: Error, res: Response) => {
        console.error('Proxy error:', err);
        res.status(502).json({
          error: 'Proxy error',
          details: err.message,
        });
      },
    });
  } catch (error) {
    throw new Error(`Invalid target URL: ${String(error)}`);
  }
}

/**
 * Handle proxy request for a mapping without content
 */
export function handleProxyRequest(
  req: Request,
  res: Response,
  next: NextFunction,
  targetUrl: string
): void {
  try {
    const proxyHandler = createProxyHandler(targetUrl);
    proxyHandler(req, res, next);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create proxy',
      details: String(error),
    });
  }
}

