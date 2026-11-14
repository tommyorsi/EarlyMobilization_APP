
const CACHE_NAME = "earlymob-clinical-v3";

const APP_FILES = [
    "./",
    "./index.html",
    "./manifest.json",
    "./favicon-32.png",
    "./icon-192.png",
    "./icon-512.png",
    "./icon-maskable-512.png"
];

// Installazione
self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            await cache.addAll(APP_FILES);
            await self.skipWaiting();
        })()
    );
});

// Attivazione e rimozione delle vecchie cache
self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            const cacheNames = await caches.keys();

            await Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );

            await self.clients.claim();
        })()
    );
});

// Gestione delle richieste
self.addEventListener("fetch", (event) => {
    const request = event.request;

    if (request.method !== "GET") return;

    const url = new URL(request.url);

    // Non intercettare richieste verso altri domini
    if (url.origin !== self.location.origin) return;

    // HTML: prima rete, poi cache in caso di offline
    if (request.mode === "navigate" ||
        url.pathname.endsWith("/index.html")) {

        event.respondWith(
            (async () => {
                try {
                    const response = await fetch(request, {
                        cache: "no-store"
                    });

                    if (response.ok) {
                        const cache = await caches.open(CACHE_NAME);
                        const indexUrl = new URL(
                            "./index.html",
                            self.registration.scope
                        ).href;

                        await cache.put(indexUrl, response.clone());
                    }

                    return response;

                } catch (error) {
                    const indexUrl = new URL(
                        "./index.html",
                        self.registration.scope
                    ).href;

                    const cached = await caches.match(indexUrl);

                    return cached || new Response(
                        "App offline",
                        { status: 503 }
                    );
                }
            })()
        );

        return;
    }

    // Altre risorse: prima rete, poi cache
    event.respondWith(
        (async () => {
            const cached = await caches.match(request);

            try {
                const response = await fetch(request, {
                    cache: "no-cache"
                });

                if (response.ok) {
                    const cache = await caches.open(CACHE_NAME);
                    await cache.put(request, response.clone());
                }

                return response;

            } catch (error) {
                return cached || new Response(
                    "",
                    { status: 503, statusText: "Offline" }
                );
            }
        })()
    );
});
