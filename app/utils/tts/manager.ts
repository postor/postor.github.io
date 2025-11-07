// @ts-nocheck
/**
 * Implementation of the unified TTS manager using engine adapters
 */

import type { ITTSManager, TTSEngine, TTSStreamChunk, TTSPredictOptions, TTSVoice, TTSEngineAdapter } from './types'
import { PiperAdapter } from './engines/piper'
import { KokoroAdapter } from './engines/kokoro'
import { OutettsAdapter } from './engines/outetts'

export class TTSManager implements ITTSManager {
  private defaultEngine: TTSEngine = 'piper'
  private initialized = false
  private adapters: Record<TTSEngine, TTSEngineAdapter>

  constructor() {
    this.adapters = {
      piper: new PiperAdapter(),
      kokoro: new KokoroAdapter(),
      outetts: new OutettsAdapter(),
    }
  }

  private getAdapter(engine?: TTSEngine): TTSEngineAdapter {
    const key = engine || this.defaultEngine
    return this.adapters[key]
  }

  async init(engine: TTSEngine = 'piper') {
    this.defaultEngine = engine
    await this.getAdapter(engine).init()
    this.initialized = true
  }

  async getVoices(engine?: TTSEngine): Promise<TTSVoice[]> {
    const selectedEngine = engine || this.defaultEngine
    return this.getAdapter(selectedEngine).getVoices()
  }

  async predict(options: TTSPredictOptions): Promise<Blob> {
    const { text, voiceId, engine, speaker, temperature, repetition_penalty, max_length } = options
    const selectedEngine = engine || this.defaultEngine
    if (!this.initialized) await this.init(selectedEngine)
    return this.getAdapter(selectedEngine).predict({ text, voiceId, engine: selectedEngine, speaker, temperature, repetition_penalty, max_length })
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

export async function initTTS(engine: TTSEngine = 'piper') {
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
export function setDefaultEngine(engine: TTSEngine) {
  ttsManager.setDefaultEngine(engine)
}
export function getDefaultEngine(): TTSEngine {
  return ttsManager.getDefaultEngine()
}
