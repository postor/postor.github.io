import { defineStore } from 'pinia'

export interface Book {
  id: string
  title: string
  filePath: string
  total: number
  current: number
  lastRead: number // timestamp
}

interface State {
  recentBooks: Book[]
  currentBook: Book | null
}

export const useBookReadingStore = defineStore('bookReading', {
  state: (): State => ({
    recentBooks: [],
    currentBook: null,
  }),
  // Persist this store to localStorage on the client
  persist: true,
  actions: {
    addRecentBook(book: Book) {
      const idx = this.recentBooks.findIndex(b => b.id === book.id)
      if (idx !== -1) this.recentBooks.splice(idx, 1)
      this.recentBooks.unshift({ ...book, lastRead: Date.now() })
      if (this.recentBooks.length > 20) this.recentBooks.length = 20
    },
    setCurrentBook(book: Book) {
      this.currentBook = book
      this.addRecentBook(book)
    },
    updateProgress(bookId: string, current: number, total: number) {
      const book = this.recentBooks.find(b => b.id === bookId)
      if (book) {
        book.current = current
        book.total = total
        book.lastRead = Date.now()
      }
      if (this.currentBook && this.currentBook.id === bookId) {
        this.currentBook.current = current
        this.currentBook.total = total
        this.currentBook.lastRead = Date.now()
      }
    },
    clearCurrentBook() {
      this.currentBook = null
    }
  },
  getters: {
    sortedRecentBooks: (state) =>
      [...state.recentBooks].sort((a, b) => b.lastRead - a.lastRead),
    getBookProgress: () => (book: Book) =>
      book.total > 0 ? Math.round((book.current / book.total) * 100) : 0,
  },
})
