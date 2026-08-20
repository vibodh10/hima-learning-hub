const CACHE = "hima-public-v1";
const PUBLIC_SHELL = ["/", "/privacy", "/manifest.webmanifest"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PUBLIC_SHELL)));
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  // Navigation and account routes stay network-only. Never disguise an
  // unavailable /login route by falling back to the cached home page.
  if (event.request.mode === "navigate" || url.pathname.startsWith("/login") ||
      url.pathname.startsWith("/register") || url.pathname.startsWith("/auth") ||
      url.pathname.startsWith("/forgot-password") || url.pathname.startsWith("/update-password") ||
      url.pathname.startsWith("/dashboard") || url.pathname.startsWith("/teacher") ||
      url.pathname.startsWith("/learn") || url.pathname.startsWith("/api")) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
    return response;
  }).catch(() => caches.match(event.request).then(response => response || caches.match("/"))));
});
