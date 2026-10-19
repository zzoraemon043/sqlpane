export interface TextChunk {
  text: string
  bytes: number
}

export function encodingFromByteOrderMark(bytes: Uint8Array): 'utf-8' | 'utf-16le' | 'utf-16be' {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return 'utf-16le'
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return 'utf-16be'
  return 'utf-8'
}

export async function* readTextChunks(blob: Blob): AsyncGenerator<TextChunk> {
  const reader = blob.stream().getReader()
  let decoder: TextDecoder | undefined
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      decoder ??= new TextDecoder(encodingFromByteOrderMark(value))
      yield { text: decoder.decode(value, { stream: true }), bytes: value.byteLength }
    }
    const rest = decoder?.decode() ?? ''
    if (rest !== '') yield { text: rest, bytes: 0 }
  } finally {
    reader.releaseLock()
  }
}
