import { cacheNameFor, isCacheRequest, precacheUrls, sameScope, staleCacheNames, strategyFor } from './cachePolicy'

declare const self: ServiceWorkerGlobalScope
declare const precacheFiles: string[]
declare const buildVersion: string

const cacheName = cacheNameFor(buildVersion)
const scopeUrl = self.registration.scope

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(cacheName)
      .then((cache) => cache.addAll(precacheUrls(precacheFiles, scopeUrl)))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(staleCacheNames(names, cacheName).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const strategy = strategyFor(event.request.method, event.request.url, scopeUrl, event.request.mode)
  if (strategy === 'bypass') return
  event.respondWith(strategy === 'network-first' ? networkFirst(event.request) : cacheFirst(event.request))
})

self.addEventListener('message', (event) => {
  if (!isCacheRequest(event.data)) return
  const port = event.ports[0]
  const urls = sameScope(event.data.urls, scopeUrl)
  event.waitUntil(
    cacheMissing(urls).then(
      () => port?.postMessage({ type: 'cached', ok: true }),
      () => port?.postMessage({ type: 'cached', ok: false }),
    ),
  )
})

async function cacheMissing(urls: string[]) {
  const cache = await caches.open(cacheName)
  for (const url of urls) {
    if (!(await cache.match(url))) await cache.add(url)
  }
}

async function cacheFirst(request: Request): Promise<Response> {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request, { ignoreSearch: true })
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok && response.type === 'basic') await cache.put(request, response.clone())
  return response
}

async function networkFirst(request: Request): Promise<Response> {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response.ok) await cache.put(new URL('./', scopeUrl).href, response.clone())
    return response
  } catch (error) {
    const cached = (await cache.match(request, { ignoreSearch: true })) ?? (await cache.match(new URL('./', scopeUrl).href))
    if (cached) return cached
    throw error
  }
}
