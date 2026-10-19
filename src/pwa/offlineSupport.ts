import { selectSelfHostedBundle } from '../engine/browserEngine'

export type OfflineStatus = 'unsupported' | 'preparing' | 'ready' | 'failed'

export async function registerOfflineSupport(baseUrl: string): Promise<OfflineStatus> {
  if (!('serviceWorker' in navigator)) return 'unsupported'
  const registration = await navigator.serviceWorker.register(new URL('sw.js', new URL(baseUrl, location.href)), { scope: baseUrl })
  await navigator.serviceWorker.ready
  const worker = registration.active
  if (!worker) return 'failed'
  const bundle = await selectSelfHostedBundle()
  const urls = [bundle.mainModule, bundle.mainWorker].filter((url): url is string => typeof url === 'string')
  return requestCaching(worker, urls.map((url) => new URL(url, location.href).href))
}

function requestCaching(worker: ServiceWorker, urls: string[]): Promise<OfflineStatus> {
  return new Promise((resolve) => {
    const channel = new MessageChannel()
    channel.port1.onmessage = (event: MessageEvent<{ ok?: boolean }>) => resolve(event.data.ok ? 'ready' : 'failed')
    worker.postMessage({ type: 'cache-urls', urls }, [channel.port2])
  })
}
