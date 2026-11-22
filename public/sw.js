/*
 * Service worker do BibleRats — simples de propósito:
 *  - guarda em cache só arquivos estáticos (JS/CSS/fontes/ícones);
 *  - NUNCA guarda páginas com dados (privacidade/LGPD);
 *  - sem internet, mostra a página /offline;
 *  - mostra as notificações push (lembrete, check-ins e comentários).
 */
const VERSAO = "biblerats-v2";
const ESTATICOS = ["/offline", "/logo.png", "/icons/icon-192.png", "/icons/icon-512.png"];

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
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname === "/logo.png") {
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

// ---------------------------- Notificações ----------------------------
self.addEventListener("push", (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {
    d = { corpo: e.data ? e.data.text() : "" };
  }
  e.waitUntil(
    self.registration.showNotification(d.titulo || "BibleRats", {
      body: d.corpo || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: d.tag,
      renotify: !!d.tag,
      data: { url: d.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const alvo = new URL((e.notification.data && e.notification.data.url) || "/", self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      for (const j of janelas) {
        if (new URL(j.url).origin === self.location.origin && "focus" in j) {
          return j.focus().then((f) => (f && "navigate" in f ? f.navigate(alvo) : null));
        }
      }
      return self.clients.openWindow(alvo);
    }),
  );
});
