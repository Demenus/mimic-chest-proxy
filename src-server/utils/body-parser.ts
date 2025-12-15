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

/**
 * Parse content from request body (always expects text content)
 */
export function parseContentFromBody(body: unknown): Buffer {
  if (typeof body === 'string') {
    return Buffer.from(body, 'utf-8');
  }
  if (body && typeof body === 'object' && 'content' in body) {
    const content = (body as { content: unknown }).content;
    if (typeof content === 'string') {
      return Buffer.from(content, 'utf-8');
    }
  }
  throw new Error('Content must be provided as text in the request body');
}

