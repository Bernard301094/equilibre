// ─── Equilibre Service Worker ────────────────────────────────────────────────
// Versão 2 — Push Notifications + Offline Cache
const CACHE_NAME = 'equilibre-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ── Recursos de dados que queremos servir offline (stale-while-revalidate)
const DATA_CACHE = 'equilibre-data-v2';
const CACHEABLE_API_PATTERNS = [
  /\/rest\/v1\/exercises/,
  /\/rest\/v1\/patient_exercises/,
  /\/rest\/v1\/diary_entries/,
  /\/rest\/v1\/sessions/,
];

// ── Install: pre-cache assets estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: limpa caches antigas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== DATA_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: estratégia por tipo de recurso
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requests que não sejam GET
  if (request.method !== 'GET') return;

  // Ignora Chrome Extensions
  if (url.protocol === 'chrome-extension:') return;

  // ── API Supabase → Stale-While-Revalidate
  const isApiCall = CACHEABLE_API_PATTERNS.some((p) => p.test(url.pathname));
  if (isApiCall) {
    event.respondWith(
      caches.open(DATA_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => cached); // se offline, devolve cache
        return cached || fetchPromise;
      })
    );
    return;
  }

  // ── Assets estáticos → Cache First
  if (
    url.origin === self.location.origin &&
    (request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'image' ||
      request.destination === 'font')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // ── Navegação (HTML) → Network First com fallback ao index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }
});

// ── Push Notifications (mantido da v1)
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || 'Equilibre';
  const options = {
    body: data.body || '',
    icon: '/logo192.png',
    badge: '/badge72.png',
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.includes(target));
      if (existing) return existing.focus();
      return clients.openWindow(target);
    })
  );
});
