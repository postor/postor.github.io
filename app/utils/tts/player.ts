// @ts-nocheck
import { predict, getVoices, getDefaultEngine } from './tts'

export interface TTSPlayerOptions {
  bufferSize?: number
}

export class TTSPlayer {
  private audio: HTMLAudioElement
  private bufferSize: number
  private ttsBuffer: Map<number, string>
  private playRequestCounter = 0
  public onEnded: (() => void) | null = null

  constructor(audio: HTMLAudioElement, opts: TTSPlayerOptions = {}) {
    this.audio = audio
    this.bufferSize = opts.bufferSize || 5
    this.ttsBuffer = new Map()

    // Wire audio end event to onEnded callback if provided
    this.audio.addEventListener('ended', () => {
      if (this.onEnded) this.onEnded()
    })
  }

  async ttsFetchForIdx(idx: number, sentenceText?: string) {
    if (!sentenceText) return
    if (this.ttsBuffer.has(idx)) return

    try {
      const currentEngine = getDefaultEngine()
      let voiceId = ''
      try {
        const voices = (await getVoices(currentEngine)) || []
        if (currentEngine === 'piper') voiceId = 'zh_CN-huayan-medium'
        else if (currentEngine === 'kokoro') voiceId = 'af_heart'
        const hasVoice = Array.isArray(voices) && voices.some((v: any) => v.key === voiceId)
        if (!hasVoice && Array.isArray(voices) && voices.length > 0 && voices[0] && voices[0].key) {
          voiceId = voices[0].key
        }
      } catch (e) {
        // ignore voice detection errors
      }

      const wav = await predict({ text: sentenceText.trim(), voiceId, engine: currentEngine })
      const url = URL.createObjectURL(wav)
      this.ttsBuffer.set(idx, url)
    } catch (e) {
      console.warn('prefetch tts error for idx', idx, e)
    }
  }

  // Prefetch a window starting at startIdx using the provided sentences array
  prefetch(startIdx: number, sentences: string[]) {
    if (!sentences || sentences.length === 0) return
    const tasks: Promise<void>[] = []
    for (let i = startIdx; i < startIdx + this.bufferSize && i < sentences.length; i++) {
      if (!this.ttsBuffer.has(i)) {
        tasks.push(this.ttsFetchForIdx(i, sentences[i]))
      }
    }
    if (tasks.length > 0) Promise.all(tasks).catch((e) => console.warn('prefetch error', e))
  }

  // Return an object URL for the given index (generate if needed)
  async ensureUrlFor(idx: number, sentences: string[]): Promise<string | undefined> {
    if (idx < 0 || idx >= (sentences?.length || 0)) return undefined
    if (this.ttsBuffer.has(idx)) return this.ttsBuffer.get(idx)
    await this.ttsFetchForIdx(idx, sentences[idx])
    return this.ttsBuffer.get(idx)
  }

  async playIndex(idx: number, sentences: string[]) {
    if (!this.audio) throw new Error('No audio element')
    if (idx < 0 || idx >= (sentences?.length || 0)) return

    const myReq = ++this.playRequestCounter

    const url = await this.ensureUrlFor(idx, sentences)
    // If another newer request started, abort
    if (myReq !== this.playRequestCounter) return
    if (!url) throw new Error('Failed to produce audio')

    try {
      // Clean up previous src if it's not in buffer
      try {
        if (this.audio.src) {
          const prev = this.audio.src
          const inBuffer = Array.from(this.ttsBuffer.values()).includes(prev)
          if (!inBuffer) URL.revokeObjectURL(prev)
        }
      } catch (e) {
        // ignore
      }

      this.audio.src = url
      try {
        await this.audio.play()
      } catch (err: any) {
        // If play was interrupted because a newer load/play was requested, ignore silently
        // Otherwise rethrow
        const isAbort = err && (err.name === 'AbortError' || err.code === DOMException.ABORT_ERR)
        if (myReq !== this.playRequestCounter && isAbort) {
          return
        }
        throw err
      }

      // Kick off background prefetch
      this.prefetch(idx + 1, sentences)
    } catch (e) {
      throw e
    }
  }

  clearBuffer() {
    try {
      this.ttsBuffer.forEach((url) => {
        try { URL.revokeObjectURL(url) } catch (e) { /* ignore */ }
      })
    } finally {
      this.ttsBuffer.clear()
    }
  }

  dispose() {
    try {
      this.clearBuffer()
      if (this.audio) {
        try { this.audio.pause() } catch (e) { /* ignore */ }
        try { if (this.audio.src) URL.revokeObjectURL(this.audio.src) } catch (e) { /* ignore */ }
        this.audio.src = ''
      }
    } catch (e) { /* ignore */ }
  }
}

export function createTTSPlayer(audio: HTMLAudioElement, opts?: TTSPlayerOptions) {
  return new TTSPlayer(audio, opts)
}
