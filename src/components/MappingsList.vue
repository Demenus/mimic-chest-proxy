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
  <div class="mappings-section">
    <q-list bordered separator class="mappings-list">
      <q-item
        v-for="mapping in mappings"
        :key="mapping.id"
        clickable
        v-ripple
        @click="$emit('select', mapping.id)"
        :active="selectedId === mapping.id"
      >
        <q-item-section>
          <q-item-label>{{ mapping.url || mapping.regexUrl || 'No URL' }}</q-item-label>
          <q-item-label caption>ID: {{ mapping.id }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <div class="row items-center q-gutter-sm">
            <q-chip :color="mapping.hasContent ? 'positive' : 'grey'" text-color="white" size="sm">
              {{ mapping.hasContent ? 'With content' : 'No content' }}
            </q-chip>
            <q-btn
              flat
              round
              dense
              icon="delete"
              color="negative"
              size="sm"
              @click.stop="$emit('delete', mapping.id)"
            >
              <q-tooltip>Delete mapping</q-tooltip>
            </q-btn>
          </div>
        </q-item-section>
      </q-item>
    </q-list>
  </div>
</template>

<script setup lang="ts">
export interface Mapping {
  id: string;
  url?: string;
  regexUrl?: string;
  hasContent: boolean;
  contentLength: number;
}

export interface Props {
  mappings: Mapping[];
  selectedId?: string | null;
}

defineProps<Props>();

defineEmits<{
  select: [id: string];
  delete: [id: string];
}>();
</script>

<style scoped>
.mappings-section {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.87);
}

.section-description {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 0.25rem;
}

.mappings-list {
  border-radius: 4px;
  flex: 1;
  overflow-y: auto;
}
</style>
