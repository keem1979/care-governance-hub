const CACHE = "qcgms-offline-capture-v1";
self.addEventListener("install", (event) => { event.waitUntil(caches.open(CACHE).then((cache) => cache.add("/offline-capture"))); self.skipWaiting(); });
self.addEventListener("activate", (event) => { event.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/login")) return;
  event.respondWith(fetch(event.request).then((response) => { if (response.ok && (url.pathname === "/offline-capture" || url.pathname.startsWith("/_next/") || url.pathname.startsWith("/assets/"))) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone())); return response; }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("/offline-capture"))));
});
