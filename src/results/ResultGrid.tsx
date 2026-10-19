import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useMessages } from '../i18n/i18nContext'
import { clampWidth, initialColumnWidths } from './columnWidths'
import { cellText, type QueryResult } from './queryResult'
import { nextSort, visibleRowIndexes, type ColumnFilters, type SortState } from './resultView'

const rowHeight = 26
const headHeight = 60

interface ResultGridProps {
  result: QueryResult
  onViewChange?: (rows: Int32Array) => void
}

export function ResultGrid({ result, onViewChange }: ResultGridProps) {
  const text = useMessages()
  const [sort, setSort] = useState<SortState>()
  const [filters, setFilters] = useState<ColumnFilters>({})
  const [appliedFilters, setAppliedFilters] = useState<ColumnFilters>({})
  const [widths, setWidths] = useState(() => initialColumnWidths(result))
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setAppliedFilters(filters), 200)
    return () => clearTimeout(timer)
  }, [filters])

  const rows = useMemo(() => visibleRowIndexes(result, appliedFilters, sort), [result, appliedFilters, sort])

  useEffect(() => {
    onViewChange?.(rows)
  }, [rows, onViewChange])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 12,
    scrollMargin: headHeight,
  })
  const totalWidth = widths.reduce((sum, width) => sum + width, 0)
  const template = widths.map((width) => `${width}px`).join(' ')

  return (
    <div className="grid-wrapper">
      <p className="result-summary" data-testid="result-summary">
        {result.rowCount.toLocaleString()} {text.rowCount}
        {rows.length !== result.rowCount && ` · ${rows.length.toLocaleString()} ${text.shownAfterFilter}`} · {result.elapsedMs.toFixed(1)} {text.elapsed}
      </p>
      <div
        ref={scrollRef}
        className="grid-scroll"
        role="grid"
        aria-label={text.results}
        aria-rowcount={rows.length + 2}
        aria-colcount={result.columns.length}
      >
        <div className="grid-head" style={{ width: totalWidth }}>
          <div className="grid-row" role="row" aria-rowindex={1} style={{ gridTemplateColumns: template }}>
            {result.columns.map((column, columnIndex) => (
              <div
                key={columnIndex}
                className="grid-header"
                role="columnheader"
                aria-colindex={columnIndex + 1}
                aria-sort={sort?.columnIndex === columnIndex ? sort.direction : 'none'}
              >
                <button
                  type="button"
                  className="grid-sort"
                  title={`${column.name} ${column.type}`}
                  onClick={() => setSort((current) => nextSort(current, columnIndex))}
                >
                  <span className="grid-header-name">{column.name}</span>
                  <span className="grid-sort-mark" aria-hidden="true">
                    {sort?.columnIndex === columnIndex ? (sort.direction === 'ascending' ? '▲' : '▼') : ''}
                  </span>
                </button>
                <ResizeHandle
                  label={`${text.resizeColumn} ${column.name}`}
                  width={widths[columnIndex]}
                  onResize={(width) => setWidths((current) => current.map((value, index) => (index === columnIndex ? width : value)))}
                />
              </div>
            ))}
          </div>
          <div className="grid-row grid-filters" role="row" aria-rowindex={2} style={{ gridTemplateColumns: template }}>
            {result.columns.map((column, columnIndex) => (
              <div key={columnIndex} role="gridcell" aria-colindex={columnIndex + 1}>
                <input
                  className="grid-filter"
                  aria-label={`${text.filterColumn} ${column.name}`}
                  placeholder={text.filter}
                  value={filters[columnIndex] ?? ''}
                  onChange={(event) => setFilters((current) => ({ ...current, [columnIndex]: event.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="grid-body" style={{ height: virtualizer.getTotalSize(), width: totalWidth }}>
          {virtualizer.getVirtualItems().map((item) => {
            const rowIndex = rows[item.index]
            return (
              <div
                key={item.key}
                className="grid-row"
                role="row"
                aria-rowindex={item.index + 3}
                style={{ gridTemplateColumns: template, transform: `translateY(${item.start - headHeight}px)`, height: rowHeight }}
              >
                {result.columns.map((column, columnIndex) => {
                  const value = cellText(result, rowIndex, columnIndex)
                  const className = value === null ? 'grid-cell null' : column.numeric ? 'grid-cell number' : 'grid-cell'
                  return (
                    <div key={columnIndex} className={className} role="gridcell" aria-colindex={columnIndex + 1} title={value ?? 'NULL'}>
                      {value ?? 'NULL'}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ResizeHandle({ label, width, onResize }: { label: string; width: number; onResize: (width: number) => void }) {
  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault()
    const startX = event.clientX
    const handle = event.currentTarget
    handle.setPointerCapture(event.pointerId)
    const move = (moveEvent: PointerEvent) => onResize(clampWidth(width + moveEvent.clientX - startX))
    const stop = () => {
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', stop)
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', stop)
  }
  return (
    <div
      className="grid-resize"
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={width}
      tabIndex={0}
      onPointerDown={startDrag}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') onResize(clampWidth(width - 16))
        if (event.key === 'ArrowRight') onResize(clampWidth(width + 16))
      }}
    />
  )
}
