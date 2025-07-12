<template>
  <q-page class="flex column items-center justify-start q-pa-md">
    <q-img src="/mimic-chest.png" alt="Mimic Chest" class="mimic-chest-image" />

    <q-btn
      v-if="isElectron"
      color="primary"
      size="lg"
      label="Launch Mimic Chrome"
      icon="launch"
      :loading="isLaunching"
      @click="handleLaunchChrome"
      class="q-mt-lg"
    />
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const isLaunching = ref(false);
const isElectron = ref(false);

onMounted(() => {
  // Check if we're running in Electron
  isElectron.value = typeof window !== 'undefined' && 'electronAPI' in window;
});

async function handleLaunchChrome() {
  if (!isElectron.value || !window.electronAPI) {
    $q.notify({
      type: 'negative',
      message: 'This feature is only available in Electron',
      position: 'top',
    });
    return;
  }

  isLaunching.value = true;

  try {
    const result = await window.electronAPI.launchMimicChrome();

    if (result.success) {
      $q.notify({
        type: 'positive',
        message: 'Chrome launched successfully with Mimic proxy!',
        position: 'top',
        timeout: 3000,
      });
    } else {
      $q.notify({
        type: 'negative',
        message: result.error || 'Failed to launch Chrome',
        position: 'top',
        timeout: 5000,
      });
    }
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: `Error launching Chrome: ${error instanceof Error ? error.message : String(error)}`,
      position: 'top',
      timeout: 5000,
    });
  } finally {
    isLaunching.value = false;
  }
}
</script>

<style scoped>
.mimic-chest-image {
  max-width: 100%;
  height: auto;
  margin-top: 2rem;
}
</style>
