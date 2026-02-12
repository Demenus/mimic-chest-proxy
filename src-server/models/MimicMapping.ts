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

export type MimicMappingType = 'content' | 'substitution';

/**
 * Common interface for MimicMapping
 * Uses null for JSON compatibility (instead of undefined)
 */
export interface IMimicMapping {
  id: string;
  pattern: string | null;
  contentLength: number;
  substitutionUrl?: string | null;
  followResources?: boolean;
}

import picomatch from 'picomatch';

/**
 * MimicMapping class that encapsulates glob pattern mapping logic
 * Handles glob pattern matching (using picomatch) for content mimicry
 */
export class MimicMapping implements IMimicMapping {
  public readonly id: string;
  private _pattern: string | null = null;
  private _picomatchMatcher: ((str: string) => boolean) | undefined;
  private _persistedContentLength = 0;
  private _substitutionUrl: string | null = null;
  private _followResources = false;
  public content: Buffer | undefined;

  constructor(
    id: string,
    pattern?: string | null,
    content?: Buffer,
    substitutionUrl?: string | null,
    followResources?: boolean
  ) {
    this.id = id;
    if (pattern) {
      this.setPattern(pattern);
    }
    this.content = content;
    if (substitutionUrl !== undefined && substitutionUrl !== null) {
      this._substitutionUrl = substitutionUrl.trim() || null;
    }
    if (followResources !== undefined) {
      this._followResources = Boolean(followResources);
    }
  }

  get followResources(): boolean {
    return this._followResources;
  }

  setFollowResources(value: boolean): void {
    this._followResources = Boolean(value);
  }

  get type(): MimicMappingType {
    return this._substitutionUrl && this._substitutionUrl.length > 0 ? 'substitution' : 'content';
  }

  get substitutionUrl(): string | null {
    return this._substitutionUrl;
  }

  setSubstitutionUrl(url: string | null): void {
    this._substitutionUrl = url && url.trim() ? url.trim() : null;
  }

  get hasContent(): boolean {
    const hasBody = (this.content?.length ?? 0) > 0 || this._persistedContentLength > 0;
    const hasSubstitutionUrl = (this._substitutionUrl?.trim() ?? '').length > 0;
    return hasBody || hasSubstitutionUrl;
  }

  /**
   * Get the glob pattern string
   */
  get pattern(): string | null {
    return this._pattern;
  }

  /**
   * Get contentLength for IMimicMapping interface compliance
   */
  get contentLength(): number {
    return this.content?.length ?? this._persistedContentLength;
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
   * Check if this mapping matches a given URL
   */
  matches(url: string): boolean {
    if (this._pattern !== null && this._picomatchMatcher) {
      return this._picomatchMatcher(url);
    }
    return false;
  }

  /**
   * Create MimicMapping from IMimicMapping (for deserialization from JSON)
   * Content should be loaded separately
   * Skips mappings without pattern (e.g. legacy regex-only mappings)
   */
  static fromInterface(data: IMimicMapping): MimicMapping {
    const mapping = new MimicMapping(data.id);
    mapping._persistedContentLength = data.contentLength ?? 0;
    if (data.substitutionUrl !== undefined && data.substitutionUrl !== null) {
      mapping._substitutionUrl = String(data.substitutionUrl).trim() || null;
    }
    if (data.followResources !== undefined) {
      mapping._followResources = Boolean(data.followResources);
    }

    if (data.pattern) {
      try {
        mapping.setPattern(data.pattern);
      } catch {
        // Skip invalid glob patterns
        console.warn(`Invalid glob pattern for mapping ${data.id}: ${data.pattern}`);
      }
    }

    return mapping;
  }

  /**
   * Create a metadata response object (for API responses)
   * hasContent is true when contentLength > 0 (from in-memory content or persisted index)
   */
  toMetadataResponse(): {
    id: string;
    pattern?: string;
    hasContent: boolean;
    contentLength: number;
    type: MimicMappingType;
    substitutionUrl?: string | null;
    followResources: boolean;
  } {
    const result: {
      id: string;
      pattern?: string;
      hasContent: boolean;
      contentLength: number;
      type: MimicMappingType;
      substitutionUrl?: string | null;
      followResources: boolean;
    } = {
      id: this.id,
      hasContent: this.hasContent,
      contentLength: this.contentLength,
      type: this.type,
      substitutionUrl: this._substitutionUrl,
      followResources: this._followResources,
    };

    if (this._pattern !== null) {
      result.pattern = this._pattern;
    }

    return result;
  }

  /**
   * Create a plain object representation (for backward compatibility)
   */
  toPlainObject(): {
    id: string;
    pattern?: string;
    content?: Buffer;
    substitutionUrl?: string | null;
    followResources?: boolean;
  } {
    const obj: {
      id: string;
      pattern?: string;
      content?: Buffer;
      substitutionUrl?: string | null;
      followResources?: boolean;
    } = {
      id: this.id,
    };

    if (this._pattern !== null) {
      obj.pattern = this._pattern;
    }

    if (this.content) {
      obj.content = this.content;
    }

    if (this._substitutionUrl !== null) {
      obj.substitutionUrl = this._substitutionUrl;
    }

    obj.followResources = this._followResources;

    return obj;
  }
}

