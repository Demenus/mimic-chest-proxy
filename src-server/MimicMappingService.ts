import { randomUUID } from 'crypto';
import type { MimicMapping } from './types.js';
import { MimicMappingStorage } from './storage/MimicMappingStorage.js';

/**
 * Service for managing mimic mappings
 * Handles creation, retrieval, updating, and deletion of URL and regex mappings
 */
export class MimicMappingService {
  // In-memory storage for mimic mappings
  private readonly mimicMappings = new Map<string, MimicMapping>();
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
      // If no path provided, continue with in-memory only
      this.initialized = true;
      return;
    }

    this.storage = new MimicMappingStorage(storagePath);
    await this.storage.initialize();

    // Load existing mappings from storage
    const metadataList = await this.storage.loadIndex();
    for (const metadata of metadataList) {
      const mapping = this.storage.metadataToMapping(metadata);
      this.mimicMappings.set(metadata.id, mapping as MimicMapping);
    }

    this.initialized = true;
  }

  /**
   * Create a new mapping for a URL or regex pattern
   * If a mapping with the same URL or regexUrl already exists, it will be overwritten
   */
  async createMapping(url?: string, regexUrl?: string): Promise<MimicMapping> {
    // Check if a mapping with the same URL or regexUrl already exists
    let existingMapping: MimicMapping | undefined;
    let existingId: string | undefined;

    if (url) {
      // Search for existing mapping with the same URL
      for (const [id, mapping] of this.mimicMappings.entries()) {
        if (mapping.url === url) {
          existingMapping = mapping;
          existingId = id;
          break;
        }
      }
    } else if (regexUrl) {
      // Search for existing mapping with the same regex pattern
      try {
        const regexPattern = new RegExp(regexUrl);
        for (const [id, mapping] of this.mimicMappings.entries()) {
          if (mapping.regex && mapping.regex.toString() === regexPattern.toString()) {
            existingMapping = mapping;
            existingId = id;
            break;
          }
        }
      } catch (error) {
        throw new Error(`Invalid regex pattern: ${String(error)}`);
      }
    } else {
      throw new Error('Either url or regexUrl must be provided');
    }

    // If existing mapping found, update it; otherwise create new one
    if (existingMapping && existingId) {
      // Overwrite existing mapping, preserving content if it exists
      if (url) {
        existingMapping.url = url;
        // Clear regex if it was a regex mapping before
        delete existingMapping.regex;
        delete existingMapping.regexPattern;
      } else if (regexUrl) {
        try {
          existingMapping.regex = new RegExp(regexUrl);
          existingMapping.regexPattern = regexUrl; // Store the original pattern
          // Clear url if it was a URL mapping before
          delete existingMapping.url;
        } catch (error) {
          throw new Error(`Invalid regex pattern: ${String(error)}`);
        }
      }
      this.mimicMappings.set(existingId, existingMapping);
      await this.persistMapping(existingMapping);
      return existingMapping;
    }

    // Create new mapping
    const id = randomUUID();
    const mapping: MimicMapping = {
      id,
    };

    if (url) {
      mapping.url = url;
    } else if (regexUrl) {
      try {
        mapping.regex = new RegExp(regexUrl);
        mapping.regexPattern = regexUrl; // Store the original pattern
      } catch (error) {
        throw new Error(`Invalid regex pattern: ${String(error)}`);
      }
    }

    this.mimicMappings.set(id, mapping);
    await this.persistMapping(mapping);
    return mapping;
  }

  /**
   * Persist a mapping to storage
   */
  private async persistMapping(mapping: MimicMapping): Promise<void> {
    if (!this.storage) {
      return;
    }

    try {
      const metadataList = Array.from(this.mimicMappings.values()).map((m) =>
        this.storage!.mappingToMetadata(m)
      );
      await this.storage.saveIndex(metadataList);

      // Save content if it exists
      if (mapping.content) {
        await this.storage.saveContent(mapping.id, mapping.content);
      }
    } catch (error) {
      console.error('Failed to persist mapping:', error);
      // Don't throw - continue operation even if persistence fails
    }
  }

  /**
   * Get a mapping by ID
   * Loads content from storage if not already in memory
   */
  async getMapping(id: string): Promise<MimicMapping | undefined> {
    const mapping = this.mimicMappings.get(id);
    if (!mapping) {
      return undefined;
    }

    // Load content from storage if not in memory and storage is available
    if (!mapping.content && this.storage) {
      try {
        const content = await this.storage.loadContent(id);
        if (content) {
          mapping.content = content;
          this.mimicMappings.set(id, mapping);
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
    return this.mimicMappings.get(id);
  }

  /**
   * Find a matching mapping by URL
   * First checks for exact URL matches, then checks regex patterns
   * This ensures that fixed URLs take priority over generic regex patterns
   */
  findMatchingMapping(url: string): MimicMapping | undefined {
    // First pass: check all exact URL matches
    for (const mapping of this.mimicMappings.values()) {
      if (mapping.url && mapping.url === url) {
        return mapping;
      }
    }

    // Second pass: check regex patterns (only if no exact URL match was found)
    for (const mapping of this.mimicMappings.values()) {
      if (mapping.regex && mapping.regex.test(url)) {
        return mapping;
      }
    }

    return undefined;
  }

  /**
   * Find a matching mapping by URL (async version that loads content)
   */
  async findMatchingMappingAsync(url: string): Promise<MimicMapping | undefined> {
    const mapping = this.findMatchingMapping(url);
    if (!mapping) {
      return undefined;
    }

    // Load content if not already in memory
    if (!mapping.content && this.storage) {
      try {
        const content = await this.storage.loadContent(mapping.id);
        if (content) {
          mapping.content = content;
          this.mimicMappings.set(mapping.id, mapping);
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
    const mapping = this.mimicMappings.get(id);
    if (!mapping) {
      throw new Error('Mapping not found');
    }

    mapping.content = content;
    this.mimicMappings.set(id, mapping);
    await this.persistMapping(mapping);
    return mapping;
  }

  /**
   * Get all mappings (for debugging/admin purposes)
   */
  getAllMappings(): MimicMapping[] {
    return Array.from(this.mimicMappings.values());
  }

  /**
   * Get all mappings with metadata (hasContent derived from contentLength > 0)
   * This method loads metadata from storage to get accurate contentLength
   * without loading the actual content files. hasContent is derived from contentLength > 0
   */
  async getAllMappingsWithMetadata(): Promise<
    Array<{
      id: string;
      url?: string;
      regexUrl?: string;
      hasContent: boolean;
      contentLength: number;
    }>
  > {
    const mappings = Array.from(this.mimicMappings.values());

    // If we have storage, get accurate metadata
    if (this.storage) {
      const metadataList = await this.storage.loadIndex();
      const metadataMap = new Map(metadataList.map((m) => [m.id, m]));

      return mappings.map((m) => {
        const metadata = metadataMap.get(m.id);
        const regexUrl = m.regexPattern || m.regex?.toString();
        const contentLength = metadata?.contentLength ?? m.content?.length ?? 0;
        const result: {
          id: string;
          url?: string;
          regexUrl?: string;
          hasContent: boolean;
          contentLength: number;
        } = {
          id: m.id,
          hasContent: contentLength > 0,
          contentLength,
        };
        if (m.url) {
          result.url = m.url;
        }
        if (regexUrl) {
          result.regexUrl = regexUrl;
        }
        return result;
      });
    }

    // Fallback to in-memory data if no storage
    return mappings.map((m) => {
      const regexUrl = m.regexPattern || m.regex?.toString();
      const contentLength = m.content?.length || 0;
      const result: {
        id: string;
        url?: string;
        regexUrl?: string;
        hasContent: boolean;
        contentLength: number;
      } = {
        id: m.id,
        hasContent: contentLength > 0,
        contentLength,
      };
      if (m.url) {
        result.url = m.url;
      }
      if (regexUrl) {
        result.regexUrl = regexUrl;
      }
      return result;
    });
  }

  /**
   * Delete a mapping by ID
   */
  async deleteMapping(id: string): Promise<boolean> {
    const deleted = this.mimicMappings.delete(id);
    if (!deleted) {
      return false;
    }

    // Persist changes and delete content file
    if (this.storage) {
      try {
        const metadataList = Array.from(this.mimicMappings.values()).map((m) =>
          this.storage!.mappingToMetadata(m)
        );
        await this.storage.saveIndex(metadataList);
        await this.storage.deleteContent(id);
      } catch (error) {
        console.error(`Failed to persist deletion of mapping ${id}:`, error);
        // Don't throw - mapping is already deleted from memory
      }
    }

    return true;
  }
}

// Export a singleton instance for convenience
export const mimicMappingService = new MimicMappingService();

