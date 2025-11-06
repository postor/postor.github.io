import { defineStore } from 'pinia'

export interface TextReaderPreferences {
  fontSize: number
  controlsExpanded: boolean
  autoMode: boolean
  linesPerPage: number
}

export interface EncodingSettings {
  selectedEncoding: string
  detectedEncoding: string
}

export interface ReadingPosition {
  filePath: string
  currentPage: number
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
    setReadingPosition(filePath: string, page: number) {
      this.readingPositions[filePath] = {
        filePath,
        currentPage: page,
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

    loadReadingPosition(filePath: string): number {
      if (typeof localStorage !== 'undefined') {
        const key = `text-reader-position-${filePath}`
        const saved = localStorage.getItem(key)
        if (saved) {
          try {
            const position = JSON.parse(saved)
            this.readingPositions[filePath] = position
            return position.currentPage || 0
          } catch (err) {
            console.error('Error loading reading position:', err)
          }
        }
      }
      return 0
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
  },
})
