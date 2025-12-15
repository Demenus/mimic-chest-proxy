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
 * Detect content type from buffer
 */
export function detectContentType(buffer: Buffer): string {
  if (buffer.length === 0) {
    return 'text/plain';
  }

  const text = buffer.toString('utf-8').trim();

  // JSON
  if (text.length > 0) {
    try {
      JSON.parse(text);
      return 'application/json';
    } catch {
      // Not JSON
    }
  }

  // HTML - check for HTML tags
  if (text.startsWith('<!') || text.startsWith('<html') || text.includes('<html')) {
    return 'text/html; charset=utf-8';
  }

  // JavaScript - check for common JS patterns
  if (text.includes('function') ||
      text.includes('const ') ||
      text.includes('let ') ||
      text.includes('var ') ||
      text.includes('=>') ||
      text.includes('//') ||
      text.includes('/*')) {
    return 'application/javascript; charset=utf-8';
  }

  // Check for image signatures
  if (buffer.length >= 4) {
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return 'image/png';
    }
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }
  }

  // Default to text/plain
  return 'text/plain; charset=utf-8';
}

