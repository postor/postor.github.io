
<template>
  <div class="fixed inset-0 flex flex-col" :style="{ top: headerHeight + 'px', bottom: footerHeight + 'px' }">
    <div v-if="filePath" class="flex-1 overflow-y-auto">
      <ReadText :file-path="filePath" />
    </div>
    <div v-else class="text-gray-400 p-4">{{ t('bookReading.noBookSelected') }}</div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import ReadText from '~/components/read/read-text.vue'
import { useBookReadingStore } from '~/stores/useBookReadingStore'

const route = useRoute()
const { t } = useI18n()
const store = useBookReadingStore()
const filePath = ref<string>('')
const headerHeight = ref(56) // Default h-14 = 56px
const footerHeight = ref(56) // Default h-14 = 56px

onMounted(() => {
  // Get file path from query parameter, or use current book from store
  const fileParam = route.query.file
  if (fileParam && typeof fileParam === 'string') {
    filePath.value = fileParam
  } else if (store.currentBook) {
    filePath.value = store.currentBook.filePath
  }
  
  // Detect actual header and footer heights
  const header = document.querySelector('header')
  const footer = document.querySelector('nav')
  if (header) {
    headerHeight.value = header.offsetHeight
  }
  if (footer) {
    footerHeight.value = footer.offsetHeight
  }
})
</script>

<script lang="ts">
definePageMeta({ layout: 'book-reading' })
</script>

<style>

</style>