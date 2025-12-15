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
 * Handles creation, retrieval, updating, and deletion of URL and regex mappings
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
   * Create a new mapping for a glob pattern or regex pattern
   * If a mapping with the same pattern or regexPattern already exists, it will be overwritten
   */
  async createMapping(pattern?: string, regexPattern?: string): Promise<MimicMapping> {
    if (!this.storage) {
      throw new Error('Storage not initialized');
    }

    // Check if a mapping with the same pattern or regexPattern already exists
    let existing: { id: string; mapping: MimicMapping } | undefined;

    if (pattern) {
      existing = this.storage.findByPattern(pattern);
    } else if (regexPattern) {
      existing = this.storage.findByRegex(regexPattern);
    } else {
      throw new Error('Either pattern or regexPattern must be provided');
    }

    // If existing mapping found, update it; otherwise create new one
    if (existing) {
      // Overwrite existing mapping, preserving content if it exists
      if (pattern) {
        existing.mapping.setPattern(pattern);
        // Clear regex if it was a regex mapping before
        existing.mapping.clearRegex();
      } else if (regexPattern) {
        existing.mapping.setRegexPattern(regexPattern);
        // Clear pattern if it was a glob pattern mapping before
        existing.mapping.clearPattern();
      }
      await this.storage.set(existing.id, existing.mapping);
      return existing.mapping;
    }

    // Create new mapping
    const id = randomUUID();
    const mapping = new MimicMapping(id, pattern ?? null, regexPattern ?? null);

    await this.storage.set(id, mapping);
    return mapping;
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

    // Load content from storage if not in memory
    if (!mapping.content) {
      try {
        const content = await this.storage.loadContent(id);
        if (content) {
          mapping.content = content;
          // Update the mapping in storage with loaded content
          await this.storage.set(id, mapping);
        }
      } catch (error) {
        console.error(`Failed to load content for mapping ${id}:`, error);
      }
    }

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
   * Find a matching mapping by URL
   * First checks for glob patterns, then checks regex patterns
   * This ensures that glob patterns are checked before regex patterns
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

    // Load content if not already in memory
    if (!mapping.content) {
      try {
        const content = await this.storage.loadContent(mapping.id);
        if (content) {
          mapping.content = content;
          // Update the mapping in storage with loaded content
          await this.storage.set(mapping.id, mapping);
        }
      } catch (error) {
        console.error(`Failed to load content for mapping ${mapping.id}:`, error);
      }
    }

    return mapping;
  }

  /**
   * Update the content of a mapping
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
    regexPattern?: string;
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

