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

  <audio ref="audioPlayer" @ended="onAudioEnded" @play="textReaderStore.setAudioPlaying(true)" @pause="textReaderStore.setAudioPlaying(false)" style="display: none;"></audio>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick, provide } from 'vue'
import Controls from './Controls.vue'
import { getVoices, predict as ttsPredict } from '~/utils/tts/tts'
import { useThemeStore } from '~/stores/useThemeStore'
import { useTextReaderStore } from '~/stores/useTextReaderStore'

const props = defineProps<{
  filePath: string
}>()

const { t } = useI18n()
const bookReadingStore = useBookReadingStore()
const themeStore = useThemeStore()
const textReaderStore = useTextReaderStore()

// State
const loading = ref(true)
const error = ref('')
const textContent = ref('')
const currentPage = ref(0)
const themeClass = themeStore.themeClass
const audioPlayer = ref<HTMLAudioElement | null>(null)
const rawFileData = ref<Uint8Array | null>(null)
const lastScrollY = ref(0)
const currentSentenceIndex = ref<number>(-1)
const sentences = ref<string[]>([])
const currentSentenceInPage = ref<number>(-1)

// Provide context to Controls component
provide('filePath', computed(() => props.filePath))
provide('currentPage', computed(() => currentPage.value))
provide('totalPages', computed(() => totalPages.value))
provide('onEncodingChange', onEncodingChange)


// Use the Pinia store directly (access reactive properties and call actions)

// TTS Engine selection
import { getDefaultEngine, setDefaultEngine } from '~/utils/tts/tts'
import type { TTSEngine } from '~/utils/tts/tts'
const ttsEngine = ref<TTSEngine>(getDefaultEngine())
watch(ttsEngine, (val) => {
  setDefaultEngine(val)
})

// Parse content into pages
const pages = computed(() => {
  if (!textContent.value) return []
  const lines = textContent.value.split('\n')
  const result: string[] = []
  for (let i = 0; i < lines.length; i += textReaderStore.preferences.linesPerPage) {
    result.push(lines.slice(i, i + textReaderStore.preferences.linesPerPage).join('\n'))
  }
  return result
})

const totalPages = computed(() => pages.value.length || 1)

const currentPageContent = computed(() => {
  const content = pages.value[currentPage.value] || ''
  // Split content into sentences for highlighting
  const pageSentences = splitIntoSentences(content)
  sentences.value = pageSentences
  
  // Convert to HTML with line breaks and sentence highlighting
  let sentenceCounter = 0
  return content.split('\n').map(line => {
    if (!line.trim()) return '<p>&nbsp;</p>'
    
    // Split line into sentences and wrap each one
    const lineSentences = splitIntoSentences(line)
    const htmlLine = lineSentences.map((sentence, idx) => {
      const globalIdx = sentenceCounter++
      const isCurrentSentence = globalIdx === currentSentenceInPage.value
      const className = isCurrentSentence ? 'reading-sentence' : ''
      const dataAttr = `data-sentence-idx="${globalIdx}"`
      return `<span class="${className}" ${dataAttr}>${escapeHtml(sentence)}</span>`
    }).join('')
    
    return `<p>${htmlLine || '&nbsp;'}</p>`
  }).join('')
})

// Helper function to split text into sentences
function splitIntoSentences(text: string): string[] {
  if (!text) return []
  // Split by common sentence endings (period, exclamation, question mark, Chinese periods)
  // Keep the punctuation with the sentence
  const regex = /[^。！？\.!\?]+[。！？\.!\?]*/g
  const matches = text.match(regex) || []
  return matches.filter(s => s.trim().length > 0)
}

// Scroll current sentence to middle of viewport
function scrollToCurrentSentence() {
  nextTick(() => {
    const sentenceElement = document.querySelector(`[data-sentence-idx="${currentSentenceInPage.value}"]`)
    if (sentenceElement) {
      sentenceElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      })
    }
  })
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Navigation
function nextPage() {
  if (currentPage.value < totalPages.value - 1) {
    currentPage.value++
    currentSentenceInPage.value = -1
    textReaderStore.setReadingPosition(props.filePath, currentPage.value)
    updateBookProgress()
  }
}

