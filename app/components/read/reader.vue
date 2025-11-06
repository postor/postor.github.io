<template>
  <div>
    <div v-for="(audioUrl, index) in audioChunks" :key="index">
      <audio :src="audioUrl" controls></audio>
    </div>
    <div v-if="status">Status: {{ status }}</div>
  </div>
</template>
<script setup lang="ts">
import { streamTTS, initTTS } from '~/utils/tts'

const audioChunks = ref<string[]>([])
const status = ref('')

onMounted(async () => {
  if(typeof window === 'undefined') return
  
  status.value = 'Initializing model...'
  
  // Initialize Kokoro engine
  await initTTS('kokoro')
  
  status.value = 'Model loaded, starting stream...'

  // Stream the text
  const text = "Kokoro is an open-weight TTS model with 82 million parameters. Despite its lightweight architecture, it delivers comparable quality to larger models while being significantly faster and more cost-efficient. With Apache-licensed weights, Kokoro can be deployed anywhere from production environments to personal projects. It can even run 100% locally in your browser, powered by Transformers.js!"
  
  let i = 0
  for await (const { text: chunkText, phonemes, audio } of streamTTS(text, 'af')) {
    console.log({ text: chunkText, phonemes })
    audioChunks.value.push(URL.createObjectURL(audio))
    status.value = `Generated chunk ${i++}`
  }
  
  status.value = 'All chunks generated!'
})
</script>