<template>
  <div class="grid grid-cols-1 gap-2">
    <FileItem
      v-for="item in props.items"
      :key="item.id"
      :item="item"
    />

    <!-- action row at end of list -->
    <div class="flex items-center gap-3 pt-2">
  <button @click="createPlaceholder" class="flex items-center gap-2 px-2 py-1 text-sm rounded bg-slate-100 hover:bg-slate-200" type="button">
        <span class="text-lg">📁</span>
        <span>New folder</span>
      </button>

      <label class="flex items-center gap-2 px-2 py-1 text-sm rounded bg-slate-100 hover:bg-slate-200 cursor-pointer">
        <span class="text-lg">📄</span>
        <span>Upload file</span>
        <input type="file" class="hidden" @change="onFile" />
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FileEntry } from '../../stores/useFileBrowserStore'
import FileItem from './FileItem.vue'
import { defineProps } from 'vue'
import { useFileBrowserStore } from '../../stores/useFileBrowserStore'

const props = defineProps<{ items: FileEntry[] }>()
const store = useFileBrowserStore()

function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files && input.files[0]
  if (file) store.uploadFile(file)
  if (input) input.value = ''
}

function createPlaceholder() {
  store.createPlaceholderFolder()
}
</script>
