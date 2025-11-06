<template>
  <div
    class="min-h-screen bg-white text-neutral-900 transition-colors dark:bg-neutral-900 dark:text-neutral-200"
    :class="{ dark: isDarkMode }"
  >
    <div
      class="flex flex-col items-stretch gap-4 p-4 border-b bg-neutral-50 dark:bg-neutral-800 dark:border-neutral-700 sm:flex-row sm:items-center sm:justify-between"
    >
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
          {{ isDarkMode ? '☀️' : '🌙' }}
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import * as tts from '@mintplex-labs/piper-tts-web'
import * as iconv from 'iconv-lite'
import jschardet from 'jschardet'

const props = defineProps<{
  filePath: string
}>()

const { t } = useI18n()

// State
const loading = ref(true)
const error = ref('')
const textContent = ref('')
const currentPage = ref(0)
const fontSize = ref(18)
const isDarkMode = ref(false)
const isPlaying = ref(false)
const isLoadingAudio = ref(false)
const audioPlayer = ref<HTMLAudioElement | null>(null)
const linesPerPage = ref(20)
const selectedEncoding = ref('auto')
const detectedEncoding = ref('')
const rawFileData = ref<Uint8Array | null>(null)

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
  // Convert to HTML with line breaks
  return content.split('\n').map(line => `<p>${escapeHtml(line) || '&nbsp;'}</p>`).join('')
})

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Navigation
function nextPage() {
  if (currentPage.value < totalPages.value - 1) {
    currentPage.value++
    saveReadingPosition()
  }
}

function prevPage() {
  if (currentPage.value > 0) {
    currentPage.value--
    saveReadingPosition()
  }
}

// Theme
function toggleTheme() {
  isDarkMode.value = !isDarkMode.value
  savePreferences()
}

// Audio
async function toggleAudio() {
  if (isPlaying.value) {
    audioPlayer.value?.pause()
  } else {
    await playCurrentPage()
  }
}

async function playCurrentPage() {
  const pageText = pages.value[currentPage.value]
  if (!pageText || !audioPlayer.value) return

  try {
    isLoadingAudio.value = true
    
    // Initialize voices if needed
    const voices = await tts.voices()
    
    // Use Chinese voice if available, fallback to first available
    let voiceId = 'zh_CN-huayan-medium'
    const hasChineseVoice = voices.some((v: any) => v.key === voiceId)
    if (!hasChineseVoice && voices.length > 0 && voices[0]) {
      voiceId = voices[0].key
    }

    const wav = await tts.predict({
      text: pageText,
      voiceId: voiceId,
    })

    const url = URL.createObjectURL(wav)
    audioPlayer.value.src = url
    await audioPlayer.value.play()
  } catch (err) {
    console.error('Audio playback error:', err)
    error.value = 'Failed to play audio'
  } finally {
    isLoadingAudio.value = false
  }
}

function onAudioEnded() {
  isPlaying.value = false
  // Auto advance to next page
  if (currentPage.value < totalPages.value - 1) {
    nextPage()
    setTimeout(() => playCurrentPage(), 500)
  }
}

// Storage keys
const getStorageKey = (suffix: string) => `read-text-${props.filePath}-${suffix}`

// Load and save reading position
function saveReadingPosition() {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(getStorageKey('page'), String(currentPage.value))
    localStorage.setItem(getStorageKey('timestamp'), String(Date.now()))
  }
}

function loadReadingPosition() {
  if (typeof localStorage !== 'undefined') {
    const savedPage = localStorage.getItem(getStorageKey('page'))
    if (savedPage) {
      currentPage.value = parseInt(savedPage, 10) || 0
    }
  }
}

// Save and load preferences
function savePreferences() {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('read-text-fontSize', String(fontSize.value))
    localStorage.setItem('read-text-darkMode', String(isDarkMode.value))
  }
}

function loadPreferences() {
  if (typeof localStorage !== 'undefined') {
    const savedFontSize = localStorage.getItem('read-text-fontSize')
    const savedDarkMode = localStorage.getItem('read-text-darkMode')
    
    if (savedFontSize) fontSize.value = parseInt(savedFontSize, 10)
    if (savedDarkMode) isDarkMode.value = savedDarkMode === 'true'
  }
}

// Watch for changes and save
watch(fontSize, savePreferences)

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
    saveEncodingPreference()
  } catch (err) {
    console.error('Error changing encoding:', err)
    error.value = 'Error decoding file with selected encoding: ' + (err as Error).message
  }
}

// Save and load encoding preference
function saveEncodingPreference() {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(getStorageKey('encoding'), selectedEncoding.value)
  }
}

function loadEncodingPreference() {
  if (typeof localStorage !== 'undefined') {
    const savedEncoding = localStorage.getItem(getStorageKey('encoding'))
    if (savedEncoding) {
      selectedEncoding.value = savedEncoding
    }
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
    
    // Load encoding preference
    loadEncodingPreference()
    
    // Decode with selected or auto-detected encoding
    let encoding = selectedEncoding.value
    if (encoding === 'auto') {
      encoding = detectEncoding(data)
      detectedEncoding.value = encoding
    } else {
      detectedEncoding.value = ''
    }
    
    textContent.value = decodeText(data, encoding)
    loadReadingPosition()
  } catch (err) {
    console.error('Error loading file:', err)
    error.value = 'Error loading file: ' + (err as Error).message
  } finally {
    loading.value = false
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
  loadPreferences()
  loadFile()
  window.addEventListener('keydown', handleKeyPress)
})

onUnmounted(() => {
  saveReadingPosition()
  window.removeEventListener('keydown', handleKeyPress)
  
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
