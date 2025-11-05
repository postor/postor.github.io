<template>
  <div class="folder-tree">
    <ul>
      <li v-for="folder in folders" :key="folder.id">
        <span @click="toggle(folder)">{{ folder.name }}</span>
        <button @click="createNewFolder(folder.id)">New Folder</button>
        <ul v-if="folder.expanded">
          <FolderTree :folders="folder.children ?? []" @folder-click="setTargetPath" />
        </ul>
      </li>
    </ul>
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

const emit = defineEmits(['folder-click']);


function toggle(folder: FolderNode) {
  folder.expanded = !folder.expanded;
}


function createNewFolder(parentId: string | number) {
  // Logic to create a new folder under the specified parentId
}


function setTargetPath(folder: FolderNode) {
  emit('folder-click', folder);
}
</script>

<style scoped>
/* Add styles for the folder tree if needed */
</style>
