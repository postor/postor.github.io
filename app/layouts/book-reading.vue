
<template>
  <div :class="['flex flex-col min-h-screen', themeClass]">
    <header class="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <div class="w-10"></div>
      <h1 class="text-lg font-semibold text-slate-900 dark:text-slate-100">{{ title }}</h1>
      <LayoutI18nSelect />
    </header>
    <main class="flex-1 mt-14 mb-14">
      <slot />
    </main>
    <nav class="fixed bottom-0 left-0 right-0 z-50 flex flex-row justify-evenly border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 h-14">
      <button
        :class="[
          'flex flex-col items-center justify-center flex-1 h-full px-2 py-1 text-sm font-medium transition-colors',
          tab==='recent' ? 'text-blue-600 dark:text-blue-400 font-bold border-b-2 border-blue-600 dark:border-blue-400' : 'text-slate-700 dark:text-slate-300',
          'disabled:text-slate-400 disabled:cursor-not-allowed'
        ]"
        @click="goTab('recent')"
        :disabled="false"
      >
        <Icon name="i-heroicons-clock" size="22" class="mb-0.5" />
        <span>{{ t('nav.recent') }}</span>
      </button>
      <button
        :class="[
          'flex flex-col items-center justify-center flex-1 h-full px-2 py-1 text-sm font-medium transition-colors',
          tab==='files' ? 'text-blue-600 dark:text-blue-400 font-bold border-b-2 border-blue-600 dark:border-blue-400' : 'text-slate-700 dark:text-slate-300',
          'disabled:text-slate-400 disabled:cursor-not-allowed'
        ]"
        @click="goTab('files')"
        :disabled="false"
      >
        <Icon name="i-heroicons-folder" size="22" class="mb-0.5" />
        <span>{{ t('nav.files') }}</span>
      </button>
      <button
        :class="[
          'flex flex-col items-center justify-center flex-1 h-full px-2 py-1 text-sm font-medium transition-colors',
          tab==='read' ? 'text-blue-600 dark:text-blue-400 font-bold border-b-2 border-blue-600 dark:border-blue-400' : 'text-slate-700 dark:text-slate-300',
          'disabled:text-slate-400 disabled:cursor-not-allowed'
        ]"
        @click="goTab('read')"
        :disabled="!canRead"
      >
        <Icon name="i-heroicons-book-open" size="22" class="mb-0.5" />
        <span>{{ t('nav.read') }}</span>
      </button>
    </nav>
  </div>
</template>


<script setup lang="ts">
import { useThemeStore } from '~/stores/useThemeStore'
import { useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'
import { Icon } from '#components'

const themeStore = useThemeStore()
const themeClass = themeStore.themeClass

const route = useRoute()
const router = useRouter()
const store = useBookReadingStore()
const { t } = useI18n()

const tab = computed(() => {
  if (route.path.endsWith('/files')) return 'files'
  if (route.path.endsWith('/reading')) return 'read'
  return 'recent'
})

const title = computed(() => {
  if (tab.value === 'files') return t('nav.files')
  if (tab.value === 'read') return t('nav.read')
  return t('nav.recent')
})

const canRead = computed(() => !!store.currentBook)

function goTab(tab: string) {
  if (tab === 'recent') router.push('/book-reading')
  else if (tab === 'files') router.push('/book-reading/files')
  else if (tab === 'read' && canRead.value) router.push('/book-reading/reading')
}
</script>


