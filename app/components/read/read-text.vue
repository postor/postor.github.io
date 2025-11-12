<template>
  <div
    class="min-h-full bg-white text-neutral-900 transition-colors dark:bg-neutral-900 dark:text-neutral-200"
    :class="themeStore.themeClass"
  >
    <Controls />

    <div class="max-w-[800px] mx-auto p-8 leading-8 sm:p-4" :style="{ fontSize: textReaderStore.preferences.fontSize + 'px' }">
      <div v-if="loading" class="text-center p-8 text-base">{{ t('bookReading.loading') }}...</div>
      <div v-else-if="error" class="text-center p-8 text-base text-red-600 dark:text-red-400">{{ error }}</div>
      <div v-else-if="textReaderStore.getCurrentPageContent(activeFile)" class="space-y-2" v-html="textReaderStore.getCurrentPageContent(activeFile)"></div>
      <div v-else class="text-center p-8 text-base">{{ t('bookReading.noContent') }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import Controls from './Controls.vue'
import { useThemeStore } from '~/stores/useThemeStore'
import { useTextReaderStore } from '~/stores/useTextReaderStore'

// filePath prop removed; managed via store activeFilePath

const { t } = useI18n()
const themeStore = useThemeStore()
const textReaderStore = useTextReaderStore()

const activeFile = computed(() => textReaderStore.getActiveFile())
const loading = computed(() => textReaderStore.isLoading(activeFile.value))
const error = computed(() => textReaderStore.getError(activeFile.value))
// Drive UI directly from store where needed
const lastScrollY = ref(0)
const currentSentenceGlobal = computed(() => textReaderStore.getReadingPosition(activeFile.value)?.currentSentenceIndex ?? -1)

// filePath now accessed directly from the store in child components; provide removed

function scrollToCurrentSentence() {
  nextTick(() => {
    if (currentSentenceGlobal.value < 0) return
    const selector = `[data-sentence-idx="${currentSentenceGlobal.value}"]`
    const sentenceElement = document.querySelector(selector)
    if (sentenceElement) {
      sentenceElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      })
    }
  })
}

// Pagination is now handled in the store

// Encoding changes are handled directly in Controls via the store

function handleScroll() {
  if (!textReaderStore.preferences.autoMode) return

  const scrollContainer = document.querySelector('.overflow-y-auto')
  if (!scrollContainer) return

  const currentScrollY = scrollContainer.scrollTop
  const scrollThreshold = 100
  const scrollDelta = Math.abs(currentScrollY - lastScrollY.value)

  if (scrollDelta > 10) {
    if (currentScrollY > lastScrollY.value && currentScrollY > scrollThreshold) {
      if (textReaderStore.preferences.controlsExpanded) {
        textReaderStore.setControlsExpanded(false)
      }
    } else if (currentScrollY < lastScrollY.value) {
      if (!textReaderStore.preferences.controlsExpanded) {
        textReaderStore.setControlsExpanded(true)
      }
    }

    lastScrollY.value = currentScrollY
  }
}

function handleKeyPress(e: KeyboardEvent) {
  if (!activeFile.value) return
  if (e.key === 'ArrowLeft') {
    textReaderStore.prevPage(activeFile.value)
  } else if (e.key === 'ArrowRight') {
    textReaderStore.nextPage(activeFile.value)
  } else if (e.key === ' ') {
    e.preventDefault()
    ;(async () => {
      try {
        textReaderStore.setError(activeFile.value, '')
        await textReaderStore.toggleAudio(activeFile.value)
      } catch (err) {
        console.error('Audio playback error:', err)
        textReaderStore.setError(activeFile.value, t('bookReading.ttsError') || 'Failed to play audio')
      }
    })()
  }
}

// Reader events are now handled in the store

onMounted(() => {
  textReaderStore.init()
  if (activeFile.value) textReaderStore.loadFile(activeFile.value)
  window.addEventListener('keydown', handleKeyPress)

  const scrollContainer = document.querySelector('.overflow-y-auto')
  if (scrollContainer) {
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
    lastScrollY.value = scrollContainer.scrollTop
  }
})

onUnmounted(() => {
  if (activeFile.value) {
    textReaderStore.updateReadingPosition(activeFile.value, {
      currentPage: textReaderStore.getReadingPosition(activeFile.value)?.currentPage ?? 0,
      currentSentenceIndex: currentSentenceGlobal.value,
    })
  }

  window.removeEventListener('keydown', handleKeyPress)

  const scrollContainer = document.querySelector('.overflow-y-auto')
  if (scrollContainer) {
    scrollContainer.removeEventListener('scroll', handleScroll)
  }
  // Reader cleanup is handled by the store-managed manager
})

watch(
  () => textReaderStore.getReadingPosition(activeFile.value)?.currentSentenceIndex,
  (idx, old) => {
    if (typeof idx === 'number' && idx !== old) {
      scrollToCurrentSentence()
    }
  }
)

watch(
  () => activeFile.value,
  (val, old) => {
    if (val && val !== old) {
      textReaderStore.loadFile(val)
    }
  }
)
</script>

<style>
/* Use global styles for v-html rendered content */
.reading-sentence {
  background-color: rgba(255, 255, 0, 0.4);
  padding: 2px 4px;
  border-radius: 2px;
  transition: background-color 0.3s ease;
  box-shadow: 0 0 0 2px rgba(255, 255, 0, 0.2);
}

.dark .reading-sentence {
  background-color: rgba(255, 215, 0, 0.3);
  box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.15);
}
</style>