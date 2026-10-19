export type Notice =
  | { code: 'emptySheetSkipped'; sheet: string }
  | { code: 'rowsNotLoaded'; table: string; lines: number[] }
  | { code: 'recordsSkipped'; lines: number[] }
  | { code: 'zeroDatesAsNull'; count: number }
  | { code: 'computedColumnsSkipped'; table: string; columns: string[] }
  | { code: 'createdWithTextColumns'; table: string }
  | { code: 'valueTypeMismatch' }
  | { code: 'valueCountMismatch'; expected: number; found: number }
  | { code: 'detail'; text: string }

export function detail(text: string): Notice {
  return { code: 'detail', text }
}

export function noticeKey(notice: Notice): string {
  return JSON.stringify(notice)
}

export function uniqueNotices(notices: readonly Notice[]): Notice[] {
  const seen = new Set<string>()
  return notices.filter((notice) => {
    const key = noticeKey(notice)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function lineList(lines: readonly number[], limit = 20): string {
  const shown = lines.slice(0, limit).join(', ')
  return lines.length > limit ? `${shown}, ...` : shown
}
