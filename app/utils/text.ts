export function splitIntoSentences(text: string): string[] {
  if (!text) return []
  // Normalize Windows CRLF to LF for consistent splitting
  const normalized = text.replace(/\r\n?/g, '\n')
  // We want to split sentences by punctuation or line boundaries while keeping terminal punctuation.
  // Strategy: Replace line breaks with a sentinel punctuation (newline treated as boundary) then use regex.
  // We'll temporarily mark newlines so we can treat them like sentence end delimiters.
  const sentinel = '\u0000' // unlikely to appear in normal text
  const withSentinel = normalized.replace(/\n+/g, match => sentinel.repeat(match.length))
  // Regex explanation:
  // [^。！？.!?\u0000]+ matches a run of characters that are not end delimiters
  // [。！？.!?]* optionally captures trailing punctuation
  // [\u0000]* optionally captures sentinel(s) (line breaks) as boundaries.
  const regex = /[^。！？.!?\u0000]+[。！？.!?]*[\u0000]*/g
  const raw = withSentinel.match(regex) || []
  return raw
    .map(segment => segment.replace(new RegExp(sentinel, 'g'), '').trim())
    .filter(s => s.length > 0)
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
