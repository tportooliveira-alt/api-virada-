# Mapa dos arquivos importantes

## Acesso e webhook

| Arquivo | Função |
|---|---|
| `lib/access/db.ts` | Abre o SQLite, cria tabelas no boot |
| `lib/access/members.ts` | API: `isMember`, `upsertMember`, `setStatus`, `listMembers`, `logWebhook` |
| `lib/access/adapters.ts` | Adapters por plataforma (Hotmart/Eduzz/Kiwify/Monetizze/Cakto/Perfectpay) |
| `app/api/webhooks/[platform]/route.ts` | Endpoint único — valida token + roda adapter + grava |
| `app/api/access/check/route.ts` | Valida ID token Google + checa se é comprador |
| `components/AuthGate.tsx` | UI de login Google + offline-first + telas de erro |

## Planilha profissional

| Arquivo | Função |
|---|---|
| `lib/sheets/styles.ts` | Paleta navy/dourado/verde + helpers de format/proteção |
| `lib/sheets/builder.ts` | Builder isomórfico (gera requests/values puros) |
| `lib/sheets/google-sheets.ts` | Wrapper de servidor (service account opcional) |
| `components/GoogleSyncButton.tsx` | UI cliente — OAuth + cria/atualiza planilha na conta do usuário |

## App

| Arquivo | Função |
|---|---|
| `app/layout.tsx` | Root layout, envolve tudo em `AuthGate` + `ViradaProvider` |
| `app/page.tsx` | Landing (precisa virar página de vendas) |
| `app/app/*` | Páginas autenticadas do app (início, lançamentos, dívidas, metas, etc.) |
| `providers/virada-provider.tsx` | Estado global do app (IndexedDB) |
| `lib/db/indexeddb.ts` | Banco local do celular |
| `lib/types.ts` | Tipos compartilhados (Expense, Income, Debt, Goal, etc.) |
| `lib/constants.ts` | Constantes (categorias, missões, etc.) |
| `tailwind.config.ts` | Paleta `virada-bg/green/gold/etc.` |

## Testes

| Arquivo | O que testa |
|---|---|
| `scripts/test-sheets-build.ts` | 69 asserts da planilha gerada (estrutura + dados) |
| `scripts/test-webhooks.ts` | 25 asserts dos 6 adapters + ciclo refund + normalização |
| `scripts/fake-googleapis.cjs` | Mock auxiliar do teste de planilha |

## Dados (não versionar)

| Caminho | Conteúdo |
|---|---|
| `data/access.db` | SQLite — membros + webhook_log |
| `data/access.db-wal` / `-shm` | Arquivos auxiliares do modo WAL |
| `data/planilhas/` | Restos do CSV antigo (pode apagar depois) |

> Adicione `data/` ao `.gitignore` se ainda não estiver — é dado de produção.

## Configuração

| Arquivo | Conteúdo |
|---|---|
| `.env.local` | `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, tokens das plataformas |
| `.env.example` | Template (commitado) |
| `package.json` | Deps: `next 14`, `react 18`, `googleapis`, `idb`, `better-sqlite3`, `lucide-react`, `tailwindcss` |
