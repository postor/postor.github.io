<template>
  <ClientOnly>
    <LazyGame :cfg="'/learn-game' + cfg"></LazyGame>
  </ClientOnly>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'clean'
})

import { ref, onMounted } from 'vue'

// Fallback value used during SSR and when no search param provided
const cfg = ref('/02-zhanguoce/01-qin/01-shangyang/')

// Read `cfg` from the URL search params on the client and update `cfg`.
onMounted(() => {
  try {
    const params = new URLSearchParams(window.location.search)
    const v = params.get('cfg')
    if (v) cfg.value = v
  } catch (e) {
    // ignore if URL parsing fails
  }
})
</script>

<style scoped></style>