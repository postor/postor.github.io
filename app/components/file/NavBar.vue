<template>
  <div class="flex items-center justify-between bg-slate-50 p-3 rounded-md mb-4">
    <div class="flex items-center gap-3">
      <button :disabled="disabled" @click="onCreate" :class="['px-2 py-1 rounded text-sm', disabled ? 'bg-slate-300 text-slate-600' : 'bg-blue-600 text-white']">New folder</button>
      <label :class="['px-2 py-1 rounded text-sm cursor-pointer', disabled ? 'bg-slate-300 text-slate-600 cursor-not-allowed' : 'bg-green-600 text-white']">
        <span>Upload</span>
        <input type="file" class="hidden" @change="onFile" :disabled="disabled" />
      </label>
    </div>

    <div class="text-sm text-slate-600">File browser</div>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'
import { useFileBrowserStore } from '../../stores/useFileBrowserStore'

const props = defineProps<{ disabled?: boolean }>()
const store = useFileBrowserStore()

function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files && input.files[0]
  if (file) store.uploadFile(file)
  // reset so same file can be uploaded again
  if (input) input.value = ''
}

function onCreate() {
  if (props.disabled) return
  store.createPlaceholderFolder()
}
</script>
