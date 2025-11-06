<template>
  <UModal v-model:open="open" title="Move item(s)" :ui="{ body: 'p-0' }" @close="onCancel">
    <template #body>
      <div class="p-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div class="text-sm font-medium mb-2">Folders</div>
            <div class="h-64 overflow-auto border rounded p-2">
              <FolderTree :folders="tree" @folder-click="onFolderClick" @create-folder="onCreateRequest" />
            </div>
          </div>
          <div class="flex flex-col gap-2 mb-3">
            <textarea v-model="displayTarget" class="flex-1 border rounded px-2 py-1 resize-none break-all min-h-[38px]" style="word-break: break-all;" rows="2" readonly />
            <!-- Move button will be placed in footer for alignment -->
          </div>
        </div>
      </div>
    </template>
    <template #footer="{ close }">
      <div class="flex justify-end gap-2 w-full px-4 pb-4">
        <UButton color="neutral" variant="ghost" @click="close">Cancel</UButton>
        <UButton color="primary" @click="confirm">Move</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">

import { ref, onMounted, computed, watch } from 'vue'
import FolderTree from './FolderTree.vue'
import * as opfs from '../../utils/opfs'
import { useFileBrowserStore } from '../../stores/useFileBrowserStore'
import { STORAGE_ROOT } from '../../utils/constants'
import { UModal, UButton } from '#components'

interface FolderNode {
  id: string
  name: string
  expanded?: boolean
  children?: FolderNode[]
}


const store = useFileBrowserStore()
const open = ref(true)
const target = ref(store.moveTarget || '')

// display-only path without the top-level internal root
const displayTarget = computed<string>({
  get() {
    const root = (store.currentPath || '').split('/').filter(Boolean)[0] || STORAGE_ROOT
    const t = target.value || ''
    if (!t) return ''
    if (t === root) return ''
    return t.startsWith(root + '/') ? t.slice(root.length + 1) : t
  },
  set(val: string) {
    const root = (store.currentPath || '').split('/').filter(Boolean)[0] || STORAGE_ROOT
    const v = (val || '').replace(/^\/+/, '')
    target.value = v ? `${root}/${v}` : root
  }
})

const tree = ref<FolderNode[]>([])
const newFolderParent = ref<string | null>(null)
const newFolderName = ref('')


onMounted(async () => {
  await loadTree()
})

watch(open, (val) => {
  if (!val) onCancel()
})

async function loadTree() {
  // root the tree at the top-level internal storage root
  const root = (store.currentPath || '').split('/').filter(Boolean)[0] || STORAGE_ROOT
  tree.value = await buildTree(root, 4)
}

async function buildTree(path: string, depth = 3): Promise<FolderNode[]> {
  try {
    const list = await opfs.list(path)
    const folders = list.filter((i: any) => i.type === 'folder')
    const out: FolderNode[] = []
    for (const f of folders) {
      const fullPath = path ? `${path}/${f.name}` : f.name
      const node: FolderNode = { id: fullPath, name: f.name }
      if (depth > 0) {
        node.children = await buildTree(fullPath, depth - 1)
      }
      out.push(node)
    }
    return out
  } catch (e) {
    return []
  }
}

function onFolderClick(folderPath: string) {
  target.value = folderPath
  store.moveTarget = folderPath
}

function onCreateRequest(payload: any) {
  // folder-tree may emit either a parentId string (old behavior)
  // or an object { parentId, name } when the tree shows its own modal.
  if (!payload) return
  if (typeof payload === 'string') {
    newFolderParent.value = payload
    return
  }
  if (typeof payload === 'object' && payload.parentId && payload.name) {
    // create immediately
    createFolderImmediate(String(payload.parentId), String(payload.name))
    return
  }
}

async function createFolderImmediate(parent: string, name: string) {
  const path = parent ? `${parent}/${name}` : name
  try {
    await opfs.mkdir(path)
    await loadTree()
    target.value = path
    store.moveTarget = path
  } catch (e) {
    // ignore for now
  }
}

async function createFolder() {
  if (!newFolderName.value) return
  const parent = newFolderParent.value || target.value || ''
  const path = parent ? `${parent}/${newFolderName.value}` : newFolderName.value
  try {
    await opfs.mkdir(path)
    await loadTree()
    // select created folder
    target.value = path
    store.moveTarget = path
    newFolderName.value = ''
    newFolderParent.value = null
  } catch (e) {
    // ignore
  }
}

function clearNewFolder() {
  newFolderName.value = ''
  newFolderParent.value = null
}


async function confirm() {
  store.moveTarget = target.value
  await store.confirmMove()
  open.value = false
}


function onCancel() {
  open.value = false
  store.cancelMove()
}
</script>


<style scoped>
.folder-tree {
  font-size: 14px;
}
</style>
