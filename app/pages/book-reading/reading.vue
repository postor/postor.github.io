
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
import { useTextReaderStore } from '~/stores/useTextReaderStore'

const route = useRoute()
const { t } = useI18n()
const store = useBookReadingStore()
const textReaderStore = useTextReaderStore()
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

  // If opened via ?file=... then ensure the book store is aware of the current file
  if (filePath.value) {
    if (!store.currentBook || store.currentBook.filePath !== filePath.value) {
      const fileName = filePath.value.split('/').pop() || filePath.value
      const currentPos = textReaderStore.loadReadingPosition(filePath.value)
      const currentPage = currentPos?.currentPage ?? 0
      const book = {
        id: filePath.value,
        title: fileName,
        filePath: filePath.value,
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