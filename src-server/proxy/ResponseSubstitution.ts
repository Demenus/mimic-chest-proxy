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
import type { InterceptionDecision } from './interception.js';
import type { MitmProxyContext } from './types.js';

/**
 * Performs response substitution: intercepts response chunks and sends mimicked content instead.
 * Sets up onResponseData (swallow chunks) and onResponseEnd (write mimicked content).
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

  delete responseHeaders['content-length'];
  delete responseHeaders['Content-Length'];

  ctx.onResponseData((_ctx: MitmProxyContext, _chunk: Buffer, dataCallback: (err: Error | null, chunk: Buffer | null) => void) => {
    dataCallback(null, null);
  });

  ctx.onResponseEnd((ctx: MitmProxyContext, endCallback: () => void) => {
    if (!mapping.content) {
      logger.warn('No mimicked content for mapping', { url: targetUrl, mappingId: mapping.id });
      return endCallback();
    }
    const statusCode = ctx.serverToProxyResponse?.statusCode ?? 200;
    const headers = ctx.serverToProxyResponse?.headers;
    sendMimickedContent(ctx.proxyToClientResponse, mapping, targetUrl, statusCode, headers);
    logger.info('Replaced response with mimicked content', { url: targetUrl, mappingId: mapping.id });
    endCallback();
  });

  callback();
}
