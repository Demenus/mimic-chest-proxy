<template>
  <q-page class="main-page">
    <div class="content-container">
      <!-- URL Input Section -->
      <UrlInputSection
        v-model="urlInput"
        v-model:input-mode="inputMode"
        :is-submitting="isSubmitting"
        @submit="handleSubmitUrl"
      />

      <!-- Mappings List -->
      <MappingsList :mappings="mappings" :selected-id="selectedMappingId" @select="selectMapping" />

      <!-- Editor Section -->
      <ContentEditorSection
        v-if="selectedMappingId"
        :url="selectedMapping?.url || selectedMapping?.regexUrl || ''"
        v-model:content="editorContent"
        v-model:language="editorLanguage"
        :is-saving="isSaving"
        @change="handleContentChange"
        @save="saveContent"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { api, configureMimicApi } from 'boot/axios';
import UrlInputSection from 'components/UrlInputSection.vue';
import MappingsList from 'components/MappingsList.vue';
import ContentEditorSection from 'components/ContentEditorSection.vue';

interface Mapping {
  id: string;
  url?: string;
  regexUrl?: string;
  hasContent: boolean;
  contentLength: number;
}

interface MappingWithContent extends Mapping {
  content: string;
}

const $q = useQuasar();
const isElectron = ref(false);
const urlInput = ref('');
const inputMode = ref<'url' | 'regex'>('url');
const isSubmitting = ref(false);
const mappings = ref<Mapping[]>([]);
const selectedMappingId = ref<string | null>(null);
const selectedMapping = ref<MappingWithContent | null>(null);
const editorContent = ref('');
const editorLanguage = ref('javascript');
const isSaving = ref(false);

onMounted(async () => {
  // Check if we're running in Electron
  isElectron.value = typeof window !== 'undefined' && 'electronAPI' in window;

  // Configure API baseURL if in Electron
  if (isElectron.value) {
    await configureMimicApi();
    await loadMappings();
  }
});

async function loadMappings() {
  try {
    const response = await api.get<Mapping[]>('/api/mimic');
    console.log('Loaded mappings:', response.data);
    mappings.value = response.data || [];
  } catch (error) {
    console.error('Failed to load mappings:', error);
    $q.notify({
      type: 'negative',
      message: `Failed to load mappings: ${error instanceof Error ? error.message : String(error)}`,
      position: 'top',
      timeout: 5000,
    });
  }
}

async function selectMapping(id: string) {
  selectedMappingId.value = id;
  isSaving.value = true;

  try {
    const response = await api.get<MappingWithContent>(`/api/mimic/${id}`);
    selectedMapping.value = response.data;
    editorContent.value = response.data.content || '';

    // Auto-detect language from content
    if (response.data.content) {
      const trimmed = response.data.content.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        editorLanguage.value = 'json';
      } else if (trimmed.startsWith('<')) {
        editorLanguage.value = 'html';
      } else {
        editorLanguage.value = 'javascript';
      }
    }
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: `Failed to load mapping: ${error instanceof Error ? error.message : String(error)}`,
      position: 'top',
    });
  } finally {
    isSaving.value = false;
  }
}

function handleContentChange(value: string) {
  editorContent.value = value;
}

async function saveContent() {
  if (!selectedMappingId.value) {
    return;
  }

  isSaving.value = true;

  try {
    await api.post(`/api/mimic/${selectedMappingId.value}`, editorContent.value, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });

    $q.notify({
      type: 'positive',
      message: 'Content saved successfully',
      position: 'top',
      timeout: 3000,
    });

    await loadMappings();
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: `Failed to save content: ${error instanceof Error ? error.message : String(error)}`,
      position: 'top',
      timeout: 5000,
    });
  } finally {
    isSaving.value = false;
  }
}

async function handleSubmitUrl() {
  if (!urlInput.value.trim()) {
    return;
  }

  if (!isElectron.value) {
    $q.notify({
      type: 'negative',
      message: 'This feature is only available in Electron',
      position: 'top',
    });
    return;
  }

  isSubmitting.value = true;

  try {
    const payload =
      inputMode.value === 'url'
        ? { url: urlInput.value.trim() }
        : { regexUrl: urlInput.value.trim() };

    console.log('Submitting URL/regex:', payload);
    const response = await api.post<{ id: string }>('/api/mimic/url', payload);
    console.log('Response from server:', response.data);

    $q.notify({
      type: 'positive',
      message: `Successfully registered ${inputMode.value === 'url' ? 'URL' : 'regex pattern'}!`,
      position: 'top',
      timeout: 3000,
    });

    // Clear input after successful submission
    urlInput.value = '';

    // Reload mappings and select the new one
    console.log('Reloading mappings...');
    await loadMappings();
    console.log('Mappings after reload:', mappings.value);

    if (response.data.id) {
      await selectMapping(response.data.id);
    }
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: `Failed to register ${inputMode.value === 'url' ? 'URL' : 'regex'}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      position: 'top',
      timeout: 5000,
    });
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<style scoped>
.main-page {
  padding: 2rem;
  min-height: 100vh;
  background: linear-gradient(135deg, #cd853f 0%, #a0522d 100%);
}

.content-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  gap: 2rem;
}
</style>
