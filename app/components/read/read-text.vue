<template>
  <div
    class="min-h-full bg-white text-neutral-900 transition-colors dark:bg-neutral-900 dark:text-neutral-200"
    :class="themeClass"
  >
    <Controls />

  <div class="max-w-[800px] mx-auto p-8 leading-8 sm:p-4" :style="{ fontSize: textReaderStore.preferences.fontSize + 'px' }">
      <div v-if="loading" class="text-center p-8 text-base">{{ t('bookReading.loading') }}...</div>
      <div v-else-if="error" class="text-center p-8 text-base text-red-600 dark:text-red-400">{{ error }}</div>
      <div v-else-if="currentPageContent" class="space-y-2" v-html="currentPageContent"></div>
      <div v-else class="text-center p-8 text-base">{{ t('bookReading.noContent') }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick, provide } from 'vue'
import { useI18n } from 'vue-i18n'
import Controls from './Controls.vue'
import { splitIntoSentences, escapeHtml } from '../../utils/text'
import { useThemeStore } from '~/stores/useThemeStore'
import { useTextReaderStore, type ReadingPosition } from '~/stores/useTextReaderStore'
import { useBookReadingStore } from '~/stores/useBookReadingStore'
import { getReaderManager } from '~/utils/reader/manager'
import { createTTSFetcher } from '~/utils/reader/ttsFetcher'
import { getDefaultEngine, setDefaultEngine } from '~/utils/tts/tts'
import type { TTSEngine } from '~/utils/tts/tts'

const props = defineProps<{
  filePath: string
}>()

const { t } = useI18n()
const bookReadingStore = useBookReadingStore()
const themeStore = useThemeStore()
const textReaderStore = useTextReaderStore()

const loading = ref(true)
const error = ref('')
const textContent = ref('')
const currentPage = ref(0)
const themeClass = themeStore.themeClass
const rawFileData = ref<Uint8Array | null>(null)
const lastScrollY = ref(0)
const currentSentenceGlobal = ref(-1)
const activeSentences = ref<string[]>([])
const isSessionReady = ref(false)

const BUFFER_SIZE = 5
const readerManager = getReaderManager()
const ttsFetcher = createTTSFetcher()

const ttsEngine = ref<TTSEngine>(getDefaultEngine())
watch(ttsEngine, (val) => setDefaultEngine(val))

provide('filePath', computed(() => props.filePath))
provide('currentPage', computed(() => currentPage.value))
provide('totalPages', computed(() => totalPages.value))
provide('onEncodingChange', onEncodingChange)
provide('toggleAudio', toggleAudio)
provide('goToPage', goToPage)

const pages = computed(() => {
  if (!textContent.value) return []
  const lines = textContent.value.split('\n')
  const result: string[] = []
  for (let i = 0; i < lines.length; i += textReaderStore.preferences.linesPerPage) {
    result.push(lines.slice(i, i + textReaderStore.preferences.linesPerPage).join('\n'))
  }
  return result
})

const pageSentenceMeta = computed(() => {
  const meta: Array<{ offset: number; count: number }> = []
  let offset = 0
  for (const page of pages.value) {
    const count = splitIntoSentences(page).length
    meta.push({ offset, count })
    offset += count
  }
  return meta
})

const totalPages = computed(() => pages.value.length || 1)

const currentSentenceInPage = computed(() => {
  const meta = pageSentenceMeta.value[currentPage.value]
  if (!meta) return -1
  if (currentSentenceGlobal.value < meta.offset || currentSentenceGlobal.value >= meta.offset + meta.count) {
    return -1
  }
  return currentSentenceGlobal.value - meta.offset
})

const currentPageContent = computed(() => {
  const content = pages.value[currentPage.value] || ''
  const meta = pageSentenceMeta.value[currentPage.value]
  let sentenceCounter = 0
  return content
    .split('\n')
    .map((line) => {
      if (!line.trim()) return '<p>&nbsp;</p>'
      const lineSentences = splitIntoSentences(line)
      const htmlLine = lineSentences
        .map((sentence) => {
          const globalIdx = (meta?.offset ?? 0) + sentenceCounter++
          const isCurrent = globalIdx === currentSentenceGlobal.value
          const className = isCurrent ? 'reading-sentence' : ''
          const dataAttr = `data-sentence-idx="${globalIdx}"`
          return `<span class="${className}" ${dataAttr}>${escapeHtml(sentence)}</span>`
        })
        .join('')
      return `<p>${htmlLine || '&nbsp;'}</p>`
    })
    .join('')
})

function getSentenceIndexForPage(page: number) {
  const meta = pageSentenceMeta.value[page]
  if (!meta || meta.count === 0) return -1
  return meta.offset
}

