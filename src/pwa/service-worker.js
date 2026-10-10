const CACHE_NAME = __CACHE_NAME__;
const ASSETS = __PRECACHE_ASSETS__.map((path) => new URL(path, self.registration.scope).href);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("volleyeye-cache-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.href.startsWith(self.registration.scope) ||
    request.destination === "video" ||
    request.destination === "audio" ||
    url.pathname.endsWith("/__local-video__")
  )
    return;
  if (request.mode === "navigate" || url.pathname.endsWith("/version.json")) {
    // Keep the precached shell paired with its own hashed chunks for offline use.
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (
          (await cache.match(request)) ||
          (await cache.match(new URL("./", self.registration.scope).href))
        );
      }),
    );
    return;
  }
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Precached same-origin assets are identical across Origin headers (Vite adds Vary: Origin).
      const cached = await cache.match(request, { ignoreSearch: true, ignoreVary: true });
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && ASSETS.includes(request.url)) {
        event.waitUntil(cache.put(request, response.clone()));
      }
      return response;
    }),
  );
});
