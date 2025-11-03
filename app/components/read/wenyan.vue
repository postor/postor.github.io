<template>
  <div class="viewer">
    <h1>{{ title }}</h1>
    <div class="content-container">
      <div v-for="(paragraph, pIndex) in content" :key="pIndex" class="paragraph">
        <div v-for="(segment, sIndex) in paragraph.segments" :key="sIndex" class="segment">
          <div v-for="track in tracks" :key="track" :class="['track', `track-${track}`]">
            {{ segment[track] || ' ' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{
  cfg: string
}>()

const title = ref('')
const tracks = ref<string[]>([])
const content = ref<any[]>([])

onMounted(async () => {
  try {
    const response = await fetch(`${props.cfg}/text.json`)
    const data = await response.json()
    title.value = data.title
    tracks.value = data.tracks
    content.value = data.content
  } catch (error) {
    console.error('Error loading text data:', error)
  }
})
</script>

<style scoped>
.viewer {
  max-width: 900px;
  margin: 0 auto;
  background-color: #fff;
  padding: 2em;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

h1 {
  text-align: center;
  margin-bottom: 1.5em;
  color: #343a40;
}

.paragraph {
  margin-bottom: 1.5em;
  text-align: justify;
}

.segment {
  display: inline-flex;
  flex-direction: column;
  text-align: center;
  padding: 5px 3px;
  margin: 0 1px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;
  vertical-align: top;
}

.segment:hover {
  background-color: #e9ecef;
}

.track {
  white-space: nowrap;
}

.track-pinyin {
  font-size: 0.8em;
  color: #6c757d;
  height: 1.2em;
}

.track-ancient {
  font-size: 1.5em;
  font-weight: 500;
  color: #000;
  font-family: "KaiTi", "STKaiti", "楷体", serif;
}

.track-modern {
  font-size: 0.9em;
  color: #495057;
}
</style>
