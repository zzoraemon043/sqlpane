import type { DelimitedOptions } from '../loaders/csvLoader'
import { useMessages } from '../i18n/i18nContext'

const delimiterChoices = [
  { value: '', labelKey: 'automatic' },
  { value: ',', labelKey: 'comma' },
  { value: ';', labelKey: 'semicolon' },
  { value: '\t', labelKey: 'tab' },
  { value: '|', labelKey: 'pipe' },
] as const

export function DelimitedOptionsForm({ options, onChange }: { options: DelimitedOptions; onChange: (options: DelimitedOptions) => void }) {
  const text = useMessages()
  const headerValue = options.header === undefined ? '' : String(options.header)
  return (
    <details className="options-menu">
      <summary>{text.csvOptions}</summary>
      <div className="options-panel">
        <label>
          {text.delimiter}
          <select
            aria-label={text.delimiter}
            value={options.delimiter ?? ''}
            onChange={(event) => onChange({ ...options, delimiter: event.target.value === '' ? undefined : event.target.value })}
          >
            {delimiterChoices.map((choice) => (
              <option key={choice.labelKey} value={choice.value}>
                {text[choice.labelKey]}
              </option>
            ))}
          </select>
        </label>
        <label>
          {text.headerRow}
          <select
            aria-label={text.headerRow}
            value={headerValue}
            onChange={(event) => onChange({ ...options, header: event.target.value === '' ? undefined : event.target.value === 'true' })}
          >
            <option value="">{text.automatic}</option>
            <option value="true">{text.yes}</option>
            <option value="false">{text.no}</option>
          </select>
        </label>
        <p className="muted">{text.csvOptionsHint}</p>
      </div>
    </details>
  )
}
