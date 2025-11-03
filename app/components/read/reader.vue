<template>
  <audio :src="src" controls></audio>
  <ul></ul>
</template>
<script setup lang="ts">
import * as tts from '@mintplex-labs/piper-tts-web';
const src = ref('')
onMounted(async () => {
  if(typeof window === 'undefined') return
  console.log(await tts.voices())
  const wav = await tts.predict({
    text: "你好，中文!",
    voiceId: 'zh_CN-huayan-medium',
  });

  src.value = URL.createObjectURL(wav);
  console.log(await tts.voices())
})
</script>