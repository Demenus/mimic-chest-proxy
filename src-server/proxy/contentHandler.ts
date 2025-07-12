import type { Response } from 'express';
import type { MimicMapping } from '../types.js';
import { detectContentType } from '../utils.js';
import { logger } from '../logger.js';

/**
 * Handle response with mimicked content
 */
export function sendMimickedContent(res: Response, mapping: MimicMapping, targetUrl: string): void {
  if (!mapping.content) {
    throw new Error('Mapping has no content');
  }

  const contentType = detectContentType(mapping.content);
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Length', mapping.content.length.toString());

  logger.info('Returning mimicked content', {
    targetUrl,
    contentType,
    contentLength: mapping.content.length,
    mappingId: mapping.id,
  });

  res.status(200).send(mapping.content);
}

