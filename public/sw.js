/**
 * Service worker do Virada App.
 *
 * O app já guardava os DADOS no aparelho (IndexedDB), mas a casca — HTML, JS,
 * CSS — vinha do servidor a cada abertura. Sem rede o app simplesmente não
 * abria, o que contradizia a promessa de "funciona offline". Este arquivo
 * resolve isso cacheando a casca.
 *
 * Estratégias, por tipo de pedido:
 *   /api/*            → sempre rede. Nunca cacheia (login, versão, webhooks).
 *   /_next/static/*   → cache-first. O nome do arquivo já tem hash do conteúdo,
 *                       então nunca serve versão errada.
 *   navegação (HTML)  → rede primeiro, cache como rede de segurança. Assim uma
 *                       publicação nova aparece na hora quando há internet, e
 *                       o app ainda abre quando não há.
 *   resto same-origin → stale-while-revalidate (responde do cache e atualiza
 *                       por baixo).
 *
 * Sobe SW_VERSION ao mudar as regras aqui — o activate limpa os caches velhos.
 */

const SW_VERSION = "v1";
const SHELL_CACHE = `virada-shell-${SW_VERSION}`;
const RUNTIME_CACHE = `virada-runtime-${SW_VERSION}`;

// Rota de entrada do app: é o que servimos quando o usuário abre offline numa
// rota que ainda não visitou.
const APP_ENTRY = "/app/inicio";

const PRECACHE = [APP_ENTRY, "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Um item que falhe (offline na 1ª instalação) não pode derrubar o
      // install inteiro — por isso um a um, e não addAll.
      await Promise.all(
        PRECACHE.map((url) => cache.add(url).catch(() => undefined)),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("virada-") && k !== SHELL_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);
  return hit ?? (await network) ?? Response.error();
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (
      (await cache.match(request)) ??
      (await cache.match(APP_ENTRY)) ??
      new Response(
        "<!doctype html><meta charset=utf-8><title>Sem conexão</title>" +
          "<body style=\"font-family:system-ui;background:#07111F;color:#CBD5E1;padding:40px\">" +
          "<h1>Sem conexão</h1><p>Abra o app uma vez com internet para ele funcionar offline.</p>",
        { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
      )
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
});
