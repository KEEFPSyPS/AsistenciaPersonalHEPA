// Service Worker con Control de Versiones
const APP_VERSION = 'hepa-app-v1.3'; // CAMBIA ESTO cuando hagas actualizaciones

self.addEventListener('install', (e) => {
    // Fuerza al SW a activarse inmediatamente tras instalarse
    self.skipWaiting();
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
    // Esto asegura que siempre se busque la versión más nueva
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    );
});