function prevPage() {
  if (currentPage.value > 0) {
    currentPage.value--
    currentSentenceInPage.value = -1
    textReaderStore.setReadingPosition(props.filePath, currentPage.value)
    updateBookProgress()
  }
}

// Theme
// Controls toggle (moved theme toggle to Controls component)
function toggleControls() {
  textReaderStore.setControlsExpanded(!textReaderStore.preferences.controlsExpanded)
  textReaderStore.setAutoMode(false)
}

// Audio
async function toggleAudio() {
  if (textReaderStore.audioState.isPlaying) {
    audioPlayer.value?.pause()
    currentSentenceInPage.value = -1
  } else {
    currentSentenceInPage.value = 0
    await playCurrentSentence()
  }
}

async function playCurrentSentence() {
  if (currentSentenceInPage.value >= sentences.value.length) {
    // Reached end of page, move to next page
    if (currentPage.value < totalPages.value - 1) {
      nextPage()
      await nextTick()
      currentSentenceInPage.value = 0
      setTimeout(() => playCurrentSentence(), 500)
    } else {
      // End of book
      currentSentenceInPage.value = -1
      textReaderStore.setAudioPlaying(false)
    }
    return
  }

  const sentenceText = sentences.value[currentSentenceInPage.value]
  if (!sentenceText || !audioPlayer.value) {
    currentSentenceInPage.value++
    playCurrentSentence()
    return
  }

  // Scroll to current sentence
  scrollToCurrentSentence()

  try {
    textReaderStore.setAudioLoading(true)
    
    // Use the current engine from the TTS manager so Controls changes take effect
    const currentEngine = getDefaultEngine()
    const voices = await getVoices(currentEngine)
    // Use Chinese voice if available, fallback to first available
    let voiceId = ''
    if (currentEngine === 'piper') {
      voiceId = 'zh_CN-huayan-medium'
    } else if (currentEngine === 'kokoro') {
      // 默认用af_heart，若不存在则用第一个
      voiceId = 'af_heart'
    }
    const hasVoice = voices.some((v) => v.key === voiceId)
    if (!hasVoice && voices.length > 0 && voices[0]) {
      voiceId = voices[0].key
    }
    const wav = await ttsPredict({
      text: sentenceText.trim(),
      voiceId,
      engine: currentEngine,
    })
    const url = URL.createObjectURL(wav)
    audioPlayer.value.src = url
    await audioPlayer.value.play()
  } catch (err) {
    console.error('Audio playback error:', err)
    error.value = 'Failed to play audio'
    currentSentenceInPage.value = -1
    textReaderStore.setAudioPlaying(false)
  } finally {
    textReaderStore.setAudioLoading(false)
  }
}

async function playCurrentPage() {
  // Start reading from first sentence
  currentSentenceInPage.value = 0
  await playCurrentSentence()
}

function onAudioEnded() {
  // Move to next sentence
  currentSentenceInPage.value++
  playCurrentSentence()
}

// Update book progress in bookReadingStore
function updateBookProgress() {
  if (bookReadingStore.currentBook && bookReadingStore.currentBook.id === props.filePath) {
    bookReadingStore.updateProgress(props.filePath, currentPage.value, totalPages.value)
  }
}

// Encoding/detection/decoding moved to `textReaderStore.decodeFile` and `textReaderStore.detectEncoding`.

// Handle encoding change
function onEncodingChange() {
  if (!rawFileData.value) return
  
  try {
    // Delegate decoding to the store (it will read selectedEncoding and update detectedEncoding)
    textContent.value = textReaderStore.decodeFile(props.filePath, rawFileData.value)
    currentPage.value = 0
  } catch (err) {
    console.error('Error changing encoding:', err)
    error.value = 'Error decoding file with selected encoding: ' + (err as Error).message
  }
}

