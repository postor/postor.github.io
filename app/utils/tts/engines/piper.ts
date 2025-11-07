// @ts-nocheck
import * as piperTTS from '@mintplex-labs/piper-tts-web'
import type { TTSEngineAdapter, TTSPredictOptions, TTSVoice } from '../types'

export class PiperAdapter implements TTSEngineAdapter {
  private initialized = false

  async init(): Promise<void> {
    // Piper web package lazily loads voices/models on demand; no heavy init needed
    this.initialized = true
  }

  async getVoices(): Promise<TTSVoice[]> {
    const piperVoices = await piperTTS.voices()
    return piperVoices.map((v: any) => ({
      key: v.key,
      name: v.name || v.key,
      language: v.language || 'unknown',
    }))
  }

  async predict(options: TTSPredictOptions): Promise<Blob> {
    const { text, voiceId } = options
    const voices = await piperTTS.voices()
    let selectedVoiceId = voiceId || 'zh_CN-huayan-medium'
    const hasVoice = voices.some((v: any) => v.key === selectedVoiceId)
    if (!hasVoice && voices.length > 0 && voices[0]) {
      selectedVoiceId = voices[0].key
    }
    const wav = await piperTTS.predict({ text: text.trim(), voiceId: selectedVoiceId })
    return wav
  }
}
