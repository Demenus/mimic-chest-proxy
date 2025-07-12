import type { Request, Response, NextFunction } from 'express';
import proxy from 'express-http-proxy';
import parseUrl from 'parse-url';
import { logger } from '../logger.js';

const PROXY_TIMEOUT = 30000; // 30 seconds
const PROXY_LIMIT = '50mb';

/**
 * Create and execute proxy request
 */
export function handleProxyRequest(
  req: Request,
  res: Response,
  next: NextFunction,
  targetUrl: string
): void {
  try {
    const targetUrlObj = parseUrl(targetUrl);
    const host = targetUrlObj.host || targetUrlObj.resource;
    const baseUrl = `${targetUrlObj.protocol}://${host}`;

    logger.info('Initiating proxy request', { method: req.method, targetUrl, baseUrl });

    // Create proxy handler
    const proxyHandler = proxy(baseUrl, {
      filter: (req: Request) => {
        // Safety check: don't proxy API routes
        if (req.url?.startsWith('/api/') || req.url?.startsWith('/health')) {
          return false;
        }
        return true;
      },
      proxyReqPathResolver: (req: Request) => {
        // Use req.url if it's a path, otherwise use target URL pathname
        if (req.url && !req.url.startsWith('http')) {
          return req.url;
        }
        const search = targetUrlObj.search ? `?${targetUrlObj.search}` : '';
        return targetUrlObj.pathname + search;
      },
      proxyReqOptDecorator: (proxyReqOpts, srcReq: Request) => {
        if (srcReq.method) {
          proxyReqOpts.method = srcReq.method;
        }
        if (proxyReqOpts.headers) {
          proxyReqOpts.headers.host = host;
        }
        return proxyReqOpts;
      },
      userResHeaderDecorator: (headers, userReq: Request, userRes: Response, proxyReq, proxyRes) => {
        logger.info('Proxy response received', {
          statusCode: proxyRes.statusCode,
          targetUrl,
          method: userReq.method,
        });
        return headers;
      },
      preserveHostHdr: false,
      limit: PROXY_LIMIT,
      parseReqBody: false,
      proxyErrorHandler: (err: Error, res: Response) => {
        logger.error('Proxy error', { error: err.message, targetUrl, stack: err.stack });
        if (!res.headersSent) {
          res.status(502).json({ error: 'Proxy error', details: err.message });
        }
      },
    });

    // Setup timeout
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logger.error('Proxy timeout', { targetUrl, method: req.method });
        res.status(504).json({ error: 'Proxy timeout', details: 'Request took too long' });
      }
    }, PROXY_TIMEOUT);

    // Cleanup on finish
    res.once('finish', () => {
      clearTimeout(timeout);
      logger.info('Proxy request completed', {
        method: req.method,
        targetUrl,
        statusCode: res.statusCode,
      });
    });

    res.once('error', (err) => {
      clearTimeout(timeout);
      logger.error('Proxy response error', { targetUrl, error: String(err) });
    });

    // Execute proxy
    proxyHandler(req, res, () => {
      logger.warn('Proxy handler called next() unexpectedly', { targetUrl });
      next();
    });
  } catch (error) {
    logger.error('Failed to create proxy', { targetUrl, error: String(error) });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to create proxy', details: String(error) });
    }
  }
}

