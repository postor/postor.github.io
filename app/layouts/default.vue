
<template>
  <div :class="themeClass">
    <nav>
      <div class="nav-left">
        <NuxtLink to="/">{{ t('nav.home') }}</NuxtLink>
      </div>
      <div class="nav-right">
        <I18nSelect />
      </div>
    </nav>
    <slot />
  </div>
</template>


<script setup lang="ts">
import { useThemeStore } from '~/stores/useThemeStore'
const { t } = useI18n()
const themeStore = useThemeStore()
const themeClass = themeStore.themeClass
</script>

<style>
</style>