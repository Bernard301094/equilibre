// public/sw.js — Equilibre Service Worker
// Handles: static caching, offline fallback, Web Push notifications

const CACHE_NAME    = "equilibre-v1";
const OFFLINE_URL   = "/offline.html";

// Assets to pre-cache on install
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.json",
];

/* ─────────────────────────────────────────────────────────────
   Install — pre-cache shell assets
───────────────────────────────────────────────────────────── */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  // Take control immediately without waiting for old SW to expire
  self.skipWaiting();
});

/* ─────────────────────────────────────────────────────────────
   Activate — clean up old caches
───────────────────────────────────────────────────────────── */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  // Claim all open clients immediately
  self.clients.claim();
});

/* ─────────────────────────────────────────────────────────────
   Fetch — Network-first for API, Cache-first for assets
───────────────────────────────────────────────────────────── */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Skip non-GET, browser-extension URLs and cross-origin API calls (Supabase)
  if (
    request.method !== "GET" ||
    !url.origin.startsWith(self.location.origin.replace(/:\d+$/, "")) &&
    url.origin !== self.location.origin
  ) {
    return;
  }

  // 2. Supabase REST calls — network only, no caching
  if (request.url.includes("/rest/v1/") || request.url.includes("supabase")) {
    return;
  }

  // 3. Navigation requests — network first, fallback to offline page
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((r) => r || caches.match("/index.html"))
      )
    );
    return;
  }

  // 4. Static assets — cache first, then network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        // Only cache successful same-origin responses
        if (
          response.ok &&
          response.type === "basic" &&
          url.origin === self.location.origin
        ) {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, toCache));
        }
        return response;
      }).catch(() => caches.match(OFFLINE_URL));
    })
  );
});

/* ─────────────────────────────────────────────────────────────
   Push Notifications
   Expected push payload (JSON):
   {
     "title":   "Novo exercício disponível 📋",
     "body":    "Sua psicóloga enviou um novo exercício para você.",
     "icon":    "/icons/icon-192.png",
     "badge":   "/icons/badge-72.png",
     "tag":     "new-exercise",           // collapses duplicates
     "url":     "/exercises",             // opened on click
     "data":    { ... }                   // optional extra payload
   }
───────────────────────────────────────────────────────────── */
self.addEventListener("push", (event) => {
  let payload = {
    title:  "Equilibre",
    body:   "Você tem uma nova atualização.",
    icon:   "/icons/icon-192.png",
    badge:  "/icons/badge-72.png",
    tag:    "equilibre-default",
    url:    "/",
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text();
    }
  }

  const options = {
    body:             payload.body,
    icon:             payload.icon,
    badge:            payload.badge,
    tag:              payload.tag,
    renotify:         true,
    requireInteraction: false,
    vibrate:          [100, 50, 100],
    data:             { url: payload.url, ...(payload.data ?? {}) },
    actions: [
      { action: "open",    title: "Ver agora" },
      { action: "dismiss", title: "Fechar"    },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

/* ─────────────────────────────────────────────────────────────
   Notification click — open or focus the app
───────────────────────────────────────────────────────────── */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url ?? "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If app is already open, focus it and navigate
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            client.postMessage({ type: "NAVIGATE", url: targetUrl });
            return;
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

/* ─────────────────────────────────────────────────────────────
   Push subscription change (token rotation)
───────────────────────────────────────────────────────────── */
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true })
      .then((subscription) => {
        // Notify all clients so they can re-save the subscription to the server
        return self.clients.matchAll().then((clientList) => {
          clientList.forEach((client) =>
            client.postMessage({
              type:         "PUSH_SUBSCRIPTION_CHANGED",
              subscription: JSON.parse(JSON.stringify(subscription)),
            })
          );
        });
      })
  );
});

/* ─────────────────────────────────────────────────────────────
   Message handler — receive commands from the app
   Supported: { type: "SKIP_WAITING" }
───────────────────────────────────────────────────────────── */
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});