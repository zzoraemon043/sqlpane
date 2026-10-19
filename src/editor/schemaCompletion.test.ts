import { describe, expect, it } from 'vitest'
import { completionSchema } from './schemaCompletion'

describe('completion schema', () => {
  it('lists every table with its columns', () => {
    expect(
      completionSchema([
        { name: 'orders', columns: [{ name: 'id', type: 'INTEGER', nullable: false }, { name: 'total', type: 'DOUBLE', nullable: true }] },
        { name: 'empty', columns: [] },
      ]),
    ).toEqual({ orders: ['id', 'total'], empty: [] })
  })
})
