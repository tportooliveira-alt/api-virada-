# Relatório de Análise — Virada App (`api-virada-`)

> Gerado em 2026-06-02 por análise completa do repositório (Claude Code).
> Cobre: estado real do código, resultado dos testes e erros encontrados.

## 1. O que é o projeto (resumo de 1 parágrafo)

Apesar do nome `api-virada-`, **não é uma API** — é o **Virada App**: um app de
controle financeiro **mobile-first (PWA)** vendido como infoproduto. Fluxo: cliente
compra na plataforma (Hotmart/Eduzz/Kiwify/Monetizze/Cakto/Perfectpay) → webhook
libera o acesso automaticamente → dados ficam no celular dele (offline-first,
IndexedDB) → ele exporta uma planilha premium direto pro Google Planilhas dele.

**Stack:** Next.js 14 (App Router) · React 18 · TypeScript · Tailwind 3 ·
better-sqlite3 (servidor) · idb/IndexedDB (cliente) · googleapis · Google Identity Services.

## 2. Estado da validação (rodado em 2026-06-02)

| Verificação | Resultado |
|---|---|
| `npm run typecheck` | ✅ 0 erros |
| `npm run lint` | ⚠️ 0 erros, 2 warnings (exhaustive-deps) |
| `npm run build` | ✅ OK — 24 rotas |
| `npm install` | ✅ exit 0 (better-sqlite3 compilou) |

### Testes automatizados

