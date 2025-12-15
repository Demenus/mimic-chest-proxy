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

// Types and interfaces for the mimic proxy server

export interface CreateMappingRequest {
  pattern?: string;
  regexPattern?: string;
}

export interface CreateMappingResponse {
  id: string;
  pattern?: string;
  regexPattern?: string;
}

export interface UpdateContentResponse {
  success: boolean;
  id: string;
  contentLength: number;
}

export interface ErrorResponse {
  error: string;
  details?: string;
}

// Extend Express Request to include originalTargetUrl for proxy requests
declare module 'express-serve-static-core' {
  interface Request {
    originalTargetUrl?: string;
  }
}

