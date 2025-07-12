<template>
  <div class="editor-section">
    <q-card flat bordered>
      <q-card-section>
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
          :height="'400px'"
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
}

.editor-container {
  padding: 0;
  min-height: 400px;
  position: relative;
}
</style>
