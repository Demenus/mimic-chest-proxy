<template>
  <q-page class="main-page">
    <div class="content-container">
      <!-- URL Input Section -->
      <UrlInputSection
        v-model="urlInput"
        v-model:input-mode="inputMode"
        :is-submitting="mimicStore.isSubmitting"
        @submit="handleSubmitUrl"
      />

      <!-- Mappings List -->
      <MappingsList
        :mappings="mimicStore.mappings"
        :selected-id="mimicStore.selectedMappingId"
        @select="handleSelectMapping"
        @delete="handleDeleteMapping"
      />

      <!-- Editor Section -->
      <ContentEditorSection
        v-if="mimicStore.selectedMappingId"
        :url="mimicStore.selectedMappingUrl"
        v-model:content="editorContent"
        v-model:language="editorLanguage"
        :is-saving="mimicStore.isSaving"
        @change="handleContentChange"
        @save="handleSaveContent"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useMimicStore } from 'stores/mimic-store';
import UrlInputSection from 'components/UrlInputSection.vue';
import MappingsList from 'components/MappingsList.vue';
import ContentEditorSection from 'components/ContentEditorSection.vue';

const $q = useQuasar();
const mimicStore = useMimicStore();
const urlInput = ref('');
const inputMode = ref<'url' | 'regex'>('url');

// Computed properties for v-model binding with store
const editorContent = computed({
  get: () => mimicStore.editorContent,
  set: (value: string) => mimicStore.updateEditorContent(value),
});

const editorLanguage = computed({
  get: () => mimicStore.editorLanguage,
  set: (value: string) => mimicStore.updateEditorLanguage(value),
});

onMounted(async () => {
  await mimicStore.initialize();
});

async function handleSelectMapping(id: string) {
  try {
    await mimicStore.selectMapping(id);
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: `Failed to load mapping: ${error instanceof Error ? error.message : String(error)}`,
      position: 'top',
    });
  }
}

function handleContentChange(value: string) {
  mimicStore.updateEditorContent(value);
}

async function handleSaveContent() {
  try {
    await mimicStore.saveContent();
    $q.notify({
      type: 'positive',
      message: 'Content saved successfully',
      position: 'top',
      timeout: 3000,
    });
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: `Failed to save content: ${error instanceof Error ? error.message : String(error)}`,
      position: 'top',
      timeout: 5000,
    });
  }
}

async function handleSubmitUrl() {
  if (!urlInput.value.trim()) {
    return;
  }

  if (!mimicStore.isElectron) {
    $q.notify({
      type: 'negative',
      message: 'This feature is only available in Electron',
      position: 'top',
    });
    return;
  }

  try {
    const payload =
      inputMode.value === 'url'
        ? { url: urlInput.value.trim() }
        : { regexUrl: urlInput.value.trim() };

    await mimicStore.createMapping(payload);

    $q.notify({
      type: 'positive',
      message: `Successfully registered ${inputMode.value === 'url' ? 'URL' : 'regex pattern'}!`,
      position: 'top',
      timeout: 3000,
    });

    // Clear input after successful submission
    urlInput.value = '';
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: `Failed to register ${inputMode.value === 'url' ? 'URL' : 'regex'}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      position: 'top',
      timeout: 5000,
    });
  }
}

function handleDeleteMapping(id: string) {
  if (!mimicStore.isElectron) {
    $q.notify({
      type: 'negative',
      message: 'This feature is only available in Electron',
      position: 'top',
    });
    return;
  }

  // Confirm deletion
  $q.dialog({
    title: 'Confirm deletion',
    message: 'Are you sure you want to delete this mapping? This action cannot be undone.',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void (async () => {
      try {
        await mimicStore.deleteMapping(id);
        $q.notify({
          type: 'positive',
          message: 'Mapping deleted successfully',
          position: 'top',
          timeout: 3000,
        });
      } catch (error) {
        $q.notify({
          type: 'negative',
          message: `Failed to delete mapping: ${error instanceof Error ? error.message : String(error)}`,
          position: 'top',
          timeout: 5000,
        });
      }
    })();
  });
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