function findPageForSentence(index: number) {
  if (index < 0) return currentPage.value
  const metaList = pageSentenceMeta.value
  for (let i = 0; i < metaList.length; i++) {
    const meta = metaList[i]
    if (!meta) continue
    if (index >= meta.offset && index < meta.offset + meta.count) {
      return i
    }
  }
  return metaList.length ? metaList.length - 1 : 0
}

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

function syncPageToSentence(index: number) {
  const targetPage = findPageForSentence(index)
  if (targetPage !== currentPage.value) {
    currentPage.value = targetPage
  }
}

function ensureReaderSession(position?: ReadingPosition) {
  const sentences = splitIntoSentences(textContent.value || '')
  activeSentences.value = sentences

  const total = sentences.length
  if (!total) {
    currentSentenceGlobal.value = -1
    readerManager.loadSession({
      id: props.filePath,
      sentences,
    })
    isSessionReady.value = true
    return
  }

  const preferredPage = position?.currentPage ?? currentPage.value
  const preferredSentence = typeof position?.currentSentenceIndex === 'number' ? position.currentSentenceIndex : -1
  let startIndex = preferredSentence >= 0 ? preferredSentence : getSentenceIndexForPage(preferredPage)

  if (typeof startIndex !== 'number' || startIndex < 0 || startIndex >= total) {
    startIndex = 0
  }

  currentSentenceGlobal.value = preferredSentence >= 0 ? preferredSentence : startIndex

  readerManager.loadSession({
    id: props.filePath,
    sentences,
    startIndex,
  })

  isSessionReady.value = true
}

function updateBookProgress() {
  if (bookReadingStore.currentBook && bookReadingStore.currentBook.id === props.filePath) {
    bookReadingStore.updateProgress(props.filePath, currentPage.value, totalPages.value)
  }
}

function recordSentenceProgress(index: number) {
  textReaderStore.updateReadingPosition(props.filePath, {
    currentPage: currentPage.value,
    currentSentenceIndex: index,
  })
  updateBookProgress()
}

async function toggleAudio() {
  if (!isSessionReady.value || !activeSentences.value.length) return

  // Immediate UI toggle regardless of engine state
  const nowPlaying = textReaderStore.audioState.isPlaying
  if (nowPlaying) {
    // Switch to paused state immediately and let current sentence finish
    textReaderStore.setAudioPlaying(false)
    try {
      readerManager.pause({ finishSentence: true })
    } catch (_) {}
    return
  }

  // Switch to playing state immediately
  textReaderStore.setAudioPlaying(true)

  const fallbackIndex = Math.max(getSentenceIndexForPage(currentPage.value), 0)
  const startIndex = currentSentenceGlobal.value >= 0 ? currentSentenceGlobal.value : fallbackIndex

  try {
    textReaderStore.setAudioLoading(true)
    error.value = ''
    // If there is a current index, resume; else start from startIndex
    if (readerManager.getCurrentIndex() >= 0) {
      await readerManager.resume()
    } else {
      await readerManager.playFrom(startIndex)
    }
  } catch (err) {
    console.error('Audio playback error:', err)
    error.value = t('bookReading.ttsError') || 'Failed to play audio'
    textReaderStore.setAudioPlaying(false)
  } finally {
    textReaderStore.setAudioLoading(false)
  }
}

function goToPage(page: number) {
  const clamped = Math.max(0, Math.min(page, totalPages.value - 1))
  if (clamped === currentPage.value) {
    return
  }
  currentPage.value = clamped
  const sentenceIdx = getSentenceIndexForPage(clamped)
  if (sentenceIdx >= 0) {
    currentSentenceGlobal.value = sentenceIdx
    readerManager.seek(sentenceIdx)
  } else {
    currentSentenceGlobal.value = -1
    readerManager.seek(-1)
  }
  textReaderStore.updateReadingPosition(props.filePath, {
    currentPage: clamped,
    currentSentenceIndex: currentSentenceGlobal.value,
  })
  updateBookProgress()
}

function nextPage() {
  if (currentPage.value < totalPages.value - 1) {
    goToPage(currentPage.value + 1)
  }
}

function prevPage() {
  if (currentPage.value > 0) {
    goToPage(currentPage.value - 1)
  }
}

function toggleControls() {
  textReaderStore.setControlsExpanded(!textReaderStore.preferences.controlsExpanded)
  textReaderStore.setAutoMode(false)
}

async function onEncodingChange() {
  if (!rawFileData.value) return

  try {
    textContent.value = textReaderStore.decodeFile(props.filePath, rawFileData.value)
    currentPage.value = 0
    currentSentenceGlobal.value = -1
    ensureReaderSession()
  } catch (err) {
    console.error('Error changing encoding:', err)
    error.value = 'Error decoding file with selected encoding: ' + (err as Error).message
  }
}

