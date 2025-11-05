
<template>
  <div>
    <div v-if="book">
      <h2 class="text-xl font-bold mb-2">{{ book.title }}</h2>
      <div class="mb-2 text-xs text-gray-500">{{ book.filePath }}</div>
      <div class="mb-4">{{ t('bookReading.progress') }}: {{ progress }}%</div>
      <!-- Book reading content here -->
      <div class="border p-4 bg-white rounded shadow mb-4 min-h-[200px]">Reading area for {{ book.title }}</div>
      <button class="px-4 py-2 bg-blue-600 text-white rounded" @click="finishReading">{{ t('bookReading.markAsRead') }}</button>
    </div>
    <div v-else class="text-gray-400">{{ t('bookReading.noBookSelected') }}</div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useBookReadingStore } from '~/stores/useBookReadingStore'
import { useRouter } from 'vue-router'
const store = useBookReadingStore()
const router = useRouter()
const { t } = useI18n()
const book = computed(() => store.currentBook)
const progress = computed(() => book.value ? store.getBookProgress(book.value) : 0)
function finishReading() {
  if (book.value) {
    store.updateProgress(book.value.id, book.value.total, book.value.total)
    router.push('/book-reading')
  }
}
</script>

<script lang="ts">
export default {
  layout: 'book-reading',
}
</script>

<style>

</style>