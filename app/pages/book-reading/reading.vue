
<template>
  <div>
    <div v-if="filePath">
      <ReadText :file-path="filePath" />
    </div>
    <div v-else class="text-gray-400 p-4">{{ t('bookReading.noBookSelected') }}</div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import ReadText from '~/components/read/read-text.vue'

const route = useRoute()
const { t } = useI18n()
const filePath = ref<string>('')

onMounted(() => {
  // Get file path from query parameter
  const fileParam = route.query.file
  if (fileParam && typeof fileParam === 'string') {
    filePath.value = fileParam
  }
})
</script>

<script lang="ts">
export default {
  layout: 'book-reading',
}
</script>

<style>

</style>