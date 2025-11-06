<template>
  <nav class="text-sm text-slate-700 mb-3">
    <ul class="flex items-center gap-2 flex-wrap">
        <li>
          <button class="underline whitespace-nowrap" @click="go(ROOT)">root</button>
        </li>
        <template v-for="(crumb, i) in crumbs" :key="i">
          <li class="flex items-center gap-2">
            <span class="text-slate-400">/</span>
            <span v-if="i === crumbs.length - 1" class="truncate whitespace-nowrap">{{ crumb.name }}</span>
            <button v-else class="underline whitespace-nowrap" @click="go(crumb.path)">{{ crumb.name }}</button>
          </li>
        </template>
      </ul>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { defineProps } from 'vue'
import { useFileBrowserStore } from '../../stores/useFileBrowserStore'
import { STORAGE_ROOT } from '../../utils/constants'

const props = defineProps<{ path: string }>()
const store = useFileBrowserStore()

function go(path: string) {
  store.goTo(path)
}

const ROOT = STORAGE_ROOT

const parts = computed(() => {
  const p = props.path || ''
  return p.split('/').filter(Boolean)
})

// crumbs is the list of breadcrumb segments after the root.
const crumbs = computed(() => {
  const arr = parts.value
  if (arr.length === 0) return []
  // if the first part is the canonical root, skip it in the crumbs list
  const tail = arr[0] === ROOT ? arr.slice(1) : arr
  return tail.map((name, idx) => {
    const pathParts = arr[0] === ROOT ? [ROOT].concat(tail.slice(0, idx + 1)) : arr.slice(0, idx + 1)
    return { name, path: pathParts.join('/') }
  })
})
</script>
