const CACHE_NAME = "food-calculator-v14";

const FILES_TO_CACHE = [
    "/",
    "/index.html",
    "/inventory.html",
    "/recipeCreate.html",
    "/recipeDetails.html",
    "/recipeInstructions.html",
    "/style.css",
    "/navigation.js",
    "/script.js",
    "/inventory.js",
    "/recipeCreate.js",
    "/recipeDetails.js",
    "/recipeInstructions.js",
    "/manifest.json"
];

self.addEventListener("install", (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE)));
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames => Promise.all(
            cacheNames
                .filter(name => name !== CACHE_NAME)
                .map(name => caches.delete(name))
        ))
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;

    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
