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
  <div class="code-editor-container" :style="{ height: height }">
    <MonacoEditor
      :value="modelValue"
      :language="language"
      :theme="theme"
      :options="editorOptions"
      class="monaco-editor"
      @update:value="handleUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import MonacoEditor from 'monaco-editor-vue3';

export interface Props {
  modelValue: string;
  language?: string;
  theme?: string;
  height?: string;
}

withDefaults(defineProps<Props>(), {
  language: 'javascript',
  theme: 'vs-dark',
  height: '500px',
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  change: [value: string];
}>();

const editorOptions = {
  minimap: { enabled: false },
  fontSize: 14,
  lineNumbers: 'on' as const,
  roundedSelection: false,
  scrollBeyondLastLine: false,
  readOnly: false,
  automaticLayout: true,
  tabSize: 2,
  wordWrap: 'on' as const,
};

function handleUpdate(value: string) {
  emit('update:modelValue', value);
  emit('change', value);
}
</script>

<style scoped>
.code-editor-container {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

.monaco-editor {
  width: 100%;
  flex: 1;
  min-height: 400px;
}
</style>
