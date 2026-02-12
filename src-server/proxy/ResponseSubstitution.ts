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

import { logger } from '../logger.js';
import { sendMimickedContent } from './sendMimickedContent.js';
import { detectContentType } from '../utils/content-type.js';
import type { InterceptionDecision } from './interception.js';
import type { MitmProxyContext } from './types.js';

/**
 * Performs response substitution: intercepts response chunks and sends mimicked content instead.
 * Sets up onResponseHeaders (override headers), onResponseData (send body on first chunk, then swallow),
 * and onResponseEnd (just finish). Sending body on first chunk avoids client closing before we write (EPIPE).
 */
export function substituteResponse(
  ctx: MitmProxyContext,
  decision: InterceptionDecision,
  callback: () => void
): void {
  const { mapping, targetUrl } = decision;
  const responseHeaders = ctx.serverToProxyResponse?.headers;
  if (!responseHeaders) {
    return callback();
  }

  logger.info('Intercepting response for mimicked URL', {
    url: targetUrl,
    mappingId: mapping.id,
    contentType: responseHeaders['content-type'],
  });

  if (!mapping.content) {
    logger.warn('No mimicked content for mapping', { url: targetUrl, mappingId: mapping.id });
    return callback();
  }

  const contentLength = mapping.content.length;
  const contentType = detectContentType(mapping.content);
  let bodySent = false;

  // Override headers before the proxy sends writeHead (runs in onResponseHeaders).
  if (ctx.onResponseHeaders) {
    ctx.onResponseHeaders((_ctx: MitmProxyContext, headersCallback: () => void) => {
      const h = _ctx.serverToProxyResponse?.headers;
      if (h) {
        h['content-type'] = contentType;
        h['content-length'] = String(contentLength);
        delete h['content-encoding'];
        delete h['Content-Encoding'];
        delete h['transfer-encoding'];
        delete h['Transfer-Encoding'];
      }
      if (typeof headersCallback === 'function') headersCallback();
    });
  }

  // Send mimicked body on first chunk so client gets data immediately (avoids ECONNRESET/EPIPE).
  // Subsequent chunks are swallowed (pass null).
  ctx.onResponseData((_ctx: MitmProxyContext, _chunk: Buffer, dataCallback: (err: Error | null, chunk: Buffer | null) => void) => {
    if (!bodySent) {
      bodySent = true;
      const statusCode = _ctx.serverToProxyResponse?.statusCode ?? 200;
      const headers = _ctx.serverToProxyResponse?.headers;
      sendMimickedContent(_ctx.proxyToClientResponse, mapping, targetUrl, statusCode, headers);
      logger.info('Replaced response with mimicked content', { url: targetUrl, mappingId: mapping.id });
    }
    dataCallback(null, null);
  });

  ctx.onResponseEnd((_ctx: MitmProxyContext, endCallback: () => void) => {
    if (!bodySent) {
      const statusCode = _ctx.serverToProxyResponse?.statusCode ?? 200;
      const headers = _ctx.serverToProxyResponse?.headers;
      sendMimickedContent(_ctx.proxyToClientResponse, mapping, targetUrl, statusCode, headers);
      logger.info('Replaced response with mimicked content', { url: targetUrl, mappingId: mapping.id });
    }
    endCallback();
  });

  callback();
}
