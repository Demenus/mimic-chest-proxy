import type { Request, Response, NextFunction } from 'express';
import proxy from 'express-http-proxy';
import parseUrl from 'parse-url';
import { logger } from './logger.js';

/**
 * Create a proxy handler for a target URL
 */
export function createProxyHandler(targetUrl: string) {
  try {
    const targetUrlObj = parseUrl(targetUrl);
    // Use host which includes port if present, otherwise use resource
    const host = targetUrlObj.host || targetUrlObj.resource;
    const baseUrl = `${targetUrlObj.protocol}://${host}`;

    logger.debug('Creating proxy handler', { targetUrl, baseUrl, pathname: targetUrlObj.pathname });

    return proxy(baseUrl, {
      proxyReqPathResolver: () => {
        // Use the path from the original target URL
        const path = targetUrlObj.pathname + (targetUrlObj.search || '');
        logger.debug('Proxying request', { path, targetUrl });
        return path;
      },
      proxyErrorHandler: (err: Error, res: Response) => {
        logger.error('Proxy error', { error: err.message, stack: err.stack, targetUrl });
        res.status(502).json({
          error: 'Proxy error',
          details: err.message,
        });
      },
    });
  } catch (error) {
    logger.error('Failed to create proxy handler', { targetUrl, error });
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
    logger.debug('Handling proxy request', { method: req.method, targetUrl, originalUrl: req.originalUrl });
    const proxyHandler = createProxyHandler(targetUrl);
    proxyHandler(req, res, next);
  } catch (error) {
    logger.error('Failed to handle proxy request', { targetUrl, error });
    res.status(500).json({
      error: 'Failed to create proxy',
      details: String(error),
    });
  }
}

