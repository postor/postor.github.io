// @ts-nocheck
import { KokoroTTS, TextSplitterStream } from 'kokoro-js'
import type { TTSEngineAdapter, TTSPredictOptions, TTSVoice, TTSStreamChunk } from '../types'

export class KokoroAdapter implements TTSEngineAdapter {
  private instance: any = null
  private initialized = false

  async init(): Promise<void> {
    if (!this.instance) {
      const model_id = 'onnx-community/Kokoro-82M-v1.0-ONNX'
      this.instance = await KokoroTTS.from_pretrained(model_id, { dtype: 'q4' })
    }
    this.initialized = true
  }

  async getVoices(): Promise<TTSVoice[]> {
    // Hard-coded voice map
    const kokoroVoices: Record<string, { name: string; language: string }> = {
      'af_heart': { name: 'Heart', language: 'en-us' },
      'af_alloy': { name: 'Alloy', language: 'en-us' },
      'af_aoede': { name: 'Aoede', language: 'en-us' },
      'af_bella': { name: 'Bella', language: 'en-us' },
      'af_jessica': { name: 'Jessica', language: 'en-us' },
      'af_kore': { name: 'Kore', language: 'en-us' },
      'af_nicole': { name: 'Nicole', language: 'en-us' },
      'af_nova': { name: 'Nova', language: 'en-us' },
      'af_river': { name: 'River', language: 'en-us' },
      'af_sarah': { name: 'Sarah', language: 'en-us' },
      'af_sky': { name: 'Sky', language: 'en-us' },
      'am_adam': { name: 'Adam', language: 'en-us' },
      'am_echo': { name: 'Echo', language: 'en-us' },
      'am_eric': { name: 'Eric', language: 'en-us' },
      'am_fenrir': { name: 'Fenrir', language: 'en-us' },
      'am_liam': { name: 'Liam', language: 'en-us' },
      'am_michael': { name: 'Michael', language: 'en-us' },
      'am_onyx': { name: 'Onyx', language: 'en-us' },
      'am_puck': { name: 'Puck', language: 'en-us' },
      'am_santa': { name: 'Santa', language: 'en-us' },
      'bf_emma': { name: 'Emma', language: 'en-gb' },
      'bf_isabella': { name: 'Isabella', language: 'en-gb' },
      'bm_george': { name: 'George', language: 'en-gb' },
      'bm_lewis': { name: 'Lewis', language: 'en-gb' },
      'bf_alice': { name: 'Alice', language: 'en-gb' },
      'bf_lily': { name: 'Lily', language: 'en-gb' },
      'bm_daniel': { name: 'Daniel', language: 'en-gb' },
      'bm_fable': { name: 'Fable', language: 'en-gb' },
    }
    return Object.entries(kokoroVoices).map(([key, v]) => ({ key, name: v.name, language: v.language }))
  }

  async predict(options: TTSPredictOptions): Promise<Blob> {
    const { text, voiceId, speed } = options
    if (!this.instance) await this.init()
    const voice = voiceId || 'af'
    // pass speed through if provided (kokoro-js supports generation options)
    const audio = await this.instance.generate(text, { voice, ...(typeof speed === 'number' ? { speed } : {}) })
    const wav = audio.toWav()
    return new Blob([wav], { type: 'audio/wav' })
  }

  async *stream(text: string, voiceId?: string): AsyncGenerator<TTSStreamChunk, void, unknown> {
    if (!this.instance) await this.init()
    const splitter = new TextSplitterStream()
    const voice = voiceId || 'af'
    const stream = this.instance.stream(splitter, { voice })
    const streamProcessor = (async () => {
      const chunks: TTSStreamChunk[] = []
      for await (const { text: chunkText, phonemes, audio } of stream) {
        const wav = audio.toWav()
        const blob = new Blob([wav], { type: 'audio/wav' })
        chunks.push({ text: chunkText, phonemes, audio: blob })
      }
      return chunks
    })()
    const tokens = text.match(/\s*\S+/g)
    if (tokens) {
      for (const token of tokens) {
        splitter.push(token)
        await new Promise((resolve) => setTimeout(resolve, 10))
      }
    }
    splitter.close()
    const chunks = await streamProcessor
    for (const chunk of chunks) {
      yield chunk
    }
  }
}
