// @ts-nocheck
import type { TTSSourceFetcher } from './types'

export interface ReaderSession {
  id: string
  sentences: string[]
  startIndex?: number
}

export interface ReaderEvents {
  onSentenceStart?: (index: number, sentence: string) => void
  onSentenceEnd?: (index: number, sentence: string) => void
  onQueueComplete?: () => void
  onError?: (error: unknown) => void
  onAudioPlay?: () => void
  onAudioPause?: () => void
}

interface BufferEntry {
  url: string
  busy?: boolean
}

const DEFAULT_BUFFER_SIZE = 5

class ReaderManager {
  private audio: HTMLAudioElement
  private bufferSize = DEFAULT_BUFFER_SIZE
  private buffer: Map<number, BufferEntry> = new Map()
  private fetcher: TTSSourceFetcher | null = null
  private events: ReaderEvents = {}
  private sessionToken: symbol | null = null
  private currentSession: ReaderSession | null = null
  private currentIndex = -1
  private playRequestCounter = 0

  constructor() {
    if (typeof window !== 'undefined') {
      this.audio = new Audio()
      this.audio.preload = 'auto'
    } else {
      // SSR safeguard
      this.audio = {
        play: async () => {},
        pause: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        src: '',
      } as unknown as HTMLAudioElement
    }

    this.attachAudioListeners()
  }

  configure(opts: { bufferSize?: number; fetcher?: TTSSourceFetcher; audio?: HTMLAudioElement; events?: ReaderEvents } = {}) {
    if (typeof opts.bufferSize === 'number' && opts.bufferSize > 0) {
      this.bufferSize = opts.bufferSize
    }

    if (opts.fetcher) {
      this.fetcher = opts.fetcher
    }

    if (opts.events) {
      this.events = opts.events
    }

    if (opts.audio && opts.audio !== this.audio) {
      this.detachAudioListeners()
      this.audio = opts.audio
      this.attachAudioListeners()
    }
  }

  setEvents(events: ReaderEvents) {
    this.events = events
  }

  setFetcher(fetcher: TTSSourceFetcher) {
    this.fetcher = fetcher
  }

  setAudioElement(audio: HTMLAudioElement) {
    if (!audio || audio === this.audio) return
    this.detachAudioListeners()
    this.audio = audio
    this.attachAudioListeners()
  }

  getAudioElement() {
    return this.audio
  }

  loadSession(session: ReaderSession) {
    this.stop()
    this.clearBuffer()
    this.currentSession = { ...session }
    this.sessionToken = Symbol(session.id)
    if (typeof session.startIndex === 'number') {
      this.currentIndex = session.startIndex
      if (session.startIndex >= 0) {
        this.prefetchFrom(session.startIndex)
      }
    } else {
      this.currentIndex = -1
    }
  }

  seek(index: number) {
    if (!this.currentSession) return
    if (index < 0) {
      this.currentIndex = -1
      return
    }
    const clamped = this.clampIndex(index)
    this.currentIndex = clamped
    if (clamped >= 0) {
      this.prefetchFrom(clamped)
    }
  }

  async playFrom(index: number) {
    this.seek(index)
    await this.playCurrent()
  }

  async resume() {
    if (!this.currentSession) return
    if (this.currentIndex < 0) {
      await this.playFrom(0)
      return
    }
    await this.playCurrent()
  }

  pause() {
    try {
      this.audio.pause()
    } catch (e) {
      // ignore pause errors
    }
  }

  stop() {
    try {
      this.audio.pause()
    } catch (e) {
      // ignore pause errors
    }
    if (this.audio?.src) {
      try {
        URL.revokeObjectURL(this.audio.src)
      } catch (e) {
        // ignore revoke errors
      }
      this.audio.src = ''
    }
    this.currentIndex = -1
    this.playRequestCounter++
  }

  dispose() {
    this.stop()
    this.clearBuffer()
    this.detachAudioListeners()
    this.events = {}
    this.fetcher = null
  }

  getCurrentIndex() {
    return this.currentIndex
  }

  getSessionId() {
    return this.currentSession?.id || null
  }

  private attachAudioListeners() {
    if (!this.audio) return
    this.audio.addEventListener('ended', this.handleEnded)
    this.audio.addEventListener('play', this.handlePlay)
    this.audio.addEventListener('pause', this.handlePause)
  }

  private detachAudioListeners() {
    if (!this.audio) return
    this.audio.removeEventListener('ended', this.handleEnded)
    this.audio.removeEventListener('play', this.handlePlay)
    this.audio.removeEventListener('pause', this.handlePause)
  }

  private handlePlay = () => {
    this.events.onAudioPlay?.()
  }

