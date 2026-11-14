/*
 * Service worker da Bandinha — simples de propósito:
 *  - guarda em cache só arquivos estáticos (JS/CSS/fontes/ícones);
 *  - NUNCA guarda páginas com dados (privacidade/LGPD);
 *  - sem internet, mostra a página /offline.
 */
const VERSAO = "bandinha-v1";
const ESTATICOS = ["/offline", "/logo.svg", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ESTATICOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navegação: sempre da rede; se cair, página offline.
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match("/offline")));
    return;
  }

  // Arquivos estáticos versionados do Next e ícones: cache primeiro.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname === "/logo.svg") {
    e.respondWith(
      caches.match(req).then(
        (r) =>
          r ||
          fetch(req).then((resp) => {
            if (resp.ok) {
              const copia = resp.clone();
              caches.open(VERSAO).then((c) => c.put(req, copia));
            }
            return resp;
          }),
      ),
    );
  }
});
