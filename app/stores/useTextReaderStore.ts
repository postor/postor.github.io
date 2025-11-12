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
  encodingSettings: EncodingSettings
  readingPositions: Record<string, ReadingPosition>
  audioState: AudioState
  fileData: {
    raw?: Uint8Array
    text: string
    isSessionReady: boolean
    sentences: string[]
  }
  ui: { loading: boolean; error: string }
  activeFilePath: string
  lastLoadedFilePath?: string
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
    encodingSettings: { selectedEncoding: 'auto', detectedEncoding: '' },
    readingPositions: {},
    audioState: {
      isPlaying: false,
      isLoadingAudio: false,
    },
    fileData: { text: '', isSessionReady: false, sentences: [] },
    activeFilePath: '',
    lastLoadedFilePath: undefined,
    ui: { loading: false, error: '' },
  }),

  getters: {
    getText: (state) => (filePath: string) => {
      return state.fileData.text || ''
    },

    getReadingPosition: (state) => (filePath: string) => {
      return state.readingPositions[filePath]
    },

    getEncodingSettings: (state) => (filePath: string) => {
      return state.encodingSettings || {
        selectedEncoding: 'auto',
        detectedEncoding: '',
      }
    },

    getPages(): (filePath: string) => string[] {
      return (filePath: string) => {
        return paginateText(
          (this.fileData?.text as string) || '',
          this.preferences.linesPerPage
        )
      }
    },

    getPageSentenceMeta(): (filePath: string) => Array<{ offset: number; count: number }> {
      return (filePath: string) => {
        const pages = paginateText(
          (this.fileData?.text as string) || '',
          this.preferences.linesPerPage
        )
        return getPageSentenceMeta(pages)
      }
    },

    getTotalPages(): (filePath: string) => number {
      return (filePath: string) => {
        const pages = paginateText(
          (this.fileData?.text as string) || '',
          this.preferences.linesPerPage
        )
        return pages.length || 1
      }
    },

    getCurrentPageContent(): (filePath: string) => string {
      return (filePath: string) => {
        const pages = paginateText(
          (this.fileData?.text as string) || '',
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
      return !!state.ui?.loading
    },

    getError: (state) => (filePath: string) => {
      return state.ui?.error || ''
    },
  },

  persist: {
    pick: ['preferences', 'encodingSettings', 'readingPositions', 'activeFilePath'],
  },

  actions: {
    // Active file: mutate activeFilePath directly; retained getter function only if needed
    getActiveFile() {
      return this.activeFilePath
    },
    // Preferences management
    // Removed trivial setters; mutate state directly from components/actions

    updatePreferences(prefs: Partial<TextReaderPreferences>) {
      this.preferences = { ...this.preferences, ...prefs }
    },
    // No explicit save/load needed; persistedstate handles it

    // Encoding settings management
    setEncodingSettings(filePath: string, settings: Partial<EncodingSettings>) {
      this.encodingSettings = {
        ...(this.encodingSettings || { selectedEncoding: 'auto', detectedEncoding: '' }),
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
    // Removed trivial audio setters; mutate audioState directly

    updateAudioState(state: Partial<AudioState>) {
      this.audioState = { ...this.audioState, ...state }
    },

    // Cleanup
    clearFileData(filePath: string) {
      // Clear persisted reading position for that file
      if (filePath) delete this.readingPositions[filePath]
      // If clearing current file or no file specified, reset top-level states
      if (!filePath || filePath === this.activeFilePath) {
        this.fileData = { text: '', isSessionReady: false, sentences: [] }
        this.ui = { loading: false, error: '' }
        this.encodingSettings = { selectedEncoding: 'auto', detectedEncoding: '' }
      }
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
            onSentenceChange: (index: number) => {
              const bookStore = useBookReadingStore()
              const filePath = bookStore.currentBook?.id
              if (!filePath) return
              const page = this.findPageForSentence(filePath, index)
              this.updateReadingPosition(filePath, {
                currentPage: page,
                currentSentenceIndex: index,
              })
              this.updateBookProgress(filePath)
            },
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
              this.audioState.isPlaying = false
              this.audioState.isLoadingAudio = false
            },
            onError: () => {
              this.audioState.isPlaying = false
              this.audioState.isLoadingAudio = false
            },
            onAudioPlay: () => {
              this.audioState.isPlaying = true
            },
            onAudioPause: () => {
              this.audioState.isPlaying = false
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
      const settings = this.encodingSettings || { selectedEncoding: 'auto', detectedEncoding: '' }
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
    // Removed trivial UI setters; access ui map directly

    async loadFile(filePath: string) {
      // If caller passes empty, try active
      if (!filePath) filePath = this.activeFilePath
      if (!filePath) throw new Error('No file selected')

      // If switching files (based on last loaded), reset top-level state
      if (this.lastLoadedFilePath !== filePath) {
        this.fileData = { text: '', isSessionReady: false, sentences: [] }
        this.ui = { loading: false, error: '' }
        this.encodingSettings = { selectedEncoding: 'auto', detectedEncoding: '' }
        this.lastLoadedFilePath = filePath
      }
      // Always set active file for UI
      this.activeFilePath = filePath

      this.ui.loading = true
      this.ui.error = ''
      // Reset audio state for new file
      this.audioState.isPlaying = false
      this.audioState.isLoadingAudio = false
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

        // Write raw data
        this.fileData.raw = data

        const decoded = this.decodeFile(filePath, data)
        this.fileData.text = decoded

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
        this.ui.error = (err as Error)?.message || 'Failed to load file'
        throw err
      }
      finally {
        this.ui.loading = false
      }
    },

    async ensureReaderSession(filePath: string, position?: ReadingPosition) {
      const text = this.getText(filePath)
      const sentences = splitIntoSentences(text || '')
      this.fileData.sentences = sentences

      const readerManager = getReaderManager()

      const total = sentences.length
      if (!total) {
        readerManager.loadSession({ id: filePath, sentences })
        this.fileData.isSessionReady = true
        return
      }

      const preferredPage = position?.currentPage ?? this.getReadingPosition(filePath)?.currentPage ?? 0
      const preferredSentence = typeof position?.currentSentenceIndex === 'number' ? position.currentSentenceIndex : -1
      let startIndex = preferredSentence >= 0 ? preferredSentence : this.getSentenceIndexForPage(filePath, preferredPage)

      if (typeof startIndex !== 'number' || startIndex < 0 || startIndex >= total) {
        startIndex = 0
      }

      readerManager.loadSession({ id: filePath, sentences, startIndex })
      this.fileData.isSessionReady = true
    },

    getSentenceIndexForPage(filePath: string, page: number) {
      const pages = paginateText((this.fileData?.text as string) || '', this.preferences.linesPerPage)
      const metaList = getPageSentenceMeta(pages)
      return getSentenceIndexForPageUtil(metaList, page)
    },

    findPageForSentence(filePath: string, index: number) {
      const fallback = this.readingPositions[filePath]?.currentPage ?? 0
      const pages = paginateText((this.fileData?.text as string) || '', this.preferences.linesPerPage)
      const metaList = getPageSentenceMeta(pages)
      return findPageForSentenceUtil(metaList, index, fallback)
    },

    async toggleAudio(filePath: string) {
      const fileState = this.fileData
      if (!fileState?.isSessionReady || !fileState.sentences.length) return

      const readerManager = getReaderManager()
      const nowPlaying = this.audioState.isPlaying

      if (nowPlaying) {
        this.audioState.isPlaying = false
        try {
          readerManager.pause({ finishSentence: true })
        } catch (_) { }
        return
      }

      this.audioState.isPlaying = true

      const fallbackIndex = Math.max(this.getSentenceIndexForPage(filePath, this.getReadingPosition(filePath)?.currentPage ?? 0), 0)
      const currentIndex = this.getReadingPosition(filePath)?.currentSentenceIndex ?? -1
      const startIndex = currentIndex >= 0 ? currentIndex : fallbackIndex

      try {
        this.audioState.isLoadingAudio = true
        if (readerManager.getCurrentIndex() >= 0) {
          await readerManager.resume()
        } else {
          await readerManager.playFrom(startIndex)
        }
      } catch (err) {
        console.error('Audio playback error (store):', err)
        this.audioState.isPlaying = false
      } finally {
        this.audioState.isLoadingAudio = false
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
      const raw = this.fileData?.raw
      if (!raw) return
      const decoded = this.decodeFile(filePath, raw)
      this.fileData = this.fileData || { text: '', isSessionReady: false, sentences: [] }
      this.fileData.text = decoded
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