  private handlePause = () => {
    this.events.onAudioPause?.()
  }

  private handleEnded = () => {
    const sentence = this.getSentence(this.currentIndex)
    if (sentence) {
      this.events.onSentenceEnd?.(this.currentIndex, sentence)
    }

    const nextIdx = this.currentIndex + 1
    if (!this.currentSession || nextIdx >= this.currentSession.sentences.length) {
      this.events.onQueueComplete?.()
      return
    }

    this.currentIndex = nextIdx
    void this.playCurrent()
  }

  private getSentence(index: number): string | null {
    if (!this.currentSession) return null
    return this.currentSession.sentences[index] ?? null
  }

  private clampIndex(index: number) {
    if (!this.currentSession) return -1
    const total = this.currentSession.sentences.length
    if (total === 0) return -1
    return Math.max(0, Math.min(index, total - 1))
  }

  private async playCurrent() {
    if (!this.currentSession || !this.fetcher) return
    const index = this.clampIndex(this.currentIndex)
    if (index < 0) {
      this.events.onQueueComplete?.()
      return
    }

    const sentence = this.getSentence(index)
    if (!sentence || !sentence.trim()) {
      this.currentIndex = index + 1
      if (this.currentIndex < this.currentSession.sentences.length) {
        await this.playCurrent()
      } else {
        this.events.onQueueComplete?.()
      }
      return
    }

    const token = this.sessionToken
    const myReq = ++this.playRequestCounter

    try {
      const url = await this.ensureUrlFor(index, token)
      if (!url) return
      if (myReq !== this.playRequestCounter) return

      if (this.audio.src && this.audio.src !== url && !this.isUrlInBuffer(this.audio.src)) {
        try {
          URL.revokeObjectURL(this.audio.src)
        } catch (e) {
          // ignore revoke errors
        }
      }

      if (this.audio.src !== url) {
        this.audio.src = url
      }

      this.events.onSentenceStart?.(index, sentence)

      await this.audio.play()

      this.prefetchFrom(index + 1)
      this.pruneBuffer(index - this.bufferSize)
    } catch (err) {
      this.events.onError?.(err)
    }
  }

  private async ensureUrlFor(index: number, token: symbol | null) {
    const cached = this.buffer.get(index)
    if (cached?.url) {
      return cached.url
    }
    await this.fetchAndStore(index, token)
    return this.buffer.get(index)?.url
  }

  private async fetchAndStore(index: number, token: symbol | null) {
    if (!this.currentSession || !this.fetcher) return
    if (this.buffer.has(index)) return

    const sentence = this.getSentence(index)
    if (!sentence || !sentence.trim()) {
      this.buffer.set(index, { url: '' })
      return
    }

    try {
      this.buffer.set(index, { url: '', busy: true })
      const blob = await this.fetcher(sentence, index, this.currentSession.id)
      if (!blob) {
        this.buffer.delete(index)
        return
      }

      if (!this.sessionToken || this.sessionToken !== token) {
        return
      }

      const url = URL.createObjectURL(blob)
      this.buffer.set(index, { url })
    } catch (err) {
      this.buffer.delete(index)
      this.events.onError?.(err)
    }
  }

  private prefetchFrom(startIndex: number) {
    if (!this.currentSession || !this.fetcher) return
    const token = this.sessionToken
    const start = Math.max(0, startIndex)
    for (let i = start; i < start + this.bufferSize; i++) {
      if (i >= this.currentSession.sentences.length) break
      if (this.buffer.has(i)) continue
      void this.fetchAndStore(i, token)
    }
  }

  private pruneBuffer(minIndex: number) {
    if (minIndex <= 0) return
    for (const [idx, entry] of this.buffer.entries()) {
      if (idx < minIndex) {
        this.releaseEntry(idx, entry)
      }
    }
  }

  private isUrlInBuffer(url: string) {
    for (const entry of this.buffer.values()) {
      if (entry.url === url) return true
    }
    return false
  }

  private clearBuffer() {
    for (const [idx, entry] of this.buffer.entries()) {
      this.releaseEntry(idx, entry)
    }
    this.buffer.clear()
  }

  private releaseEntry(index: number, entry: BufferEntry) {
    if (entry?.url) {
      try {
        URL.revokeObjectURL(entry.url)
      } catch (e) {
        // ignore revoke errors
      }
    }
    this.buffer.delete(index)
  }
}

let instance: ReaderManager | null = null

export function getReaderManager() {
  if (!instance) {
    instance = new ReaderManager()
  }
  return instance
}

export function resetReaderManager() {
  instance?.dispose()
  instance = null
}
