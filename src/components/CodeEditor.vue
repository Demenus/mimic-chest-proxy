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
