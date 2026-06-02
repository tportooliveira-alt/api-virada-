# `app/` — Rotas Next.js (App Router)

Tudo que tem rota mora aqui: páginas (UI) e endpoints (API). Next 14 App Router.

## UI — páginas
| Rota | Arquivo | O que é |
|---|---|---|
| `/` | `page.tsx` | Landing — hoje **redireciona** pra `/app/inicio` (deveria virar página de vendas) |
| `/app/inicio` | `app/inicio/page.tsx` | Dashboard (caixa, entradas, gastos, resultado) |
| `/app/lancar` | `app/lancar/page.tsx` | Lançar transação (texto/voz) |
| `/app/gastos`, `/entradas` | `app/gastos`, `app/entradas` | Listas + estorno |
| `/app/dividas`, `/metas`, `/missoes` | idem | Dívidas, metas, gamificação |
| `/app/evolucao` | `app/evolucao/page.tsx` | Visão "planilha" |
| `/app/conta`, `/aprendizado`, `/aprender/ia` | idem | Conta, conteúdo, consultor IA |
| `/app/instalar`, `/planilha-demo`, `/renda-extra` | idem | PWA install, demo, renda extra |
| `/admin/membros` | `admin/membros/page.tsx` | Painel admin de compradores |
| `/seed-test` | `seed-test/page.tsx` | Página de seed pra testes (dev) |

`layout.tsx` (raiz) envolve tudo em `AuthGate` + `ViradaProvider` (ver `providers/`).

## API — endpoints (`app/api/`)
| Rota | Arquivo | Função |
|---|---|---|
| `POST /api/access/check` | `api/access/check/route.ts` | Valida token Google + checa se é comprador/admin |
| `POST /api/webhooks/[platform]` | `api/webhooks/[platform]/route.ts` | Recebe venda das 6 plataformas (token + adapter) |
| `GET /api/admin/members` | `api/admin/members/route.ts` | Lista membros ⚠️ **auth fraca (ver RELATORIO-ANALISE.md #1)** |
| `POST /api/admin/members/manual` | `.../manual/route.ts` | Cadastro manual ⚠️ **auth fraca** |
| `POST /api/admin/members/status` | `.../status/route.ts` | Muda status ⚠️ **auth fraca** |

> ⚠️ As rotas `/api/admin/*` hoje confiam num header `x-admin-email` forjável. Ver
> `RELATORIO-ANALISE.md` (erro #1) antes de expor em produção.
