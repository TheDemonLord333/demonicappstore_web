'use strict';

// Bei jedem Deployment mit sichtbaren Frontend-Änderungen sollte diese
// Versionsnummer erhöht werden, damit Clients (Browser & WKWebView) den
// neuen App-Shell-Cache holen.
const CACHE_VERSION = 'v1';
const SHELL_CACHE = `demonic-shell-${CACHE_VERSION}`;
const API_CACHE = `demonic-api-${CACHE_VERSION}`;

const SHELL_FILES = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/styles/tokens.css',
  '/styles/base.css',
  '/styles/layout.css',
  '/styles/components.css',
  '/styles/animations.css',
  '/styles/admin.css',
  '/styles/offline.css',
  '/styles/utilities.css',
  '/scripts/main.js',
  '/scripts/api.js',
  '/scripts/state.js',
  '/scripts/router.js',
  '/scripts/utils.js',
  '/scripts/dom.js',
  '/scripts/offline.js',
  '/scripts/components/toast.js',
  '/scripts/components/installButton.js',
  '/scripts/components/appCard.js',
  '/scripts/components/header.js',
  '/scripts/views/home.js',
  '/scripts/views/appDetail.js',
  '/scripts/views/updates.js',
  '/scripts/views/search.js',
  '/scripts/views/notFound.js',
  '/scripts/admin/adminLogin.js',
  '/scripts/admin/adminLayout.js',
  '/scripts/admin/adminDashboard.js',
  '/scripts/admin/adminCategories.js',
  '/scripts/admin/adminAppForm.js',
  '/native/nativeBridge.js',
  '/icons/favicon-16.png',
  '/icons/favicon-32.png',
  '/icons/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-192-maskable.png',
  '/icons/icon-512-maskable.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== API_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations (SPA-Routen wie /admin, /app/:id): Netzwerk zuerst, damit
  // Deployments sofort sichtbar sind; Fallback auf App-Shell bzw. Offline-Seite.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(SHELL_CACHE);
        return (await cache.match('/')) || (await cache.match('/offline.html'));
      })
    );
    return;
  }

  if (isApiRequest(url)) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  if (url.pathname.startsWith('/uploads/')) {
    event.respondWith(cacheFirst(request, API_CACHE));
    return;
  }

  event.respondWith(cacheFirst(request, SHELL_CACHE));
});
