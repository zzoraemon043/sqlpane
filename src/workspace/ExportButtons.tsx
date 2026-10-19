import { useState } from 'react'
import { downloadBytes, exportFileName } from '../export/download'
import { exportCsv } from '../export/exportCsv'
import { exportExcel } from '../export/exportExcel'
import { exportJson } from '../export/exportJson'
import { exportParquet } from '../export/exportParquet'
import { useMessages } from '../i18n/i18nContext'
import type { QueryResult } from '../results/queryResult'

type ExportFormat = 'csv' | 'json' | 'parquet' | 'xlsx'

const formats: { format: ExportFormat; label: string }[] = [
  { format: 'csv', label: 'CSV' },
  { format: 'json', label: 'JSON' },
  { format: 'parquet', label: 'Parquet' },
  { format: 'xlsx', label: 'Excel' },
]

function runExport(format: ExportFormat, result: QueryResult, rows: Int32Array): { truncated: boolean } {
  switch (format) {
    case 'csv':
      downloadBytes(exportCsv(result, rows), exportFileName('csv'), 'text/csv;charset=utf-8')
      return { truncated: false }
    case 'json':
      downloadBytes(exportJson(result, rows), exportFileName('json'), 'application/json')
      return { truncated: false }
    case 'parquet':
      downloadBytes(exportParquet(result, rows) as Uint8Array<ArrayBuffer>, exportFileName('parquet'), 'application/vnd.apache.parquet')
      return { truncated: false }
    case 'xlsx': {
      const { bytes, truncated } = exportExcel(result, rows)
      downloadBytes(bytes as Uint8Array<ArrayBuffer>, exportFileName('xlsx'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      return { truncated }
    }
  }
}

export function ExportButtons({ result, rows }: { result: QueryResult; rows: Int32Array }) {
  const text = useMessages()
  const [message, setMessage] = useState<string>()
  return (
    <div className="export-buttons" role="group" aria-label={text.exportResult}>
      <span className="muted">{text.exportResult}</span>
      {formats.map(({ format, label }) => (
        <button
          key={format}
          type="button"
          className="small"
          onClick={() => {
            try {
              const { truncated } = runExport(format, result, rows)
              setMessage(truncated ? text.exportTruncated : undefined)
            } catch (error) {
              setMessage(`${text.exportFailed}: ${error instanceof Error ? error.message : String(error)}`)
            }
          }}
        >
          {label}
        </button>
      ))}
      {message && <span className="warning">{message}</span>}
    </div>
  )
}
