import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createNodeEngine } from '../test-support/nodeEngine'
import type { SqlEngine } from './sqlEngine'

let engine: SqlEngine

beforeAll(async () => {
  engine = await createNodeEngine()
})

afterAll(async () => {
  await engine.close()
})

describe('sql engine', () => {
  it('runs a query', async () => {
    const table = await engine.run('SELECT 40 + 2 AS answer')
    expect(Number(table.getChild('answer')?.get(0))).toBe(42)
  })

  it('never downloads extensions', async () => {
    const table = await engine.run(
      "SELECT current_setting('autoinstall_known_extensions') AS install, current_setting('autoload_known_extensions') AS load",
    )
    expect(table.getChild('install')?.get(0)).toBe(false)
    expect(table.getChild('load')?.get(0)).toBe(false)
  })

  it('reads a registered CSV file with the built-in reader', async () => {
    await engine.registerFile('numbers.csv', new TextEncoder().encode('n\n1\n2\n3\n'))
    const table = await engine.run("SELECT sum(n) AS total FROM read_csv('numbers.csv')")
    expect(Number(table.getChild('total')?.get(0))).toBe(6)
  })
})
