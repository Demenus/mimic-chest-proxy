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

import { defineStore, acceptHMRUpdate } from 'pinia';
import { api, configureMimicApi } from 'boot/axios';

export interface Mapping {
  id: string;
  pattern?: string;
  regexPattern?: string;
  hasContent: boolean;
  contentLength: number;
}

export interface MappingWithContent extends Mapping {
  content: string;
}

interface CreateMappingPayload {
  pattern?: string;
  regexPattern?: string;
}

export const useMimicStore = defineStore('mimic', {
  state: () => ({
    mappings: [] as Mapping[],
    selectedMappingId: null as string | null,
    selectedMapping: null as MappingWithContent | null,
    editorContent: '',
    editorLanguage: 'javascript',
    isElectron: false,
    isLoading: false,
    isSaving: false,
    isSubmitting: false,
  }),

  getters: {
    selectedMappingUrl: (state) => {
      if (!state.selectedMapping) return '';
      return state.selectedMapping.pattern || state.selectedMapping.regexPattern || '';
    },
  },

  actions: {
    async initialize() {
      // Check if we're running in Electron
      this.isElectron = typeof window !== 'undefined' && 'electronAPI' in window;

      // Configure API baseURL if in Electron
      if (this.isElectron) {
        await configureMimicApi();
        await this.loadMappings();
      }
    },

    async loadMappings() {
      this.isLoading = true;
      try {
        const response = await api.get<Mapping[]>('/api/mimic');
        this.mappings = response.data || [];
      } catch (error) {
        console.error('Failed to load mappings:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async selectMapping(id: string) {
      this.selectedMappingId = id;
      this.isSaving = true;

      try {
        const response = await api.get<MappingWithContent>(`/api/mimic/${id}`);
        this.selectedMapping = response.data;
        this.editorContent = response.data.content || '';

        // Auto-detect language from content
        if (response.data.content) {
          const trimmed = response.data.content.trim();
          if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            this.editorLanguage = 'json';
          } else if (trimmed.startsWith('<')) {
            this.editorLanguage = 'html';
          } else {
            this.editorLanguage = 'javascript';
          }
        }
      } catch (error) {
        console.error('Failed to load mapping:', error);
        throw error;
      } finally {
        this.isSaving = false;
      }
    },

    async createMapping(payload: CreateMappingPayload) {
      this.isSubmitting = true;
      try {
        const response = await api.post<{ id: string }>('/api/mimic/url', payload);

        // Reload mappings and select the new one
        await this.loadMappings();

        if (response.data.id) {
          await this.selectMapping(response.data.id);
        }

        return response.data;
      } catch (error) {
        console.error('Failed to create mapping:', error);
        throw error;
      } finally {
        this.isSubmitting = false;
      }
    },

    async saveContent() {
      if (!this.selectedMappingId) {
        throw new Error('No mapping selected');
      }

      this.isSaving = true;

      try {
        await api.post(`/api/mimic/${this.selectedMappingId}`, this.editorContent, {
          headers: {
            'Content-Type': 'text/plain',
          },
        });

        // Reload mappings to update the hasContent flag
        await this.loadMappings();
      } catch (error) {
        console.error('Failed to save content:', error);
        throw error;
      } finally {
        this.isSaving = false;
      }
    },

    async deleteMapping(id: string) {
      try {
        await api.delete(`/api/mimic/${id}`);

        // If the deleted mapping was selected, clear the selection
        if (this.selectedMappingId === id) {
          this.selectedMappingId = null;
          this.selectedMapping = null;
          this.editorContent = '';
        }

        // Reload mappings
        await this.loadMappings();
      } catch (error) {
        console.error('Failed to delete mapping:', error);
        throw error;
      }
    },

    updateEditorContent(content: string) {
      this.editorContent = content;
    },

    updateEditorLanguage(language: string) {
      this.editorLanguage = language;
    },

    clearSelection() {
      this.selectedMappingId = null;
      this.selectedMapping = null;
      this.editorContent = '';
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useMimicStore, import.meta.hot));
}

