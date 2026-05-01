# Fluxo completo do cliente — do pagamento ao app

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. Cliente compra na plataforma (Hotmart, Eduzz, Kiwify, etc.)     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼  webhook (POST com email do comprador)
┌─────────────────────────────────────────────────────────────────────┐
│  2. /api/webhooks/[platform]                                         │
│     • valida token                                                   │
│     • adapter normaliza JSON da plataforma                           │
│     • upsert na tabela `members` do SQLite                           │
│     • status = 'ativo'                                               │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. Cliente recebe email (do checkout) com link do app               │
│     ex.: https://app.codigodavirada.com.br                           │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. Cliente abre o app no celular                                    │
│     • AuthGate.tsx pede "Entrar com Google"                          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼  ID token JWT
┌─────────────────────────────────────────────────────────────────────┐
│  5. /api/access/check                                                │
│     • valida token via Google                                        │
│     • isMember(email)?                                               │
│       • SIM → retorna { status: "ativo", email, sub }                │
│       • NÃO → retorna { status: "inativo" }                          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  6. AuthGate grava no localStorage                                   │
│     { email, sub, name, status, checkedAt }                          │
│     • status="ativo"   → libera o app                                │
│     • status="inativo" → tela "Comprou com outro e-mail?"            │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  7. Cliente usa o app — todos os dados ficam no IndexedDB DELE       │
│     • lança receitas/despesas, dívidas, metas                        │
│     • completa missões                                               │
│     • app funciona offline                                           │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼  cliente clica "Exportar minha planilha"
┌─────────────────────────────────────────────────────────────────────┐
│  8. GoogleSyncButton                                                 │
│     • OAuth scope: spreadsheets + drive.file                         │
│     • cria planilha no DRIVE DO CLIENTE                              │
│     • banner navy/dourado, KPIs, 4 gráficos, 9 abas                  │
│     • tudo travado read-only                                         │
│     • botão "Abrir no Google Planilhas" aparece                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Cenários de erro tratados

| Situação | O que acontece |
|---|---|
| Cliente comprou mas não chegou no banco ainda | Tela "Conta não encontrada" com texto "pode levar 1-2 min" |
| Cliente abre offline | Se já está ativo no localStorage → libera. Se inativo → tela "Conecte uma vez" |
| Cliente comprou com email A e tenta logar com email B | Tela "Comprou com outro e-mail?" com botão "Tentar com outra conta" |
| Cliente foi reembolsado | Webhook recebe REFUND → `status='reembolsado'` → próximo `check` retorna `inativo` → app trava |
| Cliente troca o email no localStorage manualmente | `google_sub` salvo não bate com o do token → bloqueado |

## Por que esse fluxo é prático

- **Pra você (vendedor):** zero suporte de "cadê meu código". Webhook automatiza tudo.
- **Pro cliente:** 1 clique pra entrar. Sem senha. Sem cadastro. Sem código pra digitar errado.
- **Operacional:** trabalha com 6 plataformas com o mesmo código. Adicionar uma 7ª = 1 adapter novo.
