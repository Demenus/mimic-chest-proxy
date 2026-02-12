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
import { extractTargetUrlFromMitmProxyContext } from '../utils/index.js';
import type { MitmProxyContext } from './types.js';

/**
 * Abstraction for resolving a URL to a MimicMapping.
 * Allows the proxy layer to be tested with a stub and avoids direct singleton dependency.
 */
export interface MimicMappingFinder {
  findMatchingMapping(url: string): MimicMapping | undefined;
}

/**
 * Result of the interception policy: we should substitute the response with this mapping.
 */
export interface InterceptionDecision {
  mapping: MimicMapping;
  targetUrl: string;
}

const INTERCEPTED_CONTENT_TYPES = [
  'text/html',
  'application/javascript',
  'text/javascript',
];

function isInterceptableContentType(contentType: string): boolean {
  return INTERCEPTED_CONTENT_TYPES.some((ct) => contentType.includes(ct));
}

/**
 * Decides whether to intercept this response and replace it with mimicked content.
 * Returns an InterceptionDecision if we should substitute; null otherwise.
 */
export function getInterceptionDecision(
  ctx: MitmProxyContext,
  finder: MimicMappingFinder
): InterceptionDecision | null {
  const targetUrl = extractTargetUrlFromMitmProxyContext(ctx);
  if (!targetUrl) {
    return null;
  }

  const mapping = finder.findMatchingMapping(targetUrl);
  if (!mapping?.hasContent || !ctx.serverToProxyResponse?.headers) {
    return null;
  }

  const contentType = ctx.serverToProxyResponse.headers['content-type'] ?? '';
  if (!isInterceptableContentType(String(contentType))) {
    return null;
  }

  return { mapping, targetUrl };
}
