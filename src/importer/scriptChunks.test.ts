import { describe, expect, it } from 'vitest'
import { encodingFromByteOrderMark, readTextChunks } from './scriptChunks'

async function readAll(blob: Blob) {
  let text = ''
  let bytes = 0
  for await (const chunk of readTextChunks(blob)) {
    text += chunk.text
    bytes += chunk.bytes
  }
  return { text, bytes }
}

function utf16le(text: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(2 + text.length * 2)
  bytes.set([0xff, 0xfe])
  for (let index = 0; index < text.length; index++) {
    bytes[2 + index * 2] = text.charCodeAt(index) & 0xff
    bytes[3 + index * 2] = text.charCodeAt(index) >> 8
  }
  return bytes
}

describe('script chunks', () => {
  it('detects byte order marks', () => {
    expect(encodingFromByteOrderMark(new Uint8Array([0xff, 0xfe]))).toBe('utf-16le')
    expect(encodingFromByteOrderMark(new Uint8Array([0xfe, 0xff]))).toBe('utf-16be')
    expect(encodingFromByteOrderMark(new Uint8Array([0x41]))).toBe('utf-8')
  })

  it('decodes UTF-8 with a BOM and counts bytes', async () => {
    const result = await readAll(new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), 'SELECT 中文'.toString()]))
    expect(result.text).toBe('SELECT 中文')
    expect(result.bytes).toBe(3 + new TextEncoder().encode('SELECT 中文').length)
  })

  it('decodes UTF-16 scripts saved by SQL Server tools', async () => {
    expect((await readAll(new Blob([utf16le("INSERT [t] VALUES (N'台北')")]))).text).toBe("INSERT [t] VALUES (N'台北')")
  })
})
