// @ts-nocheck
import EasySpeech from 'easy-speech'
import type { TTSEngineAdapter, TTSPredictOptions, TTSVoice } from '../types'

export class EasySpeechAdapter implements TTSEngineAdapter {
  private initialized = false

  async init(): Promise<void> {
    const result = await EasySpeech.init({ maxTimeout: 5000, interval: 250 })
    if (!result) {
      throw new Error('EasySpeech initialization failed')
    }
    this.initialized = true
  }

  async getVoices(): Promise<TTSVoice[]> {
    // Ensure initialized before accessing voices (Web Speech API requirement)
    if (!this.initialized) {
      await this.init()
    }
    const voices = EasySpeech.voices()
    return voices.map((v: any) => ({
      key: v.name,
      name: v.name,
      language: v.lang,
    }))
  }

  async predict(options: TTSPredictOptions): Promise<Blob> {
    // EasySpeech does not support generating audio blobs directly
    // It only supports playing audio via Web Speech API
    throw new Error('EasySpeech adapter does not support audio blob generation. Use speak() method instead.')
  }
}