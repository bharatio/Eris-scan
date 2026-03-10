/* =====================================================
ERIS SCAN – SERVICE WORKER
PWA Cache + Offline Support
===================================================== */

const CACHE_NAME = "eris-scan-cache-v1";

/* ================= FILES TO CACHE ================= */

const urlsToCache = [

"./",
"./index.html",
"./style.css",
"./scan.js",
"./manifest.json",
"./logo.svg"

];

/* ================= INSTALL ================= */

self.addEventListener("install", event => {

event.waitUntil(

caches.open(CACHE_NAME)
.then(cache => {

console.log("Cache opened");

return cache.addAll(urlsToCache);

})

);

self.skipWaiting();

});

/* ================= ACTIVATE ================= */

self.addEventListener("activate", event => {

event.waitUntil(

caches.keys().then(cacheNames => {

return Promise.all(

cacheNames.map(cacheName => {

if (cacheName !== CACHE_NAME) {

console.log("Deleting old cache:", cacheName);

return caches.delete(cacheName);

}

})

);

})

);

self.clients.claim();

});

/* ================= FETCH ================= */

self.addEventListener("fetch", event => {

event.respondWith(

caches.match(event.request)
.then(response => {

if (response) {

return response;

}

return fetch(event.request)
.then(networkResponse => {

if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {

return networkResponse;

}

const responseClone = networkResponse.clone();

caches.open(CACHE_NAME)
.then(cache => {

cache.put(event.request, responseClone);

});

return networkResponse;

});

})

);

});

/* ================= MESSAGE LISTENER ================= */

self.addEventListener("message", event => {

if (event.data === "skipWaiting") {

self.skipWaiting();

}

});
