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

import { randomUUID } from 'crypto';
import { MimicMapping } from '../models/MimicMapping.js';
import { MimicMappingStorage } from '../storage/MimicMappingStorage.js';

/**
 * Service for managing mimic mappings
 * Handles creation, retrieval, updating, and deletion of glob pattern mappings
 */
export class MimicMappingService {
  private storage: MimicMappingStorage | null = null;
  private initialized = false;

  /**
   * Initialize the service with storage path
   * Must be called before using the service
   */
  async init(userDataPath: string): Promise<void> {
    if (this.initialized) {
      return;
    }

    const storagePath = userDataPath ? `${userDataPath}/mimic` : undefined;
    if (!storagePath) {
      // If no path provided, service cannot work without storage
      throw new Error('Storage path is required');
    }

    this.storage = new MimicMappingStorage(storagePath);
    await this.storage.initialize();

    this.initialized = true;
  }

  /**
   * Normalize a bare host/domain (e.g. "google.com") into a glob that matches any URL for that domain.
   * - "google.com" -> "*://*google.com/**" matches https://www.google.com, https://google.com,
   *   http://mail.google.com/inbox, etc.
   * - Patterns with wildcards or explicit protocol are left unchanged.
   */
  private normalizeGlobPattern(pattern: string): string {
    const trimmed = pattern.trim();
    if (!trimmed) {
      return trimmed;
    }
    const hasWildcards = /\*|\?/.test(trimmed);
    const hasProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
    if (hasWildcards || hasProtocol) {
      return trimmed;
    }
    return `*://*${trimmed}*/**`;
  }

  /**
   * Create a new mapping for a glob pattern
   * If a mapping with the same pattern already exists, it will be overwritten.
   * Bare host names (e.g. "google.com") are normalized to a glob that matches any URL containing them.
   */
  async createMapping(pattern: string): Promise<MimicMapping> {
    if (!this.storage) {
      throw new Error('Storage not initialized');
    }

    pattern = this.normalizeGlobPattern(pattern);

    const existing = this.storage.findByPattern(pattern);

    if (existing) {
      existing.mapping.setPattern(pattern);
      await this.storage.set(existing.id, existing.mapping);
      return existing.mapping;
    }

    const id = randomUUID();
    const mapping = new MimicMapping(id, pattern);

    await this.storage.set(id, mapping);
    return mapping;
  }

  /**
   * Ensure mapping has content loaded from storage if not already in memory.
   * Skips loading for substitution-type mappings (they use substitutionUrl instead).
   */
  private async ensureContentLoaded(mapping: MimicMapping): Promise<void> {
    if (mapping.content || mapping.substitutionUrl) {
      return;
    }
    try {
      const content = await this.storage!.loadContent(mapping.id);
      if (content) {
        mapping.content = content;
        await this.storage!.set(mapping.id, mapping);
      }
    } catch (error) {
      console.error(`Failed to load content for mapping ${mapping.id}:`, error);
    }
  }

  /**
   * Get a mapping by ID
   * Loads content from storage if not already in memory
   */
  async getMapping(id: string): Promise<MimicMapping | undefined> {
    if (!this.storage) {
      throw new Error('Storage not initialized');
    }

    const mapping = this.storage.get(id);
    if (!mapping) {
      return undefined;
    }

    await this.ensureContentLoaded(mapping);
    return mapping;
  }

  /**
   * Get a mapping by ID (synchronous version for backward compatibility)
   * Note: Content may not be loaded if not already in memory
   */
  getMappingSync(id: string): MimicMapping | undefined {
    if (!this.storage) {
      return undefined;
    }
    return this.storage.get(id);
  }

  /**
   * Find a matching mapping by URL using glob patterns
   */
  findMatchingMapping(url: string): MimicMapping | undefined {
    if (!this.storage) {
      return undefined;
    }
    return this.storage.findMatchingMapping(url);
  }

  /**
   * Find a matching mapping by URL (async version that loads content)
   */
  async findMatchingMappingAsync(url: string): Promise<MimicMapping | undefined> {
    if (!this.storage) {
      return undefined;
    }

    const mapping = this.storage.findMatchingMapping(url);
    if (!mapping) {
      return undefined;
    }

    await this.ensureContentLoaded(mapping);
    return mapping;
  }

  /**
   * Update the content of a mapping (sets type to 'content', clears substitutionUrl)
   */
  async updateMappingContent(id: string, content: Buffer): Promise<MimicMapping> {
    if (!this.storage) {
      throw new Error('Storage not initialized');
    }

    const mapping = this.storage.get(id);
    if (!mapping) {
      throw new Error('Mapping not found');
    }

    mapping.content = content;
    mapping.setSubstitutionUrl(null);
    await this.storage.set(id, mapping);
    return mapping;
  }

  /**
   * Update the substitution URL of a mapping (sets type to 'substitution', clears stored content)
   */
  async updateMappingSubstitutionUrl(id: string, substitutionUrl: string): Promise<MimicMapping> {
    if (!this.storage) {
      throw new Error('Storage not initialized');
    }

    const mapping = this.storage.get(id);
    if (!mapping) {
      throw new Error('Mapping not found');
    }

    mapping.setSubstitutionUrl(substitutionUrl.trim() || null);
    mapping.content = undefined;
    await this.storage.set(id, mapping);
    return mapping;
  }

  /**
   * Get all mappings (for debugging/admin purposes)
   */
  getAllMappings(): MimicMapping[] {
    if (!this.storage) {
      return [];
    }
    return this.storage.getAll();
  }

  /**
   * Get all mappings with metadata (hasContent derived from contentLength > 0)
   * Assumes content size doesn't change externally, only through the app editor
   */
  getAllMappingsWithMetadata(): Array<{
    id: string;
    pattern?: string;
    hasContent: boolean;
    contentLength: number;
  }> {
    if (!this.storage) {
      return [];
    }
    const mappings = this.storage.getAll();
    return mappings.map((m) => m.toMetadataResponse());
  }

  /**
   * Delete a mapping by ID
   */
  async deleteMapping(id: string): Promise<boolean> {
    if (!this.storage) {
      return false;
    }
    return await this.storage.delete(id);
  }
}

// Export a singleton instance for convenience
export const mimicMappingService = new MimicMappingService();

