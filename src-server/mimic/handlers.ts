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

import type { Request, Response } from 'express';
import { mimicMappingService } from '../service/MimicMappingService.js';
import { parseContentFromBody } from '../utils/index.js';
import type {
  CreateMappingRequest,
  CreateMappingResponse,
  UpdateContentResponse,
  ErrorResponse,
} from '../types.js';

export function getMappings(_req: Request, res: Response): void {
  try {
    const mappings = mimicMappingService.getAllMappingsWithMetadata();
    res.status(200).json(mappings);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get mappings',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function getMappingById(req: Request<{ id: string }>, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const mapping = await mimicMappingService.getMapping(id);

    if (!mapping) {
      res.status(404).json({ error: 'Mapping not found' });
      return;
    }

    res.status(200).json({
      id: mapping.id,
      pattern: mapping.pattern,
      content: mapping.content ? mapping.content.toString('utf-8') : '',
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get mapping',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function createMapping(
  req: Request<unknown, CreateMappingResponse | ErrorResponse, CreateMappingRequest>,
  res: Response
): Promise<void> {
  try {
    const { pattern } = req.body;

    if (!pattern || typeof pattern !== 'string' || !pattern.trim()) {
      res.status(400).json({ error: 'pattern is required' });
      return;
    }

    const mapping = await mimicMappingService.createMapping(pattern.trim());

    res.status(201).json({ id: mapping.id, pattern: mapping.pattern ?? undefined });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to create mapping',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function updateMappingContent(
  req: Request<{ id: string }, UpdateContentResponse | ErrorResponse>,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const mapping = await mimicMappingService.getMapping(id);

    if (!mapping) {
      res.status(404).json({ error: 'Mapping not found' });
      return;
    }

    const content = parseContentFromBody(req.body);
    await mimicMappingService.updateMappingContent(id, content);

    res.status(200).json({
      success: true,
      id,
      contentLength: content.length,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Mapping not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(400).json({
      error: 'Failed to update content',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function deleteMapping(req: Request<{ id: string }>, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = await mimicMappingService.deleteMapping(id);

    if (!deleted) {
      res.status(404).json({ error: 'Mapping not found' });
      return;
    }

    res.status(200).json({
      success: true,
      id,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to delete mapping',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
