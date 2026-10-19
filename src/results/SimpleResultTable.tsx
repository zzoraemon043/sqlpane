import { useMessages } from '../i18n/i18nContext'
import { cellText, type QueryResult } from './queryResult'

const previewRows = 200

export function SimpleResultTable({ result }: { result: QueryResult }) {
  const text = useMessages()
  const shown = Math.min(result.rowCount, previewRows)
  return (
    <div className="result-scroll">
      <table className="result-table" aria-label={text.results}>
        <thead>
          <tr>
            {result.columns.map((column) => (
              <th key={column.name}>{column.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: shown }, (_, rowIndex) => (
            <tr key={rowIndex}>
              {result.columns.map((column, columnIndex) => {
                const value = cellText(result, rowIndex, columnIndex)
                return (
                  <td key={column.name} className={value === null ? 'null' : column.numeric ? 'number' : undefined}>
                    {value ?? 'NULL'}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
