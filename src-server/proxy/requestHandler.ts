import type { Request, Response, NextFunction } from 'express';
import { mimicMappingService } from '../MimicMappingService.js';
import { extractTargetUrl } from '../utils.js';
import { sendMimickedContent } from './contentHandler.js';
import { handleProxyRequest } from './proxyHandler.js';
import { logger } from '../logger.js';
import type { MimicMapping } from '../types.js';

/**
 * Determine what action to take for a request
 */
type RequestAction =
  | { type: 'skip'; reason: string }
  | { type: 'mimic'; mapping: MimicMapping; targetUrl: string }
  | { type: 'proxy'; targetUrl: string };

function determineAction(req: Request): RequestAction {
  const targetUrl = extractTargetUrl(req);

  if (!targetUrl) {
    return {
      type: 'skip',
      reason: 'Cannot determine target URL',
    };
  }

  const mapping = mimicMappingService.findMatchingMapping(targetUrl);

  if (!mapping) {
    return { type: 'proxy', targetUrl };
  }

  // Mapping found - check what to do
  if (mapping.content) {
    return { type: 'mimic', mapping, targetUrl };
  }

  if (mapping.url) {
    // Has URL mapping but no content - proxy to mapped URL
    return { type: 'proxy', targetUrl: mapping.url };
  }

  // Regex mapping without content - cannot proxy (no target URL)
  return {
    type: 'skip',
    reason: 'Regex mapping found but no target URL to proxy',
  };
}

/**
 * Create middleware to intercept requests and handle them appropriately
 */
export function createRequestInterceptor() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const action = determineAction(req);

    switch (action.type) {
      case 'skip':
        logger.info('Skipping request', {
          method: req.method,
          url: req.url,
          reason: action.reason,
        });
        return next();

      case 'mimic':
        logger.info('Found mapping with content', {
          mappingId: action.mapping.id,
          targetUrl: action.targetUrl,
        });
        sendMimickedContent(res, action.mapping, action.targetUrl);
        return;

      case 'proxy':
        logger.info('Proxying request', {
          method: req.method,
          targetUrl: action.targetUrl,
        });
        handleProxyRequest(req, res, next, action.targetUrl);
        return;
    }
  };
}

