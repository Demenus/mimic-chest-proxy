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
import { sendMimickedContent, sendMimickedContentWithBuffer } from './sendMimickedContent.js';
import { detectContentType } from '../utils/content-type.js';
import type { InterceptionDecision } from './interception.js';
import type { MitmProxyContext } from './types.js';

const SUBSTITUTION_FETCH_TIMEOUT_MS = 15_000;

/**
 * Performs response substitution: intercepts response chunks and sends mimicked content instead.
 * Supports both inline content (mapping.content) and substitution by URL (mapping.substitutionUrl).
 * When substitutionUrl is set, fetches that URL and sends its body; on fetch failure, passes through (callback only).
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

  const hasInlineContent = (mapping.content?.length ?? 0) > 0;
  const substitutionUrl = (mapping.substitutionUrl?.trim() ?? '') || null;

  if (!hasInlineContent && !substitutionUrl) {
    logger.warn('No mimicked content or substitution URL for mapping', {
      url: targetUrl,
      mappingId: mapping.id,
    });
    return callback();
  }

  let bodySent = false;
  let pendingEndCallback: (() => void) | null = null;
  let fetchStarted = false;

  const runPendingEnd = (): void => {
    if (pendingEndCallback) {
      pendingEndCallback();
      pendingEndCallback = null;
    }
  };

  if (substitutionUrl) {
    const doFetchAndSend = (): void => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SUBSTITUTION_FETCH_TIMEOUT_MS);

      fetch(substitutionUrl, { signal: controller.signal, headers: { Accept: '*/*' } })
        .then((res) => {
          clearTimeout(timeoutId);
          if (!res.ok) throw new Error(`Substitution URL returned ${res.status}`);
          return res.arrayBuffer();
        })
        .then((ab) => Buffer.from(ab))
        .then((buf) => {
          const statusCode = ctx.serverToProxyResponse?.statusCode ?? 200;
          const headers = ctx.serverToProxyResponse?.headers;
          sendMimickedContentWithBuffer(
            ctx.proxyToClientResponse,
            buf,
            targetUrl,
            mapping.id,
            statusCode,
            headers
          );
          bodySent = true;
          logger.info('Replaced response with content from substitution URL', {
            url: targetUrl,
            mappingId: mapping.id,
            substitutionUrl,
          });
          runPendingEnd();
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          logger.warn('Substitution URL fetch failed, passing through', {
            url: targetUrl,
            mappingId: mapping.id,
            substitutionUrl,
            error: err instanceof Error ? err.message : String(err),
          });
          runPendingEnd();
        });
    };

    // Swallow original body: pass empty buffer so the proxy replaces the chunk (passing null would keep the original chunk and forward it).
    const emptyChunk = Buffer.alloc(0);
    if (ctx.onResponseHeaders) {
      ctx.onResponseHeaders((_ctx: MitmProxyContext, headersCallback: () => void) => {
        const h = _ctx.serverToProxyResponse?.headers;
        if (h) {
          delete h['content-length'];
          delete h['Content-Length'];
          delete h['content-encoding'];
          delete h['Content-Encoding'];
          delete h['transfer-encoding'];
          delete h['Transfer-Encoding'];
          h['transfer-encoding'] = 'chunked';
        }
        if (typeof headersCallback === 'function') headersCallback();
      });
    }
    ctx.onResponseData((_ctx: MitmProxyContext, _chunk: Buffer, dataCallback: (err: Error | null, chunk: Buffer | null) => void) => {
      dataCallback(null, emptyChunk);
      if (bodySent || fetchStarted) return;
      fetchStarted = true;
      doFetchAndSend();
    });

    ctx.onResponseEnd((_ctx: MitmProxyContext, endCallback: () => void) => {
      if (bodySent) {
        endCallback();
        return;
      }
      pendingEndCallback = endCallback;
      if (!fetchStarted) {
        fetchStarted = true;
        doFetchAndSend();
      }
    });

    callback();
    return;
  }

  // Inline content path
  const contentLength = mapping.content!.length;
  const contentType = detectContentType(mapping.content!);

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
