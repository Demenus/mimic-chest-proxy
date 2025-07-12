import { randomUUID } from 'crypto';
import type { MimicMapping } from './types.js';

/**
 * Service for managing mimic mappings
 * Handles creation, retrieval, updating, and deletion of URL and regex mappings
 */
export class MimicMappingService {
  // In-memory storage for mimic mappings
  private readonly mimicMappings = new Map<string, MimicMapping>();

  /**
   * Create a new mapping for a URL or regex pattern
   * If a mapping with the same URL or regexUrl already exists, it will be overwritten
   */
  createMapping(url?: string, regexUrl?: string): MimicMapping {
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
    return mapping;
  }

  /**
   * Get a mapping by ID
   */
  getMapping(id: string): MimicMapping | undefined {
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
   * Update the content of a mapping
   */
  updateMappingContent(id: string, content: Buffer): MimicMapping {
    const mapping = this.mimicMappings.get(id);
    if (!mapping) {
      throw new Error('Mapping not found');
    }

    mapping.content = content;
    this.mimicMappings.set(id, mapping);
    return mapping;
  }

  /**
   * Get all mappings (for debugging/admin purposes)
   */
  getAllMappings(): MimicMapping[] {
    return Array.from(this.mimicMappings.values());
  }

  /**
   * Delete a mapping by ID
   */
  deleteMapping(id: string): boolean {
    return this.mimicMappings.delete(id);
  }
}

// Export a singleton instance for convenience
export const mimicMappingService = new MimicMappingService();

