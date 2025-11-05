<template>
  <div>
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
const { t } = useI18n()
</script>

<style>
</style>