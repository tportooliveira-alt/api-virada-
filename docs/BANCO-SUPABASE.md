# Banco Supabase

Migration principal:

- `supabase/migrations/202604280001_initial_virada_app.sql`

## Tabelas

- `profiles`
- `expenses`
- `incomes`
- `debts`
- `goals`
- `completed_missions`
- `impulse_checks`
- `user_points`
- `user_badges`
- `user_streaks`
- `user_score_history`
- `ai_conversations`
- `ai_recommendations`

## RLS

Todas as tabelas públicas têm Row Level Security ativado.

Tabelas com `user_id` usam policies:

- `select` se `auth.uid() = user_id`
- `insert` se `auth.uid() = user_id`
- `update` se `auth.uid() = user_id`
- `delete` se `auth.uid() = user_id`

`profiles` permite:

- usuário ver e atualizar o próprio perfil
- admin ver e atualizar todos os perfis via função `public.is_admin(auth.uid())`

## Chaves

Frontend usa apenas:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Nunca expor `SUPABASE_SERVICE_ROLE_KEY` no frontend.
