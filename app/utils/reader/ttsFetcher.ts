// @ts-nocheck
import { predict, getVoices, getDefaultEngine } from '~/utils/tts/tts'
import type { TTSEngine } from '~/utils/tts/tts'
import { useTextReaderStore } from '~/stores/useTextReaderStore'
import type { TTSSourceFetcher } from './types'

const engineVoiceCache = new Map<TTSEngine, string>()

async function resolveVoice(engine: TTSEngine) {
  if (engineVoiceCache.has(engine)) {
    return engineVoiceCache.get(engine) || ''
  }

  let voiceId = ''
  try {
    const voices = (await getVoices(engine)) || []
    if (engine === 'piper') voiceId = 'zh_CN-huayan-medium'
    else if (engine === 'kokoro') voiceId = 'af_heart'

    const hasVoice = Array.isArray(voices) && voices.some((v: any) => v.key === voiceId)
    if (!hasVoice && Array.isArray(voices) && voices.length > 0 && voices[0]?.key) {
      voiceId = voices[0].key
    }
    engineVoiceCache.set(engine, voiceId)
  } catch (err) {
    // voice detection failures fallback to empty id
    engineVoiceCache.set(engine, voiceId)
  }
  return voiceId
}

export function createTTSFetcher(): TTSSourceFetcher {
  return async (sentence) => {
    const text = sentence?.trim()
    if (!text) return null

    const engine = getDefaultEngine()
    const voiceId = await resolveVoice(engine)
    try {
      // read preferred speed from store (client-side)
      let speed = 1
      try {
        const store = useTextReaderStore()
        speed = store.preferences.ttsSpeed ?? 1
      } catch (e) {
        // ignore if store not available
      }
      const wav = await predict({ text, voiceId, engine, speed })
      return wav
    } catch (err) {
      console.warn('tts fetcher error', err)
      throw err
    }
  }
}
