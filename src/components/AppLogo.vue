<template>
  <div class="logo-container">
    <q-img src="/mimic-chest.png" alt="Mimic Chest" class="logo-image" />
    <div class="logo-text">
      <div class="logo-title">Mimic Chest Proxy</div>
    </div>
  </div>
</template>

<script setup lang="ts">
// AppLogo component for navbar
</script>

<style scoped>
.logo-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-image {
  width: 32px;
  height: 32px;
}

.logo-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
}

@media (max-width: 600px) {
  .logo-text {
    display: none;
  }
}
</style>

