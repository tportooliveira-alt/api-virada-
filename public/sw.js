/* Service worker do Virada App.
 *
 * Existe por dois motivos, nessa ordem:
 *  1) Sem service worker o Chrome NÃO oferece instalar o app (o `beforeinstallprompt`
 *     nunca dispara) — o comprador só conseguia "adicionar atalho", que não é o app.
 *  2) O app é offline-first (os dados moram no localStorage), mas sem cache das telas
 *     ele mostrava dinossauro no metrô. Agora abre sem internet.
 *
 * Regras de cache:
 *  - /api/*            → nunca. Acesso, versão e planilha precisam da verdade do servidor.
 *  - navegação (HTML)  → rede primeiro, cache como rede reserva (deploy novo aparece na hora).
 *  - /_next/static/*   → cache primeiro (nome tem hash: muda de nome a cada build).
 *  - ícones/manifest   → cache primeiro com atualização em segundo plano.
 *  - resto             → passa direto, sem service worker no meio.
 *
 * Ao mudar este arquivo, suba a VERSION: é ela que apaga os caches antigos.
 */

const VERSION = "2026-09-04.1";
const SHELL_CACHE = `virada-shell-${VERSION}`;
const ASSET_CACHE = `virada-assets-${VERSION}`;
const OFFLINE_URL = "/app/inicio";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // A tela inicial é a reserva de qualquer navegação offline.
      await cache.add(new Request(OFFLINE_URL, { cache: "reload" })).catch(() => {});
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, ASSET_CACHE]);
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith("virada-") && !keep.has(n)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

// A tela de "Nova versão" recarrega a página; isso troca o worker junto.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") void self.skipWaiting();
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest"
  );
}

async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    const cached = (await cache.match(request)) || (await cache.match(OFFLINE_URL));
    if (cached) return cached;
    throw new Error("offline sem cópia em cache");
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh && fresh.ok) cache.put(request, fresh.clone());
  return fresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Google Identity, fontes, etc.
  if (url.pathname.startsWith("/api/")) return;

  // Navegação interna do Next (RSC): mesma URL, resposta diferente do HTML.
  // Guardar no mesmo cache envenenaria a tela. Deixa passar.
  if (url.searchParams.has("_rsc") || request.headers.get("RSC")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  }
});
