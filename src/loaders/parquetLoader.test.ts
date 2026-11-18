import { parquetWriteBuffer } from 'hyparquet-writer'
import { describe, expect, it } from 'vitest'
import { selectRows, startSharedEngine } from '../test-support/sharedEngine'
import { loadParquetBuffer } from './parquetLoader'

const engine = startSharedEngine()

describe('parquet loader', () => {
  it('loads every column with its type', async () => {
    const buffer = parquetWriteBuffer({
      columnData: [
        { name: 'id', data: [1, 2, 3], type: 'INT32' },
        { name: 'name', data: ['a', null, '中文'], type: 'STRING' },
        { name: 'ratio', data: [0.5, 1.5, 2], type: 'DOUBLE' },
        { name: 'flag', data: [true, false, true], type: 'BOOLEAN' },
        { name: 'big', data: [1n, 2n, 9007199254740993n], type: 'INT64' },
      ],
    })
    const result = await loadParquetBuffer(engine(), 'metrics', buffer)
    expect(result.tables).toEqual([{ name: 'metrics', rowCount: 3 }])
    expect(await selectRows(engine(), 'SELECT id, name, ratio, flag, CAST(big AS VARCHAR) AS big FROM metrics ORDER BY id')).toEqual([
      { id: 1, name: 'a', ratio: 0.5, flag: true, big: '1' },
      { id: 2, name: null, ratio: 1.5, flag: false, big: '2' },
      { id: 3, name: '中文', ratio: 2, flag: true, big: '9007199254740993' },
    ])
  })

  it('keeps unannotated byte arrays as binary alongside annotated strings', async () => {
    const buffer = parquetWriteBuffer({
      columnData: [
        { name: 'label', data: ['第一筆', '第二筆'], type: 'STRING' },
        { name: 'payload', data: [Uint8Array.of(0xfe), Uint8Array.of(0xff)], type: 'BYTE_ARRAY' },
      ],
    })
    await loadParquetBuffer(engine(), 'binary_records', buffer)
    expect(await selectRows(engine(), 'SELECT label, typeof(payload) AS kind, hex(payload) AS bytes FROM binary_records ORDER BY bytes')).toEqual([
      { label: '第一筆', kind: 'BLOB', bytes: 'FE' },
      { label: '第二筆', kind: 'BLOB', bytes: 'FF' },
    ])
  })
})
