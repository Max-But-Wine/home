const CACHE = "fromage-pwa-v1";
const ASSETS = ["./", "./index.html", "./styles.css", "./app.js", "./manifest.webmanifest", "./assets/icon-192.svg", "./assets/icon-512.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
});
