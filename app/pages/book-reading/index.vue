
<template>
  <div>
    <h2 class="text-xl font-bold mb-4">{{ t('bookReading.recentBooks') }}</h2>
    <ul v-if="recentBooks.length">
      <li v-for="book in recentBooks" :key="book.id" class="mb-2 flex items-center justify-between">
        <div class="flex-1 cursor-pointer" @click="goRead(book)">
          <div class="font-semibold">{{ book.title }}</div>
          <div class="text-xs text-gray-500">{{ book.filePath }}</div>
        </div>
        <div class="ml-2 text-sm text-blue-600">{{ getBookProgress(book) }}%</div>
      </li>
    </ul>
    <div v-else class="text-gray-400">{{ t('bookReading.noRecentBooks') }}</div>
  </div>
</template>

<script lang="ts" setup>
import { useBookReadingStore } from '~/stores/useBookReadingStore'
import { useRouter } from 'vue-router'
const store = useBookReadingStore()
const router = useRouter()
const { t } = useI18n()
const recentBooks = store.sortedRecentBooks
const getBookProgress = store.getBookProgress
function goRead(book: any) {
  store.setCurrentBook(book)
  router.push('/book-reading/reading')
}
definePageMeta({ layout: 'book-reading' })
</script>