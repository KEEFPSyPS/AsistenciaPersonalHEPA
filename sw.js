// Service Worker con Control de Versiones
const APP_VERSION = 'hepa-app-v1.5'; // CAMBIA ESTO cuando hagas actualizaciones

// Archivos necesarios para que la app funcione offline (Requisito para instalar)
const CACHE_URLS = [
    './',
    './index.html',
    './manifest.json',
    './img/logoAppHepa.png'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(APP_VERSION).then((cache) => {
            return cache.addAll(CACHE_URLS);
        })
    );
    self.skipWaiting(); // Fuerza al SW a activarse inmediatamente
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                // Borra cachés antiguas que no coincidan con la versión actual
                if (key !== APP_VERSION) {
                    return caches.delete(key);
                }
            }));
        })
    );
    // Toma el control de la página inmediatamente
    return self.clients.claim(); 
});

self.addEventListener('fetch', (e) => {
    // Estrategia: Network First (Red primero, luego caché si falla)
    e.respondWith(
        fetch(e.request)
            .then((response) => {
                // Si la red responde bien, actualizamos la caché (opcional, pero recomendado)
                // Solo cacheamos peticiones exitosas y que sean del mismo origen (tu dominio)
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                const responseClone = response.clone();
                caches.open(APP_VERSION).then((cache) => {
                    cache.put(e.request, responseClone);
                });
                return response;
            })
            .catch(() => {
                // Si falla la red, buscamos en caché
                return caches.match(e.request);
            })
    );
});
