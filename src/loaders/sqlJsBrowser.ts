import initSqlJs, { type SqlJsStatic } from 'sql.js'
import sqlJsWasmUrl from 'sql.js/dist/sql-wasm-browser.wasm?url'

let loading: Promise<SqlJsStatic> | undefined

export function loadSqlJs(): Promise<SqlJsStatic> {
  loading ??= initSqlJs({ locateFile: () => sqlJsWasmUrl })
  return loading
}
