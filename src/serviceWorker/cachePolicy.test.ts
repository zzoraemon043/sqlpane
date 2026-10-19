import { describe, expect, it } from 'vitest'
import { cacheNameFor, isCacheRequest, precacheUrls, sameScope, staleCacheNames, strategyFor } from './cachePolicy'

const scope = 'https://example.test/sqlpane/'

describe('service worker cache policy', () => {
  it('names caches by build version and finds old ones', () => {
    expect(cacheNameFor('abc')).toBe('sqlpane-abc')
    expect(staleCacheNames(['sqlpane-old', 'sqlpane-abc', 'other-cache'], 'sqlpane-abc')).toEqual(['sqlpane-old'])
  })

  it('serves pages network first and assets cache first inside the scope only', () => {
    expect(strategyFor('GET', `${scope}`, scope, 'navigate')).toBe('network-first')
    expect(strategyFor('GET', `${scope}assets/app.js`, scope, 'cors')).toBe('cache-first')
    expect(strategyFor('POST', `${scope}assets/app.js`, scope, 'cors')).toBe('bypass')
    expect(strategyFor('GET', 'https://cdn.example/lib.js', scope, 'cors')).toBe('bypass')
    expect(strategyFor('GET', 'https://example.test/other/', scope, 'navigate')).toBe('bypass')
  })

  it('resolves precache files against the scope', () => {
    expect(precacheUrls(['index.html', 'assets/a.js'], scope)).toEqual([scope, `${scope}index.html`, `${scope}assets/a.js`])
  })

  it('accepts only well formed cache requests for its own scope', () => {
    expect(isCacheRequest({ type: 'cache-urls', urls: ['a'] })).toBe(true)
    expect(isCacheRequest({ type: 'cache-urls', urls: [1] })).toBe(false)
    expect(isCacheRequest('cache-urls')).toBe(false)
    expect(sameScope([`${scope}assets/x.wasm`, 'https://evil.test/x.wasm', 'assets/y.wasm', 'http://['], scope)).toEqual([
      `${scope}assets/x.wasm`,
      'assets/y.wasm',
    ])
  })
})
