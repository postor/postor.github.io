<template>
  <div class="sticky top-0 z-20">
    <div class="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 shadow-lg">
      <div v-show="useTextReaderStore().preferences.controlsExpanded" class="flex flex-col sm:flex-row items-center justify-center gap-4 p-4">
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
              :value="useTextReaderStore().getEncodingSettings(filePath).selectedEncoding"
              @change="(e) => onEncodingChange((e.target as HTMLSelectElement).value)"
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
              v-if="useTextReaderStore().getEncodingSettings(filePath).detectedEncoding"
              class="text-xs text-neutral-500 italic dark:text-neutral-400"
              :title="`Detected: ${useTextReaderStore().getEncodingSettings(filePath).detectedEncoding}`"
            >
              ({{ useTextReaderStore().getEncodingSettings(filePath).detectedEncoding }})
            </span>
          </label>
          <label class="flex items-center gap-2 text-sm">
            <span>{{ t('bookReading.fontSize') }}:</span>
            <select
              :value="useTextReaderStore().preferences.fontSize"
              @change="(e) => useTextReaderStore().setFontSize(Number((e.target as HTMLSelectElement).value))"
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
          <label class="flex items-center gap-2 text-sm">
            <span>TTS:</span>
            <select 
              :value="ttsEngine" 
              @change="(e) => setTTSEngine((e.target as HTMLSelectElement).value as TTSEngine)"
              class="px-2 py-1 border rounded bg-white border-neutral-300 dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-200"
            >
           <option value="piper">Piper</option>
           <option value="kokoro">KokoroJS</option>
           <option value="outetts">Outetts</option>
           <option value="easy-speech">Easy Speech</option>
            </select>
          </label>
          <label class="flex items-center gap-2 text-sm">
            <span>Speed:</span>
            <select
              :value="useTextReaderStore().preferences.ttsSpeed"
              @change="(e) => useTextReaderStore().updatePreferences({ ttsSpeed: Number((e.target as HTMLSelectElement).value) })"
              class="px-2 py-1 border rounded bg-white border-neutral-300 dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-200"
            >
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </label>
          <button
            @click="useThemeStore().setTheme(useThemeStore().isDark ? 'light' : 'dark')"
            class="px-3 py-2 border rounded text-sm transition bg-white border-neutral-300 hover:bg-neutral-100 hover:border-neutral-400 dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-700 dark:hover:border-neutral-500"
          >
            {{ useThemeStore().isDark ? '☀️' : '🌙' }}
          </button>
          <button
            @click="toggleAudio"
            class="px-3 py-2 border rounded text-sm transition bg-white border-neutral-300 hover:bg-neutral-100 hover:border-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-700 dark:hover:border-neutral-500"
          >
            {{ useTextReaderStore().audioState.isPlaying ? '⏸️' : '▶️' }}
          </button>
        </div>
      </div>
      <div 
        @click="toggleControls" 
        class="cursor-pointer px-4 py-1 text-center select-none text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 border-t border-neutral-200 dark:border-neutral-600"
      >
        {{ useTextReaderStore().preferences.controlsExpanded ? (t('bookReading.hide') || '▲ Hide Controls') : (t('bookReading.show') || '▼ Show Controls') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useThemeStore } from '~/stores/useThemeStore'
import { useTextReaderStore } from '~/stores/useTextReaderStore'
import { ref, computed, inject, type ComputedRef } from 'vue'
import { getDefaultEngine, setDefaultEngine } from '~/utils/tts/tts'
import type { TTSEngine } from '~/utils/tts/tts'

const { t } = useI18n()
const textReaderStore = useTextReaderStore()

// Get context from parent component
const filePath = inject<string>('filePath', '')
const currentPage = inject<ComputedRef<number>>('currentPage', computed(() => 0))
const totalPages = inject<ComputedRef<number>>('totalPages', computed(() => 1))
const onEncodingChangeCallback = inject<(encoding: string) => void>('onEncodingChange', () => {})
const toggleAudioFn = inject<() => void>('toggleAudio', () => {})
const goToPage = inject<(page: number) => void>('goToPage', () => {})

const ttsEngine = ref<TTSEngine>(getDefaultEngine())

function setTTSEngine(val: TTSEngine) {
  ttsEngine.value = val
  setDefaultEngine(val)
}

function onEncodingChange(encoding: string) {
  textReaderStore.setEncodingSettings(filePath, { selectedEncoding: encoding })
  onEncodingChangeCallback(encoding)
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

function toggleAudio() {
  toggleAudioFn()
}

function toggleControls() {
  textReaderStore.setControlsExpanded(!textReaderStore.preferences.controlsExpanded)
}
</script>
