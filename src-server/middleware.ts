import type { Request, Response, NextFunction } from 'express';
import { findMatchingMapping } from './storage.js';
import { detectContentType, extractTargetUrl } from './utils.js';
import { handleProxyRequest } from './proxy.js';
import { logger } from './logger.js';

/**
 * Create middleware to intercept all requests and check for mimic mappings
 */
export function createMimicInterceptor() {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Extract target URL from request
    const targetUrl = extractTargetUrl(req);

    if (!targetUrl) {
      // Cannot determine target URL, continue to next middleware
      logger.debug('Cannot determine target URL, skipping mimic interceptor', {
        method: req.method,
        url: req.url,
        originalUrl: req.originalUrl,
      });
      return next();
    }

    logger.debug('Intercepting request', { method: req.method, targetUrl });

    // Find matching mapping
    const mapping = findMatchingMapping(targetUrl);

    if (mapping) {
      logger.info('Found matching mapping', { mappingId: mapping.id, targetUrl, hasContent: !!mapping.content });

      if (mapping.content) {
        // Return mimicked content
        const contentType = detectContentType(mapping.content);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', mapping.content.length.toString());
        logger.debug('Returning mimicked content', { contentType, contentLength: mapping.content.length });
        res.status(200).send(mapping.content);
        return;
      } else if (mapping.url) {
        // Has mapping with exact URL but no content, proxy to original URL
        logger.debug('Proxying to mapped URL', { mappingUrl: mapping.url, targetUrl });
        handleProxyRequest(req, res, next, mapping.url);
        return;
      } else {
        // Has regex mapping but no content, cannot proxy (no target URL)
        // Continue to next middleware
        logger.warn('Regex mapping found but no target URL to proxy', { mappingId: mapping.id });
        return next();
      }
    }

    // No mapping found, proxy to the original target URL
    logger.debug('No mapping found, proxying to original target URL', { targetUrl });
    handleProxyRequest(req, res, next, targetUrl);
  };
}

