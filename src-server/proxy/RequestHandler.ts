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
import { extractTargetUrlFromMitmProxyContext } from '../utils/index.js';
import { getInterceptionDecision, type MimicMappingFinder } from './interception.js';
import { substituteResponse } from './ResponseSubstitution.js';
import type { MitmProxyContext } from './types.js';

/**
 * Request handler class - delegates interception decision and response substitution to dedicated modules.
 * Receives a mapping finder so the proxy layer does not depend on a concrete service (testable, swappable).
 */
export class RequestHandler {
  constructor(private readonly mappingFinder: MimicMappingFinder) {}

  /**
   * Handle response: decide whether to substitute with mimicked content, then substitute or pass through.
   * Uses async finder to load content; if content does not exist, passes through original response.
   */
  public handleResponse(ctx: MitmProxyContext, callback: () => void): void {
    void getInterceptionDecision(ctx, this.mappingFinder).then((decision) => {
      if (!decision) {
        return callback();
      }
      logger.info('Mimicked URL', { url: decision.targetUrl, mappingId: decision.mapping.id });
      substituteResponse(ctx, decision, callback);
    });
  }

  /**
   * Handle normal proxy request (no content substitution)
   * Patterns are used for matching only, not for URL redirection
   */
  private handleNormalProxy(ctx: MitmProxyContext, callback: () => void): void {
    // Normal proxy behavior - no event handlers needed, let proxy work normally
    // Patterns are only used for content substitution, not URL redirection
    return callback();
  }

  /**
   * Handle a proxy request. Content substitution is done in handleResponse.
   * The request-phase mapping lookup is intentional: it can warm the mapping (e.g. ensure it is
   * in memory) before the response arrives. Patterns are used for matching only, not URL redirection.
   */
  public handleRequest(ctx: MitmProxyContext, callback: () => void): void {
    const targetUrl = extractTargetUrlFromMitmProxyContext(ctx);
    logger.debug('Processing request', { method: ctx.clientToProxyRequest.method, targetUrl });

    if (!targetUrl) {
      logger.warn('Cannot determine target URL');
      return callback();
    }

    // Look up mapping in request phase (used e.g. to warm cache for handleResponse)
    void this.mappingFinder.findMatchingMapping(targetUrl);

    return this.handleNormalProxy(ctx, callback);
  }
}
