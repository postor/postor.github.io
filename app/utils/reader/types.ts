// @ts-nocheck
export type TTSSourceFetcher = (sentence: string, index: number, sessionId: string) => Promise<Blob | null>
