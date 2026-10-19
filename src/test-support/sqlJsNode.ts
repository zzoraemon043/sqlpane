import { createRequire } from 'node:module'
import initSqlJs, { type SqlJsStatic } from 'sql.js'

const require = createRequire(import.meta.url)
const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm')

let loading: Promise<SqlJsStatic> | undefined

export function loadSqlJsForNode(): Promise<SqlJsStatic> {
  loading ??= initSqlJs({ locateFile: () => wasmPath })
  return loading
}
