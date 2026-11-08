/* EarlyMob Clinical — offline application shell */
'use strict';

const CACHE_NAME = 'earlymob-clinical-v1';
const APP_SHELL = [
    './',
    './index.html',
    './manifest.json',
    './favicon-32.png',
    './icon-192.png',
    './icon-512.png',
    './icon-maskable-512.png'
];

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function (cache) {
                return cache.addAll(APP_SHELL);
            })
            .then(function () {
                return self.skipWaiting();
            })
    );
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys()
            .then(function (cacheNames) {
                return Promise.all(cacheNames.map(function (cacheName) {
                    if (cacheName.startsWith('earlymob-clinical-') && cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                }));
            })
            .then(function () {
                return self.clients.claim();
            })
    );
});

self.addEventListener('fetch', function (event) {
    const request = event.request;
    const requestURL = new URL(request.url);

    // Do not intercept non-GET requests or requests to other origins.
    if (request.method !== 'GET' || requestURL.origin !== self.location.origin) {
        return;
    }

    if (request.mode === 'navigate') {
        // Prefer the latest page when online; use the cached app shell when offline.
        event.respondWith(
            fetch(request)
                .then(function (response) {
                    if (response && response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then(function (cache) {
                            cache.put('./index.html', copy);
                        });
                    }
                    return response;
                })
                .catch(function () {
                    return caches.match(request).then(function (cachedPage) {
                        return cachedPage || caches.match('./index.html') || caches.match('./');
                    });
                })
        );
        return;
    }

    // Cache-first for the local app assets, with a network fallback.
    event.respondWith(
        caches.match(request).then(function (cachedResponse) {
            if (cachedResponse) return cachedResponse;

            return fetch(request).then(function (response) {
                if (response && response.ok) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(function (cache) {
                        cache.put(request, copy);
                    });
                }
                return response;
            });
        })
    );
});
