# Histórico das mudanças desta sessão

## Sessão de redesign — abril/maio 2026

### Planilha profissional (substituiu a antiga genérica)

- **Antes:** dashboard com `SUMIF` solto, sem gráficos, sem formato BRL, 15 abas confusas.
- **Agora:** banner navy/dourado, 4 KPI cards, 4 gráficos (pizza/coluna/linha/barra), 9 abas enxutas, formatação condicional, banding, freeze, formatos BRL/data/percent, travamento read-only, aba "Como usar".
- **Builder isomórfico** (`lib/sheets/builder.ts`) compartilhado entre cliente (`GoogleSyncButton.tsx`) e servidor (`google-sheets.ts`).
- **Estilos extraídos** para `lib/sheets/styles.ts` com paleta espelhando o Tailwind.
- **69 asserts** de teste estrutural offline.

### Substituição do sistema de ativação

- **Antes:** código de ativação manual gerado em CSV, telas de cadastro/login com email+senha, admin de códigos.
- **Agora:** login Google único + lista de compradores em SQLite + webhooks por plataforma.
- **Removidos:** `components/ActivationGate.tsx`, `lib/activation-codes.ts`, `app/cadastro/`, `app/login/`, `app/admin/`, `app/api/auth/login`, `auth/me`, `auth/logout`, `auth/register`, `app/api/finance`, `app/api/sheets/sync`, `app/api/sheets/export`, `lib/sheets/local-store.ts`, `codigos-ativacao-lote1.csv`, `cadastro-hotmart-passo-a-passo.md`.

### Múltiplas plataformas (escala)

- **Antes:** 1 webhook só de Hotmart, JSON em arquivo.
- **Agora:** endpoint genérico `/api/webhooks/[platform]` + 6 adapters (Hotmart, Eduzz, Kiwify, Monetizze, Cakto, Perfectpay) + SQLite com tabelas `members` e `webhook_log`.
- **Classifier** entende eventos em PT e EN ("PURCHASE_APPROVED", "PAID", "Compra Finalizada", "Reembolsada", etc.).
- **Token por plataforma** validado via `?token=` ou header.
- **25 asserts** cobrindo as 6 plataformas + ciclo refund + normalização de email.

### Auth Google completo

- `AuthGate.tsx` reescrito: login único, validação no servidor, offline-first, telas dedicadas (login / não membro / sem internet).
- `/api/access/check` valida ID token via Google e devolve status checando o SQLite.
- `google_sub` (ID imutável) salvo junto pra anti-fraude.

## Resultado

| Verificação | Antes | Agora |
|---|---|---|
| typecheck | ✅ | ✅ |
| lint | ✅ | ✅ |
| build | ✅ 31 rotas | ✅ 17 rotas (mais enxuto) |
| testes automatizados | 0 | 94 asserts (69 + 25) |
| sistema de ativação | manual / CSV | automático / SQLite |
| plataformas suportadas | 1 (Hotmart) | 6 |
| login | email + senha | Google 1 clique |
| planilha | 15 abas planas | 9 abas premium + gráficos |
