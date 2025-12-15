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
  <div class="url-input-section">
    <div class="section-description">
      Register a glob pattern or regex pattern to intercept and modify its content
    </div>
    <q-input
      :model-value="modelValue"
      :label="inputMode === 'url' ? 'Glob Pattern' : 'Regex Pattern'"
      filled
      class="url-input"
      @update:model-value="handleValueUpdate"
      @keydown.enter.prevent="handleSubmit"
    >
      <template v-slot:prepend>
        <q-btn-toggle
          :model-value="inputMode"
          toggle-color="primary"
          :options="[
            { label: 'Glob', value: 'url' },
            { label: 'Regex', value: 'regex' },
          ]"
          class="mode-toggle"
          @update:model-value="(val) => $emit('update:inputMode', val)"
        />
      </template>
      <template v-slot:append>
        <q-btn
          round
          dense
          flat
          icon="send"
          color="primary"
          @click="handleSubmit"
          :loading="isSubmitting"
          :disable="!modelValue?.trim()"
        />
      </template>
    </q-input>
  </div>
</template>

<script setup lang="ts">
export interface Props {
  modelValue: string;
  inputMode: 'url' | 'regex';
  isSubmitting?: boolean;
}

withDefaults(defineProps<Props>(), {
  isSubmitting: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'update:inputMode': [value: 'url' | 'regex'];
  submit: [];
}>();

function handleValueUpdate(val: string | number | null) {
  emit('update:modelValue', val == null ? '' : String(val));
}

function handleSubmit() {
  emit('submit');
}
</script>

<style scoped>
.url-input-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.87);
}

.section-description {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 0.25rem;
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
