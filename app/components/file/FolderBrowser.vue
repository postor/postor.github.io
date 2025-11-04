<template>
  <div class="w-full max-w-4xl mx-auto">
  <FileNavBar :disabled="store.loading || !store.opfsAvailable" @create-folder="onCreateFolder" @upload="store.uploadFile" />

    <div class="p-4">
      <div class="flex items-center justify-between gap-4">
        <FileBreadcrumbs :path="store.currentPath" @go="store.goTo" />

        <div class="relative">
          <button :disabled="selectedCount === 0" @click="store.bulkOpen = !store.bulkOpen" class="px-2 py-1 rounded bg-slate-100 disabled:opacity-50">Actions</button>
          <div v-if="store.bulkOpen" class="absolute right-0 mt-2 w-44 bg-white border rounded shadow p-2 z-50">
            <button class="w-full text-left px-2 py-1 hover:bg-slate-50" @click="onBulkMove">Move</button>
            <button class="w-full text-left px-2 py-1 text-red-600 hover:bg-slate-50" @click="onBulkDelete">Delete</button>
          </div>
        </div>
      </div>

      <div v-if="store.loading" class="py-8 text-center text-sm text-slate-600">Loading…</div>

      <div v-else-if="!store.opfsAvailable" class="py-8 text-center">
        <div class="text-lg font-medium mb-2">Storage not available</div>
        <div class="text-sm text-slate-600 mb-4">This browser does not expose the private origin filesystem. Use a Chromium-based browser that supports Storage Foundation / OPFS.</div>
        <div class="flex justify-center gap-2">
          <button class="px-3 py-1 bg-blue-600 text-white rounded text-sm" disabled>Create local folder</button>
        </div>
      </div>

      <div v-else>
        <div v-if="store.error" class="mb-4 text-sm text-red-600">Error: {{ store.error }}</div>

        <div v-if="!store.loading && store.items.length === 0" class="py-8 text-center text-slate-600">
          <div class="text-lg font-medium mb-2">No books yet</div>
          <div class="text-sm mb-4">Upload files or create a folder to get started.</div>
          <div class="flex justify-center gap-2">
            <button @click="onCreateFolder()" class="px-3 py-1 bg-blue-600 text-white rounded text-sm">New folder</button>
            <label class="px-3 py-1 bg-green-600 text-white rounded text-sm cursor-pointer">
              Upload
              <input type="file" class="hidden" @change="onFile" />
            </label>
          </div>
        </div>

      <FileList
          v-else
          :items="store.items"
          @open="store.openItem"
          @toggle-select="store.toggleSelect"
          @rename="onRename"
          @cancel-rename="onCancelRename"
          @create-folder="onCreateFolder"
          @upload="(file:File) => store.uploadFile(file)"
          @rename-request="store.openRenameModalForItem"
          @move-request="store.openMoveModalForItem"
          @delete-request="store.openDeleteModalForItem"
        />
      <!-- Move modal -->
      <div v-if="store.showMoveModal" class="fixed inset-0 flex items-center justify-center z-50">
        <div class="absolute inset-0 bg-black/40" @click="store.cancelMove()"></div>
        <div class="bg-white rounded shadow p-4 z-10 w-full max-w-md">
          <div class="text-lg font-medium mb-2">Move item(s)</div>
          <div class="text-sm mb-2">Target folder (full path):</div>
          <input v-model="store.moveTarget" class="w-full border rounded px-2 py-1 mb-3" />
          <div class="flex justify-end gap-2">
            <button class="px-3 py-1" @click="store.cancelMove()">Cancel</button>
            <button class="px-3 py-1 bg-blue-600 text-white rounded" @click="store.confirmMove()">Move</button>
          </div>
        </div>
      </div>

      <!-- Rename modal -->
      <div v-if="store.showRenameModal" class="fixed inset-0 flex items-center justify-center z-50">
        <div class="absolute inset-0 bg-black/40" @click="store.cancelRenameModal()"></div>
        <div class="bg-white rounded shadow p-4 z-10 w-full max-w-md">
          <div class="text-lg font-medium mb-2">Rename</div>
          <div class="text-sm mb-2">New name:</div>
          <input v-model="store.renameName" class="w-full border rounded px-2 py-1 mb-3" />
          <div class="flex justify-end gap-2">
            <button class="px-3 py-1" @click="store.cancelRenameModal()">Cancel</button>
            <button class="px-3 py-1 bg-blue-600 text-white rounded" @click="store.confirmRenameModal()">Rename</button>
          </div>
        </div>
      </div>

      <!-- Delete modal -->
      <div v-if="store.showDeleteModal" class="fixed inset-0 flex items-center justify-center z-50">
        <div class="absolute inset-0 bg-black/40" @click="store.cancelDeleteModal()"></div>
        <div class="bg-white rounded shadow p-4 z-10 w-full max-w-md">
          <div class="text-lg font-medium mb-2">Confirm delete</div>
          <div class="text-sm mb-4">Are you sure you want to delete {{ store.deleteIds.length }} item(s)? This cannot be undone.</div>
          <div class="flex justify-end gap-2">
            <button class="px-3 py-1" @click="store.cancelDeleteModal()">Cancel</button>
            <button class="px-3 py-1 bg-red-600 text-white rounded" @click="store.confirmDeleteModal()">Delete</button>
          </div>
        </div>
      </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useFileBrowserStore } from '../../stores/useFileBrowserStore'
import FileNavBar from './NavBar.vue'
import FileBreadcrumbs from './Breadcrumbs.vue'
import FileList from './FileList.vue'

import { ref, computed, onMounted } from 'vue'

const store = useFileBrowserStore()
const selectedCount = computed(() => store.items.filter((i: any) => i.selected).length)

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