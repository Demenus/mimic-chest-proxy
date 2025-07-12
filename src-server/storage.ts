import { randomUUID } from 'crypto';
import type { MimicMapping } from './types.js';

// In-memory storage for mimic mappings
const mimicMappings = new Map<string, MimicMapping>();

/**
 * Create a new mapping for a URL or regex pattern
 * If a mapping with the same URL or regexUrl already exists, it will be overwritten
 */
export function createMapping(url?: string, regexUrl?: string): MimicMapping {
  // Check if a mapping with the same URL or regexUrl already exists
  let existingMapping: MimicMapping | undefined;
  let existingId: string | undefined;

  if (url) {
    // Search for existing mapping with the same URL
    for (const [id, mapping] of mimicMappings.entries()) {
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
      for (const [id, mapping] of mimicMappings.entries()) {
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
    mimicMappings.set(existingId, existingMapping);
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
 * First checks for exact URL matches, then checks regex patterns
 * This ensures that fixed URLs take priority over generic regex patterns
 */
export function findMatchingMapping(url: string): MimicMapping | undefined {
  // First pass: check all exact URL matches
  for (const mapping of mimicMappings.values()) {
    if (mapping.url && mapping.url === url) {
      return mapping;
    }
  }

  // Second pass: check regex patterns (only if no exact URL match was found)
  for (const mapping of mimicMappings.values()) {
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

