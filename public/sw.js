const CACHE_NAME = "bomba-aberta-v10";
const APP_SHELL = [
  "/offline",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/favicon.svg",
  "/favicon-16.png",
  "/favicon-32.png",
  "/favicon-48.png",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/maskable-icon-192.png",
  "/maskable-icon-512.png",
  "/brand/bomba-aberta/icon/bomba-aberta-icon.svg",
  "/brand/bomba-aberta/icon/bomba-aberta-icon-192.png",
  "/brand/bomba-aberta/icon/bomba-aberta-icon-512.png",
  "/brand/bomba-aberta/icon/bomba-aberta-icon-maskable-192.png",
  "/brand/bomba-aberta/icon/bomba-aberta-icon-maskable-512.png",
  "/brand/bomba-aberta/logo/bomba-aberta-logo-horizontal.svg",
  "/brand/bomba-aberta/logo/bomba-aberta-logo-horizontal-dark.png",
  "/brand/bomba-aberta/logo/bomba-aberta-logo-og.png",
  "/brand/bomba-aberta/emblem/bomba-aberta-emblem.svg",
  "/brand/bomba-aberta/emblem/bomba-aberta-emblem-dark.png",
  "/brand/bomba-aberta/emblem/bomba-aberta-emblem-transparent.png"
];

const STATIC_PATH_PREFIXES = ["/_next/static/", "/icons/", "/brand/"];
const STATIC_FILE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".ico", ".css", ".js", ".woff", ".woff2", ".ttf", ".otf", ".webmanifest"];

function isStaticAssetRequest(url) {
  return STATIC_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
    || STATIC_FILE_EXTENSIONS.some((extension) => url.pathname.endsWith(extension));
}

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
    return await fetch(request);
  } catch {
    return (await caches.match("/offline")) ?? Response.error();
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

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  // Next.js RSC client-side navigation: never cache dynamic payloads
  if (event.request.headers.get("RSC") === "1") {
    event.respondWith(fetch(event.request));
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (isStaticAssetRequest(url)) {
    event.respondWith(cacheStaticResponse(event.request));
  }
});
