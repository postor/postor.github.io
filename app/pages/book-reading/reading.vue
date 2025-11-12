
<template>
  <div class="fixed inset-0 flex flex-col" :style="{ top: headerHeight + 'px', bottom: footerHeight + 'px' }">
    <div v-if="activeFile" class="flex-1 overflow-y-auto">
      <ReadText />
    </div>
    <div v-else class="text-gray-400 p-4">{{ t('bookReading.noBookSelected') }}</div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import ReadText from '~/components/read/read-text.vue'
import { useBookReadingStore } from '~/stores/useBookReadingStore'
import { useTextReaderStore } from '~/stores/useTextReaderStore'

const route = useRoute()
const { t } = useI18n()
const store = useBookReadingStore()
const textReaderStore = useTextReaderStore()
const activeFile = computed(() => textReaderStore.getActiveFile())
const headerHeight = ref(56) // Default h-14 = 56px
const footerHeight = ref(56) // Default h-14 = 56px

onMounted(() => {
  // Get file path from query parameter, or use current book from store
  const fileParam = route.query.file
  let fp = ''
  if (fileParam && typeof fileParam === 'string') {
    fp = fileParam
  } else if (store.currentBook) {
    fp = store.currentBook.filePath
  }

  if (fp) {
    textReaderStore.activeFilePath = fp
    // Ensure the book store is aware of the current file
    if (!store.currentBook || store.currentBook.filePath !== fp) {
      const fileName = fp.split('/').pop() || fp
  const currentPos = textReaderStore.ensureReadingPosition(fp)
      const currentPage = currentPos?.currentPage ?? 0
      const book = {
        id: fp,
        title: fileName,
        filePath: fp,
        total: 0,
        current: currentPage,
        lastRead: Date.now(),
      }
      store.setCurrentBook(book)
    }
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