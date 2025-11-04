export interface FileEntry {
  id: string
  name: string
  type: 'file' | 'folder'
  ext?: string
  size?: number
  selected?: boolean
}
