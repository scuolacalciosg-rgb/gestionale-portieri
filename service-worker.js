// ============================================
// SERVICE WORKER - Gestionale Portieri
// ============================================
const NOME_CACHE = "gestionale-portieri-v1";

const FILE_DA_METTERE_IN_CACHE = [
  "dashboard.html",
  "giocatori.html",
  "allenamenti.html",
  "esercizi.html",
  "rapporti.html",
  "calendario.html",
  "css/style.css",
  "assets/stemma.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(NOME_CACHE).then((cache) => {
      return cache.addAll(FILE_DA_METTERE_IN_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((nomiCache) => {
      return Promise.all(
        nomiCache.filter((nome) => nome !== NOME_CACHE).map((nome) => caches.delete(nome))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((rispostaRete) => {
        const copia = rispostaRete.clone();
        caches.open(NOME_CACHE).then((cache) => cache.put(event.request, copia));
        return rispostaRete;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
