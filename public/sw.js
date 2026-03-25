const CACHE_NAME = "bomba-aberta-v5";
const APP_SHELL = [
  "/",
  "/atualizacoes",
  "/enviar",
  "/feedback",
  "/auditoria",
  "/sobre",
  "/offline",
  "/manifest.webmanifest",
  "/brand/bomba-aberta/icon/favicon-16.png",
  "/brand/bomba-aberta/icon/favicon-32.png",
  "/brand/bomba-aberta/icon/apple-touch-icon.png",
  "/brand/bomba-aberta/icon/bomba-aberta-icon.svg",
  "/brand/bomba-aberta/icon/bomba-aberta-icon-192.png",
  "/brand/bomba-aberta/icon/bomba-aberta-icon-512.png",
  "/brand/bomba-aberta/icon/bomba-aberta-icon-maskable-192.png",
  "/brand/bomba-aberta/icon/bomba-aberta-icon-maskable-512.png",
  "/brand/bomba-aberta/logo/bomba-aberta-logo-horizontal.svg",
  "/brand/bomba-aberta/logo/bomba-aberta-logo-horizontal-dark.png",
  "/brand/bomba-aberta/emblem/bomba-aberta-emblem.svg",
  "/brand/bomba-aberta/emblem/bomba-aberta-emblem-dark.png",
  "/brand/bomba-aberta/emblem/bomba-aberta-emblem-transparent.png",
  "/brand/bomba-aberta/emblem/bomba-aberta-emblem-og.png"
];

async function cacheStaticResponse(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }

  return response;
}

async function cacheNavigationRequest(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? (await caches.match("/offline"));
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(cacheNavigationRequest(event.request));
    return;
  }

  if (new URL(event.request.url).origin === self.location.origin) {
    event.respondWith(cacheStaticResponse(event.request));
  }
});
