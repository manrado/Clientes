/**
 * Service Worker - Manrado Website
 * Estrategia: Network First con fallback a cache
 */

const CACHE_NAME = 'manrado-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/assets/styles.css',
  '/assets/scripts.js',
  '/assets/icons.svg',
  '/assets/silueta_blanca.ico',
  '/assets/modules/dom.js',
  '/assets/modules/menu.js',
  '/assets/modules/hero-tags.js',
  '/assets/modules/particles.js',
  '/assets/modules/smooth-scroll.js'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activación y limpieza de caches antiguos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Estrategia: Network First con fallback a cache
self.addEventListener('fetch', event => {
  // Solo manejar requests GET
  if (event.request.method !== 'GET') return;

  // Ignorar requests externos (analytics, etc.)
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clonar la respuesta para guardarla en cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Si falla la red, buscar en cache
        return caches.match(event.request);
      })
  );
});
