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
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { api, configureMimicApi } from 'boot/axios';

const $q = useQuasar();
const isElectron = ref(false);
const urlInput = ref('');
const inputMode = ref<'url' | 'regex'>('url');
const isSubmitting = ref(false);

onMounted(async () => {
  // Check if we're running in Electron
  isElectron.value = typeof window !== 'undefined' && 'electronAPI' in window;

  // Configure API baseURL if in Electron
  if (isElectron.value) {
    await configureMimicApi();
  }
});

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

    await api.post('/api/mimic/url', payload);

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
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<style scoped>
.main-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 50px);
  padding: 2rem;
}

.content-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 600px;
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
</style>
