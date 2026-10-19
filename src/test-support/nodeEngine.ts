import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { engineStartupStatements, type SqlEngine } from '../engine/sqlEngine'

type BlockingModule = typeof import('@duckdb/duckdb-wasm/blocking')

const require = createRequire(import.meta.url)
const blocking = require('@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs') as BlockingModule
const distDirectory = dirname(require.resolve('@duckdb/duckdb-wasm/dist/duckdb-eh.wasm'))

export async function createNodeEngine(): Promise<SqlEngine> {
  const database = await blocking.createDuckDB(
    {
      mvp: { mainModule: join(distDirectory, 'duckdb-mvp.wasm'), mainWorker: '' },
      eh: { mainModule: join(distDirectory, 'duckdb-eh.wasm'), mainWorker: '' },
    },
    new blocking.VoidLogger(),
    blocking.NODE_RUNTIME,
  )
  await database.instantiate()
  const connection = database.connect()
  for (const statement of engineStartupStatements) connection.query(statement)

  return {
    run: async (sql) => connection.query(sql),
    registerFile: async (name, source) => {
      const bytes = source instanceof Uint8Array ? source : new Uint8Array(await source.arrayBuffer())
      database.registerFileBuffer(name, bytes)
    },
    dropFile: async (name) => database.dropFile(name),
    readFile: async (name) => database.copyFileToBuffer(name),
    insertArrowIpc: async (tableName, ipcBytes) =>
      connection.insertArrowFromIPCStream(ipcBytes, { name: tableName, create: true }),
    close: async () => {
      connection.close()
      database.reset()
    },
  }
}
