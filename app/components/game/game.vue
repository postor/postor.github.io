<template>
  <div id="game">

  </div>
</template>

<script lang="ts" setup>
import { startGame } from './lib';

const props = defineProps<{ cfg: string }>()

onMounted(() => {
  // `cfg` is now a path to a folder containing config.json and assets
  startGame({ cfgPath: props.cfg,onBack:()=>{
    navigateTo('/learn-game')
  } })
})
</script>

<style>
html,
body,
#__nuxt,
#game {
  height: 100%;
  width: 100%;
  position: relative;
  margin: 0;
  padding: 0;
  background: #333;
}
</style>
