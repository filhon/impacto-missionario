const CACHE = "impacto-v1";
const SHELL = [
  "/",
  "/login",
  "/perfil",
  "/sync",
  "/pessoa/novo",
  "/atividade/biblia",
  "/atividade/joao",
  "/atividade/folheto",
  "/atividade/visita",
  "/atividade/oracao",
  "/atividade/conversao",
  "/atividade/medico",
  "/atividade/radio",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith("/api/")) return;
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(
        () => caches.match(e.request) || caches.match("/"),
      ),
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(
      (r) =>
        r ||
        fetch(e.request).then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return resp;
        }),
    ),
  );
});
