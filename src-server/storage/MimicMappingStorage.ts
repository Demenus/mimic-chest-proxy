import { promises as fs } from 'fs';
import path from 'path';
import type { MimicMapping } from '../types.js';

/**
 * Storage metadata structure for index.json
 */
interface MappingMetadata {
  id: string;
  url: string | null;
  regexPattern: string | null;
  contentLength: number;
}

interface StorageIndex {
  mappings: MappingMetadata[];
}

/**
 * Storage layer for MimicMapping data
 * Handles persistence to filesystem:
 * - index.json: Contains metadata (id, url, regexPattern)
 * - {id}.txt: Contains content for each mapping (UTF-8 text)
 */
export class MimicMappingStorage {
  private readonly storageDir: string;
  private readonly indexPath: string;

  constructor(storagePath: string) {
    this.storageDir = path.resolve(storagePath);
    this.indexPath = path.join(this.storageDir, 'index.json');
  }

  /**
   * Initialize storage directory and load existing data
   */
  async initialize(): Promise<void> {
    // Ensure storage directory exists
    await fs.mkdir(this.storageDir, { recursive: true });
  }

  /**
   * Load all mappings metadata from index.json
   */
  async loadIndex(): Promise<MappingMetadata[]> {
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
  async saveIndex(mappings: MappingMetadata[]): Promise<void> {
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
   * Convert MimicMapping to MappingMetadata (without content)
   */
  mappingToMetadata(mapping: MimicMapping): MappingMetadata {
    return {
      id: mapping.id,
      url: mapping.url ?? null,
      regexPattern: mapping.regexPattern ?? null,
      contentLength: mapping.content?.length || 0,
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
   * Convert MappingMetadata to MimicMapping (without content, content loaded separately)
   */
  metadataToMapping(metadata: MappingMetadata): Omit<MimicMapping, 'content'> {
    const mapping: Omit<MimicMapping, 'content'> = {
      id: metadata.id,
    };

    if (metadata.url) {
      mapping.url = metadata.url;
    }

    if (metadata.regexPattern) {
      try {
        mapping.regex = new RegExp(metadata.regexPattern);
        mapping.regexPattern = metadata.regexPattern;
      } catch {
        // Skip invalid regex patterns
        console.warn(`Invalid regex pattern for mapping ${metadata.id}: ${metadata.regexPattern}`);
      }
    }

    return mapping;
  }
}
