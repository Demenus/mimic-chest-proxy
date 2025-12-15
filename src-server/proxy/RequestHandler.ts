/*
 * Copyright (c) 2025 Aarón Negrín
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { mimicMappingService } from '../service/MimicMappingService.js';
import { logger } from '../logger.js';
import { extractTargetUrlFromMitmProxyContext } from '../utils/index.js';
import { sendMimickedContent } from './sendMimickedContent.js';

// Type for http-mitm-proxy context
interface MitmProxyContext {
  clientToProxyRequest: {
    url?: string;
    method?: string;
    headers: Record<string, string | string[] | undefined>;
  };
  proxyToServerRequestOptions: {
    host?: string;
    port?: number;
    protocol?: string;
    path?: string;
    rejectUnauthorized?: boolean;
  };
  proxyToClientResponse: {
    writeHead: (statusCode: number, statusMessage?: string, headers?: Record<string, string>) => void;
    write: (chunk: unknown) => void;
    end: (chunk?: unknown) => void;
    headersSent: boolean;
  };
  serverToProxyResponse?: {
    statusCode?: number;
    headers?: Record<string, string | string[] | undefined>;
  };
  onResponseHeaders?: (handler: (ctx: MitmProxyContext, callback: () => void) => void) => void;
  onResponseData: (handler: (ctx: MitmProxyContext, chunk: Buffer, callback: (err: Error | null, chunk: Buffer | null) => void) => void) => void;
  onResponseEnd: (handler: (ctx: MitmProxyContext, callback: () => void) => void) => void;
  isSSL?: boolean;
}

/**
 * Request handler class - simplified version following the example pattern
 */
export class RequestHandler {

  /**
   * Handle response that needs content substitution (mimicked content)
   * Intercepts response in onResponse hook, following simple-proxy.js pattern
   * Accumulates chunks and replaces with mimicked content
   */
  public handleResponse(ctx: MitmProxyContext, callback: () => void): void {
    const targetUrl = extractTargetUrlFromMitmProxyContext(ctx);

    if (!targetUrl) {
      logger.warn('Cannot determine target URL in response handler');
      return callback();
    }

    // Find matching mapping
    const mapping = mimicMappingService.findMatchingMapping(targetUrl);

    // If mapping found with content, intercept and replace
    if (mapping?.hasContent && ctx.serverToProxyResponse) {
      const responseHeaders = ctx.serverToProxyResponse.headers;
      if (!responseHeaders) {
        return callback();
      }

      const contentType = responseHeaders['content-type'] || '';

      // Only intercept HTML or JavaScript responses (as per user requirement)
      if (contentType.includes('text/html') || contentType.includes('application/javascript') || contentType.includes('text/javascript')) {
        logger.info('Intercepting response for content substitution', {
          targetUrl,
          mappingId: mapping.id,
          contentType,
        });

        // Store original chunks to modify later (following simple-proxy.js pattern)
        const chunks: Buffer[] = [];

        // Remove content-length header since we'll modify the content
        delete responseHeaders['content-length'];
        delete responseHeaders['Content-Length'];

        // Intercept response data to collect chunks
        ctx.onResponseData((ctx: MitmProxyContext, chunk: Buffer, callback: (err: Error | null, chunk: Buffer | null) => void) => {
          chunks.push(chunk);
          // Don't send this chunk yet, we'll send modified content later
          return callback(null, null);
        });

        // Modify and send response when complete
        ctx.onResponseEnd((ctx: MitmProxyContext, callback: () => void) => {
          if (chunks.length > 0 || mapping.content) {
            // Use the mimicked content directly (we don't need the original chunks)
            const statusCode = ctx.serverToProxyResponse?.statusCode || 200;
            const headers = ctx.serverToProxyResponse?.headers;

            sendMimickedContent(
              ctx.proxyToClientResponse,
              mapping,
              targetUrl,
              statusCode,
              headers
            );

            logger.info('Replaced content with mimicked content', { targetUrl, mappingId: mapping.id });
          } else {
            logger.warn('No chunks collected and no mimicked content', { targetUrl });
          }
          return callback();
        });

        return callback();
      }
    }

    // No content substitution needed, continue normally
    return callback();
  }

  /**
   * Handle normal proxy request (no content substitution)
   * May redirect to different URL if mapping exists, otherwise proxies normally
   */
  private handleNormalProxy(ctx: MitmProxyContext, mapping: { url: string | null } | undefined, targetUrl: string, callback: () => void): void {
    // If mapping found with URL redirect, update proxy target
    if (mapping?.url && mapping.url !== null && mapping.url !== targetUrl) {
      const mappedUrlObj = new URL(mapping.url);
      const originalUrlObj = new URL(targetUrl);

      ctx.proxyToServerRequestOptions.host = mappedUrlObj.hostname;
      const port = mappedUrlObj.port
        ? parseInt(mappedUrlObj.port, 10)
        : mappedUrlObj.protocol === 'https:'
          ? 443
          : 80;
      ctx.proxyToServerRequestOptions.port = port;
      ctx.proxyToServerRequestOptions.protocol = mappedUrlObj.protocol;
      ctx.proxyToServerRequestOptions.path = originalUrlObj.pathname + originalUrlObj.search;

      logger.debug('Redirecting proxy request', {
        originalUrl: targetUrl,
        mappedUrl: mapping.url,
      });
    }

    // Normal proxy behavior - no event handlers needed, let proxy work normally
    return callback();
  }

  /**
   * Handle a proxy request using http-mitm-proxy context
   * Only handles URL redirections here, content substitution is done in handleResponse
   */
  public handleRequest(ctx: MitmProxyContext, callback: () => void): void {
    const targetUrl = extractTargetUrlFromMitmProxyContext(ctx);
    logger.debug('Processing request', { method: ctx.clientToProxyRequest.method, targetUrl });

    if (!targetUrl) {
      logger.warn('Cannot determine target URL');
      return callback();
    }

    // Find matching mapping
    const mapping = mimicMappingService.findMatchingMapping(targetUrl);

    // Only handle URL redirections here, content substitution is done in onResponse
    return this.handleNormalProxy(ctx, mapping, targetUrl, callback);
  }
}
