// @ts-nocheck
/**
 * Implementation of the unified TTS manager using engine adapters
 */

import type { ITTSManager, TTSEngine, TTSStreamChunk, TTSPredictOptions, TTSVoice, TTSEngineAdapter } from './types'
import { PiperAdapter } from './engines/piper'
import { KokoroAdapter } from './engines/kokoro'
import { OutettsAdapter } from './engines/outetts'
import { EasySpeechAdapter } from './engines/easy-speech'

export class TTSManager implements ITTSManager {
  private defaultEngine: TTSEngine = 'easy-speech'
  private initialized = false
  // Track which engine adapters have been initialized to avoid calling
  // Web Speech APIs (easy-speech) before init.
  private initializedAdapters: Set<TTSEngine> = new Set()
  private adapters: Record<TTSEngine, TTSEngineAdapter>
  // Track object URLs created by helper methods so they can be revoked
  private urlCache: Set<string> = new Set()

  constructor() {
    this.adapters = {
      piper: new PiperAdapter(),
      kokoro: new KokoroAdapter(),
      outetts: new OutettsAdapter(),
      'easy-speech': new EasySpeechAdapter(),
    }
  }

  private getAdapter(engine?: TTSEngine): TTSEngineAdapter {
    const key = engine || this.defaultEngine
    return this.adapters[key]
  }

  async init(engine: TTSEngine = 'easy-speech') {
    this.defaultEngine = engine
    const adapter = this.getAdapter(engine)
    if (!this.initializedAdapters.has(engine)) {
      await adapter.init()
      this.initializedAdapters.add(engine)
    }
    this.initialized = true
  }

  async getVoices(engine?: TTSEngine): Promise<TTSVoice[]> {
    const selectedEngine = engine || this.defaultEngine
    // Ensure adapter is initialized before listing voices (needed for easy-speech)
    if (!this.initializedAdapters.has(selectedEngine)) {
      await this.getAdapter(selectedEngine).init()
      this.initializedAdapters.add(selectedEngine)
    }
    return this.getAdapter(selectedEngine).getVoices()
  }

  async predict(options: TTSPredictOptions): Promise<Blob> {
    const { text, voiceId, engine, speaker, temperature, repetition_penalty, max_length, speed } = options
    const selectedEngine = engine || this.defaultEngine
    if (!this.initializedAdapters.has(selectedEngine)) {
      await this.getAdapter(selectedEngine).init()
      this.initializedAdapters.add(selectedEngine)
      this.initialized = true
    }
    return this.getAdapter(selectedEngine).predict({ text, voiceId, engine: selectedEngine, speaker, temperature, repetition_penalty, max_length, speed })
  }


  async *stream(text: string, voiceId?: string): AsyncGenerator<TTSStreamChunk, void, unknown> {
    const adapter = this.getAdapter('kokoro')
    if (adapter.stream) {
      // If Kokoro adapter supports streaming (it does), delegate
      for await (const chunk of adapter.stream(text, voiceId)) {
        yield chunk
      }
      return
    }
    // Fallback: single shot predict and yield one chunk
    const audio = await this.getAdapter().predict({ text, voiceId })
    yield { text, phonemes: '', audio }
  }

  // High-level helper: fetch audio blob for a sentence. Accepts optional AbortSignal.
  async fetchAudioForSentence(options: { text: string; voiceId?: string; engine?: TTSEngine; speed?: number; signal?: AbortSignal }): Promise<Blob> {
    const { text, voiceId, engine, speed, signal } = options
    if (!text || !text.trim()) throw new Error('No text')
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    // Delegate to predict. Many adapters don't support AbortSignal so we do a simple pre-check.
    const blob = await this.predict({ text, voiceId, engine, speed })

    if (signal?.aborted) {
      // If caller aborted during predict, reject similarly.
      throw new DOMException('Aborted', 'AbortError')
    }
    return blob
  }

  // Create and return an object URL for the audio; caller should call releaseAudioUrl when done.
  async fetchAudioUrlForSentence(options: { text: string; voiceId?: string; engine?: TTSEngine; speed?: number; signal?: AbortSignal }): Promise<string> {
    const blob = await this.fetchAudioForSentence(options)
    const url = URL.createObjectURL(blob)
    this.urlCache.add(url)
    return url
  }

  releaseAudioUrl(url: string) {
    try {
      if (this.urlCache.has(url)) {
        try { URL.revokeObjectURL(url) } catch (e) { /* ignore */ }
        this.urlCache.delete(url)
      }
    } catch (e) {
      // swallow
    }
  }

  clearAudioUrls() {
    try {
      this.urlCache.forEach((u) => {
        try { URL.revokeObjectURL(u) } catch (e) { /* ignore */ }
      })
    } finally {
      this.urlCache.clear()
    }
  }

  async prefetch(sentences: string[], startIndex: number = 0, bufferSize: number = 5): Promise<void> {
    if (!Array.isArray(sentences) || sentences.length === 0) return
    const end = Math.min(sentences.length, startIndex + bufferSize)
    const tasks: Promise<void>[] = []
    for (let i = startIndex; i < end; i++) {
      const s = sentences[i]
      if (!s || !s.trim()) continue
      tasks.push(
        this.fetchAudioUrlForSentence({ text: s }).then(() => {}).catch(() => {})
      )
    }
    await Promise.all(tasks)
  }

  setDefaultEngine(engine: TTSEngine) {
    this.defaultEngine = engine
  }
  getDefaultEngine(): TTSEngine {
    return this.defaultEngine
  }
  isInitialized(): boolean {
    return this.initialized
  }
}

export const ttsManager: ITTSManager = new TTSManager()

export async function initTTS(engine: TTSEngine = 'easy-speech') {
  return ttsManager.init(engine)
}
export async function getVoices(engine?: TTSEngine): Promise<TTSVoice[]> {
  return ttsManager.getVoices(engine)
}
export async function predict(options: TTSPredictOptions): Promise<Blob> {
  return ttsManager.predict(options)
}
export function streamTTS(text: string, voiceId?: string): AsyncGenerator<TTSStreamChunk, void, unknown> {
  return ttsManager.stream(text, voiceId)
}
export async function fetchAudioForSentence(options: { text: string; voiceId?: string; engine?: TTSEngine; speed?: number; signal?: AbortSignal }): Promise<Blob> {
  return ttsManager.fetchAudioForSentence(options)
}
export async function fetchAudioUrlForSentence(options: { text: string; voiceId?: string; engine?: TTSEngine; speed?: number; signal?: AbortSignal }): Promise<string> {
  return ttsManager.fetchAudioUrlForSentence(options)
}
export function releaseAudioUrl(url: string) {
  return ttsManager.releaseAudioUrl(url)
}
export function clearAudioUrls() {
  return ttsManager.clearAudioUrls()
}
export async function prefetch(sentences: string[], startIndex?: number, bufferSize?: number): Promise<void> {
  return ttsManager.prefetch(sentences, startIndex, bufferSize)
}
export function setDefaultEngine(engine: TTSEngine) {
  ttsManager.setDefaultEngine(engine)
}
export function getDefaultEngine(): TTSEngine {
  return ttsManager.getDefaultEngine()
}
