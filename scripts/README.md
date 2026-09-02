# `scripts/` — Testes e automação

Três famílias bem diferentes convivem aqui.

## 1. ✅ Testes automatizados (TypeScript) — VÁLIDOS
Rodam com `npx tsx`. Exercitam a lógica de `lib/`. Todos passando (265 asserts).

| Arquivo | Cobre | Status |
|---|---|---|
| `test-sheets-build.ts` | Geração da planilha (estrutura+dados) | ✅ 69 |
| `test-webhooks.ts` | 6 adapters + ciclo refund + normalização | ✅ 25 |
| `test-deletions.ts` | Exclusões e cascata | ✅ 76 |
| `test-estorno.ts` | Estorno + precisão BRL | ✅ 35 |
| `test-app-completo.ts` | Métricas do dashboard | ✅ 60 |
| `test-sheets-stress.ts` | Massa de dados (smoke) | ✅ |
| `fake-googleapis.cjs` | Mock auxiliar do teste de planilha | — |

## 2. ❌ Testes de integração HTTP — OBSOLETOS (ver RELATORIO #4)
| Arquivo | Problema |
|---|---|
| `test_finance.js` | Chama `POST /api/auth/login`, `GET/POST /api/finance` — **rotas que não existem** |
| `test_performance.js` | Idem + exige servidor em `localhost:3000` |

Foram escritos pra uma arquitetura antiga (login senha + API de finanças no servidor).
Nunca passam hoje. **Remover ou reescrever** como testes client-side.

## 3. 🐍 Automação de lançamento (Python + JS) — operação
Scripts que dirigem o navegador / geram material. Dependências fora do `package.json`
(Python + libs). Use sob demanda, não no CI.

| Família | Arquivos | O que faz |
|---|---|---|
| Hotmart | `hotmart_*.py` | Cria produto, define preço, faz upload, tira prints |
| Cakto | `cakto_*.py` | Abre painel, dashboard, screenshots |
| Canva | `canva_*.py` | Upload/inspeção de design |
| Chrome | `chrome_*.py` | Sessões/perfis de navegador pra automação |
| Deploy | `deploy_netlify_drop.py` | Deploy via Netlify Drop |
| Produto | `build_pdfs.py`, `build_videos.py`, `build_assets.py`, `build-ebook-pdf.mjs` | Gera PDFs (de `content/`), vídeos e assets |
| Screenshots | `screenshot.js`, `screenshot-all.js`, `screenshot_app.*` | Capturas do app |
| Outros | `open_gmail.py` | Utilitário |

> ⚠️ `build-ebook-pdf.mjs` está com 0 bytes (vazio) — provável arquivo abandonado.
