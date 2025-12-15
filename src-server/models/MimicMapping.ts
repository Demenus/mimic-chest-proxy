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
  pattern: string | null;
  regexPattern: string | null;
  contentLength: number;
}

import picomatch from 'picomatch';

/**
 * MimicMapping class that encapsulates glob pattern and regex pattern mapping logic
 * Handles both glob pattern matching (using picomatch) and regex pattern matching for content mimicry
 */
export class MimicMapping implements IMimicMapping {
  public readonly id: string;
  private _pattern: string | null = null;
  private _picomatchMatcher: ((str: string) => boolean) | undefined;
  private _regex: RegExp | undefined;
  private _regexPattern: string | null = null;
  public content: Buffer | undefined;

  constructor(id: string, pattern?: string | null, regexPattern?: string | null, content?: Buffer) {
    this.id = id;
    if (pattern) {
      this.setPattern(pattern);
    }
    if (regexPattern) {
      this.setRegexPattern(regexPattern);
    }
    this.content = content;
  }

  get hasContent(): boolean {
    return this.content !== undefined;
  }

  /**
   * Get the glob pattern string
   */
  get pattern(): string | null {
    return this._pattern;
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
   * Set the glob pattern and create the picomatch matcher
   * Throws error if pattern is invalid
   */
  setPattern(pattern: string): void {
    this._pattern = pattern;
    try {
      this._picomatchMatcher = picomatch(pattern);
    } catch (error) {
      throw new Error(`Invalid glob pattern: ${String(error)}`);
    }
  }

  /**
   * Clear glob pattern and picomatch matcher
   */
  clearPattern(): void {
    this._pattern = null;
    this._picomatchMatcher = undefined;
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
   * First checks glob pattern (using picomatch), then regex pattern
   */
  matches(url: string): boolean {
    // First try glob pattern matching
    if (this._pattern !== null && this._picomatchMatcher) {
      if (this._picomatchMatcher(url)) {
        return true;
      }
    }

    // Then try regex pattern matching
    if (this._regexPattern !== null && this._regex) {
      if (this._regex.test(url)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Create MimicMapping from IMimicMapping (for deserialization from JSON)
   * Content should be loaded separately
   */
  static fromInterface(data: IMimicMapping): MimicMapping {
    const mapping = new MimicMapping(data.id);

    if (data.pattern) {
      try {
        mapping.setPattern(data.pattern);
      } catch {
        // Skip invalid glob patterns
        console.warn(`Invalid glob pattern for mapping ${data.id}: ${data.pattern}`);
      }
    }

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
   * Includes pattern, regexPattern, hasContent, and contentLength
   */
  toMetadataResponse(): {
    id: string;
    pattern?: string;
    regexPattern?: string;
    hasContent: boolean;
    contentLength: number;
  } {
    const result: {
      id: string;
      pattern?: string;
      regexPattern?: string;
      hasContent: boolean;
      contentLength: number;
    } = {
      id: this.id,
      hasContent: this.hasContent,
      contentLength: this.contentLength,
    };

    if (this._pattern !== null) {
      result.pattern = this._pattern;
    }

    if (this._regexPattern !== null) {
      result.regexPattern = this._regexPattern;
    }

    return result;
  }

  /**
   * Create a plain object representation (for backward compatibility)
   */
  toPlainObject(): {
    id: string;
    pattern?: string;
    regex?: RegExp;
    regexPattern?: string;
    content?: Buffer;
  } {
    const obj: {
      id: string;
      pattern?: string;
      regex?: RegExp;
      regexPattern?: string;
      content?: Buffer;
    } = {
      id: this.id,
    };

    if (this._pattern !== null) {
      obj.pattern = this._pattern;
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

