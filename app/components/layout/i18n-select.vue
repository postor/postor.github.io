<script setup lang="ts">
const { locale, setLocale, locales: i18nLocales } = useI18n()

// Map i18n locales to ULocaleSelect format with all required properties
const locales = computed(() => 
  i18nLocales.value.map(l => ({
    code: typeof l === 'string' ? l : l.code,
    name: typeof l === 'string' ? l : (l.name || l.code),
    dir: 'ltr' as const,
    messages: {}
  }))
)
</script>

<template>
  <ULocaleSelect
    v-model="locale"
    :locales="locales"
    @update:model-value="setLocale($event as any)"
  />
</template>