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

import type { MimicMapping } from '../models/MimicMapping.js';
import { logger } from '../logger.js';
import { extractTargetUrlFromMitmProxyContext } from '../utils/index.js';
import { getInterceptionDecision, type MimicMappingFinder } from './interception.js';
import { substituteResponse } from './ResponseSubstitution.js';
import { sendMimickedContentWithBuffer } from './sendMimickedContent.js';
import type { MitmProxyContext } from './types.js';

const FOLLOW_RESOURCES_FETCH_TIMEOUT_MS = 15_000;

/**
 * Returns the base URL (origin + directory path with trailing slash) for a substitution URL.
 */
function getSubstitutionBaseUrl(substitutionUrl: string): string {
  try {
    const u = new URL(substitutionUrl);
    let path = u.pathname;
    if (!path.endsWith('/')) {
      path = path.replace(/\/[^/]*$/, '/') || '/';
    }
    return u.origin + path;
  } catch {
    return substitutionUrl;
  }
}

/**
 * Returns the URL to fetch for a request when followResources is enabled.
 * Document (path '' or '/') uses the exact substitutionUrl; resources use substitutionBase + path + query.
 */
function getFetchUrlForRequest(mapping: MimicMapping, requestUrl: string): string {
  const subUrl = mapping.substitutionUrl;
  if (!subUrl) return requestUrl;
  try {
    const u = new URL(requestUrl);
    const pathname = u.pathname || '/';
    const isDocument = pathname === '/' || pathname === '';
    if (isDocument) {
      return subUrl;
    }
    const base = getSubstitutionBaseUrl(subUrl);
    return base.replace(/\/$/, '') + pathname + (u.search || '');
  } catch {
    return subUrl;
  }
}

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
   * Handle a proxy request. When a mapping has substitutionUrl and followResources, we fetch
   * from the substitution base (document or resource) and respond directly without forwarding.
   * Otherwise content substitution is done in handleResponse.
   */
  public handleRequest(ctx: MitmProxyContext, callback: () => void): void {
    const targetUrl = extractTargetUrlFromMitmProxyContext(ctx);
    logger.debug('Processing request', { method: ctx.clientToProxyRequest.method, targetUrl });

    if (!targetUrl) {
      logger.warn('Cannot determine target URL');
      return callback();
    }

    const mapping = this.mappingFinder.findMatchingMapping(targetUrl);
    const substitutionUrl = (mapping?.substitutionUrl?.trim() ?? '') || null;
    const followResources = mapping?.followResources === true;

    if (!mapping || !substitutionUrl || !followResources) {
      return this.handleNormalProxy(ctx, callback);
    }

    const fetchUrl = getFetchUrlForRequest(mapping, targetUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FOLLOW_RESOURCES_FETCH_TIMEOUT_MS);

    fetch(fetchUrl, { signal: controller.signal, headers: { Accept: '*/*' } })
      .then((res) => {
        clearTimeout(timeoutId);
        if (!res.ok) {
          throw new Error(`Substitution fetch returned ${res.status}`);
        }
        return res.arrayBuffer().then((ab) => ({ res, body: Buffer.from(ab) }));
      })
      .then(({ res, body }) => {
        const statusCode = res.status;
        const headers: Record<string, string | string[] | undefined> = {};
        res.headers.forEach((value, key) => {
          const lower = key.toLowerCase();
          if (lower !== 'content-encoding' && lower !== 'transfer-encoding') {
            headers[key] = value;
          }
        });
        sendMimickedContentWithBuffer(
          ctx.proxyToClientResponse,
          body,
          targetUrl,
          mapping.id,
          statusCode,
          headers
        );
        logger.info('Follow resources: served from substitution base', {
          url: targetUrl,
          fetchUrl,
          mappingId: mapping.id,
        });
        callback();
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        logger.warn('Follow resources fetch failed, forwarding request', {
          url: targetUrl,
          fetchUrl,
          error: err instanceof Error ? err.message : String(err),
        });
        callback();
      });
  }
}
