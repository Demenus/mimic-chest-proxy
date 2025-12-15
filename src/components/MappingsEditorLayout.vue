<!--
  - Copyright (c) 2025 Aarón Negrín
  -
  - This program is free software: you can redistribute it and/or modify
  - it under the terms of the GNU General Public License as published by
  - the Free Software Foundation, either version 3 of the License, or
  - (at your option) any later version.
  -
  - This program is distributed in the hope that it will be useful,
  - but WITHOUT ANY WARRANTY; without even the implied warranty of
  - MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  - GNU General Public License for more details.
  -
  - You should have received a copy of the GNU General Public License
  - along with this program.  If not, see <https://www.gnu.org/licenses/>.
  -->

<template>
  <div class="mappings-editor-layout">
    <!-- Empty State -->
    <div v-if="mappings.length === 0" class="empty-state-container">
      <q-card flat bordered class="empty-state-card">
        <q-card-section class="empty-state-content">
          <div class="empty-state-title">No mappings registered yet</div>
          <div class="empty-state-message">Add a URL or regex pattern above to get started.</div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Mappings List and Editor -->
    <template v-else>
      <!-- Mappings List -->
      <div class="mappings-list-container">
        <MappingsList
          :mappings="mappings"
          :selected-id="normalizedSelectedId"
          @select="$emit('select', $event)"
          @delete="$emit('delete', $event)"
        />
      </div>

      <!-- Editor Section -->
      <div class="editor-container">
        <ContentEditorSection
          v-if="selectedId"
          :url="normalizedSelectedUrl"
          :content="content"
          :language="language"
          :is-saving="isSaving"
          @update:content="$emit('update:content', $event)"
          @update:language="$emit('update:language', $event)"
          @change="$emit('change', $event)"
          @save="$emit('save')"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import MappingsList, { type Mapping } from 'components/MappingsList.vue';
import ContentEditorSection from 'components/ContentEditorSection.vue';

export interface Props {
  mappings: Mapping[];
  selectedId?: string | null;
  selectedUrl?: string;
  content: string;
  language: string;
  isSaving?: boolean;
}

const props = defineProps<Props>();

// Normalize selectedId to match MappingsList expected type (string | null, not undefined)
const normalizedSelectedId = computed<string | null>(() => {
  return props.selectedId ?? null;
});

// Normalize selectedUrl to match ContentEditorSection expected type (string, not undefined)
const normalizedSelectedUrl = computed<string>(() => {
  return props.selectedUrl ?? '';
});

defineEmits<{
  select: [id: string];
  delete: [id: string];
  'update:content': [value: string];
  'update:language': [value: string];
  change: [value: string];
  save: [];
}>();
</script>

<style scoped>
.mappings-editor-layout {
  display: flex;
  flex-direction: row;
  gap: 2rem;
  flex: 1;
  min-height: 0;
}

.empty-state-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.empty-state-card {
  width: 100%;
  max-width: 600px;
  background-color: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
}

.empty-state-content {
  text-align: center;
  padding: 3rem 2rem;
}

.empty-state-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 1rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.empty-state-message {
  font-size: 1.125rem;
  color: #f5f5f5;
  line-height: 1.6;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.mappings-list-container {
  flex: 0 0 33.333%;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.editor-container {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
</style>
