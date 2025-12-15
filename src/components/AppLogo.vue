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

