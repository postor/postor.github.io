
// @ts-nocheck
// Barrel re-exports for backward compatibility
export type { TTSEngine, TTSVoice, TTSPredictOptions, TTSStreamChunk, ITTSManager } from './types'
export {
  TTSManager,
  ttsManager,
  initTTS,
  getVoices,
  predict,
  streamTTS,
  fetchAudioForSentence,
  fetchAudioUrlForSentence,
  releaseAudioUrl,
  clearAudioUrls,
  prefetch,
  setDefaultEngine,
  getDefaultEngine,
} from './manager'