| Suite | Resultado |
|---|---|
| `scripts/test-sheets-build.ts` | ✅ 69/69 |
| `scripts/test-webhooks.ts` | ✅ 25/25 |
| `scripts/test-deletions.ts` | ✅ 76/76 |
| `scripts/test-estorno.ts` | ✅ 35/35 |
| `scripts/test-app-completo.ts` | ✅ 60/60 |
| `scripts/test-sheets-stress.ts` | ✅ (gera massa de dados) |
| `scripts/test_finance.js` | ❌ obsoleto (ver erro #4) |
| `scripts/test_performance.js` | ❌ obsoleto (ver erro #4) |

**Total: 265 asserts TS passando.** Os 2 `.js` que falham são testes mortos.

## 3. Erros encontrados (por severidade)

### 🔴 #1 CRÍTICO — Painel admin sem autenticação real  ✅ CORRIGIDO (2026-06-02)
**Onde:** `app/api/admin/members/route.ts`, `.../manual/route.ts`, `.../status/route.ts`.
**Problema:** autenticam só pelo header `x-admin-email` comparado com `ADMIN_EMAILS`.
O header é controlado pelo cliente → qualquer um forja `x-admin-email: <admin>` e:
- lista todos os compradores (vazamento LGPD: email, nome, transação);
- cadastra a si mesmo como membro `ativo` de graça (`/manual`);
- cancela/reembolsa qualquer membro (`/status`).

**Correção:** validar ID token Google (como `app/api/access/check/route.ts` já faz) e
conferir o email/`sub` **validado** contra `ADMIN_EMAILS`. Nunca confiar em header de texto.

### 🟠 #2 GRAVE — Conflito SQLite × Netlify (perda de dados)
**Onde:** `lib/access/db.ts` (better-sqlite3, arquivo `data/access.db`) × `netlify.toml`.
**Problema:** Netlify/serverless tem disco efêmero → o banco de compradores some a cada
deploy/cold-start; e sem `@netlify/plugin-nextjs` as API routes (webhooks) nem rodam.
Existe `supabase/migrations/` (migração iniciada) mas **o código ainda usa SQLite**.
**Correção (escolher 1):** (a) finalizar migração p/ Supabase Postgres e ajustar deploy;
ou (b) hospedar em VPS com disco persistente e remover/ajustar o `netlify.toml`.

### 🟡 #3 MÉDIO — Validação de audiência (`aud`) opcional no login  ✅ CORRIGIDO (2026-06-02)
**Onde:** `app/api/access/check/route.ts:50` e `:67`.
**Problema:** `if (expectedClient && info.aud && info.aud !== expectedClient)` — se a env
`NEXT_PUBLIC_GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_ID` não estiver no servidor, **a audiência
não é checada** e um ID token de qualquer app Google passa.
**Correção:** exigir `expectedClient` definido e validar `aud` sempre (falhar se ausente).

### 🟢 #4 MENOR — Testes obsoletos (mortos)
**Onde:** `scripts/test_finance.js`, `scripts/test_performance.js`.
**Problema:** chamam `POST /api/auth/login` (email+senha), `GET/POST /api/finance` — rotas
que **não existem**. O app migrou p/ login Google (sem senha) + finanças no cliente.
Esses testes nunca passam. **Correção:** remover ou reescrever como testes client-side.

### 🟢 #5 MENOR — Warnings de lint
`react-hooks/exhaustive-deps` em `components/AuthGate.tsx:262` (falta `isPublic`) e
`components/GoogleSyncButton.tsx:335` (falta `runAction`). Revisar deps dos `useEffect`.

### 🟢 #6 MENOR — Backup redundante versionado
`content/ebook.backup.md` é byte-a-byte idêntico a `content/ebook.md`. Remover do Git
(ou mover pra fora) — backup não deve ir versionado lado a lado.

### 🟢 #7 MENOR — Documentação desatualizada
- `README.md` (raiz) descreve "base CSV em `data/planilhas`" — arquitetura antiga.
- `00-LEIA-AQUI/10-STATUS-ATUAL-01-05-2026.md` diz "17 rotas" (são 24) e "admin não
  implementado" (já existe em `app/admin/membros/` + 3 APIs).
- Ver os `README.md` por pasta (criados nesta análise) para o estado real.

## 4. O que falta pra vender (consolidado do 00-LEIA-AQUI, revisado)
1. Configurar `.env.local` (Google Client ID + tokens das plataformas + `ADMIN_EMAILS`).
2. **Decidir arquitetura/deploy** (erro #2) e subir num domínio.
3. Corrigir segurança do admin (erro #1) **antes** de expor publicamente.
4. Transformar `app/page.tsx` em página de vendas (hoje redireciona).
5. Produto/lançamento: ebook + vídeos + automação Hotmart/Cakto (pastas `content/`,
   `marketing/`, `artifacts/`, `scripts/*.py`).

## 5. Próximos passos sugeridos
- Aplicar correções #1 e #3 (segurança) — mudança de código, precisa decisão.
- Resolver #2 (arquitetura) — decisão Supabase vs VPS.
- Limpar #4, #5, #6 (rápido, baixo risco).
- Rodar uma revisão de segurança dedicada (`/security-review`) antes do lançamento.

## 6. Correções aplicadas (2026-06-02)

**#1 (admin) e #3 (audiência)** foram corrigidos:
- Novo `lib/access/admin-session.ts` — sessão admin assinada (HMAC) em cookie httpOnly,
  com expiração de 12h e **fail-closed** (sem `ADMIN_SESSION_SECRET`, admin fica bloqueado).
- `app/api/access/check/route.ts` — `aud` agora é **obrigatório** (falha se a env do
  client ID não estiver no servidor); emite/limpa o cookie admin conforme `ADMIN_EMAILS`.
- `app/api/admin/members/route.ts`, `.../manual`, `.../status` — passam a exigir o cookie
  assinado (verificado server-side). Header `x-admin-email` **não é mais aceito**.
- `app/admin/membros/page.tsx` — usa o cookie (same-origin), sem header forjável.
- `.env.example` — documenta `ADMIN_EMAILS` e `ADMIN_SESSION_SECRET`.
- `scripts/test-admin-session.ts` — 12 asserts cobrindo assinatura, adulteração,
  expiração lógica, revogação e fail-closed.

> ⚠️ **Ação necessária no servidor:** defina `ADMIN_EMAILS` e um `ADMIN_SESSION_SECRET`
> forte no `.env.local`, senão o painel admin fica bloqueado (comportamento seguro).

**Pendentes:** #2 (arquitetura/deploy — precisa decisão), #4/#5/#6 (limpeza).

