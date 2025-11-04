// Simple wrapper for Origin Private File System / Storage Foundation API
// Provides a small, defensive API: available(), list(path), readFile(path), writeFile(path, data), mkdir(path), remove(path)

type DirHandle = any

let root: DirHandle | null = null

async function getRoot(): Promise<DirHandle | null> {
  if (root) return root
  // Storage Foundation API
  try {
    if (typeof navigator !== 'undefined' && (navigator as any).storage && typeof (navigator as any).storage.getDirectory === 'function') {
      root = await (navigator as any).storage.getDirectory()
      return root
    }
  } catch (e) {
    // ignore
  }

  // global originPrivateFileSystem (older prefixed implementations)
  try {
    const g: any = globalThis as any
    if (g.originPrivateFileSystem) {
      root = g.originPrivateFileSystem
      return root
    }
  } catch (e) {
    // ignore
  }

  return null
}

export async function available(): Promise<boolean> {
  const r = await getRoot()
  return !!r
}

async function getHandleForPath(path: string, create = false): Promise<DirHandle | null> {
  const r = await getRoot()
  if (!r) return null
  if (!path || path === '' || path === '/') return r

  const parts = path.split('/').filter(Boolean)
  let dir: DirHandle = r
  for (const p of parts) {
    try {
      dir = await dir.getDirectoryHandle(p, { create })
    } catch (err) {
      return null
    }
  }
  return dir
}

export async function list(path = ''): Promise<Array<{ name: string; type: 'file' | 'folder'; size?: number }>> {
  const dir = await getHandleForPath(path)
  if (!dir) return []
  const out: Array<{ name: string; type: 'file' | 'folder'; size?: number }> = []
  try {
    // entries() is an async iterable of [name, handle]
    for await (const entry of dir.entries ? dir.entries() : []) {
      // entry may be [name, handle] or {name, kind}
      if (Array.isArray(entry)) {
        const [name, handle] = entry
        const kind = handle.kind || (handle.isFile ? 'file' : 'directory')
        out.push({ name, type: kind === 'file' ? 'file' : 'folder' })
      } else if (entry && typeof entry === 'object') {
        const { name, kind } = entry as any
        out.push({ name, type: kind === 'file' ? 'file' : 'folder' })
      }
    }
  } catch (e) {
    // some implementations don't support entries(); try keys()
    try {
      for await (const name of dir.keys()) {
        out.push({ name, type: 'file' })
      }
    } catch (_e) {
      // give up
    }
  }
  return out
}

export async function readFile(path: string): Promise<ArrayBuffer | string | null> {
  const parts = path.split('/').filter(Boolean)
  const fileName = parts.pop()
  const dirPath = parts.join('/')
  const dir = await getHandleForPath(dirPath)
  if (!dir || !fileName) return null
  try {
    const fh = await dir.getFileHandle(fileName)
    const file = await fh.getFile()
    // return text by default
    try {
      return await file.text()
    } catch (_e) {
      return await file.arrayBuffer()
    }
  } catch (e) {
    return null
  }
}

export async function writeFile(path: string, data: string | ArrayBuffer | Blob): Promise<boolean> {
  const parts = path.split('/').filter(Boolean)
  const fileName = parts.pop()
  const dirPath = parts.join('/')
  const dir = await getHandleForPath(dirPath, true)
  if (!dir || !fileName) return false
  try {
    const fh = await dir.getFileHandle(fileName, { create: true })
    const writable = await fh.createWritable()
    await writable.write(data)
    await writable.close()
    return true
  } catch (e) {
    return false
  }
}

export async function mkdir(path: string): Promise<boolean> {
  const dir = await getHandleForPath(path, true)
  return !!dir
}

export async function remove(path: string): Promise<boolean> {
  const parts = path.split('/').filter(Boolean)
  const name = parts.pop()
  const dirPath = parts.join('/')
  const dir = await getHandleForPath(dirPath)
  if (!dir || !name) return false
  try {
    if (typeof dir.removeEntry === 'function') {
      await dir.removeEntry(name, { recursive: true })
      return true
    }
    // removeEntry not available: try getting handle and then remove via parent API not supported
    return false
  } catch (e) {
    return false
  }
}

// Move (rename) an entry from src to dest. Handles files and directories recursively.
export async function move(src: string, dest: string): Promise<boolean> {
  const srcParts = src.split('/').filter(Boolean)
  const srcName = srcParts.pop()
  const srcDir = srcParts.join('/')
  const destParts = dest.split('/').filter(Boolean)
  const destName = destParts.pop()
  const destDir = destParts.join('/')
  if (!srcName || !destName) return false
  const srcHandle = await getHandleForPath(srcDir || '')
  const destHandle = await getHandleForPath(destDir || '', true)
  if (!srcHandle || !destHandle) return false

  try {
    // Try file move
    if (typeof srcHandle.getFileHandle === 'function') {
      try {
        const fh = await srcHandle.getFileHandle(srcName)
        const file = await fh.getFile()
        // write to dest
        const dfh = await destHandle.getFileHandle(destName, { create: true })
        const writable = await dfh.createWritable()
        await writable.write(file)
        await writable.close()
        // remove source
        if (typeof srcHandle.removeEntry === 'function') {
          await srcHandle.removeEntry(srcName)
        }
        return true
      } catch (e) {
        // not a file, fallthrough to directory handling
      }
    }

    // Directory move: create dest dir, move entries recursively
    // create dest dir if missing
    try {
      await destHandle.getDirectoryHandle(destName, { create: true })
    } catch (_e) {
      // ignore
    }
    const srcChildren = await list(src)
    for (const child of srcChildren) {
      const childSrc = `${src}/${child.name}`
      const childDest = `${dest}/${child.name}`
      await move(childSrc, childDest)
    }
    // remove src dir
    if (typeof srcHandle.removeEntry === 'function') {
      await srcHandle.removeEntry(srcName, { recursive: true })
      return true
    }
    return false
  } catch (e) {
    return false
  }
}

export default { available, list, readFile, writeFile, mkdir, remove }
