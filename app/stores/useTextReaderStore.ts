import { defineStore } from 'pinia'
import { splitIntoSentences } from '~/utils/text'
import { paginateText, getPageSentenceMeta, renderPageContent, getSentenceIndexForPage as getSentenceIndexForPageUtil, findPageForSentence as findPageForSentenceUtil } from '~/utils/textReader/pagination'
import { detectEncodingFromBytes, decodeBytes } from '~/utils/textReader/encoding'
import { getReaderManager } from '~/utils/reader/manager'
import { createTTSFetcher } from '~/utils/reader/ttsFetcher'
import { useBookReadingStore } from '~/stores/useBookReadingStore'

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
  fileData: Record<string, {
    raw?: Uint8Array
    text: string
    isSessionReady: boolean
    sentences: string[]
  }>
  ui: Record<string, { loading: boolean; error: string }>
  activeFilePath: string
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
    fileData: {},
    activeFilePath: '',
    ui: {},
  }),

  getters: {
    getText: (state) => (filePath: string) => {
      return state.fileData[filePath]?.text || ''
    },

    getReadingPosition: (state) => (filePath: string) => {
      return state.readingPositions[filePath]
    },

    getEncodingSettings: (state) => (filePath: string) => {
      return state.encodingSettings[filePath] || {
        selectedEncoding: 'auto',
        detectedEncoding: '',
      }
    },

    getPages(): (filePath: string) => string[] {
      return (filePath: string) => {
        return paginateText(
          (this.fileData[filePath]?.text as string) || '',
          this.preferences.linesPerPage
        )
      }
    },

    getPageSentenceMeta(): (filePath: string) => Array<{ offset: number; count: number }> {
      return (filePath: string) => {
        const pages = paginateText(
          (this.fileData[filePath]?.text as string) || '',
          this.preferences.linesPerPage
        )
        return getPageSentenceMeta(pages)
      }
    },

    getTotalPages(): (filePath: string) => number {
      return (filePath: string) => {
        const pages = paginateText(
          (this.fileData[filePath]?.text as string) || '',
          this.preferences.linesPerPage
        )
        return pages.length || 1
      }
    },

    getCurrentPageContent(): (filePath: string) => string {
      return (filePath: string) => {
        const pages = paginateText(
          (this.fileData[filePath]?.text as string) || '',
          this.preferences.linesPerPage
        )
        const position = this.readingPositions[filePath]
        const currentPage = position?.currentPage ?? 0
        const content = pages[currentPage] || ''
        const metaList = getPageSentenceMeta(pages)
        const pageOffset = metaList[currentPage]?.offset ?? 0
        const currentSentenceIndex = position?.currentSentenceIndex ?? -1
        return renderPageContent(content, pageOffset, currentSentenceIndex)
      }
    },

    isLoading: (state) => (filePath: string) => {
      return !!state.ui[filePath]?.loading
    },

    getError: (state) => (filePath: string) => {
      return state.ui[filePath]?.error || ''
    },
  },

  persist: {
    pick: ['preferences', 'encodingSettings', 'readingPositions', 'activeFilePath'],
  },

  actions: {
    // Active file
    setActiveFile(filePath: string) {
      this.activeFilePath = filePath || ''
    },
    getActiveFile() {
      return this.activeFilePath
    },
    // Preferences management
    setFontSize(size: number) {
      this.preferences.fontSize = size
    },

    setControlsExpanded(expanded: boolean) {
      this.preferences.controlsExpanded = expanded
    },

    setAutoMode(auto: boolean) {
      this.preferences.autoMode = auto
    },

    setLinesPerPage(lines: number) {
      this.preferences.linesPerPage = lines
    },

    updatePreferences(prefs: Partial<TextReaderPreferences>) {
      this.preferences = { ...this.preferences, ...prefs }
    },
    // No explicit save/load needed; persistedstate handles it

    // Encoding settings management
    setEncodingSettings(filePath: string, settings: Partial<EncodingSettings>) {
      this.encodingSettings[filePath] = {
        ...(this.encodingSettings[filePath] || { selectedEncoding: 'auto', detectedEncoding: '' }),
        ...settings,
      }
    },
    // Persistence handled by plugin

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
    },
    ensureReadingPosition(filePath: string): ReadingPosition {
      const existing = this.readingPositions[filePath]
      if (existing) return existing
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
      delete this.ui[filePath]
    },

    // Initialize store
    init() {
      // Configure reader pipeline once per app lifetime
      try {
        const readerManager = getReaderManager()
        const ttsFetcher = createTTSFetcher()
        readerManager.configure({
          bufferSize: 5,
          fetcher: ttsFetcher,
          events: {
            onSentenceStart: (index: number) => {
              // We don't know which file is active from the manager; we assume currentBook id
              const bookStore = useBookReadingStore()
              const filePath = bookStore.currentBook?.id
              if (!filePath) return
              // Update position
              const page = this.findPageForSentence(filePath, index)
              this.updateReadingPosition(filePath, {
                currentPage: page,
                currentSentenceIndex: index,
              })
              this.updateBookProgress(filePath)
            },
            onSentenceEnd: (index: number) => {
              const bookStore = useBookReadingStore()
              const filePath = bookStore.currentBook?.id
              if (!filePath) return
              this.updateReadingPosition(filePath, {
                currentSentenceIndex: index,
              })
              this.updateBookProgress(filePath)
            },
            onQueueComplete: () => {
              this.setAudioPlaying(false)
              this.setAudioLoading(false)
            },
            onError: () => {
              this.setAudioPlaying(false)
              this.setAudioLoading(false)
            },
            onAudioPlay: () => {
              this.setAudioPlaying(true)
            },
            onAudioPause: () => {
              this.setAudioPlaying(false)
            },
          }
        })
      } catch (err) {
        // no-op in SSR or if not available
      }
    },

    // Encoding helpers now in utils
    detectEncoding(data: Uint8Array): string { return detectEncodingFromBytes(data) },
    decodeFile(filePath: string, data: Uint8Array): string {
      const settings = this.encodingSettings[filePath] || { selectedEncoding: 'auto', detectedEncoding: '' }
      let encoding = settings.selectedEncoding || 'auto'
      if (encoding === 'auto') {
        encoding = detectEncodingFromBytes(data)
        this.setEncodingSettings(filePath, { detectedEncoding: encoding })
      } else {
        this.setEncodingSettings(filePath, { detectedEncoding: '' })
      }
      return decodeBytes(data, encoding)
    },

    // Simple UI helpers scoped per file
    setLoading(filePath: string, loading: boolean) {
      this.ui[filePath] = this.ui[filePath] || { loading: false, error: '' }
      this.ui[filePath].loading = loading
    },

    setError(filePath: string, message: string) {
      this.ui[filePath] = this.ui[filePath] || { loading: false, error: '' }
      this.ui[filePath].error = message
    },

    async loadFile(filePath: string) {
      // If caller passes empty, try active
      if (!filePath) filePath = this.activeFilePath
      if (!filePath) throw new Error('No file selected')
      this.setLoading(filePath, true)
      this.setError(filePath, '')
      // Reset audio state for new file
      this.setAudioPlaying(false)
      this.setAudioLoading(false)
      try {
        const opfs = await import('~/utils/opfs')
        const content = await opfs.readFile(filePath)
        if (content === null) throw new Error('Failed to load file')

        let data: Uint8Array
        if (typeof content === 'string') {
          data = new TextEncoder().encode(content)
        } else if (content instanceof ArrayBuffer) {
          data = new Uint8Array(content)
        } else {
          data = new Uint8Array(content as Uint8Array)
        }

        this.fileData[filePath] = this.fileData[filePath] || { text: '', isSessionReady: false, sentences: [] }
        // Ensure container exists before assignment (TS narrowing)
        const fileEntry = this.fileData[filePath] || { text: '', isSessionReady: false, sentences: [] }
        fileEntry.raw = data
        this.fileData[filePath] = fileEntry

        const decoded = this.decodeFile(filePath, data)
        // fileEntry is guaranteed non-undefined now
        this.fileData[filePath]!.text = decoded

        const position = this.ensureReadingPosition(filePath)
        await this.ensureReaderSession(filePath, position)
        this.updateBookProgress(filePath, true)

        // Ensure current book is set
        const bookStore = useBookReadingStore()
        if (!bookStore.currentBook || bookStore.currentBook.id !== filePath) {
          const fileName = filePath.split('/').pop() || filePath
          const totalPages = this.getTotalPages(filePath)
          bookStore.setCurrentBook({
            id: filePath,
            title: fileName,
            filePath,
            total: totalPages,
            current: position.currentPage || 0,
            lastRead: Date.now(),
          })
        }
      } catch (err) {
        console.error('Error loading file in store:', err)
        this.setError(filePath, (err as Error)?.message || 'Failed to load file')
        throw err
      }
      finally {
        this.setLoading(filePath, false)
      }
    },

    async ensureReaderSession(filePath: string, position?: ReadingPosition) {
      const text = this.getText(filePath)
      const sentences = splitIntoSentences(text || '')
      this.fileData[filePath] = this.fileData[filePath] || { text: '', isSessionReady: false, sentences: [] }
      this.fileData[filePath].sentences = sentences

      const readerManager = getReaderManager()

      const total = sentences.length
      if (!total) {
        readerManager.loadSession({ id: filePath, sentences })
        this.fileData[filePath].isSessionReady = true
        return
      }

      const preferredPage = position?.currentPage ?? this.getReadingPosition(filePath)?.currentPage ?? 0
      const preferredSentence = typeof position?.currentSentenceIndex === 'number' ? position.currentSentenceIndex : -1
      let startIndex = preferredSentence >= 0 ? preferredSentence : this.getSentenceIndexForPage(filePath, preferredPage)

      if (typeof startIndex !== 'number' || startIndex < 0 || startIndex >= total) {
        startIndex = 0
      }

      readerManager.loadSession({ id: filePath, sentences, startIndex })
      this.fileData[filePath].isSessionReady = true
    },

    getSentenceIndexForPage(filePath: string, page: number) {
      const pages = paginateText((this.fileData[filePath]?.text as string) || '', this.preferences.linesPerPage)
      const metaList = getPageSentenceMeta(pages)
      return getSentenceIndexForPageUtil(metaList, page)
    },

    findPageForSentence(filePath: string, index: number) {
      const fallback = this.readingPositions[filePath]?.currentPage ?? 0
      const pages = paginateText((this.fileData[filePath]?.text as string) || '', this.preferences.linesPerPage)
      const metaList = getPageSentenceMeta(pages)
      return findPageForSentenceUtil(metaList, index, fallback)
    },

    async toggleAudio(filePath: string) {
      const fileState = this.fileData[filePath]
      if (!fileState?.isSessionReady || !fileState.sentences.length) return

      const readerManager = getReaderManager()
      const nowPlaying = this.audioState.isPlaying

      if (nowPlaying) {
        this.setAudioPlaying(false)
        try {
          readerManager.pause({ finishSentence: true })
        } catch (_) { }
        return
      }

      this.setAudioPlaying(true)

      const fallbackIndex = Math.max(this.getSentenceIndexForPage(filePath, this.getReadingPosition(filePath)?.currentPage ?? 0), 0)
      const currentIndex = this.getReadingPosition(filePath)?.currentSentenceIndex ?? -1
      const startIndex = currentIndex >= 0 ? currentIndex : fallbackIndex

      try {
        this.setAudioLoading(true)
        if (readerManager.getCurrentIndex() >= 0) {
          await readerManager.resume()
        } else {
          await readerManager.playFrom(startIndex)
        }
      } catch (err) {
        console.error('Audio playback error (store):', err)
        this.setAudioPlaying(false)
      } finally {
        this.setAudioLoading(false)
      }
    },

    goToPage(filePath: string, page: number) {
      const totalPages = this.getTotalPages(filePath)
      const clamped = Math.max(0, Math.min(page, totalPages - 1))
      const sentenceIdx = this.getSentenceIndexForPage(filePath, clamped)
      const readerManager = getReaderManager()

      if (sentenceIdx >= 0) {
        readerManager.seek(sentenceIdx)
      } else {
        readerManager.seek(-1)
      }

      this.updateReadingPosition(filePath, {
        currentPage: clamped,
        currentSentenceIndex: sentenceIdx,
      })
      this.updateBookProgress(filePath)
    },

    nextPage(filePath: string) {
      const page = this.getReadingPosition(filePath)?.currentPage ?? 0
      const total = this.getTotalPages(filePath)
      if (page < total - 1) this.goToPage(filePath, page + 1)
    },

    prevPage(filePath: string) {
      const page = this.getReadingPosition(filePath)?.currentPage ?? 0
      if (page > 0) this.goToPage(filePath, page - 1)
    },

    async onEncodingChange(filePath: string) {
      const raw = this.fileData[filePath]?.raw
      if (!raw) return
      const decoded = this.decodeFile(filePath, raw)
      this.fileData[filePath] = this.fileData[filePath] || { text: '', isSessionReady: false, sentences: [] }
      this.fileData[filePath].text = decoded
      // reset position
      this.readingPositions[filePath] = {
        filePath,
        currentPage: 0,
        currentSentenceIndex: -1,
        timestamp: Date.now(),
      }
      await this.ensureReaderSession(filePath, this.readingPositions[filePath])
      this.updateBookProgress(filePath)
    },

    updateBookProgress(filePath: string, setCurrentIfMissing = false) {
      const bookStore = useBookReadingStore()
      const totalPages = this.getTotalPages(filePath)
      const currentPage = this.getReadingPosition(filePath)?.currentPage ?? 0
      bookStore.updateProgress(filePath, currentPage, totalPages)
      if (setCurrentIfMissing && (!bookStore.currentBook || bookStore.currentBook.id !== filePath)) {
        const fileName = filePath.split('/').pop() || filePath
        bookStore.setCurrentBook({
          id: filePath,
          title: fileName,
          filePath,
          total: totalPages,
          current: currentPage,
          lastRead: Date.now(),
        })
      }
    },
  },
})
