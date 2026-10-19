import { Int32, makeData, makeVector, Utf8, type Vector } from 'apache-arrow'

export function int32Vector(values: readonly number[]): Vector<Int32> {
  return makeVector(makeData({ type: new Int32(), length: values.length, nullCount: 0, data: Int32Array.from(values) }))
}

export function utf8Vector(values: readonly (string | null)[]): Vector<Utf8> {
  const encoder = new TextEncoder()
  const encoded = values.map((value) => (value === null ? undefined : encoder.encode(value)))
  const valueOffsets = new Int32Array(values.length + 1)
  const nullBitmap = new Uint8Array(Math.ceil(values.length / 8))
  let byteLength = 0
  let nullCount = 0
  encoded.forEach((bytes, index) => {
    if (bytes === undefined) nullCount++
    else {
      nullBitmap[index >> 3] |= 1 << (index & 7)
      byteLength += bytes.length
    }
    valueOffsets[index + 1] = byteLength
  })
  const data = new Uint8Array(byteLength)
  encoded.forEach((bytes, index) => {
    if (bytes !== undefined) data.set(bytes, valueOffsets[index])
  })
  return makeVector(makeData({ type: new Utf8(), length: values.length, nullCount, nullBitmap, valueOffsets, data }))
}
