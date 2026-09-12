# `app/` — Rotas Next.js (App Router)

Tudo que tem rota mora aqui: páginas (UI) e endpoints (API). Next 14, App Router.

## Páginas

| Rota | Arquivo | O que é |
|---|---|---|
| `/` e `/vendas` | — | **Rewrite** (`next.config.mjs`) para `public/vendas.html`. É a landing de vendas e **não passa pelo App Router nem pelo AuthGate** |
| `/obrigado` | `obrigado/page.tsx` | Pós-compra: avisa para entrar com o mesmo e-mail da compra, links dos bônus e suporte |
| `/app` → `/app/inicio` | `app/inicio/page.tsx` | Dashboard: caixa do mês, entradas, gastos, gasto por categoria, impulso, últimos lançamentos |
| `/app/lancar` | `app/lancar/page.tsx` | Lançar gasto ou entrada, digitando ou por voz. Casa/Empresa, essencial/impulso |
| `/app/relatorios` | `app/relatorios/page.tsx` | Histórico completo — abas: resumo, lançamentos, entradas, gastos, dívidas, metas, dia a dia, por mês. É onde se cadastra dívida e meta |
| `/app/conta` | `app/conta/page.tsx` | Conta, biblioteca de bônus, conectar/atualizar a planilha, instalar no celular, apagar dados |
| `/app/planilha-demo` | `app/planilha-demo/page.tsx` | Painel visual que **imita** o Google Sheets com os dados locais. Não é a planilha real |
| `/app/instalar` | `app/instalar/page.tsx` | Como instalar o PWA no Android e no iPhone |
| `/app/aprender/ia` | `app/aprender/ia/page.tsx` | Orientador de IA — **não lançado**, a tela avisa isso |
| `/app/aprender`, `/aprendizado`, `/dividas`, `/metas`, `/evolucao` | idem | Redirecionam para as rotas atuais (compatibilidade de links antigos) |
| `/admin/membros` | `admin/membros/page.tsx` | Painel de compradores. Exige sessão admin assinada (cookie), não header |
| `/seed-test` | `seed-test/page.tsx` | Ferramenta de dev. **Bloqueada em produção** |

`layout.tsx` (raiz) envolve tudo em `AuthGate` + `ViradaProvider`. O `AuthGate` libera `/`
sem login; todo o resto exige conta Google que esteja na lista de compradores.

## API

| Rota | O que faz |
|---|---|
| `POST /api/webhooks/[platform]` | Recebe a confirmação de compra (Kiwify em uso; Hotmart, Eduzz, Monetizze, Cakto e PerfectPay previstos), valida o token e grava o comprador em `data/access.db`. **Se falhar, o cliente paga e não recebe acesso** |
| `POST /api/access/check` | Valida o token do Google, confere se o e-mail é comprador ou admin e, se for admin, emite o cookie de sessão assinado |
| `GET /api/admin/members` | Lista compradores — exige o cookie de sessão admin |
| `POST /api/admin/members/manual` | Libera acesso na mão, quando o webhook falha — exige o cookie |
| `POST /api/admin/members/status` | Muda status (ativo / cancelado / reembolsado) — exige o cookie |
| `POST /api/whatsapp/webhook/[token]` | Recebe mensagens da Evolution API e responde pelo agente |
| `GET /api/version` | Commit e build em produção, usado pelo aviso de atualização |

> Autenticação de admin: **somente** o cookie assinado de `lib/access/admin-session.ts`.
> Nunca voltar a confiar num header de texto — qualquer pessoa forja.
