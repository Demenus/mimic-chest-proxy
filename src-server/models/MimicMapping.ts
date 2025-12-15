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
 * Common interface for MimicMapping
 * Uses null for JSON compatibility (instead of undefined)
 */
export interface IMimicMapping {
  id: string;
  url: string | null;
  regexPattern: string | null;
  contentLength: number;
}

/**
 * MimicMapping class that encapsulates URL and regex pattern mapping logic
 * Handles both exact URL matching and regex pattern matching for content mimicry
 */
export class MimicMapping implements IMimicMapping {
  public readonly id: string;
  public url: string | null = null;
  private _regex: RegExp | undefined;
  private _regexPattern: string | null = null;
  public content: Buffer | undefined;

  constructor(id: string, url?: string | null, regexPattern?: string | null, content?: Buffer) {
    this.id = id;
    this.url = url ?? null;
    if (regexPattern) {
      this.setRegexPattern(regexPattern);
    }
    this.content = content;
  }

  get hasContent(): boolean {
    return this.content !== undefined;
  }

  /**
   * Get the regex pattern string
   */
  get regexPattern(): string | null {
    return this._regexPattern;
  }

  /**
   * Get contentLength for IMimicMapping interface compliance
   */
  get contentLength(): number {
    return this.content?.length || 0;
  }

  /**
   * Get the regex RegExp object
   */
  get regex(): RegExp | undefined {
    return this._regex;
  }

  /**
   * Set the regex pattern and create the RegExp object
   * Throws error if pattern is invalid
   */
  setRegexPattern(pattern: string): void {
    this._regexPattern = pattern;
    try {
      this._regex = new RegExp(pattern);
    } catch (error) {
      throw new Error(`Invalid regex pattern: ${String(error)}`);
    }
  }

  /**
   * Clear regex pattern and RegExp
   */
  clearRegex(): void {
    this._regex = undefined;
    this._regexPattern = null;
  }

  /**
   * Check if this mapping matches a given URL
   * First checks exact URL match, then regex pattern
   */
  matches(url: string): boolean {
    if (this.url && this.url === url) {
      return true;
    }
    if (this._regexPattern && this._regex && this._regex.test(url)) {
      return true;
    }
    return false;
  }

  /**
   * Create MimicMapping from IMimicMapping (for deserialization from JSON)
   * Content should be loaded separately
   */
  static fromInterface(data: IMimicMapping): MimicMapping {
    const mapping = new MimicMapping(data.id);
    mapping.url = data.url;

    if (data.regexPattern) {
      try {
        mapping.setRegexPattern(data.regexPattern);
      } catch {
        // Skip invalid regex patterns
        console.warn(`Invalid regex pattern for mapping ${data.id}: ${data.regexPattern}`);
      }
    }

    return mapping;
  }

  /**
   * Create a metadata response object (for API responses)
   * Includes url, regexUrl (instead of regexPattern), hasContent, and contentLength
   */
  toMetadataResponse(): {
    id: string;
    url?: string;
    regexUrl?: string;
    hasContent: boolean;
    contentLength: number;
  } {
    const result: {
      id: string;
      url?: string;
      regexUrl?: string;
      hasContent: boolean;
      contentLength: number;
    } = {
      id: this.id,
      hasContent: this.hasContent,
      contentLength: this.contentLength,
    };

    if (this.url !== null) {
      result.url = this.url;
    }

    if (this._regexPattern !== null) {
      result.regexUrl = this._regexPattern;
    }

    return result;
  }

  /**
   * Create a plain object representation (for backward compatibility)
   */
  toPlainObject(): {
    id: string;
    url?: string;
    regex?: RegExp;
    regexPattern?: string;
    content?: Buffer;
  } {
    const obj: {
      id: string;
      url?: string;
      regex?: RegExp;
      regexPattern?: string;
      content?: Buffer;
    } = {
      id: this.id,
    };

    if (this.url !== null) {
      obj.url = this.url;
    }

    if (this._regex) {
      obj.regex = this._regex;
    }

    if (this._regexPattern !== null) {
      obj.regexPattern = this._regexPattern;
    }

    if (this.content) {
      obj.content = this.content;
    }

    return obj;
  }
}

