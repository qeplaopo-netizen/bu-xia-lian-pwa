const CACHE_NAME = 'bu-xia-lian-v5'
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-180.png', './icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME)
    await cache.addAll(APP_SHELL)
    const html = await (await cache.match('./index.html')).text()
    const assets = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^\"]+)"/g)].map((match) => match[1])
    if (assets.length) await cache.addAll(assets)
  })())
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter((key) => key.startsWith('bu-xia-lian-') && key !== CACHE_NAME).map((key) => caches.delete(key)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return
  event.respondWith((async () => {
    const cached = await caches.match(request)
    if (cached) return cached
    try {
      const response = await fetch(request)
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME)
        cache.put(request, response.clone())
      }
      return response
    } catch {
      if (request.mode === 'navigate') {
        const fallback = await caches.match(new URL('./index.html', self.registration.scope))
        if (fallback) return fallback
      }
      throw new Error('离线资源不可用')
    }
  })())
})
