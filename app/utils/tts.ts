/**
 * Unified TTS API supporting multiple TTS engines
 * Currently supports: Piper TTS and Kokoro TTS
 */

import * as piperTTS from '@mintplex-labs/piper-tts-web'
import { KokoroTTS, TextSplitterStream } from 'kokoro-js'

export type TTSEngine = 'piper' | 'kokoro'

export interface TTSVoice {
  key: string
  name: string
  language: string
}

export interface TTSPredictOptions {
  text: string
  voiceId?: string
  engine?: TTSEngine
}

export interface TTSStreamChunk {
  text: string
  phonemes: string
  audio: Blob
}

/**
 * Singleton manager for TTS engines
 */
class TTSManager {
  private kokoroInstance: any = null
  private defaultEngine: TTSEngine = 'piper'
  private initialized = false

  /**
   * Initialize the TTS manager with the specified engine
   */
  async init(engine: TTSEngine = 'piper') {
    this.defaultEngine = engine
    
    if (engine === 'kokoro' && !this.kokoroInstance) {
      const model_id = 'onnx-community/Kokoro-82M-v1.0-ONNX'
      this.kokoroInstance = await KokoroTTS.from_pretrained(model_id, {
        dtype: 'q4',
      })
    }
    
    this.initialized = true
  }

  /**
   * Get available voices from the current engine
   */
  async getVoices(engine?: TTSEngine): Promise<TTSVoice[]> {
    const selectedEngine = engine || this.defaultEngine

    if (selectedEngine === 'piper') {
      const piperVoices = await piperTTS.voices()
      return piperVoices.map((v: any) => ({
        key: v.key,
        name: v.name || v.key,
        language: v.language || 'unknown',
      }))
    } else if (selectedEngine === 'kokoro') {
      // 硬编码KokoroJS voice列表
      const kokoroVoices: Record<string, { name: string; language: string }> = {
        "af_heart": { name: "Heart", language: "en-us" },
        "af_alloy": { name: "Alloy", language: "en-us" },
        "af_aoede": { name: "Aoede", language: "en-us" },
        "af_bella": { name: "Bella", language: "en-us" },
        "af_jessica": { name: "Jessica", language: "en-us" },
        "af_kore": { name: "Kore", language: "en-us" },
        "af_nicole": { name: "Nicole", language: "en-us" },
        "af_nova": { name: "Nova", language: "en-us" },
        "af_river": { name: "River", language: "en-us" },
        "af_sarah": { name: "Sarah", language: "en-us" },
        "af_sky": { name: "Sky", language: "en-us" },
        "am_adam": { name: "Adam", language: "en-us" },
        "am_echo": { name: "Echo", language: "en-us" },
        "am_eric": { name: "Eric", language: "en-us" },
        "am_fenrir": { name: "Fenrir", language: "en-us" },
        "am_liam": { name: "Liam", language: "en-us" },
        "am_michael": { name: "Michael", language: "en-us" },
        "am_onyx": { name: "Onyx", language: "en-us" },
        "am_puck": { name: "Puck", language: "en-us" },
        "am_santa": { name: "Santa", language: "en-us" },
        "bf_emma": { name: "Emma", language: "en-gb" },
        "bf_isabella": { name: "Isabella", language: "en-gb" },
        "bm_george": { name: "George", language: "en-gb" },
        "bm_lewis": { name: "Lewis", language: "en-gb" },
        "bf_alice": { name: "Alice", language: "en-gb" },
        "bf_lily": { name: "Lily", language: "en-gb" },
        "bm_daniel": { name: "Daniel", language: "en-gb" },
        "bm_fable": { name: "Fable", language: "en-gb" },
      }
      return Object.entries(kokoroVoices).map(([key, v]) => ({
        key,
        name: v.name,
        language: v.language,
      }))
    }

    return []
  }

  /**
   * Generate speech from text
   */
  async predict(options: TTSPredictOptions): Promise<Blob> {
    const { text, voiceId, engine } = options
    const selectedEngine = engine || this.defaultEngine

    if (!this.initialized) {
      await this.init(selectedEngine)
    }

    if (selectedEngine === 'piper') {
      return await this.predictPiper(text, voiceId)
    } else if (selectedEngine === 'kokoro') {
      return await this.predictKokoro(text, voiceId)
    }

    throw new Error(`Unsupported TTS engine: ${selectedEngine}`)
  }

  /**
   * Generate speech using Piper TTS
   */
  private async predictPiper(text: string, voiceId?: string): Promise<Blob> {
    const voices = await piperTTS.voices()
    
    // Use provided voiceId or default to Chinese voice
    let selectedVoiceId = voiceId || 'zh_CN-huayan-medium'
    const hasVoice = voices.some((v: any) => v.key === selectedVoiceId)
    
    if (!hasVoice && voices.length > 0 && voices[0]) {
      selectedVoiceId = voices[0].key
    }

    const wav = await piperTTS.predict({
      text: text.trim(),
      voiceId: selectedVoiceId,
    })

    return wav
  }

  /**
   * Generate speech using Kokoro TTS
   */
  private async predictKokoro(text: string, voiceId?: string): Promise<Blob> {
    if (!this.kokoroInstance) {
      await this.init('kokoro')
    }

    const voice = voiceId || 'af' // Default to American Female
    const audio = await this.kokoroInstance.generate(text, { voice })
    const wav = audio.toWav()
    
    return new Blob([wav], { type: 'audio/wav' })
  }

  /**
   * Stream speech generation (Kokoro only)
   * Returns an async iterator of audio chunks
   */
  async *stream(text: string, voiceId?: string): AsyncGenerator<TTSStreamChunk, void, unknown> {
    if (!this.kokoroInstance) {
      await this.init('kokoro')
    }

    const splitter = new TextSplitterStream()
    const voice = voiceId || 'af'
    const stream = this.kokoroInstance.stream(splitter, { voice })

    // Start processing stream
    const streamProcessor = (async () => {
      const chunks: TTSStreamChunk[] = []
      for await (const { text: chunkText, phonemes, audio } of stream) {
        const wav = audio.toWav()
        const blob = new Blob([wav], { type: 'audio/wav' })
        chunks.push({
          text: chunkText,
          phonemes,
          audio: blob,
        })
      }
      return chunks
    })()

    // Feed text to splitter
    const tokens = text.match(/\s*\S+/g)
    if (tokens) {
      for (const token of tokens) {
        splitter.push(token)
        await new Promise((resolve) => setTimeout(resolve, 10))
      }
    }
    splitter.close()

    // Yield chunks as they arrive
    const chunks = await streamProcessor
    for (const chunk of chunks) {
      yield chunk
    }
  }

  /**
   * Set the default TTS engine
   */
  setDefaultEngine(engine: TTSEngine) {
    this.defaultEngine = engine
  }

  /**
   * Get the current default engine
   */
  getDefaultEngine(): TTSEngine {
    return this.defaultEngine
  }

  /**
   * Check if an engine is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }
}

// Export singleton instance
export const ttsManager = new TTSManager()

// Export convenience functions
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
