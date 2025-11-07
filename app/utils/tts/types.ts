// @ts-nocheck
// Types and interfaces for the unified TTS layer

export type TTSEngine = 'piper' | 'kokoro' | 'outetts'

export interface TTSVoice {
  key: string
  name: string
  language: string
}

export interface TTSPredictOptions {
  text: string
  voiceId?: string
  engine?: TTSEngine
  // Outetts-specific optional fields
  speaker?: string
  temperature?: number
  repetition_penalty?: number
  max_length?: number
}

export interface TTSStreamChunk {
  text: string
  phonemes: string
  audio: Blob
}

export interface ITTSManager {
  init(engine?: TTSEngine): Promise<void>
  getVoices(engine?: TTSEngine): Promise<TTSVoice[]>
  predict(options: TTSPredictOptions): Promise<Blob>
  stream(text: string, voiceId?: string): AsyncGenerator<TTSStreamChunk, void, unknown>
  setDefaultEngine(engine: TTSEngine): void
  getDefaultEngine(): TTSEngine
  isInitialized(): boolean
}

// Adapter interface for specific engines
export interface TTSEngineAdapter {
  init(): Promise<void>
  getVoices(): Promise<TTSVoice[]>
  predict(options: TTSPredictOptions): Promise<Blob>
  // Optional: only some engines implement streaming
  stream?(text: string, voiceId?: string): AsyncGenerator<TTSStreamChunk, void, unknown>
}
