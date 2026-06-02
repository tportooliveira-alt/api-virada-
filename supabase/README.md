# `supabase/` — Migração de banco (Postgres)

| Arquivo | O que cria |
|---|---|
| `migrations/202604280001_initial_virada_app.sql` | Schema completo do app no Postgres: 13 tabelas (`profiles`, `expenses`, `incomes`, `debts`, `goals`, `completed_missions`, `impulse_checks`, `user_points`, `user_badges`, `user_streaks`, `user_score_history`, `ai_conversations`, `ai_recommendations`), **RLS** (Row Level Security) por usuário em todas, função `is_admin()`, e trigger `handle_new_user` que cria o profile no signup |

## ⚠️ Atenção — divergência arquitetural (ver RELATORIO-ANALISE.md #2)

Esta migration aponta para uma arquitetura **diferente** da que o código usa hoje:

| | Código atual (em produção no repo) | Esta migration Supabase |
|---|---|---|
| Auth | Google Identity Services (sem senha) | `auth.users` do Supabase + RLS |
| Finanças | IndexedDB no **cliente** (offline-first) | Postgres no **servidor** (expenses/incomes/...) |
| Acesso/compradores | SQLite `members` (`lib/access/db.ts`) | `profiles.access_status` |

Ou seja: **a migration existe mas o código ainda não a usa.** É preciso decidir:
- **Manter offline-first** (IndexedDB) e usar Supabase só pra `members`/acesso; **ou**
- **Migrar tudo pro Supabase** (servidor), reescrevendo o provider e a auth.

Enquanto não se decide, há 2 modelos de dados no repo. Resolver antes de escalar.
