import { defineStore } from 'pinia'
import * as iconv from 'iconv-lite'
import jschardet from 'jschardet'

export interface TextReaderPreferences {
  fontSize: number
  controlsExpanded: boolean
  autoMode: boolean
  linesPerPage: number
  // TTS playback speed multiplier (e.g. 1.0 = normal)
  ttsSpeed?: number
}

export interface EncodingSettings {
  selectedEncoding: string
  detectedEncoding: string
}

export interface ReadingPosition {
  filePath: string
  currentPage: number
  currentSentenceIndex: number
  timestamp: number
}

export interface AudioState {
  isPlaying: boolean
  isLoadingAudio: boolean
}

interface State {
  preferences: TextReaderPreferences
  encodingSettings: Record<string, EncodingSettings>
  readingPositions: Record<string, ReadingPosition>
  audioState: AudioState
}

export const useTextReaderStore = defineStore('textReader', {
  state: (): State => ({
    preferences: {
      fontSize: 18,
      controlsExpanded: true,
      autoMode: true,
      linesPerPage: 20,
      ttsSpeed: 1,
    },
    encodingSettings: {},
    readingPositions: {},
    audioState: {
      isPlaying: false,
      isLoadingAudio: false,
    },
  }),

  getters: {
    getReadingPosition: (state) => (filePath: string) => {
      return state.readingPositions[filePath]
    },
    
    getEncodingSettings: (state) => (filePath: string) => {
      return state.encodingSettings[filePath] || {
        selectedEncoding: 'auto',
        detectedEncoding: '',
      }
    },
  },

  actions: {
    // Preferences management
    setFontSize(size: number) {
      this.preferences.fontSize = size
      this.savePreferences()
    },

    setControlsExpanded(expanded: boolean) {
      this.preferences.controlsExpanded = expanded
      this.savePreferences()
    },

    setAutoMode(auto: boolean) {
      this.preferences.autoMode = auto
      this.savePreferences()
    },

    setLinesPerPage(lines: number) {
      this.preferences.linesPerPage = lines
      this.savePreferences()
    },

    updatePreferences(prefs: Partial<TextReaderPreferences>) {
      this.preferences = { ...this.preferences, ...prefs }
      this.savePreferences()
    },

    savePreferences() {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('text-reader-preferences', JSON.stringify(this.preferences))
      }
    },

    loadPreferences() {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('text-reader-preferences')
        if (saved) {
          try {
            this.preferences = { ...this.preferences, ...JSON.parse(saved) }
          } catch (err) {
            console.error('Error loading preferences:', err)
          }
        }
      }
    },

    // Encoding settings management
    setEncodingSettings(filePath: string, settings: Partial<EncodingSettings>) {
      this.encodingSettings[filePath] = {
        ...this.getEncodingSettings(filePath),
        ...settings,
      }
      this.saveEncodingSettings(filePath)
    },

    saveEncodingSettings(filePath: string) {
      if (typeof localStorage !== 'undefined') {
        const key = `text-reader-encoding-${filePath}`
        const settings = this.encodingSettings[filePath]
        if (settings) {
          localStorage.setItem(key, JSON.stringify(settings))
        }
      }
    },

    loadEncodingSettings(filePath: string) {
      if (typeof localStorage !== 'undefined') {
        const key = `text-reader-encoding-${filePath}`
        const saved = localStorage.getItem(key)
        if (saved) {
          try {
            this.encodingSettings[filePath] = JSON.parse(saved)
          } catch (err) {
            console.error('Error loading encoding settings:', err)
          }
        }
      }
    },

    // Reading position management
    setReadingPosition(filePath: string, page: number, sentenceIndex?: number) {
      const previous = this.readingPositions[filePath]
      const nextSentenceIndex = typeof sentenceIndex === 'number'
        ? sentenceIndex
        : previous?.currentSentenceIndex ?? -1

      this.readingPositions[filePath] = {
        filePath,
        currentPage: page,
        currentSentenceIndex: nextSentenceIndex,
        timestamp: Date.now(),
      }
      this.saveReadingPosition(filePath)
    },

    updateReadingPosition(filePath: string, position: Partial<Pick<ReadingPosition, 'currentPage' | 'currentSentenceIndex'>>) {
      const existing = this.readingPositions[filePath] || {
        filePath,
        currentPage: 0,
        currentSentenceIndex: -1,
        timestamp: Date.now(),
      }

      this.readingPositions[filePath] = {
        filePath,
        currentPage: typeof position.currentPage === 'number' ? position.currentPage : existing.currentPage,
        currentSentenceIndex: typeof position.currentSentenceIndex === 'number' ? position.currentSentenceIndex : existing.currentSentenceIndex,
        timestamp: Date.now(),
      }
      this.saveReadingPosition(filePath)
    },

    saveReadingPosition(filePath: string) {
      if (typeof localStorage !== 'undefined') {
        const key = `text-reader-position-${filePath}`
        const position = this.readingPositions[filePath]
        if (position) {
          localStorage.setItem(key, JSON.stringify(position))
        }
      }
    },

    loadReadingPosition(filePath: string): ReadingPosition {
      if (typeof localStorage !== 'undefined') {
        const key = `text-reader-position-${filePath}`
        const saved = localStorage.getItem(key)
        if (saved) {
          try {
            const raw = JSON.parse(saved)
            const position: ReadingPosition = {
              filePath,
              currentPage: raw?.currentPage ?? 0,
              currentSentenceIndex: typeof raw?.currentSentenceIndex === 'number' ? raw.currentSentenceIndex : -1,
              timestamp: raw?.timestamp ?? Date.now(),
            }
            this.readingPositions[filePath] = position
            return position
          } catch (err) {
            console.error('Error loading reading position:', err)
          }
        }
      }
      const fallback: ReadingPosition = {
        filePath,
        currentPage: 0,
        currentSentenceIndex: -1,
        timestamp: Date.now(),
      }
      this.readingPositions[filePath] = fallback
      return fallback
    },

    // Audio state management
    setAudioPlaying(playing: boolean) {
      this.audioState.isPlaying = playing
    },

    setAudioLoading(loading: boolean) {
      this.audioState.isLoadingAudio = loading
    },

    updateAudioState(state: Partial<AudioState>) {
      this.audioState = { ...this.audioState, ...state }
    },

    // Cleanup
    clearFileData(filePath: string) {
      delete this.readingPositions[filePath]
      delete this.encodingSettings[filePath]
      
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(`text-reader-position-${filePath}`)
        localStorage.removeItem(`text-reader-encoding-${filePath}`)
      }
    },

    // Initialize store
    init() {
      this.loadPreferences()
    },

    // Encoding detection helper (used by components to decode raw file data)
    detectEncoding(data: Uint8Array): string {
      try {
        // Convert a sample of the binary data to a binary string for jschardet
        let binaryString = ''
        const len = Math.min(data.length, 100000)
        for (let i = 0; i < len; i++) {
          const byte = data[i]
          if (byte !== undefined) binaryString += String.fromCharCode(byte)
        }

        const result = jschardet.detect(binaryString)
        if (result && result.encoding) {
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
        console.error('Error detecting encoding in store:', err)
      }
      return 'utf-8'
    },

    // Decode raw file data using the selected encoding for the given filePath.
    // This centralizes iconv/jschardet usage in the store.
    decodeFile(filePath: string, data: Uint8Array): string {
      try {
        // Ensure encoding settings exist for the file
        const settings = this.getEncodingSettings(filePath)
        let encoding = settings.selectedEncoding || 'auto'

        if (encoding === 'auto') {
          encoding = this.detectEncoding(data)
          this.setEncodingSettings(filePath, { detectedEncoding: encoding })
        } else {
          this.setEncodingSettings(filePath, { detectedEncoding: '' })
        }

        // iconv-lite can decode a Uint8Array directly
        const decoded = iconv.decode(data, encoding)
        return decoded
      } catch (err) {
        console.error('Error decoding file in store:', err)
        throw err
      }
    },
  },
})
