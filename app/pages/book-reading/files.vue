
<template>
  <div class="min-h-screen p-4 sm:p-8 bg-slate-50">
    <file-folder-browser @open-file="onOpenFile" />
  </div>
</template>

<script setup lang="ts">
import { useBookReadingStore } from '~/stores/useBookReadingStore'
import { useRouter } from 'vue-router'
const store = useBookReadingStore()
const router = useRouter()
function onOpenFile(file: any) {
  if (file && file.type === 'txt') {
    const book = {
      id: file.path,
      title: file.name,
      filePath: file.path,
      total: file.size || 0,
      current: 0,
      lastRead: Date.now(),
    }
    store.setCurrentBook(book)
    router.push('/book-reading/reading')
  }
}
</script>


<script lang="ts">
definePageMeta({
  layout: 'book-reading',
})
</script>

<style scoped>
</style>