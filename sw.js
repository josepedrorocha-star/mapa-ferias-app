/* Mapa de Férias — service worker
   Guarda a app no telemóvel para abrir depressa e mesmo sem rede.
   Os dados (Firebase) não passam por aqui: o próprio Firebase guarda uma cópia local.
   Ao publicar uma nova versão da app, aumente o número da VERSAO. */
const VERSAO = "mapa-ferias-v3";
const BASE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png"];
const EXTERNOS = ["www.gstatic.com", "fonts.googleapis.com", "fonts.gstatic.com", "cdn.jsdelivr.net"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  /* A app (mesmo endereço): tenta a rede primeiro, para ter sempre a versão mais recente */
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
        .then(r => {
          if (r && r.ok) { const copia = r.clone(); caches.open(VERSAO).then(c => c.put(req, copia)); }
          return r;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  /* Bibliotecas e letras (Firebase, ExcelJS, Google Fonts): usa a cópia e atualiza em segundo plano */
  if (EXTERNOS.includes(url.hostname)) {
    e.respondWith(
      caches.open(VERSAO).then(c =>
        c.match(req).then(guardado => {
          const rede = fetch(req)
            .then(r => { if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone()); return r; })
            .catch(() => guardado);
          return guardado || rede;
        })
      )
    );
  }
  /* Tudo o resto (entrada com Google, base de dados) segue direto para a internet */
});
