import { randomUUID } from 'crypto';
import type { MimicMapping } from './types.js';

// In-memory storage for mimic mappings
const mimicMappings = new Map<string, MimicMapping>();

/**
 * Create a new mapping for a URL or regex pattern
 */
export function createMapping(url?: string, regexUrl?: string): MimicMapping {
  const id = randomUUID();
  const mapping: MimicMapping = {
    id,
  };

  if (url) {
    mapping.url = url;
  } else if (regexUrl) {
    try {
      mapping.regex = new RegExp(regexUrl);
    } catch (error) {
      throw new Error(`Invalid regex pattern: ${String(error)}`);
    }
  } else {
    throw new Error('Either url or regexUrl must be provided');
  }

  mimicMappings.set(id, mapping);
  return mapping;
}

/**
 * Get a mapping by ID
 */
export function getMapping(id: string): MimicMapping | undefined {
  return mimicMappings.get(id);
}

/**
 * Find a matching mapping by URL
 */
export function findMatchingMapping(url: string): MimicMapping | undefined {
  for (const mapping of mimicMappings.values()) {
    if (mapping.url && mapping.url === url) {
      return mapping;
    }
    if (mapping.regex && mapping.regex.test(url)) {
      return mapping;
    }
  }
  return undefined;
}

/**
 * Update the content of a mapping
 */
export function updateMappingContent(id: string, content: Buffer): MimicMapping {
  const mapping = mimicMappings.get(id);
  if (!mapping) {
    throw new Error('Mapping not found');
  }

  mapping.content = content;
  mimicMappings.set(id, mapping);
  return mapping;
}

/**
 * Get all mappings (for debugging/admin purposes)
 */
export function getAllMappings(): MimicMapping[] {
  return Array.from(mimicMappings.values());
}

/**
 * Delete a mapping by ID
 */
export function deleteMapping(id: string): boolean {
  return mimicMappings.delete(id);
}

