<template>
  <UModal v-model:open="openLocal" title="Search files" @close="handleClose">
    <template #body>
      <div class="space-y-3">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Keyword</label>
          <input
            v-model="keyword"
            type="text"
            placeholder="Type to search (min 2 characters)"
            class="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div v-if="searching" class="flex items-center gap-2 text-sm text-slate-600">
          <div class="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500" />
          Searching…
        </div>
        <div v-else-if="keyword && results.length === 0" class="text-sm text-slate-600">No results.</div>

        <ul v-if="results.length" class="max-h-64 overflow-auto divide-y rounded border">
          <li v-for="(r, idx) in results" :key="idx" class="flex items-center justify-between gap-3 px-3 py-2">
            <div class="min-w-0">
              <div class="truncate text-sm font-medium text-slate-800">{{ r.name }}</div>
              <div class="truncate text-xs text-slate-500">{{ r.path }}</div>
            </div>
            <div class="shrink-0">
              <button class="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-slate-50" @click="goTo(r)">
                <UIcon name="mdi:folder-open-outline" />
                Go to folder
              </button>
            </div>
          </li>
        </ul>
        <div v-if="tooMany" class="text-xs text-slate-500">Showing first {{ maxResults }} results.</div>
      </div>
    </template>
    <template #footer="{ close }">
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="() => { close(); handleClose() }">Close</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { UModal, UButton } from '#components'
import { useFileBrowserStore } from '../../stores/useFileBrowserStore'
import * as opfs from '../../utils/opfs'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const store = useFileBrowserStore()
const openLocal = ref(props.open)
watch(() => props.open, (v) => (openLocal.value = v))

function handleClose() {
  openLocal.value = false
  emit('close')
}

const keyword = ref('')
const searching = ref(false)
const results = ref<Array<{ name: string; path: string }>>([])
const maxResults = 200
const tooMany = computed(() => results.value.length >= maxResults)

let debounceTimer: any
watch(keyword, () => {
  clearTimeout(debounceTimer)
  if (!keyword.value || keyword.value.trim().length < 2) {
    results.value = []
    return
  }
  debounceTimer = setTimeout(runSearch, 300)
})

watch(openLocal, (open) => {
  if (open) {
    keyword.value = ''
    results.value = []
    searching.value = false
  }
})

async function runSearch() {
  const q = keyword.value.trim().toLowerCase()
  if (!q) return
  searching.value = true
  results.value = []
  try {
    const acc: Array<{ name: string; path: string }> = []
    await walk(store.currentPath, acc, q)
    results.value = acc.slice(0, maxResults)
  } finally {
    searching.value = false
  }
}

async function walk(path: string, acc: Array<{ name: string; path: string }>, q: string) {
  const list = await opfs.list(path)
  for (const item of list) {
    if (item.type === 'folder') {
      await walk(`${path}/${item.name}`, acc, q)
    } else if (item.type === 'file') {
      if (item.name.toLowerCase().includes(q)) {
        acc.push({ name: item.name, path })
        if (acc.length >= maxResults) return
      }
    }
  }
}

async function goTo(r: { name: string; path: string }) {
  await store.goTo(r.path)
  handleClose()
}
</script>

<style scoped>
</style>
