export const cachePrefix = 'sqlpane-'

export function cacheNameFor(version: string): string {
  return `${cachePrefix}${version}`
}

export function staleCacheNames(existing: readonly string[], current: string): string[] {
  return existing.filter((name) => name.startsWith(cachePrefix) && name !== current)
}

export type FetchStrategy = 'network-first' | 'cache-first' | 'bypass'

export function strategyFor(method: string, requestUrl: string, scopeUrl: string, mode: string): FetchStrategy {
  if (method !== 'GET') return 'bypass'
  const url = new URL(requestUrl)
  const scope = new URL(scopeUrl)
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return 'bypass'
  if (mode === 'navigate') return 'network-first'
  return 'cache-first'
}

export function precacheUrls(files: readonly string[], scopeUrl: string): string[] {
  return ['./', ...files].map((file) => new URL(file, scopeUrl).href)
}

export function isCacheRequest(data: unknown): data is { type: 'cache-urls'; urls: string[] } {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { type?: unknown }).type === 'cache-urls' &&
    Array.isArray((data as { urls?: unknown }).urls) &&
    (data as { urls: unknown[] }).urls.every((url) => typeof url === 'string')
  )
}

export function sameScope(urls: readonly string[], scopeUrl: string): string[] {
  const scope = new URL(scopeUrl)
  return urls.filter((value) => {
    try {
      const url = new URL(value, scopeUrl)
      return url.origin === scope.origin && url.pathname.startsWith(scope.pathname)
    } catch {
      return false
    }
  })
}
