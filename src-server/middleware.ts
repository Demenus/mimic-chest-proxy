import type { Request, Response, NextFunction } from 'express';
import { findMatchingMapping } from './storage.js';
import { detectContentType, extractTargetUrl } from './utils.js';
import { handleProxyRequest } from './proxy.js';

/**
 * Create middleware to intercept all requests and check for mimic mappings
 */
export function createMimicInterceptor() {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Extract target URL from request
    const targetUrl = extractTargetUrl(req);

    if (!targetUrl) {
      // Cannot determine target URL, continue to next middleware
      return next();
    }

    // Find matching mapping
    const mapping = findMatchingMapping(targetUrl);

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
        handleProxyRequest(req, res, next, mapping.url);
        return;
      } else {
        // Has regex mapping but no content, cannot proxy (no target URL)
        // Continue to next middleware
        return next();
      }
    }

    // No mapping found, continue to next middleware
    next();
  };
}

