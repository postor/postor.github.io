<template>
  <div
    class="min-h-full bg-white text-neutral-900 transition-colors dark:bg-neutral-900 dark:text-neutral-200"
    :class="themeClass"
  >
    <!-- Sticky Controls at Top, Expand/Collapse at Bottom of Controls -->
    <div class="sticky top-0 z-20">
      <div class="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 shadow-lg">
        <div v-show="controlsExpanded" class="flex flex-col sm:flex-row items-center justify-center gap-4 p-4">
          <div class="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
            <button
              @click="prevPage"
              :disabled="currentPage <= 0"
              class="px-3 py-2 border rounded text-sm transition bg-white border-neutral-300 hover:bg-neutral-100 hover:border-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-700 dark:hover:border-neutral-500"
            >
              ← {{ t('bookReading.prev') }}
            </button>
            <span class="font-medium min-w-20 text-center">{{ currentPage + 1 }} / {{ totalPages }}</span>
            <button
              @click="nextPage"
              :disabled="currentPage >= totalPages - 1"
              class="px-3 py-2 border rounded text-sm transition bg-white border-neutral-300 hover:bg-neutral-100 hover:border-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-700 dark:hover:border-neutral-500"
            >
              {{ t('bookReading.next') }} →
            </button>
          </div>
          <div class="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
            <label class="flex items-center gap-2 text-sm">
              <span>{{ t('bookReading.encoding') || 'Encoding' }}:</span>
              <select
                v-model="selectedEncoding"
                @change="onEncodingChange"
                class="px-2 py-1 border rounded bg-white border-neutral-300 dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-200"
              >
                <option value="auto">Auto Detect</option>
                <option value="utf-8">UTF-8</option>
                <option value="gbk">GBK</option>
                <option value="gb2312">GB2312</option>
                <option value="big5">Big5</option>
                <option value="shift_jis">Shift-JIS</option>
                <option value="euc-jp">EUC-JP</option>
                <option value="euc-kr">EUC-KR</option>
                <option value="windows-1252">Windows-1252</option>
                <option value="iso-8859-1">ISO-8859-1</option>
              </select>
              <span
                v-if="detectedEncoding"
                class="text-xs text-neutral-500 italic dark:text-neutral-400"
                :title="`Detected: ${detectedEncoding}`"
              >
                ({{ detectedEncoding }})
              </span>
            </label>
            <label class="flex items-center gap-2 text-sm">
              <span>{{ t('bookReading.fontSize') }}:</span>
              <select
                v-model="fontSize"
                class="px-2 py-1 border rounded bg-white border-neutral-300 dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-200"
              >
                <option value="14">14px</option>
                <option value="16">16px</option>
                <option value="18">18px</option>
                <option value="20">20px</option>
                <option value="24">24px</option>
                <option value="28">28px</option>
                <option value="32">32px</option>
              </select>
            </label>
            <button
              @click="toggleTheme"
              class="px-3 py-2 border rounded text-sm transition bg-white border-neutral-300 hover:bg-neutral-100 hover:border-neutral-400 dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-700 dark:hover:border-neutral-500"
            >
              {{ themeStore.isDark ? '☀️' : '🌙' }}
            </button>
            <button
              @click="toggleAudio"
              :disabled="isLoadingAudio"
              class="px-3 py-2 border rounded text-sm transition bg-white border-neutral-300 hover:bg-neutral-100 hover:border-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-700 dark:hover:border-neutral-500"
            >
              {{ isPlaying ? '⏸️' : '▶️' }}
            </button>
          </div>
        </div>
        <!-- Expand/Collapse toggle at bottom of controls -->
        <div 
          @click="toggleControls" 
          class="cursor-pointer px-4 py-1 text-center select-none text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 border-t border-neutral-200 dark:border-neutral-600"
        >
          {{ controlsExpanded ? (t('bookReading.hide') || '▲ Hide Controls') : (t('bookReading.show') || '▼ Show Controls') }}
        </div>
      </div>
    </div>

  <div class="max-w-[800px] mx-auto p-8 leading-8 sm:p-4" :style="{ fontSize: fontSize + 'px' }">
      <div v-if="loading" class="text-center p-8 text-base">{{ t('bookReading.loading') }}...</div>
      <div v-else-if="error" class="text-center p-8 text-base text-red-600 dark:text-red-400">{{ error }}</div>
      <div v-else-if="currentPageContent" class="space-y-2" v-html="currentPageContent"></div>
      <div v-else class="text-center p-8 text-base">{{ t('bookReading.noContent') }}</div>
    </div>

    <audio ref="audioPlayer" @ended="onAudioEnded" @play="isPlaying = true" @pause="isPlaying = false" style="display: none;"></audio>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as tts from '@mintplex-labs/piper-tts-web'
import * as iconv from 'iconv-lite'
import jschardet from 'jschardet'
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

// Use store for these values
const fontSize = computed({
  get: () => textReaderStore.preferences.fontSize,
  set: (val) => textReaderStore.setFontSize(val)
})