async function loadFile() {
  loading.value = true
  error.value = ''
  isSessionReady.value = false

  try {
    const opfs = await import('~/utils/opfs')
    const content = await opfs.readFile(props.filePath)

    if (content === null) {
      error.value = 'Failed to load file'
      return
    }

    let data: Uint8Array
    if (typeof content === 'string') {
      const encoder = new TextEncoder()
      data = encoder.encode(content)
    } else if (content instanceof ArrayBuffer) {
      data = new Uint8Array(content)
    } else {
      data = new Uint8Array(content as Uint8Array)
    }

    rawFileData.value = data

    textReaderStore.loadEncodingSettings(props.filePath)
    textContent.value = textReaderStore.decodeFile(props.filePath, data)

    const position = textReaderStore.loadReadingPosition(props.filePath)
    currentPage.value = position.currentPage || 0
    currentSentenceGlobal.value = typeof position.currentSentenceIndex === 'number' ? position.currentSentenceIndex : -1

    ensureReaderSession(position)
    updateBookProgress()

    if (!bookReadingStore.currentBook || bookReadingStore.currentBook.id !== props.filePath) {
      const fileName = props.filePath.split('/').pop() || props.filePath
      const book = {
        id: props.filePath,
        title: fileName,
        filePath: props.filePath,
        total: totalPages.value,
        current: currentPage.value,
        lastRead: Date.now(),
      }
      bookReadingStore.setCurrentBook(book)
    }
  } catch (err) {
    console.error('Error loading file:', err)
    error.value = 'Error loading file: ' + (err as Error).message
  } finally {
    loading.value = false
  }
}

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
  if (e.key === 'ArrowLeft') {
    prevPage()
  } else if (e.key === 'ArrowRight') {
    nextPage()
  } else if (e.key === ' ') {
    e.preventDefault()
    toggleAudio()
  }
}

const readerEvents = {
  onSentenceStart: (index: number) => {
    currentSentenceGlobal.value = index
    syncPageToSentence(index)
    scrollToCurrentSentence()
    recordSentenceProgress(index)
  },
  onSentenceEnd: (index: number) => {
    recordSentenceProgress(index)
  },
  onQueueComplete: () => {
    textReaderStore.setAudioPlaying(false)
    textReaderStore.setAudioLoading(false)
  },
  onError: (err: unknown) => {
    console.error('Reader queue error:', err)
    error.value = t('bookReading.ttsError') || 'Failed to play audio'
    textReaderStore.setAudioPlaying(false)
    textReaderStore.setAudioLoading(false)
  },
  onAudioPlay: () => {
    // Ignore play events while UI is in paused state (e.g., finish-current behavior)
    try {
      // Prefer class method; fallback to any
      // @ts-ignore
      const paused = typeof (readerManager as any).isPaused === 'function' ? (readerManager as any).isPaused() === true : false
      if (paused) return
    } catch (_) {}
    textReaderStore.setAudioPlaying(true)
  },
  onAudioPause: () => {
    textReaderStore.setAudioPlaying(false)
  },
}

onMounted(() => {
  textReaderStore.init()
  readerManager.configure({ bufferSize: BUFFER_SIZE, fetcher: ttsFetcher, events: readerEvents })

  loadFile()
  window.addEventListener('keydown', handleKeyPress)

  const scrollContainer = document.querySelector('.overflow-y-auto')
  if (scrollContainer) {
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
    lastScrollY.value = scrollContainer.scrollTop
  }
})

onUnmounted(() => {
  textReaderStore.updateReadingPosition(props.filePath, {
    currentPage: currentPage.value,
    currentSentenceIndex: currentSentenceGlobal.value,
  })
  updateBookProgress()

  window.removeEventListener('keydown', handleKeyPress)

  const scrollContainer = document.querySelector('.overflow-y-auto')
  if (scrollContainer) {
    scrollContainer.removeEventListener('scroll', handleScroll)
  }

  readerManager.pause()
  readerManager.setEvents({})
})

watch(() => currentPage.value, (newPage, oldPage) => {
  if (!isSessionReady.value || newPage === oldPage) return
  textReaderStore.updateReadingPosition(props.filePath, {
    currentPage: newPage,
    currentSentenceIndex: currentSentenceGlobal.value,
  })
  updateBookProgress()
})

watch(totalPages, () => {
  updateBookProgress()
})

watch(
  () => textReaderStore.getReadingPosition(props.filePath),
  (position) => {
    if (!position) return
    if (position.currentPage !== currentPage.value) {
      currentPage.value = position.currentPage
    }
    if (typeof position.currentSentenceIndex === 'number' && position.currentSentenceIndex !== currentSentenceGlobal.value) {
      currentSentenceGlobal.value = position.currentSentenceIndex
      readerManager.seek(position.currentSentenceIndex)
      scrollToCurrentSentence()
    }
  }
)

watch(
  () => props.filePath,
  () => {
    currentPage.value = 0
    currentSentenceGlobal.value = -1
    loadFile()
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