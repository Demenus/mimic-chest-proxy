<template>
  <q-page class="main-page">
    <div class="content-container">
      <q-img src="/mimic-chest.png" alt="Mimic Chest" class="mimic-chest-image" />

      <div class="url-input-section">
        <q-input
          v-model="urlInput"
          :label="inputMode === 'url' ? 'URL' : 'Regex Pattern'"
          filled
          class="url-input"
          @keyup.enter="handleSubmitUrl"
        >
          <template v-slot:prepend>
            <q-btn-toggle
              v-model="inputMode"
              toggle-color="primary"
              :options="[
                { label: 'URL', value: 'url' },
                { label: 'Regex', value: 'regex' },
              ]"
              class="mode-toggle"
            />
          </template>
          <template v-slot:append>
            <q-btn
              round
              dense
              flat
              icon="send"
              color="primary"
              @click="handleSubmitUrl"
              :loading="isSubmitting"
              :disable="!urlInput.trim()"
            />
          </template>
        </q-input>
      </div>

      <!-- Mappings List -->
      <div v-if="mappings.length > 0" class="mappings-section">
        <q-list bordered separator class="mappings-list">
          <q-item
            v-for="mapping in mappings"
            :key="mapping.id"
            clickable
            v-ripple
            @click="selectMapping(mapping.id)"
            :active="selectedMappingId === mapping.id"
          >
            <q-item-section>
              <q-item-label>{{ mapping.url || mapping.regexUrl || 'No URL' }}</q-item-label>
              <q-item-label caption>ID: {{ mapping.id }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-chip
                :color="mapping.hasContent ? 'positive' : 'grey'"
                text-color="white"
                size="sm"
              >
                {{ mapping.hasContent ? 'Con contenido' : 'Sin contenido' }}
              </q-chip>
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <!-- Editor Section -->
      <div v-if="selectedMappingId" class="editor-section">
        <q-card>
          <q-card-section>
            <div class="row items-center q-gutter-sm">
              <div class="col">
                <div class="text-h6">Editor de Contenido</div>
                <div class="text-caption text-grey">
                  {{ selectedMapping?.url || selectedMapping?.regexUrl || 'Sin URL' }}
                </div>
              </div>
              <q-select
                v-model="editorLanguage"
                :options="languageOptions"
                label="Lenguaje"
                dense
                outlined
                style="min-width: 150px"
              />
              <q-btn
                color="primary"
                icon="save"
                label="Guardar"
                @click="saveContent"
                :loading="isSaving"
                :disable="!selectedMappingId"
              />
            </div>
          </q-card-section>
          <q-card-section class="editor-container">
            <CodeEditor
              v-model="editorContent"
              :language="editorLanguage"
              :height="'400px'"
              @change="handleContentChange"
            />
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { api, configureMimicApi } from 'boot/axios';
import CodeEditor from 'components/CodeEditor.vue';

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

const languageOptions = ['javascript', 'typescript', 'json', 'html', 'css', 'plaintext'];

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
    mappings.value = response.data;
  } catch (error) {
    console.error('Failed to load mappings:', error);
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
      message: 'Contenido guardado exitosamente',
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

    const response = await api.post<{ id: string }>('/api/mimic/url', payload);

    $q.notify({
      type: 'positive',
      message: `Successfully registered ${inputMode.value === 'url' ? 'URL' : 'regex pattern'}!`,
      position: 'top',
      timeout: 3000,
    });

    // Clear input after successful submission
    urlInput.value = '';

    // Reload mappings and select the new one
    await loadMappings();
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

.mimic-chest-image {
  max-width: 120px;
  width: 120px;
  height: auto;
}

.url-input-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.url-input {
  width: 100%;
}

.mode-toggle {
  margin-right: 8px;
}

:deep(.q-field__prepend) {
  padding-right: 8px;
}

.mappings-section {
  width: 100%;
}

.mappings-list {
  border-radius: 4px;
}

.editor-section {
  width: 100%;
}

.editor-container {
  padding: 0;
  min-height: 400px;
  position: relative;
}
</style>
