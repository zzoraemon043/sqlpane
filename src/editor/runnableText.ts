import type { EditorState } from '@codemirror/state'
import { statementAtOffset } from './statementRanges'

export function runnableTextOf(state: EditorState): string {
  const selection = state.selection.main
  const text = state.doc.toString()
  if (!selection.empty) return text.slice(selection.from, selection.to)
  const range = statementAtOffset(text, selection.head)
  return range ? text.slice(range.from, range.to) : ''
}
