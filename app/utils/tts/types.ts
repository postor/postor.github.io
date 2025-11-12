// @ts-nocheck
// Types and interfaces for the unified TTS layer

export type TTSEngine = 'piper' | 'kokoro' | 'outetts' | 'easy-speech'

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
  // Optional playback/generation speed multiplier. 1 = normal, <1 slower, >1 faster
  speed?: number
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
  // High-level helpers tuned for reader use-cases
  // Fetch a single audio blob for a sentence. Accepts AbortSignal for cancellation.
  fetchAudioForSentence(options: { text: string; voiceId?: string; engine?: TTSEngine; speed?: number; signal?: AbortSignal }): Promise<Blob>
  // Convenience: return an object URL for the fetched audio and track it for later revocation
  fetchAudioUrlForSentence(options: { text: string; voiceId?: string; engine?: TTSEngine; speed?: number; signal?: AbortSignal }): Promise<string>
  // Release a previously created object URL (revokes it and forgets it)
  releaseAudioUrl(url: string): void
  // Revoke and clear all tracked object URLs
  clearAudioUrls(): void
  // Optional bulk prefetch helper for reader buffer windows
  prefetch?(sentences: string[], startIndex?: number, bufferSize?: number): Promise<void>
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
