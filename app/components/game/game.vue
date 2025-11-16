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
html, body, #__nuxt {
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
}

#game {
  /* occupy the full viewport and center the canvas */
  height: 100vh;
  width: 100vw;
  position: relative;
  margin: 0;
  padding: 0;
  background: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

#game canvas {
  display: block;
  /* default: full-viewport landscape fit */
  width: 100vw;
  height: 100vh;
  max-width: 100vw;
  max-height: 100vh;
  object-fit: cover;
  transform: none;
  transform-origin: center center;
}

/* In portrait, rotate the canvas 90deg and swap width/height so it fills the screen */
@media (orientation: portrait) {
  #game canvas {
    width: 100vh;
    height: 100vw;
    max-width: 100vh;
    max-height: 100vw;
    transform: rotate(90deg);
    -webkit-transform: rotate(90deg);
  }
}
</style>
