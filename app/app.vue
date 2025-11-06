
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { useThemeStore } from '~/stores/useThemeStore'
import { onMounted } from 'vue'
const themeStore = useThemeStore()
onMounted(() => {
  themeStore.init()
})
</script>
