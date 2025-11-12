import * as iconv from 'iconv-lite'
import jschardet from 'jschardet'

// Normalize some common encodings to values supported by iconv-lite
const encodingMap: Record<string, string> = {
  GB2312: 'gbk',
  GB18030: 'gbk',
  'windows-1252': 'windows-1252',
  'UTF-8': 'utf-8',
  Big5: 'big5',
  SHIFT_JIS: 'shift_jis',
  'EUC-JP': 'euc-jp',
  'EUC-KR': 'euc-kr',
}

export function detectEncodingFromBytes(data: Uint8Array): string {
  try {
    let binaryString = ''
    const len = Math.min(data.length, 100000)
    for (let i = 0; i < len; i++) {
      const byte = data[i]
      if (byte !== undefined) binaryString += String.fromCharCode(byte)
    }
    const result = jschardet.detect(binaryString)
    if (result && result.encoding) {
      return encodingMap[result.encoding] || result.encoding.toLowerCase()
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error detecting encoding:', err)
  }
  return 'utf-8'
}

export function decodeBytes(data: Uint8Array, encoding: string): string {
  return iconv.decode(data, encoding || 'utf-8')
}
