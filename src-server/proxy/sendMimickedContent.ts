import type { ServerResponse } from 'http';
import type { MimicMapping } from '../types.js';
import { detectContentType } from '../utils/index.js';
import { logger } from '../logger.js';

/**
 * Response-like interface for writing mimicked content
 * Works with both Express ServerResponse and http-mitm-proxy context
 */
interface ResponseLike {
  writeHead: (statusCode: number, statusMessage?: string, headers?: Record<string, string>) => void;
  write: (chunk: unknown) => void;
  end: (chunk?: unknown) => void;
  headersSent?: boolean;
}

/**
 * Handle response with mimicked content
 * Works with both Express ServerResponse and http-mitm-proxy context
 * Following simple-proxy.js pattern: clean headers and check headersSent
 */
export function sendMimickedContent(
  res: ServerResponse | ResponseLike,
  mapping: MimicMapping,
  targetUrl: string,
  statusCode?: number,
  originalHeaders?: Record<string, string | string[] | undefined>
): void {
  if (!mapping.content) {
    throw new Error('Mapping has no content');
  }

  const contentType = detectContentType(mapping.content);
  const contentBuffer = mapping.content;

  // Prepare headers - convert to string format and clean problematic headers
  const headers: Record<string, string> = {};
  
  // Copy original headers, converting arrays to strings and cleaning
  if (originalHeaders) {
    for (const [key, value] of Object.entries(originalHeaders)) {
      if (value !== undefined) {
        // Skip headers that need to be removed/recalculated
        const lowerKey = key.toLowerCase();
        if (lowerKey !== 'content-length' && 
            lowerKey !== 'content-encoding' && 
            lowerKey !== 'transfer-encoding') {
          // Convert array to string if needed
          headers[key] = Array.isArray(value) ? value.join(', ') : String(value);
        }
      }
    }
  }

  // Set content type and length
  headers['Content-Type'] = contentType;
  headers['Content-Length'] = contentBuffer.length.toString();

  const finalStatusCode = statusCode || 200;

  logger.info('Returning mimicked content', {
    targetUrl,
    contentType,
    contentLength: contentBuffer.length,
    mappingId: mapping.id,
  });

  // Check if headers have already been sent (following simple-proxy.js pattern)
  if (!res.headersSent) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - writeHead overload differences between ServerResponse and Proxy response
    res.writeHead(finalStatusCode, headers);
  }
  res.write(contentBuffer);
  res.end();
}

