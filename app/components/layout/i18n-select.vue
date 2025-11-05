<script setup lang="ts">
import * as locales from '@nuxt/ui/locale'

const { locale, setLocale } = useI18n()
 
 // Limit available locales to English and Chinese only.
 // Assumption: locale objects exported from '@nuxt/ui/locale' include a `code` or `locale` property
 // (e.g. { code: 'en', name: 'English' }). If not, we fall back to string matching.
 const availableLocales = Object.values(locales).filter((l: any) =>
   ['en', 'zh'].includes(l?.code ?? l?.locale ?? String(l))
 )
</script>

<template>
  <ULocaleSelect
    v-model="locale"
    :locales="availableLocales"
    @update:model-value="setLocale($event as string)"
  />
</template>