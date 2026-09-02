# Virada App (`api-virada-`)

> **Atenção ao nome:** apesar de `api-virada-`, **isto não é uma API** — é o **Virada App**
> completo (Next.js 14 PWA + material do infoproduto + automação de lançamento).

App de controle financeiro **mobile-first** vendido como infoproduto. Cliente compra
numa plataforma (Hotmart/Eduzz/Kiwify/Monetizze/Cakto/Perfectpay) → webhook libera o
acesso automaticamente → dados ficam no celular dele (offline-first) → ele exporta uma
planilha premium pro Google Planilhas dele.

## 📍 Comece por aqui (índice mestre)

| Quero... | Vá para |
|---|---|
| **Estado real do código + erros encontrados** | [`RELATORIO-ANALISE.md`](RELATORIO-ANALISE.md) |
| Entender o produto/negócio passo a passo | [`00-LEIA-AQUI/`](00-LEIA-AQUI/) (10 docs numerados) |
| Documentação técnica | [`docs/`](docs/README.md) |

## 🗂️ Mapa das pastas (cada uma tem seu README)

| Pasta | O que tem |
|---|---|
| [`app/`](app/README.md) | Rotas Next.js — páginas (UI) e endpoints (API) |
| [`lib/`](lib/README.md) | Lógica de negócio: acesso (`access/`), planilha (`sheets/`), parsing, IA, tipos |
| [`components/`](components/README.md) | Componentes React (26) — `AuthGate`, `GoogleSyncButton`, dashboard, etc. |
| [`providers/`](providers/README.md) | Estado global (IndexedDB) via `ViradaProvider` |
| [`content/`](content/README.md) | **Materiais do produto** (ebook + 4 bônus, em Markdown) |
| [`public/`](public/README.md) | Estáticos: PDFs vendáveis, assets, ícones, criativos, páginas HTML |
| [`marketing/`](marketing/README.md) | Copy, roteiros, calendário, sequências de e-mail |
| [`artifacts/`](artifacts/README.md) | Pacote pronto de lançamento (Hotmart) |
| [`scripts/`](scripts/README.md) | Testes (TS válidos / JS obsoletos) + automação Python |
| [`supabase/`](supabase/README.md) | Migração Postgres (⚠️ arquitetura divergente — ver RELATORIO #2) |
| [`video-production/`](video-production/README.md) | Pipeline de produção de vídeo |
| [`docs/`](docs/README.md) | Notas técnicas e de produto |

## 🧱 Stack
Next.js 14 (App Router) · React 18 · TypeScript · Tailwind 3 · better-sqlite3 (acesso) ·
IndexedDB/`idb` (finanças no cliente) · googleapis · Google Identity Services.

## ▶️ Como rodar
```bash
npm install
npm run dev      # http://localhost:3000  (redireciona pra /app/inicio)
```

## ✅ Validação
```bash
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm run build       # next build
# testes (todos passando — 265 asserts):
npx tsx scripts/test-sheets-build.ts
npx tsx scripts/test-webhooks.ts
npx tsx scripts/test-deletions.ts
npx tsx scripts/test-estorno.ts
npx tsx scripts/test-app-completo.ts
```
> Não rode `scripts/test_finance.js` / `test_performance.js` — estão obsoletos (RELATORIO #4).

## ⚙️ Configuração (`.env.local`)
Ver template em `.env.example`. Mínimo: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, tokens das
plataformas (`HOTMART_TOKEN`...), e `ADMIN_EMAILS`. Detalhes em `00-LEIA-AQUI/03-O-QUE-FALTA-PRA-VENDER.md`.

## ⚠️ Antes de lançar
Ler [`RELATORIO-ANALISE.md`](RELATORIO-ANALISE.md) — há **1 falha de segurança crítica**
(painel admin) e **1 conflito de arquitetura/deploy** (SQLite × serverless) a resolver.