const controlsExpanded = computed({
  get: () => textReaderStore.preferences.controlsExpanded,
  set: (val) => textReaderStore.setControlsExpanded(val)
})

const isAutoMode = computed({
  get: () => textReaderStore.preferences.autoMode,
  set: (val) => textReaderStore.setAutoMode(val)
})

const linesPerPage = computed({
  get: () => textReaderStore.preferences.linesPerPage,
  set: (val) => textReaderStore.setLinesPerPage(val)
})

const selectedEncoding = computed({
  get: () => textReaderStore.getEncodingSettings(props.filePath).selectedEncoding,
  set: (val) => textReaderStore.setEncodingSettings(props.filePath, { selectedEncoding: val })
})

const detectedEncoding = computed({
  get: () => textReaderStore.getEncodingSettings(props.filePath).detectedEncoding,
  set: (val) => textReaderStore.setEncodingSettings(props.filePath, { detectedEncoding: val })
})

const isPlaying = computed({
  get: () => textReaderStore.audioState.isPlaying,
  set: (val) => textReaderStore.setAudioPlaying(val)
})

const isLoadingAudio = computed({
  get: () => textReaderStore.audioState.isLoadingAudio,
  set: (val) => textReaderStore.setAudioLoading(val)
})

// Parse content into pages
const pages = computed(() => {
  if (!textContent.value) return []
  const lines = textContent.value.split('\n')
  const result: string[] = []
  for (let i = 0; i < lines.length; i += linesPerPage.value) {
    result.push(lines.slice(i, i + linesPerPage.value).join('\n'))
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
function toggleTheme() {
  themeStore.setTheme(themeStore.isDark ? 'light' : 'dark')
}

// Controls toggle
function toggleControls() {
  controlsExpanded.value = !controlsExpanded.value
  isAutoMode.value = false // Disable auto mode when manually toggled
}

// Audio
async function toggleAudio() {
  if (isPlaying.value) {
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
    
    // Initialize voices if needed
    const voices = await tts.voices()
    
    // Use Chinese voice if available, fallback to first available
    let voiceId = 'zh_CN-huayan-medium'
    const hasChineseVoice = voices.some((v: any) => v.key === voiceId)
    if (!hasChineseVoice && voices.length > 0 && voices[0]) {
      voiceId = voices[0].key
    }

    const wav = await tts.predict({
      text: sentenceText.trim(),
      voiceId: voiceId,
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

// Decode text from raw data with specified encoding
function decodeText(data: Uint8Array, encoding: string): string {
  try {
    // iconv-lite works with Uint8Array in browser
    const decoded = iconv.decode(data, encoding)
    return decoded
  } catch (err) {
    console.error('Error decoding with encoding:', encoding, err)
    throw new Error(`Failed to decode with encoding: ${encoding}`)
  }
}

// Detect encoding from raw data
function detectEncoding(data: Uint8Array): string {
  try {
    // jschardet can work with string created from the binary data
    // Convert Uint8Array to a binary string for jschardet
    let binaryString = ''
    const len = Math.min(data.length, 100000) // Sample first 100KB for detection
    for (let i = 0; i < len; i++) {
      const byte = data[i]
      if (byte !== undefined) {
        binaryString += String.fromCharCode(byte)
      }
    }
    
    const result = jschardet.detect(binaryString)
    if (result && result.encoding) {
      console.log('Detected encoding:', result.encoding, 'confidence:', result.confidence)
      // Map common encoding names to iconv-lite compatible names
      const encodingMap: Record<string, string> = {
        'GB2312': 'gbk',
        'GB18030': 'gbk',
        'windows-1252': 'windows-1252',
        'UTF-8': 'utf-8',
        'Big5': 'big5',
        'SHIFT_JIS': 'shift_jis',
        'EUC-JP': 'euc-jp',
        'EUC-KR': 'euc-kr',
      }
      return encodingMap[result.encoding] || result.encoding.toLowerCase()
    }
  } catch (err) {
    console.error('Error detecting encoding:', err)
  }
  return 'utf-8'
}

// Handle encoding change
function onEncodingChange() {
  if (!rawFileData.value) return
  
  try {
    let encoding = selectedEncoding.value
    
    if (encoding === 'auto') {
      encoding = detectEncoding(rawFileData.value)
      detectedEncoding.value = encoding
    } else {
      detectedEncoding.value = ''
    }
    
    textContent.value = decodeText(rawFileData.value, encoding)
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
    
    // Decode with selected or auto-detected encoding
    let encoding = selectedEncoding.value
    if (encoding === 'auto') {
      encoding = detectEncoding(data)
      detectedEncoding.value = encoding
    } else {
      detectedEncoding.value = ''
    }
    
    textContent.value = decodeText(data, encoding)
    
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
  if (!isAutoMode.value) return
  
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
      if (controlsExpanded.value) {
        controlsExpanded.value = false
      }
    } else if (currentScrollY < lastScrollY.value) {
      // Scrolling up - expand
      if (!controlsExpanded.value) {
        controlsExpanded.value = true
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