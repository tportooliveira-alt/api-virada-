# Prompts Codex

## Direção de Produto

Evoluir o Virada App sem refazer do zero, mantendo o foco em clareza, organização, plano, ideias práticas e direção. Não prometer dinheiro fácil.

## Direção Técnica

- Trabalhar sobre o projeto existente.
- Usar Supabase Auth e PostgreSQL como backend principal.
- Ativar RLS em todas as tabelas públicas.
- Usar `auth.uid() = user_id` nas policies.
- Manter IA restrita ao Premium.
- Criar PWA instalável.
- Preferir poucas telas e componentes simples.

## Validação

- Rodar `npm run typecheck`
- Rodar `npm run lint`
- Rodar `npm run build`
- Testar login/cadastro depois de configurar Supabase
- Testar RLS com usuários diferentes
