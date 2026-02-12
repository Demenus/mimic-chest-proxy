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
    <div class="mode-selector-row">
      <q-tabs
        :model-value="mode"
        dense
        align="left"
        class="mode-tabs"
        @update:model-value="(val: EditorMode) => $emit('update:mode', val)"
      >
        <q-tab name="content" label="Edit content" />
        <q-tab name="substitution" label="Substitute with URL" />
      </q-tabs>
    </div>
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
            v-if="mode === 'content'"
            :model-value="language"
            :options="languageOptions"
            label="Language"
            dense
            outlined
            style="min-width: 150px"
            @update:model-value="(val) => $emit('update:language', val)"
          />
          <q-btn
            v-if="mode === 'content'"
            color="primary"
            icon="save"
            label="Save"
            @click="$emit('save')"
            :loading="isSaving"
            :disable="!hasContent"
          />
          <q-btn
            v-if="mode === 'substitution'"
            color="primary"
            icon="save"
            label="Save"
            @click="$emit('saveSubstitution')"
            :loading="isSaving"
            :disable="!hasSubstitutionUrl"
          />
        </div>
      </q-card-section>

      <!-- Edit content mode: Load from URL + code editor -->
      <template v-if="mode === 'content'">
        <q-card-section class="load-from-url-section">
          <div class="row items-center q-gutter-sm">
            <q-input
              v-model="loadFromUrl"
              label="Load from URL"
              filled
              dense
              class="col"
              placeholder="https://example.com/path"
              @keydown.enter.prevent="handleLoadFromUrl"
            />
            <q-btn
              color="secondary"
              icon="download"
              label="Load"
              :loading="isLoadingFromUrl"
              :disable="!loadFromUrl.trim()"
              @click="handleLoadFromUrl"
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
      </template>

      <!-- Substitute with URL mode -->
      <q-card-section v-else class="substitution-section">
        <q-input
          :model-value="substitutionUrl"
          label="Substitution URL"
          filled
          dense
          placeholder="https://example.com/replacement"
          @update:model-value="(val: string | number | null) => $emit('update:substitutionUrl', val != null ? String(val) : '')"
        />
        <div class="text-caption text-grey q-mt-sm">
          When the glob pattern matches, the proxy will fetch this URL and serve its response body instead (no redirect).
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQuasar } from 'quasar';
import CodeEditor from 'components/CodeEditor.vue';
import { api } from 'boot/axios';

import type { EditorMode } from 'stores/mimic-store';

export interface Props {
  url?: string;
  content: string;
  language: string;
  mode: EditorMode;
  substitutionUrl: string;
  isSaving?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  url: '',
  content: '',
  language: 'javascript',
  mode: 'content',
  substitutionUrl: '',
  isSaving: false,
});

const $q = useQuasar();
const emit = defineEmits<{
  'update:content': [value: string];
  'update:language': [value: string];
  'update:mode': [value: EditorMode];
  'update:substitutionUrl': [value: string];
  change: [value: string];
  save: [];
  saveSubstitution: [];
}>();

const loadFromUrl = ref('');
const isLoadingFromUrl = ref(false);

const languageOptions = ['javascript', 'typescript', 'json', 'html', 'css', 'plaintext'];

const hasContent = computed(() => {
  return props.content.trim().length > 0;
});

const hasSubstitutionUrl = computed(() => {
  return props.substitutionUrl.trim().length > 0;
});

async function handleLoadFromUrl() {
  const url = loadFromUrl.value.trim();
  if (!url) return;

  isLoadingFromUrl.value = true;
  try {
    const { data } = await api.post<{ content: string }>('/api/mimic/fetch-url', { url });
    emit('update:content', data.content);
    emit('change', data.content);
    $q.notify({
      type: 'positive',
      message: 'Content loaded from URL',
      position: 'top',
      timeout: 2000,
    });
  } catch (error: unknown) {
    const message =
      error && typeof error === 'object' && 'response' in error
        ? String((error as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Failed to load URL')
        : 'Failed to load URL';
    $q.notify({
      type: 'negative',
      message,
      position: 'top',
      timeout: 5000,
    });
  } finally {
    isLoadingFromUrl.value = false;
  }
}
</script>

<style scoped>
.editor-section {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.mode-selector-row {
  flex-shrink: 0;
  margin-bottom: 0.5rem;
}

.mode-tabs {
  min-height: 36px;
}

.editor-card {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.editor-header {
  flex-shrink: 0;
}

.load-from-url-section {
  flex-shrink: 0;
  padding-top: 0;
}

.substitution-section {
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
