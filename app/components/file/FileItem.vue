<template>
  <div
    class="flex items-center gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer"
    @click="onClick"
    @contextmenu.prevent="toggleSelect"
  >
  <input type="checkbox" class="w-4 h-4" v-model="local.selected" @change="toggleSelect" @click.stop />

    <div class="w-10 h-10 flex items-center justify-center bg-slate-100 rounded">
      <span class="text-sm">{{ icon }}</span>
    </div>

    <div class="flex-1 min-w-0">
      <div v-if="isEditing" class="flex items-center gap-2">
        <input ref="inputRef" v-model="editName" @keydown.enter.prevent="confirm" @keydown.esc.prevent="cancel" @blur="confirm" class="w-full px-2 py-1 border rounded" />
      </div>
      <div v-else>
        <div class="truncate font-medium">{{ item.name }}</div>
        <div class="text-xs text-slate-500">{{ meta }}</div>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <button @click.stop="toggleMenu" class="px-2 py-1 rounded hover:bg-slate-100">
        ⋯
      </button>
      <div v-if="showMenu" class="relative">
        <div class="absolute right-0 mt-1 w-40 bg-white border rounded shadow p-2 z-50">
          <button class="w-full text-left px-2 py-1 hover:bg-slate-50" @click.stop="onRenameRequest">Rename</button>
          <button class="w-full text-left px-2 py-1 hover:bg-slate-50" @click.stop="onMoveRequest">Move</button>
          <button class="w-full text-left px-2 py-1 text-red-600 hover:bg-slate-50" @click.stop="onDeleteRequest">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { FileEntry } from '../../stores/useFileBrowserStore'
import { defineProps } from 'vue'
import { useFileBrowserStore } from '../../stores/useFileBrowserStore'

const props = defineProps<{ item: FileEntry }>()
const store = useFileBrowserStore()

const local = ref({ selected: !!props.item.selected })
const isEditing = ref<boolean>((props.item as any).editing === true || (props.item as any).isNew === true)
const editName = ref(props.item.name)
const inputRef = ref<HTMLInputElement | null>(null)
const showMenu = ref(false)

function toggleMenu() {
  showMenu.value = !showMenu.value
}

function onRenameRequest() {
  // start rename flow via store
  store.openRenameModalForItem(props.item)
  showMenu.value = false
}

function onMoveRequest() {
  store.openMoveModalForItem(props.item)
  showMenu.value = false
}

function onDeleteRequest() {
  store.openDeleteModalForItem(props.item)
  showMenu.value = false
}

if (isEditing.value) {
  // focus on next tick
  setTimeout(() => inputRef.value?.focus(), 50)
}

watch(
  () => props.item.selected,
  (v) => {
    local.value.selected = !!v
  }
)

function toggleSelect() {
  store.toggleSelect(props.item)
}

function confirm() {
  const name = editName.value && editName.value.trim()
  if (!name) {
    cancel()
    return
  }
  // handle create placeholder vs rename
  if (props.item.id && String(props.item.id).startsWith('tmp-')) {
    store.confirmCreateFolder(props.item.id, name)
  } else {
    store.finishRename(props.item.id, name)
  }
}

function cancel() {
  if (props.item.id && String(props.item.id).startsWith('tmp-')) {
    store.cancelCreateFolder(props.item.id)
  } else {
    store.cancelRename(props.item.id)
  }
}

function onClick(e: Event) {
  // normal click opens; with metaKey toggle selection
  const ev = e as MouseEvent
  if (ev.ctrlKey || ev.metaKey) {
    toggleSelect()
    return
  }
  store.openItem(props.item)
}

const icon = props.item.type === 'folder' ? '📁' : props.item.ext === 'pdf' ? '📄' : '📄'
const meta = props.item.type === 'folder' ? 'Folder' : `${props.item.ext || 'file'} · ${props.item.size || ''}`
</script>
