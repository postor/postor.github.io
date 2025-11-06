
<template>
    <div :class="themeClass">
        <slot />
    </div>
</template>


<script setup lang="ts">
import { useThemeStore } from '~/stores/useThemeStore'
const themeStore = useThemeStore()
const themeClass = themeStore.themeClass
</script>

<style>
</style>