// @ts-nocheck
import { HFModelConfig_v1, InterfaceHF } from 'outetts'
import type { TTSEngineAdapter, TTSPredictOptions, TTSVoice } from '../types'

export class OutettsAdapter implements TTSEngineAdapter {
  private instance: any = null
  private initialized = false

  async init(): Promise<void> {
    if (!this.instance) {
      const model_config = new HFModelConfig_v1({
        model_path: 'onnx-community/OuteTTS-0.2-500M',
        language: 'en', // en, zh, ja, ko
        dtype: 'q8', // "fp32", "fp16", "q8", "q4", "q4f16"
      })
      this.instance = await InterfaceHF({ model_version: '0.2', cfg: model_config })
    }
    this.initialized = true
  }

  async getVoices(): Promise<TTSVoice[]> {
    if (!this.instance) await this.init()
    // Could call print_default_speakers() for debug; expose a minimal default set here
    return [
      { key: 'male_1', name: 'Male 1', language: 'en' },
      { key: 'female_1', name: 'Female 1', language: 'en' },
    ]
  }

  async predict(options: TTSPredictOptions): Promise<Blob> {
    const { text, speaker, temperature, repetition_penalty, max_length } = options
    if (!this.instance) await this.init()
    const spk = this.instance.load_default_speaker(speaker || 'male_1')
    const output = await this.instance.generate({
      text,
      temperature: temperature ?? 0.1,
      repetition_penalty: repetition_penalty ?? 1.1,
      max_length: max_length ?? 4096,
      speaker: spk,
    })
    const wavData = output.wav ?? output.toWav?.() ?? output
    return new Blob([wavData], { type: 'audio/wav' })
  }
}
