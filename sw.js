// Service Worker con Control de Versiones
const APP_VERSION = 'hepa-app-v1.8'; // Versión actualizada

// Archivos necesarios para que la app funcione offline (Requisito para instalar)
const CACHE_URLS = [
    './',
    './index.html',
    './manifest.json',
    './img/logoAppHepa.png' // Usamos la imagen que sabemos que funciona en el HTML
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
    // Solo interceptamos peticiones GET (evitamos errores con Firebase/Firestore)
    if (e.request.method !== 'GET') return;

    // Estrategia: Network First (Red primero, luego caché si falla)
    e.respondWith(
        fetch(e.request)
            .then((response) => {
                // Validamos la respuesta. ACEPTAMOS 'cors' para guardar Tailwind/FontAwesome/Firebase
                if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
                    return response;
                }
                const responseClone = response.clone();
                caches.open(APP_VERSION).then((cache) => {
                    cache.put(e.request, responseClone);
                });
                return response;
            })
            .catch(() => {
                // Si falla la red, buscamos en caché.
                // Si es una navegación (abrir la app), devolvemos index.html siempre
                if (e.request.mode === 'navigate') {
                    return caches.match('./index.html').then((resp) => resp || caches.match('./'));
                }
                return caches.match(e.request);
            })
    );
});
