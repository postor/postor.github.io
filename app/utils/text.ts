export function splitIntoSentences(text: string): string[] {
  if (!text) return []
  // Split by common sentence endings (period, exclamation, question mark, Chinese periods)
  // Keep the punctuation with the sentence
  const regex = /[^。！？\.!?]+[。！？\.!?]*/g
  const matches = text.match(regex) || []
  return matches.filter((s) => s.trim().length > 0)
}

export function escapeHtml(text: string): string {
  if (text == null) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
