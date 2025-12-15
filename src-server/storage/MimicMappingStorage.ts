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

import { promises as fs } from 'fs';
import path from 'path';
import { MimicMapping, type IMimicMapping } from '../models/MimicMapping.js';

interface StorageIndex {
  mappings: IMimicMapping[];
}

/**
 * Storage layer for MimicMapping data
 * Handles in-memory state and persistence to filesystem:
 * - In-memory Map for fast access
 * - index.json: Contains metadata (id, url, regexPattern)
 * - {id}.txt: Contains content for each mapping (UTF-8 text)
 */
export class MimicMappingStorage {
  private readonly storageDir: string;
  private readonly indexPath: string;
  private readonly mimicMappings = new Map<string, MimicMapping>();

  constructor(storagePath: string) {
    this.storageDir = path.resolve(storagePath);
    this.indexPath = path.join(this.storageDir, 'index.json');
  }

  /**
   * Initialize storage directory and load existing data into memory
   */
  async initialize(): Promise<void> {
    // Ensure storage directory exists
    await fs.mkdir(this.storageDir, { recursive: true });

    // Load existing mappings from disk into memory
    const metadataList = await this.loadIndex();
    for (const metadata of metadataList) {
      const mapping = this.interfaceToMapping(metadata);
      this.mimicMappings.set(metadata.id, mapping);
    }
  }

  /**
   * Load all mappings metadata from index.json
   */
  async loadIndex(): Promise<IMimicMapping[]> {
    try {
      const data = await fs.readFile(this.indexPath, 'utf-8');
      const index: StorageIndex = JSON.parse(data);
      return index.mappings || [];
    } catch (error) {
      // If file doesn't exist, return empty array
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Save mappings metadata to index.json
   */
  async saveIndex(mappings: IMimicMapping[]): Promise<void> {
    const index: StorageIndex = { mappings };
    await fs.writeFile(this.indexPath, JSON.stringify(index, null, 2), 'utf-8');
  }

  /**
   * Get content file path for a mapping
   */
  private getContentPath(id: string): string {
    return path.join(this.storageDir, `${id}.txt`);
  }

  /**
   * Load content for a specific mapping
   * Returns undefined if content file doesn't exist
   */
  async loadContent(id: string): Promise<Buffer | undefined> {
    const contentPath = this.getContentPath(id);
    try {
      const content = await fs.readFile(contentPath, 'utf-8');
      return Buffer.from(content, 'utf-8');
    } catch (error) {
      // If file doesn't exist, return undefined
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return undefined;
      }
      throw error;
    }
  }

  /**
   * Save content for a specific mapping
   */
  async saveContent(id: string, content: Buffer): Promise<void> {
    const contentPath = this.getContentPath(id);
    // Convert buffer to UTF-8 string
    const contentString = content.toString('utf-8');
    await fs.writeFile(contentPath, contentString, 'utf-8');
  }

  /**
   * Delete content file for a specific mapping
   */
  async deleteContent(id: string): Promise<void> {
    const contentPath = this.getContentPath(id);
    try {
      await fs.unlink(contentPath);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Convert MimicMapping to IMimicMapping (for JSON serialization)
   */
  mappingToInterface(mapping: MimicMapping): IMimicMapping {
    return {
      id: mapping.id,
      pattern: mapping.pattern,
      regexPattern: mapping.regexPattern,
      contentLength: mapping.contentLength,
    };
  }

  /**
   * Check if content file exists for a mapping
   */
  async hasContentFile(id: string): Promise<boolean> {
    const contentPath = this.getContentPath(id);
    try {
      await fs.access(contentPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Convert IMimicMapping to MimicMapping (for deserialization from JSON)
   * Content should be loaded separately
   */
  interfaceToMapping(data: IMimicMapping): MimicMapping {
    return MimicMapping.fromInterface(data);
  }

  /**
   * Find a mapping by exact pattern match
   */
  findByPattern(pattern: string): { id: string; mapping: MimicMapping } | undefined {
    for (const [id, mapping] of this.mimicMappings.entries()) {
      if (mapping.pattern === pattern) {
        return { id, mapping };
      }
    }
    return undefined;
  }

  /**
   * Find a mapping by exact regex pattern match
   */
  findByRegex(regexPattern: string): { id: string; mapping: MimicMapping } | undefined {
    for (const [id, mapping] of this.mimicMappings.entries()) {
      if (mapping.regexPattern === regexPattern) {
        return { id, mapping };
      }
    }
    return undefined;
  }

  /**
   * Find a matching mapping by URL
   * First checks for glob patterns, then checks regex patterns
   * This ensures that glob patterns are checked before regex patterns
   */
  findMatchingMapping(url: string): MimicMapping | undefined {
    // First pass: check all glob patterns
    for (const mapping of this.mimicMappings.values()) {
      if (mapping.pattern !== null && mapping.matches(url)) {
        return mapping;
      }
    }

    // Second pass: check regex patterns (only if no glob pattern match was found)
    for (const mapping of this.mimicMappings.values()) {
      if (mapping.pattern === null && mapping.regexPattern !== null && mapping.matches(url)) {
        return mapping;
      }
    }

    return undefined;
  }

  /**
   * Get a mapping by ID
   */
  get(id: string): MimicMapping | undefined {
    return this.mimicMappings.get(id);
  }

  /**
   * Get all mappings
   */
  getAll(): MimicMapping[] {
    return Array.from(this.mimicMappings.values());
  }

  /**
   * Set a mapping (add or update)
   * Automatically persists to disk
   */
  async set(id: string, mapping: MimicMapping): Promise<void> {
    this.mimicMappings.set(id, mapping);
    await this.persistIndex();

    // Save content if it exists
    if (mapping.content) {
      await this.saveContent(id, mapping.content);
    }
  }

  /**
   * Delete a mapping by ID
   * Automatically persists to disk
   */
  async delete(id: string): Promise<boolean> {
    const deleted = this.mimicMappings.delete(id);
    if (!deleted) {
      return false;
    }

    await this.persistIndex();
    await this.deleteContent(id);

    return true;
  }

  /**
   * Persist the current index to disk
   */
  private async persistIndex(): Promise<void> {
    try {
      const metadataList = Array.from(this.mimicMappings.values()).map((m) =>
        this.mappingToInterface(m)
      );
      await this.saveIndex(metadataList);
    } catch (error) {
      console.error('Failed to persist index:', error);
      // Don't throw - continue operation even if persistence fails
    }
  }
}
