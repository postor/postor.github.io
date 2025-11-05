import { defineStore } from 'pinia'
// Local FileEntry type (keeps store self-contained; components import their own types)
export interface FileEntry {
  id: string
  name: string
  type: 'file' | 'folder'
  ext?: string
  size?: number
  // uploadedAt derived from OPFS file lastModified when available
  uploadedAt?: number
  selected?: boolean
}
import * as opfs from '../utils/opfs'

function makeId() {
  return Math.random().toString(36).slice(2, 9)
}

const ROOT = 'my-books'
const HIDDEN_PREFIX = '_'

export const useFileBrowserStore = defineStore('fileBrowser', {
  state: () => ({
    currentPath: ROOT as string,
    items: [] as FileEntry[],
    loading: true,
    opfsAvailable: false,
    error: null as string | null,

    // UI state moved into store
    bulkOpen: false,
    showMoveModal: false,
    moveTarget: '',
    moveIds: [] as string[],

    showRenameModal: false,
    renameId: null as string | null,
    renameName: '',

    showDeleteModal: false,
    deleteIds: [] as string[],
  }),
  actions: {
    async init() {
      this.loading = true
      try {
        this.opfsAvailable = await opfs.available()
        if (this.opfsAvailable) {
          await this.ensureRoot()
          await this.syncFromOpfs(ROOT)
        } else {
          this.items = []
        }
      } catch (e: any) {
        this.error = e?.message || String(e)
        this.items = []
      } finally {
        this.loading = false
      }
    },

    async syncFromOpfs(path = ROOT) {
      this.loading = true
      this.error = null
      try {
        const list = await opfs.list(path)
        this.items = list
          .filter((i) => !i.name.startsWith(HIDDEN_PREFIX) && !i.name.startsWith('.'))
          .map((i) => ({ id: makeId(), name: i.name, type: i.type, size: i.size, uploadedAt: (i as any).mtime }))
      } catch (e: any) {
        this.error = e?.message || String(e)
        this.items = []
      } finally {
        this.loading = false
      }
    },

    async ensureRoot() {
      try {
        await opfs.mkdir(ROOT)
      } catch (_e) {
        // ignore - mkdir may fail if exists
      }
    },

    async createFolder(name = `New Folder ${Math.floor(Math.random() * 100)}`) {
      if (!this.opfsAvailable) {
        this.error = 'Storage not available'
        return
      }
      this.loading = true
      try {
        await opfs.mkdir(`${this.currentPath}/${name}`)
        await this.syncFromOpfs(this.currentPath)
      } catch (e: any) {
        this.error = e?.message || String(e)
      } finally {
        this.loading = false
      }
    },

    createPlaceholderFolder() {
      const id = `tmp-${makeId()}`
      this.items.unshift({ id, name: 'New folder', type: 'folder', selected: false, // custom flag
        // mark as editable
        // @ts-ignore - extra runtime field
        isNew: true,
        // @ts-ignore
        editing: true,
      } as any)
      return id
    },

    async confirmCreateFolder(id: string, name: string) {
      const idx = this.items.findIndex((i) => i.id === id)
      if (idx >= 0) this.items.splice(idx, 1)
      await this.createFolder(name)
    },

    cancelCreateFolder(id: string) {
      const idx = this.items.findIndex((i) => i.id === id)
      if (idx >= 0) this.items.splice(idx, 1)
    },

    async uploadFile(file?: File) {
      if (!file) return
      if (!this.opfsAvailable) {
        this.error = 'Storage not available'
        return
      }
      this.loading = true
      try {
        const path = `${this.currentPath}/${file.name}`
        await opfs.writeFile(path, file)
        await this.syncFromOpfs(this.currentPath)
      } catch (e: any) {
        this.error = e?.message || String(e)
      } finally {
        this.loading = false
      }
    },

    async goTo(path: string) {
      this.currentPath = path
      if (!this.opfsAvailable) {
        this.items = []
        return
      }
      await this.syncFromOpfs(path)
    },

    async openItem(item: FileEntry) {
      if (item.type === 'folder') {
        await this.goTo(`${this.currentPath}/${item.name}`)
      } else {
        if (!this.opfsAvailable) {
          this.error = 'Storage not available'
          return
        }
        try {
          const data = await opfs.readFile(`${this.currentPath}/${item.name}`)
          // eslint-disable-next-line no-console
          console.log('file data', data)
        } catch (e: any) {
          this.error = e?.message || String(e)
        }
      }
    },

    toggleSelect(item: FileEntry) {
      const found = this.items.find((i: FileEntry) => i.id === item.id)
      if (!found) return
      found.selected = !found.selected
    },

    startRename(id: string) {
      const found = this.items.find((i) => i.id === id)
      if (!found) return
      ;(found as any).editing = true
    },

    async finishRename(id: string, newName: string) {
      const found = this.items.find((i) => i.id === id)
      if (!found) return
      const oldName = found.name
      if (!this.opfsAvailable) {
        this.error = 'Storage not available'
        return
      }
      this.loading = true
      try {
        const src = `${this.currentPath}/${oldName}`
        const dest = `${this.currentPath}/${newName}`
        const ok = await opfs.move(src, dest)
        if (!ok) throw new Error('Rename failed')
        await this.syncFromOpfs(this.currentPath)
      } catch (e: any) {
        this.error = e?.message || String(e)
      } finally {
        this.loading = false
      }
    },

    cancelRename(id: string) {
      const found = this.items.find((i) => i.id === id)
      if (!found) return
      ;(found as any).editing = false
    },

    async deleteEntries(ids: string[]) {
      if (!this.opfsAvailable) {
        this.error = 'Storage not available'
        return
      }
      this.loading = true
      try {
        for (const id of ids) {
          const it = this.items.find((i) => i.id === id)
          if (!it) continue
          await opfs.remove(`${this.currentPath}/${it.name}`)
        }
        await this.syncFromOpfs(this.currentPath)
      } catch (e: any) {
        this.error = e?.message || String(e)
      } finally {
        this.loading = false
      }
    },

    async moveEntries(ids: string[], targetPath: string) {
      if (!this.opfsAvailable) {
        this.error = 'Storage not available'
        return
      }
      this.loading = true
      try {
        await opfs.mkdir(targetPath)
        for (const id of ids) {
          const it = this.items.find((i) => i.id === id)
          if (!it) continue
          const src = `${this.currentPath}/${it.name}`
          const dest = `${targetPath}/${it.name}`
          await opfs.move(src, dest)
        }
        await this.syncFromOpfs(this.currentPath)
      } catch (e: any) {
        this.error = e?.message || String(e)
      } finally {
        this.loading = false
      }
    },

    // UI actions moved into the store
    openMoveModalForItem(item: FileEntry) {
      this.moveIds = [item.id]
      this.moveTarget = `${this.currentPath}/${item.name}`
      this.showMoveModal = true
    },

    openMoveModalForBulk() {
      const ids = this.items.filter((i: FileEntry) => i.selected).map((i: FileEntry) => i.id)
      if (ids.length === 0) return
      this.moveIds = ids
      this.moveTarget = this.currentPath
      this.showMoveModal = true
      this.bulkOpen = false
    },

    async confirmMove() {
      if (this.moveIds.length === 0) return
      await this.moveEntries(this.moveIds, this.moveTarget)
      this.moveIds = []
      this.moveTarget = ''
      this.showMoveModal = false
    },

    cancelMove() {
      this.moveIds = []
      this.moveTarget = ''
      this.showMoveModal = false
    },

    openRenameModalForItem(item: FileEntry) {
      this.renameId = item.id
      this.renameName = item.name
      this.showRenameModal = true
    },

    async confirmRenameModal() {
      if (!this.renameId) return
      await this.finishRename(this.renameId, this.renameName)
      this.renameId = null
      this.renameName = ''
      this.showRenameModal = false
    },

    cancelRenameModal() {
      this.renameId = null
      this.renameName = ''
      this.showRenameModal = false
    },

    openDeleteModalForItem(item: FileEntry) {
      this.deleteIds = [item.id]
      this.showDeleteModal = true
    },

    openDeleteModalForBulk() {
      const ids = this.items.filter((i: FileEntry) => i.selected).map((i: FileEntry) => i.id)
      if (ids.length === 0) return
      this.deleteIds = ids
      this.showDeleteModal = true
      this.bulkOpen = false
    },

    async confirmDeleteModal() {
      if (this.deleteIds.length === 0) return
      await this.deleteEntries(this.deleteIds)
      this.deleteIds = []
      this.showDeleteModal = false
    },

    cancelDeleteModal() {
      this.deleteIds = []
      this.showDeleteModal = false
    },
  },
})
