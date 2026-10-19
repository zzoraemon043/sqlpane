import { useState } from 'react'
import { useEngineState } from './engine/engineContext'

export function App() {
  const engineState = useEngineState()
  const [sql, setSql] = useState('SELECT 42 AS answer')
  const [output, setOutput] = useState('')

  async function runQuery() {
    if (engineState.status !== 'ready') return
    try {
      const table = await engineState.engine.run(sql)
      setOutput(JSON.stringify(table.toArray().map((row) => row.toJSON()), (_, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ))
    } catch (error) {
      setOutput(String(error))
    }
  }

  return (
    <main>
      <h1>sqlpane</h1>
      <p data-testid="engine-status">{engineState.status}</p>
      <textarea aria-label="SQL" value={sql} onChange={(event) => setSql(event.target.value)} />
      <button type="button" onClick={runQuery} disabled={engineState.status !== 'ready'}>
        Run
      </button>
      <pre data-testid="output">{output}</pre>
    </main>
  )
}
