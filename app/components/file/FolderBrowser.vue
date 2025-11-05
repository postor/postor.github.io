<template>
  <div class="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

    <div class="flex items-center justify-between gap-4 flex-nowrap">
      <div class="min-w-0 flex-1 overflow-hidden">
        <FileBreadcrumbs :path="store.currentPath" @go="store.goTo" />
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <BulkActions
          :sort-key="sortKey"
          :sort-asc="sortAsc"
          :selected-count="selectedCount"
          @toggle-sort-name="toggleSortName"
          @toggle-sort-time="toggleSortTime"
          @bulk-move="onBulkMove"
          @bulk-delete="onBulkDelete"
        />
      </div>
    </div>

    <!-- loading state -->
    <div v-if="store.loading" class="py-10 text-center text-sm text-slate-600">
      <div class="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500" />
      <div class="mt-3">Loading…</div>
    </div>

    <!-- OPFS not available -->
    <div v-else-if="!store.opfsAvailable" class="py-10 text-center">
      <div class="text-lg font-semibold mb-2">Storage not available</div>
      <div class="text-sm text-slate-600 mb-4 max-w-prose mx-auto">This browser does not expose the private origin filesystem. Use a Chromium-based browser that supports Storage Foundation / OPFS.</div>
      <div class="flex justify-center gap-2">
        <button class="px-3 py-1.5 bg-slate-200 text-slate-500 rounded-md text-sm cursor-not-allowed" disabled>Create local folder</button>
      </div>
    </div>

    <!-- main content -->
    <div v-else>
      <div v-if="store.error" class="mb-4 text-sm text-red-600">Error: {{ store.error }}</div>

      <!-- empty state -->
      <div v-if="!store.loading && store.items.length === 0" class="py-12 text-center text-slate-600">
        <div class="mx-auto mb-4 h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center text-2xl">📚</div>
        <div class="text-lg font-semibold mb-1">No books yet</div>
        <div class="text-sm mb-6">Upload files or create a folder to get started.</div>
        <div class="flex justify-center gap-2">
          <button @click="onCreateFolder()" class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow hover:bg-blue-700">
            <span>New folder</span>
          </button>
          <label class="inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white shadow hover:bg-green-700 cursor-pointer">
            <span>Upload</span>
            <input type="file" class="hidden" @change="onFile" />
          </label>
        </div>
      </div>

      <!-- list -->
      <FileList v-else :items="sortedItems" @open="store.openItem" @toggle-select="store.toggleSelect" @rename="onRename" @cancel-rename="onCancelRename" @create-folder="onCreateFolder"
        @upload="(file: File) => store.uploadFile(file)" @rename-request="store.openRenameModalForItem" @move-request="store.openMoveModalForItem" @delete-request="store.openDeleteModalForItem" />

      <!-- Move modal (extracted to component) -->
      <MoveModal v-if="store.showMoveModal" />

      <!-- Rename modal using Nuxt UI -->
      <UModal v-model:open="store.showRenameModal" title="Rename" @close="store.cancelRenameModal()">
        <template #body>
          <div class="text-sm mb-2">New name:</div>
          <input v-model="store.renameName" class="w-full border rounded px-2 py-1 mb-3" />
        </template>
        <template #footer="{ close }">
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" @click="() => { close(); store.cancelRenameModal(); }">Cancel</UButton>
            <UButton color="primary" @click="store.confirmRenameModal">Rename</UButton>
          </div>
        </template>
      </UModal>

      <!-- Delete modal using Nuxt UI -->
      <UModal v-model:open="store.showDeleteModal" title="Confirm delete" @close="store.cancelDeleteModal()">
        <template #body>
          <div class="text-sm mb-4">Are you sure you want to delete {{ store.deleteIds.length }} item(s)? This cannot be undone.</div>
        </template>
        <template #footer="{ close }">
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" @click="() => { close(); store.cancelDeleteModal(); }">Cancel</UButton>
            <UButton color="error" @click="store.confirmDeleteModal">Delete</UButton>
          </div>
        </template>
      </UModal>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useFileBrowserStore } from '../../stores/useFileBrowserStore'
import FileNavBar from './NavBar.vue'
import FileBreadcrumbs from './Breadcrumbs.vue'
import FileList from './FileList.vue'
import MoveModal from './MoveModal.vue'
import BulkActions from './BulkActions.vue'

import { ref, computed, onMounted } from 'vue'
import { UModal, UButton } from '#components'

const store = useFileBrowserStore()
const selectedCount = computed(() => store.items.filter((i: any) => i.selected).length)

// sort state and derived list
const sortKey = ref<'name' | 'time'>('name')
const sortAsc = ref(true)
const sortedItems = computed(() => {
  const list = [...store.items]
  list.sort((a: any, b: any) => {
    if (sortKey.value === 'time') {
      const at = typeof a.uploadedAt === 'number' ? a.uploadedAt : 0
      const bt = typeof b.uploadedAt === 'number' ? b.uploadedAt : 0
      if (at < bt) return sortAsc.value ? -1 : 1
      if (at > bt) return sortAsc.value ? 1 : -1
      // tie-breaker by name
    }
    const an = (a.name || '').toLowerCase()
    const bn = (b.name || '').toLowerCase()
    if (an < bn) return sortAsc.value ? -1 : 1
    if (an > bn) return sortAsc.value ? 1 : -1
    return 0
  })
  return list
})

function toggleSortName() {
  if (sortKey.value === 'name') {
    sortAsc.value = !sortAsc.value
  } else {
    sortKey.value = 'name'
    sortAsc.value = true // default A→Z
  }
  store.bulkOpen = false
}

function toggleSortTime() {
  if (sortKey.value === 'time') {
    sortAsc.value = !sortAsc.value
  } else {
    sortKey.value = 'time'
    sortAsc.value = false // default Newest→Oldest
  }
  store.bulkOpen = false
}

onMounted(() => {
  // initialize store (detect OPFS and sync)
  if (typeof store.init === 'function') store.init()
})

function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files && input.files[0]
  if (file) store.uploadFile(file)
  if (input) input.value = ''
}

function onCreateFolder() {
  // add a placeholder editable folder to the list
  store.createPlaceholderFolder()
}

async function onRename(payload: { id: string; name: string }) {
  // if placeholder id, confirm creation; otherwise perform rename
  if (payload.id && String(payload.id).startsWith('tmp-')) {
    await store.confirmCreateFolder(payload.id, payload.name)
  } else {
    await store.finishRename(payload.id, payload.name)
  }
}

function onCancelRename(id: string) {
  store.cancelCreateFolder(id)
}
function onBulkMove() {
  store.openMoveModalForBulk()
}

function onBulkDelete() {
  store.openDeleteModalForBulk()
}

/**
 * a component that works with web file api, which can 
 * list folders and files, 
 * create folders and upload books, limit extensions to mentioned above
 * grid layout and list layout 
 * enter select mode with long press on item, then user can check all or select with click/touchmove
 * nav with breadcumb (each can change currentPath) and new/delete() folder/file
 * mobile first responsive design with tailwind
 */
</script>