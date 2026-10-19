import { describe, expect, it } from 'vitest'
import { arcPath, linearScale, truncateLabel } from './chartGeometry'

describe('chart geometry', () => {
  it('maps a domain onto a range', () => {
    const scale = linearScale([0, 10], [100, 0])
    expect(scale(0)).toBe(100)
    expect(scale(5)).toBe(50)
    expect(linearScale([3, 3], [0, 10])(3)).toBe(0)
  })

  it('shortens long labels', () => {
    expect(truncateLabel('abcdefghijklmnopq', 5)).toBe('abcd…')
    expect(truncateLabel('abc', 5)).toBe('abc')
  })

  it('draws pie slices and a full circle', () => {
    expect(arcPath(0, 0, 10, 0, Math.PI / 2)).toBe('M 0 0 L 0 -10 A 10 10 0 0 1 10 -6.123233995736766e-16 Z')
    expect(arcPath(0, 0, 10, 0, Math.PI * 2)).toContain('A 10 10 0 1 1')
  })
})
