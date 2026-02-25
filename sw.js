// Service Worker mínimo para PWA
self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    // Responde con la red directamente (sin caché compleja para evitar errores en desarrollo)
    e.respondWith(fetch(e.request));
});
