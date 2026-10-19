import { describe, expect, it } from 'vitest'
import { int32Vector, utf8Vector } from './arrowVectors'

describe('arrow vectors without code generation', () => {
  it('builds text vectors with missing values', () => {
    const vector = utf8Vector(['a', null, '中文', ''])
    expect(vector.toArray()).toEqual(['a', null, '中文', ''])
    expect(vector.nullCount).toBe(1)
  })

  it('builds integer vectors', () => {
    expect(Array.from(int32Vector([1, 2, 3]).toArray())).toEqual([1, 2, 3])
  })

  it('handles empty vectors', () => {
    expect(utf8Vector([]).length).toBe(0)
  })
})
