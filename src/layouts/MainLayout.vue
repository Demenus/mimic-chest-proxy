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
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="navbar-dark">
      <q-toolbar>
        <AppLogo />
        <q-space />
        <q-btn
          v-if="isElectron"
          color="primary"
          unelevated
          label="Launch Chrome"
          icon="launch"
          :loading="isLaunching"
          @click="handleLaunchChrome"
          class="chrome-button"
        />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import AppLogo from 'components/AppLogo.vue';

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
.navbar-dark {
  background-color: #8b4513 !important; /* Darker brick/terracotta for navbar */
}

.chrome-button {
  margin-right: 8px;
}
</style>