// Load file content
async function loadFile() {
  loading.value = true
  error.value = ''
  
  try {
    // Import opfs dynamically to avoid SSR issues
    const opfs = await import('~/utils/opfs')
    const content = await opfs.readFile(props.filePath)
    
    if (content === null) {
      error.value = 'Failed to load file'
      return
    }
    
    // Convert to Uint8Array for encoding detection and conversion
    let data: Uint8Array
    if (typeof content === 'string') {
      // If we got a string, convert to Uint8Array (shouldn't happen with ArrayBuffer return)
      const encoder = new TextEncoder()
      data = encoder.encode(content)
    } else if (content instanceof ArrayBuffer) {
      data = new Uint8Array(content)
    } else {
      data = new Uint8Array(content)
    }
    
    // Store raw data for encoding changes
    rawFileData.value = data
    
    // Load encoding settings from store
    textReaderStore.loadEncodingSettings(props.filePath)
    
    // Delegate decoding to the store (it will read selectedEncoding and update detectedEncoding)
    textContent.value = textReaderStore.decodeFile(props.filePath, data)
    
    // Load reading position from store
    currentPage.value = textReaderStore.loadReadingPosition(props.filePath)
    
    // Set current book in store if not already set
    if (!bookReadingStore.currentBook || bookReadingStore.currentBook.id !== props.filePath) {
      const fileName = props.filePath.split('/').pop() || props.filePath
      const book = {
        id: props.filePath,
        title: fileName,
        filePath: props.filePath,
        total: 0, // Will be updated when pages are calculated
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

// Scroll handler for auto collapse/expand
function handleScroll() {
  if (!textReaderStore.preferences.autoMode) return
  
  // Get the scroll container (parent element with overflow)
  const scrollContainer = document.querySelector('.overflow-y-auto')
  if (!scrollContainer) return
  
  const currentScrollY = scrollContainer.scrollTop
  const scrollThreshold = 100
  
  // Only trigger if scroll delta is significant (at least 10px)
  const scrollDelta = Math.abs(currentScrollY - lastScrollY.value)
  
  if (scrollDelta > 10) {
    if (currentScrollY > lastScrollY.value && currentScrollY > scrollThreshold) {
      // Scrolling down significantly - collapse
      if (textReaderStore.preferences.controlsExpanded) {
        textReaderStore.setControlsExpanded(false)
      }
    } else if (currentScrollY < lastScrollY.value) {
      // Scrolling up - expand
      if (!textReaderStore.preferences.controlsExpanded) {
        textReaderStore.setControlsExpanded(true)
      }
    }
    
    lastScrollY.value = currentScrollY
  }
}

// Keyboard shortcuts
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

onMounted(() => {
  // Initialize store
  textReaderStore.init()
  
  loadFile()
  window.addEventListener('keydown', handleKeyPress)
  
  // Add scroll listener to the scroll container
  const scrollContainer = document.querySelector('.overflow-y-auto')
  if (scrollContainer) {
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
    lastScrollY.value = scrollContainer.scrollTop
  }
})

// Watch for total pages changes to update store
watch(totalPages, (newTotal) => {
  updateBookProgress()
})

// Watch for reading position changes from store (e.g., from Controls component)
watch(() => textReaderStore.getReadingPosition(props.filePath), (position) => {
  if (position && position.currentPage !== currentPage.value) {
    currentPage.value = position.currentPage
    currentSentenceInPage.value = -1
    updateBookProgress()
  }
})

// Watch for audio state changes from store (e.g., from Controls component)
watch(() => textReaderStore.audioState.isPlaying, (newIsPlaying, oldIsPlaying) => {
  if (newIsPlaying !== oldIsPlaying) {
    if (newIsPlaying && !audioPlayer.value?.src) {
      // Start playing audio from Controls component
      currentSentenceInPage.value = 0
      playCurrentSentence()
    } else if (!newIsPlaying && audioPlayer.value) {
      // Stop playing audio from Controls component
      audioPlayer.value.pause()
      currentSentenceInPage.value = -1
    }
  }
})

onUnmounted(() => {
  // Save final reading position
  textReaderStore.setReadingPosition(props.filePath, currentPage.value)
  updateBookProgress()
  
  window.removeEventListener('keydown', handleKeyPress)
  
  // Remove scroll listener from the scroll container
  const scrollContainer = document.querySelector('.overflow-y-auto')
  if (scrollContainer) {
    scrollContainer.removeEventListener('scroll', handleScroll)
  }
  
  // Clean up audio URL
  if (audioPlayer.value?.src) {
    URL.revokeObjectURL(audioPlayer.value.src)
  }
})

// Watch for file path changes
  watch(() => props.filePath, () => {
  currentPage.value = 0
  loadFile()
})
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