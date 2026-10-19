import type { ImportReport } from '../importer/importReport'
import { useMessages } from '../i18n/i18nContext'

export function ImportReportView({ fileName, report }: { fileName: string; report: ImportReport }) {
  const text = useMessages()
  return (
    <details className="import-report" open={report.failedRowTotal > 0 || report.failedStatements.length > 0}>
      <summary>
        {text.importReport}: {fileName} ({report.dialect === 'mysql' ? text.dialectMysql : text.dialectSqlserver})
      </summary>
      {report.failedRowTotal === 0 && report.failedStatements.length === 0 && <p>{text.noProblems}</p>}
      <FailedRows report={report} />
      <FailedStatements report={report} />
      <SkippedStatements report={report} />
    </details>
  )
}

function FailedRows({ report }: { report: ImportReport }) {
  const text = useMessages()
  if (report.failedRowTotal === 0) return null
  return (
    <section aria-label={text.failedRows}>
      <h4>
        {text.failedRows} ({report.failedRowTotal.toLocaleString()})
      </h4>
      <LimitNote shown={report.failedRows.length} total={report.failedRowTotal} />
      <table className="report-table">
        <thead>
          <tr>
            <th>{text.line}</th>
            <th>{text.table}</th>
            <th>{text.reason}</th>
          </tr>
        </thead>
        <tbody>
          {report.failedRows.map((row, index) => (
            <tr key={index}>
              <td>{row.line}</td>
              <td>{row.table}</td>
              <td>{text.describeNotice(row.reason)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function FailedStatements({ report }: { report: ImportReport }) {
  const text = useMessages()
  if (report.failedStatements.length === 0) return null
  return (
    <section aria-label={text.failedStatements}>
      <h4>
        {text.failedStatements} ({report.failedStatements.length.toLocaleString()})
      </h4>
      <table className="report-table">
        <thead>
          <tr>
            <th>{text.line}</th>
            <th>{text.statement}</th>
            <th>{text.reason}</th>
          </tr>
        </thead>
        <tbody>
          {report.failedStatements.map((statement, index) => (
            <tr key={index}>
              <td>{statement.line}</td>
              <td>
                <code>{statement.preview}</code>
              </td>
              <td>{text.describeNotice(statement.reason)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function SkippedStatements({ report }: { report: ImportReport }) {
  const text = useMessages()
  if (report.skippedTotal === 0) return null
  const counts = Object.entries(report.skippedByKind).sort((left, right) => right[1] - left[1])
  return (
    <section aria-label={text.skippedStatements}>
      <h4>
        {text.skippedStatements} ({report.skippedTotal.toLocaleString()})
      </h4>
      <p className="skipped-counts">{counts.map(([kind, count]) => `${kind} ${count}`).join(' · ')}</p>
      <details>
        <summary>{text.statement}</summary>
        <LimitNote shown={report.skipped.length} total={report.skippedTotal} />
        <table className="report-table">
          <thead>
            <tr>
              <th>{text.line}</th>
              <th>{text.kind}</th>
              <th>{text.statement}</th>
            </tr>
          </thead>
          <tbody>
            {report.skipped.map((entry, index) => (
              <tr key={index}>
                <td>{entry.line}</td>
                <td>{entry.kind}</td>
                <td>
                  <code>{entry.preview}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  )
}

function LimitNote({ shown, total }: { shown: number; total: number }) {
  const text = useMessages()
  if (shown >= total) return null
  return (
    <p className="muted">
      {text.showingFirst} {shown.toLocaleString()} / {total.toLocaleString()}
    </p>
  )
}
