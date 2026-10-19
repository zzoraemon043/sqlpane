import * as duckdb from '@duckdb/duckdb-wasm'
import mvpWasmUrl from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url'
import ehWasmUrl from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url'
import mvpWorkerUrl from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url'
import ehWorkerUrl from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url'
import { engineStartupStatements, type FileSource, type SqlEngine } from './sqlEngine'

const selfHostedBundles: duckdb.DuckDBBundles = {
  mvp: { mainModule: mvpWasmUrl, mainWorker: mvpWorkerUrl },
  eh: { mainModule: ehWasmUrl, mainWorker: ehWorkerUrl },
}

export async function selectSelfHostedBundle(): Promise<duckdb.DuckDBBundle> {
  return duckdb.selectBundle(selfHostedBundles)
}

export async function createBrowserEngine(): Promise<SqlEngine> {
  const bundle = await selectSelfHostedBundle()
  const worker = new Worker(bundle.mainWorker!)
  const database = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker)
  await database.instantiate(bundle.mainModule, bundle.pthreadWorker)
  const connection = await database.connect()
  for (const statement of engineStartupStatements) await connection.query(statement)

  return {
    run: (sql) => connection.query(sql),
    registerFile: (name, source) => registerBrowserFile(database, name, source),
    dropFile: async (name) => {
      await database.dropFile(name)
    },
    readFile: (name) => database.copyFileToBuffer(name),
    insertArrowIpc: (tableName, ipcBytes) =>
      connection.insertArrowFromIPCStream(ipcBytes, { name: tableName, create: true }),
    close: async () => {
      await connection.close()
      await database.terminate()
    },
  }
}

async function registerBrowserFile(database: duckdb.AsyncDuckDB, name: string, source: FileSource) {
  if (source instanceof Uint8Array) {
    await database.registerFileBuffer(name, source)
    return
  }
  await database.registerFileHandle(name, source, duckdb.DuckDBDataProtocol.BROWSER_FILEREADER, true)
}
