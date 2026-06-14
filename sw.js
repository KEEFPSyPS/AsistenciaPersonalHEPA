// Service Worker - Refaccionarias HEPA v2.0
// Estrategia: Cache First para assets estáticos, Network First para navegación
const APP_VERSION = 'hepa-app-v2.0';
const CACHE_STATIC = 'hepa-static-v2';
const CACHE_DYNAMIC = 'hepa-dynamic-v2';

// Assets críticos para funcionamiento offline
const PRECACHE_URLS = [
    './',
    './index.html',
    './manifest.json',
    './img/logoAppHepa.png'
];

// Instalación: Precargar assets críticos
self.addEventListener('install', (e) => {
    e.waitUntil(
        Promise.all([
            caches.open(CACHE_STATIC).then((cache) => cache.addAll(PRECACHE_URLS)),
            caches.open(CACHE_DYNAMIC)
        ])
    );
    self.skipWaiting();
});

// Activación: Limpiar cachés antiguas
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(
                keyList.map((key) => {
                    if (key !== CACHE_STATIC && key !== CACHE_DYNAMIC && !key.startsWith('hepa-app-v')) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Estrategia de fetch optimizada
self.addEventListener('fetch', (e) => {
    const { request } = e;
    
    // Solo interceptar GET
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Estrategia: Cache First para assets estáticos (imágenes, fuentes, CSS)
    if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|woff2?|css)$/)) {
        e.respondWith(cacheFirst(request));
        return;
    }

    // Estrategia: Network First para navegación y HTML
    if (request.mode === 'navigate' || url.pathname.match(/\.html?$/)) {
        e.respondWith(networkFirst(request));
        return;
    }

    // Estrategia: Network Only para APIs y Firebase (no cachear)
    if (url.hostname.includes('googleapis') || url.hostname.includes('firebase') || url.hostname.includes('gstatic.com')) {
        e.respondWith(networkOnly(request));
        return;
    }

    // Estrategia: Stale While Revalidate para CDNs (Tailwind, FontAwesome, QR, etc.)
    if (url.hostname.includes('cdnjs') || url.hostname.includes('unpkg') || url.hostname.includes('cloudflare')) {
        e.respondWith(staleWhileRevalidate(request));
        return;
    }

    // Default: Network First
    e.respondWith(networkFirst(request));
});

// --- ESTRATEGIAS DE CACHÉ ---

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;
    
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_STATIC);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        return new Response('Offline', { status: 503 });
    }
}

async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok && response.type === 'basic') {
            const cache = await caches.open(CACHE_DYNAMIC);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) return cached;
        
        // Si es navegación y no hay caché, devolver index.html
        if (request.mode === 'navigate') {
            const fallback = await caches.match('./index.html');
            if (fallback) return fallback;
        }
        
        return new Response('Offline', { status: 503 });
    }
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_DYNAMIC);
    const cached = await cache.match(request);
    
    const fetchPromise = fetch(request).then((response) => {
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    }).catch(() => cached);
    
    return cached || fetchPromise;
}

async function networkOnly(request) {
    try {
        return await fetch(request);
    } catch (error) {
        return new Response('Network error', { status: 503 });
    }
}
