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
  <q-header elevated class="navbar-dark">
    <q-toolbar>
      <AppLogo />
      <q-space />
      <q-btn
        v-if="isElectron"
        color="primary"
        unelevated
        label="Chrome"
        icon="fa-brands fa-chrome"
        :loading="isLaunchingChrome"
        @click="handleLaunchChrome"
        class="launch-button"
      />
      <q-btn
        v-if="isElectron"
        color="primary"
        unelevated
        label="Safari"
        icon="fa-brands fa-safari"
        :loading="isLaunchingSafari"
        @click="handleLaunchSafari"
        class="launch-button"
      />
      <q-btn
        v-if="isElectron"
        flat
        dense
        label="Restore proxy"
        icon="link_off"
        @click="handleRestoreProxy"
        class="restore-proxy-button"
      />
    </q-toolbar>
  </q-header>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import AppLogo from 'components/AppLogo.vue';

const $q = useQuasar();
const isLaunchingChrome = ref(false);
const isLaunchingSafari = ref(false);
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

  isLaunchingChrome.value = true;

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
    isLaunchingChrome.value = false;
  }
}

async function handleLaunchSafari() {
  if (!isElectron.value || !window.electronAPI) {
    $q.notify({
      type: 'negative',
      message: 'This feature is only available in Electron',
      position: 'top',
    });
    return;
  }

  isLaunchingSafari.value = true;

  try {
    const result = await window.electronAPI.launchMimicSafari();

    if (result.success) {
      $q.notify({
        type: 'positive',
        message: 'Safari launched with Mimic proxy. System proxy was set; it will be restored when you quit the app.',
        position: 'top',
        timeout: 4000,
      });
    } else {
      $q.notify({
        type: 'negative',
        message: result.error || 'Failed to launch Safari',
        position: 'top',
        timeout: 5000,
      });
    }
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: `Error launching Safari: ${error instanceof Error ? error.message : String(error)}`,
      position: 'top',
      timeout: 5000,
    });
  } finally {
    isLaunchingSafari.value = false;
  }
}

async function handleRestoreProxy() {
  if (!isElectron.value || !window.electronAPI?.restoreSystemProxy) return;
  try {
    await window.electronAPI.restoreSystemProxy();
    $q.notify({
      type: 'positive',
      message: 'System proxy restored. Other browsers should work again.',
      position: 'top',
      timeout: 3000,
    });
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Could not restore proxy',
      position: 'top',
    });
  }
}
</script>

<style scoped>
.navbar-dark {
  background-color: #8b4513 !important; /* Darker brick/terracotta for navbar */
}

.launch-button {
  margin-right: 8px;
}

.restore-proxy-button {
  margin-left: 4px;
}
</style>
