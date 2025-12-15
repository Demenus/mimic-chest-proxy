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
  <div class="editor-section">
    <q-card flat bordered class="editor-card">
      <q-card-section class="editor-header">
        <div class="row items-center q-gutter-sm">
          <div class="col">
            <div class="text-h6">Content Editor</div>
            <div class="text-caption text-grey">
              {{ url || 'No URL' }}
            </div>
          </div>
          <q-select
            :model-value="language"
            :options="languageOptions"
            label="Language"
            dense
            outlined
            style="min-width: 150px"
            @update:model-value="(val) => $emit('update:language', val)"
          />
          <q-btn
            color="primary"
            icon="save"
            label="Save"
            @click="$emit('save')"
            :loading="isSaving"
            :disable="!hasContent"
          />
        </div>
      </q-card-section>
      <q-card-section class="editor-container">
        <CodeEditor
          :model-value="content"
          :language="language"
          @update:model-value="(val) => $emit('update:content', val)"
          @change="(val) => $emit('change', val)"
        />
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import CodeEditor from 'components/CodeEditor.vue';

export interface Props {
  url?: string;
  content: string;
  language: string;
  isSaving?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  url: '',
  content: '',
  language: 'javascript',
  isSaving: false,
});

const languageOptions = ['javascript', 'typescript', 'json', 'html', 'css', 'plaintext'];

const hasContent = computed(() => {
  return props.content.trim().length > 0;
});

defineEmits<{
  'update:content': [value: string];
  'update:language': [value: string];
  change: [value: string];
  save: [];
}>();
</script>

<style scoped>
.editor-section {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.editor-header {
  flex-shrink: 0;
}

.editor-container {
  padding: 0;
  flex: 1;
  min-height: 0;
  position: relative;
  display: flex;
  flex-direction: column;
}
</style>
