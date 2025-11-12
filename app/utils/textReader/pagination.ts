import { splitIntoSentences, escapeHtml } from '~/utils/text'

export function paginateText(text: string, linesPerPage: number): string[] {
  if (!text) return []
  const lines = text.split('\n')
  const pages: string[] = []
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage).join('\n'))
  }
  return pages
}

export function getPageSentenceMeta(pages: string[]): Array<{ offset: number; count: number }> {
  const meta: Array<{ offset: number; count: number }> = []
  let offset = 0
  for (const page of pages) {
    const count = splitIntoSentences(page).length
    meta.push({ offset, count })
    offset += count
  }
  return meta
}

export function renderPageContent(
  content: string,
  pageOffset: number,
  currentSentenceIndex: number
): string {
  let sentenceCounter = 0
  return content
    .split('\n')
    .map((line) => {
      if (!line.trim()) return '<p>&nbsp;</p>'
      const lineSentences = splitIntoSentences(line)
      const htmlLine = lineSentences
        .map((sentence) => {
          const globalIdx = pageOffset + sentenceCounter++
          const isCurrent = globalIdx === currentSentenceIndex
          const className = isCurrent ? 'reading-sentence' : ''
          const dataAttr = `data-sentence-idx="${globalIdx}"`
          return `<span class="${className}" ${dataAttr}>${escapeHtml(sentence)}</span>`
        })
        .join('')
      return `<p>${htmlLine || '&nbsp;'}</p>`
    })
    .join('')
}

export function getSentenceIndexForPage(metaList: Array<{ offset: number; count: number }>, page: number): number {
  const meta = metaList[page]
  if (!meta || meta.count === 0) return -1
  return meta.offset
}

export function findPageForSentence(metaList: Array<{ offset: number; count: number }>, index: number, fallbackPage: number): number {
  if (index < 0) return fallbackPage
  for (let i = 0; i < metaList.length; i++) {
    const meta = metaList[i]
    if (!meta) continue
    if (index >= meta.offset && index < meta.offset + meta.count) {
      return i
    }
  }
  return metaList.length ? metaList.length - 1 : 0
}
