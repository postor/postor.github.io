<template>
  <div class="relative">
    <!-- actions toggle -->
    <button @click="store.bulkOpen = !store.bulkOpen"
      class="inline-flex items-center gap-1 rounded-md border bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
      Actions
      <span aria-hidden>▾</span>
    </button>

    <!-- click-away overlay -->
    <div v-if="store.bulkOpen" class="fixed inset-0 z-40" @click="store.bulkOpen = false" />

    <!-- dropdown menu -->
    <div v-if="store.bulkOpen" class="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-md border bg-white p-1 shadow-lg ring-1 ring-black/5">
      <!-- Sorting section -->
      <div class="px-2 py-1 text-xs uppercase tracking-wide text-slate-500">Sort</div>
      <div class="flex items-center gap-1 px-2 pb-1">
        <!-- Toggle by name -->
        <button class="inline-flex items-center gap-1 rounded px-2 py-1 text-sm hover:bg-slate-50"
          :class="{ 'bg-slate-100': sortKey === 'name' }"
          :title="sortKey === 'name' && sortAsc ? 'Sort name Z→A' : 'Sort name A→Z'"
          @click="onToggleSortName">
          <UIcon :name="sortKey === 'name' && sortAsc ? 'mdi:sort-alphabetical-ascending' : sortKey === 'name' ? 'mdi:sort-alphabetical-descending' : 'mdi:sort-alphabetical-variant'" />
          <span class="hidden sm:inline">Name</span>
        </button>
        <!-- Toggle by time -->
        <button class="inline-flex items-center gap-1 rounded px-2 py-1 text-sm hover:bg-slate-50"
          :class="{ 'bg-slate-100': sortKey === 'time' }"
          :title="sortKey === 'time' && !sortAsc ? 'Sort time Oldest→Newest' : 'Sort time Newest→Oldest'"
          @click="onToggleSortTime">
          <UIcon :name="sortKey === 'time' && !sortAsc ? 'mdi:sort-clock-descending-outline' : sortKey === 'time' ? 'mdi:sort-clock-ascending-outline' : 'mdi:clock-outline'" />
          <span class="hidden sm:inline">Time</span>
        </button>
      </div>
      <div class="my-1 border-t" />

      <!-- Search action -->
      <button class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-50"
        @click="openSearch()">
        <UIcon name="mdi:magnify" />
        <span>Search…</span>
      </button>

      <!-- Bulk actions section -->
      <button class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-50"
        :class="{ 'opacity-50 cursor-not-allowed pointer-events-none': selectedCount === 0 }"
        @click="selectedCount > 0 && onBulkMove()">
        <UIcon name="mdi:folder-move" />
        <span>Move</span>
      </button>
      <button class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
        :class="{ 'opacity-50 cursor-not-allowed pointer-events-none': selectedCount === 0 }"
        @click="selectedCount > 0 && onBulkDelete()">
        <UIcon name="mdi:trash-can-outline" />
        <span>Delete</span>
      </button>
    </div>

    <!-- Search modal (inlined) -->
    <UModal v-model:open="showSearch" title="Search files" @close="() => (showSearch = false)">
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
          <UButton color="neutral" variant="ghost" @click="() => { close(); showSearch = false }">Close</UButton>
        </div>
      </template>
    </UModal>
  </div>
  
</template>

<script setup lang="ts">
import { ref, toRefs, watch, computed } from 'vue'
import { useFileBrowserStore } from '../../stores/useFileBrowserStore'
import { UModal, UButton } from '#components'
import * as opfs from '../../utils/opfs'

const props = defineProps<{
  sortKey: 'name' | 'time'
  sortAsc: boolean
  selectedCount: number
}>()

const emit = defineEmits<{
  (e: 'toggle-sort-name'): void
  (e: 'toggle-sort-time'): void
  (e: 'bulk-move'): void
  (e: 'bulk-delete'): void
}>()

const { sortKey, sortAsc, selectedCount } = toRefs(props)

const store = useFileBrowserStore()
const showSearch = ref(false)

// Search modal state and logic
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

watch(showSearch, (open) => {
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
  showSearch.value = false
}

function onToggleSortName() {
  emit('toggle-sort-name')
}
function onToggleSortTime() {
  emit('toggle-sort-time')
}
function onBulkMove() {
  emit('bulk-move')
}
function onBulkDelete() {
  emit('bulk-delete')
}
function openSearch() {
  store.bulkOpen = false
  showSearch.value = true
}
</script>

<style scoped>
</style>
