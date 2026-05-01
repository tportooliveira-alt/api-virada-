# O que já está implementado

## ✅ Acesso e login

- **Login Google único** — `components/AuthGate.tsx`. Cliente entra com 1 clique, sem senha, sem cadastro manual.
- **Validação no servidor** — `app/api/access/check/route.ts` valida o ID token Google via endpoint público `oauth2.googleapis.com/tokeninfo`, confere se o e-mail está na lista de compradores e retorna `{ status, email, sub, name }`.
- **Offline-first** — `AuthGate` libera acesso se já existe registro `ativo` no `localStorage` mesmo sem internet. Se status = `inativo` e sem internet, mostra "Conecte uma vez".
- **Anti-fraude** — `google_sub` (ID imutável da conta Google) é salvo junto. Trocar e-mail manualmente no banco local não libera o acesso.
- **3 telas distintas:**
  - `needs-login` — botão "Entrar com Google"
  - `not-member` — "Comprou com outro e-mail?"
  - `needs-online` — "Conecte uma vez para validar"

## ✅ Webhooks de venda (6 plataformas)

| Plataforma | URL | Token .env |
|---|---|---|
| Hotmart | `/api/webhooks/hotmart` | `HOTMART_TOKEN` |
| Eduzz | `/api/webhooks/eduzz` | `EDUZZ_TOKEN` |
| Kiwify | `/api/webhooks/kiwify` | `KIWIFY_TOKEN` |
| Monetizze | `/api/webhooks/monetizze` | `MONETIZZE_TOKEN` |
| Cakto | `/api/webhooks/cakto` | `CAKTO_TOKEN` |
| Perfectpay | `/api/webhooks/perfectpay` | `PERFECTPAY_TOKEN` |

**Endpoint único** (`app/api/webhooks/[platform]/route.ts`) com adapter por plataforma em `lib/access/adapters.ts`. Cada adapter normaliza o JSON daquela plataforma para o formato único `{ email, name, product, transaction_id, platform, status }`.

**Eventos cobertos:** approved / refunded / chargeback / cancelled — reconhece português e inglês ("PURCHASE_APPROVED", "PAID", "Compra Finalizada", "Reembolsada", etc.).

**Token opcional** — se a env do token estiver definida, o webhook exige `?token=...` ou header `X-Webhook-Token`. Sem env, fica aberto (só pra testes locais).

**Auditoria** — toda chamada é registrada na tabela `webhook_log`.

## ✅ Banco SQLite

`lib/access/db.ts` — abre `data/access.db` (modo WAL), cria tabelas no boot:

- **`members`** — `email PK, name, platform, product, transaction_id, status, added_at, cancelled_at, raw`
- **`webhook_log`** — `id, platform, event, email, ok, message, received_at`

**API em `lib/access/members.ts`:** `isMember`, `getMember`, `upsertMember`, `setStatus`, `listMembers`, `logWebhook`. Normaliza email (lowercase + trim) automaticamente — não cria duplicado por capitalização.

## ✅ Planilha profissional

**Fluxo:** cliente clica "Exportar minha planilha" → popup OAuth do Google → planilha criada **na conta Google do cliente** (Drive dele) → botão "Abrir no Google Planilhas" aparece.

**Sem service account, sem `.env` do servidor para a planilha em si** (só o `NEXT_PUBLIC_GOOGLE_CLIENT_ID` no client).

**O que a planilha tem:**
- Banner navy/dourado igual à identidade do app
- 4 KPI cards (Entradas, Saídas, Saldo em dourado, Lançamentos)
- 4 gráficos: pizza (categorias), coluna (mês a mês), linha (saldo acumulado), barra (top dívidas)
- 9 abas: Dashboard, Lançamentos, Receitas, Despesas, Dívidas, Metas, Fluxo de Caixa, Resumo Mensal, Como usar
- Formato BRL (`R$ 1.234,56`), datas `dd/mm/yyyy`, percentuais
- Banding (zebra), auto-filter, freeze do cabeçalho
- Formatação condicional: saldo + verde / − vermelho, status de dívida em cores, gradiente em metas
- **Tudo travado read-only** — cliente só visualiza e filtra; sync reescreve via API
- Aba "Como usar" estilo onboarding com 5 passos

**Builder isomórfico** (`lib/sheets/builder.ts`) é compartilhado pelo cliente (`GoogleSyncButton.tsx`) e por um wrapper de servidor opcional (`lib/sheets/google-sheets.ts`).

## ✅ App / PWA

- Layout protegido por `AuthGate` (`app/layout.tsx`)
- Páginas: `/app/inicio`, `/app/lancar`, `/app/gastos`, `/app/entradas`, `/app/dividas`, `/app/metas`, `/app/missoes`, `/app/aprender`, `/app/aprender/ia`, `/app/aprendizado`, `/app/evolucao`, `/app/instalar`, `/app/planilha-demo`, `/app/renda-extra`
- Provider central `providers/virada-provider.tsx`
- Componentes prontos: `BottomNav`, `Header`, `DashboardCard`, `TransactionForm`, `TransactionList`, `GoalCard`, `DebtCard`, `MissionCard`, `ProgressBar`, `EmptyState`, `BadgeCard`, `ParsedTransactionConfirm`, `VoiceOrTextInput`, `AntiImpulseCard`, `AudioTipCard`, `ExpenseChart`, `ExtraIncomeIdeaCard`, `InstallGuide`, `LocalStorageNotice`, `QuickLaunchCard`, `ViradaScoreCard`, `PremiumGate`

## ✅ Testes automatizados

| Suite | Asserts | Arquivo |
|---|---|---|
| Geração da planilha (estrutura + dados) | 69/69 | `scripts/test-sheets-build.ts` |
| Webhooks das 6 plataformas + SQLite | 25/25 | `scripts/test-webhooks.ts` |

Rodar: `npx tsx scripts/test-sheets-build.ts && npx tsx scripts/test-webhooks.ts`

## ✅ Higiene de código

- `npx tsc --noEmit` — 0 erros
- `npx next lint` — 0 warnings
- `npm run build` — 17 rotas, build OK
