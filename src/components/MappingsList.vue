<template>
  <div class="mappings-section">
    <div class="section-description">
      Click on a mapping to edit its content.
    </div>
    <q-list v-if="mappings.length > 0" bordered separator class="mappings-list">
      <q-item
        v-for="mapping in mappings"
        :key="mapping.id"
        clickable
        v-ripple
        @click="$emit('select', mapping.id)"
        :active="selectedId === mapping.id"
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
            {{ mapping.hasContent ? 'With content' : 'No content' }}
          </q-chip>
        </q-item-section>
      </q-item>
    </q-list>
    <div v-else class="empty-state">
      <div class="text-body2 text-grey-6">
        No mappings registered yet. Add a URL or regex pattern above to get started.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface Mapping {
  id: string;
  url?: string;
  regexUrl?: string;
  hasContent: boolean;
  contentLength: number;
}

export interface Props {
  mappings: Mapping[];
  selectedId?: string | null;
}

defineProps<Props>();

defineEmits<{
  select: [id: string];
}>();
</script>

<style scoped>
.mappings-section {
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

.mappings-list {
  border-radius: 4px;
}

.empty-state {
  padding: 1.5rem;
  text-align: center;
}
</style>

