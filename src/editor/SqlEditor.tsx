import { sql, PostgreSQL } from '@codemirror/lang-sql'
import { columnCompletionSource } from './columnCompletion'
import { Compartment, EditorState, type Extension } from '@codemirror/state'
import { EditorView, keymap, placeholder as placeholderExtension } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'
import type { TableSummary } from '../catalog/catalog'
import { formatSql } from './formatSql'
import { completionSchema } from './schemaCompletion'
import { runnableTextOf } from './runnableText'

export interface SqlEditorHandle {
  runnableText(): string
  setText(text: string): void
  format(): void
  focus(): void
}

interface SqlEditorProps {
  initialText: string
  tables: readonly TableSummary[]
  label: string
  placeholder: string
  onRun: () => void
  onChange: (text: string) => void
  ref?: Ref<SqlEditorHandle>
}

function languageFor(tables: readonly TableSummary[]): Extension {
  const language = sql({ dialect: PostgreSQL, schema: completionSchema(tables), upperCaseKeywords: true })
  return [language, language.language.data.of({ autocomplete: columnCompletionSource(tables) })]
}

export function SqlEditor({ initialText, tables, label, placeholder, onRun, onChange, ref }: SqlEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView>(null)
  const languageCompartment = useRef(new Compartment())
  const callbacks = useRef({ onRun, onChange })
  const mountOptions = useRef({ initialText, placeholder, label })

  useEffect(() => {
    callbacks.current = { onRun, onChange }
  }, [onRun, onChange])

  useEffect(() => {
    const view = new EditorView({
      parent: hostRef.current!,
      state: EditorState.create({
        doc: mountOptions.current.initialText,
        extensions: [
          keymap.of([
            { key: 'Mod-Enter', preventDefault: true, run: () => (callbacks.current.onRun(), true) },
            { key: 'Shift-Alt-f', preventDefault: true, run: (target) => (formatView(target), true) },
          ]),
          basicSetup,
          languageCompartment.current.of(languageFor([])),
          placeholderExtension(mountOptions.current.placeholder),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ 'aria-label': mountOptions.current.label }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) callbacks.current.onChange(update.state.doc.toString())
          }),
        ],
      }),
    })
    viewRef.current = view
    return () => view.destroy()
  }, [])

  useEffect(() => {
    viewRef.current?.dispatch({ effects: languageCompartment.current.reconfigure(languageFor(tables)) })
  }, [tables])

  useImperativeHandle(ref, () => ({
    runnableText: () => (viewRef.current ? runnableTextOf(viewRef.current.state) : ''),
    setText: (text) => {
      const view = viewRef.current
      if (view) view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } })
    },
    format: () => {
      if (viewRef.current) formatView(viewRef.current)
    },
    focus: () => viewRef.current?.focus(),
  }))

  return <div className="sql-editor" ref={hostRef} data-testid="sql-editor" />
}

function formatView(view: EditorView) {
  const selection = view.state.selection.main
  const from = selection.empty ? 0 : selection.from
  const to = selection.empty ? view.state.doc.length : selection.to
  try {
    const formatted = formatSql(view.state.sliceDoc(from, to))
    view.dispatch({ changes: { from, to, insert: formatted } })
  } catch {
    return
  }
}
