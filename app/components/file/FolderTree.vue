<template>
  <div class="folder-tree">
    <ul class="pl-0">
      <li v-for="folder in folders" :key="folder.id" class="mb-1">
        <div class="flex items-center gap-2">
          <button class="text-sm" @click="toggle(folder)">{{ folder.expanded ? '▾' : '▸' }}</button>
          <UIcon :name="folder.expanded ? 'material-symbols:folder-open-outline' : 'material-symbols:folder-outline'" class="text-lg" />
          <span class="cursor-pointer" @click="setTargetPath(folder)">{{ folder.name }}</span>

          <button class="flex items-center gap-2 text-sm ml-5" @click="openNewFolderModal(folder.id)">
            <UIcon name="material-symbols:add-circle-outline" class="text-lg" />
          </button>
        </div>
        <ul v-if="folder.expanded" class="pl-4">
          <li v-if="folder.children && folder.children.length">
            <FolderTree :folders="folder.children ?? []" @folder-click="$emit('folder-click', $event)" @create-folder="$emit('create-folder', $event)" />
          </li>
        </ul>
      </li>
    </ul>
  </div>
  <!-- New folder modal -->
  <div v-if="showNewFolderModal" class="fixed inset-0 flex items-center justify-center z-50">
    <div class="absolute inset-0 bg-black/40" @click="cancelNewFolder"></div>
    <div class="bg-white rounded shadow p-4 z-10 w-full max-w-sm">
      <div class="text-lg font-medium mb-2">New folder</div>
      <div class="text-sm mb-2">Parent: {{ creatingParent }}</div>
      <input v-model="newFolderNameInput" placeholder="Folder name" class="w-full border rounded px-2 py-1 mb-3" />
      <div class="flex justify-end gap-2">
        <button class="px-3 py-1" @click="cancelNewFolder">Cancel</button>
        <button class="px-3 py-1 bg-green-600 text-white rounded" @click="confirmNewFolder">Create</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';


interface FolderNode {
  id: string | number;
  name: string;
  expanded?: boolean;
  children?: FolderNode[];
}

const props = defineProps<{ folders: FolderNode[] }>();

const emit = defineEmits(['folder-click', 'create-folder']);

// modal state for entering new folder name
const showNewFolderModal = ref(false)
const creatingParent = ref<string | number | null>(null)
const newFolderNameInput = ref('')

function openNewFolderModal(parentId: string | number) {
  creatingParent.value = parentId
  newFolderNameInput.value = ''
  showNewFolderModal.value = true
}

function confirmNewFolder() {
  if (!creatingParent.value) return
  if (!newFolderNameInput.value) return
  emit('create-folder', { parentId: String(creatingParent.value), name: newFolderNameInput.value })
  showNewFolderModal.value = false
  creatingParent.value = null
  newFolderNameInput.value = ''
}

function cancelNewFolder() {
  showNewFolderModal.value = false
  creatingParent.value = null
  newFolderNameInput.value = ''
}


function toggle(folder: FolderNode) {
  folder.expanded = !folder.expanded;
}


function createNewFolder(parentId: string | number) {
  // emit event to parent so it can handle creation UI and opfs calls
  // kept for backward compatibility (not used by template now)
  emit('create-folder', parentId)
}


function setTargetPath(folder: FolderNode) {
  // emit the folder id (path) so parents can use it directly
  emit('folder-click', folder.id);
}
</script>

<style scoped>
/* Add styles for the folder tree if needed */
</style>
