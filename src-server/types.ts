// Types and interfaces for the mimic proxy server

export interface MimicMapping {
  id: string;
  url?: string;
  regex?: RegExp;
  regexPattern?: string; // Store the original regex pattern string
  content?: Buffer;
}

export interface CreateMappingRequest {
  url?: string;
  regexUrl?: string;
}

export interface CreateMappingResponse {
  id: string;
  url?: string;
  regexUrl?: string;
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

