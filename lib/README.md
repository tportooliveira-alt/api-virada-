# `lib/` — Lógica de negócio (sem UI)

Funções puras e camada de dados. Importadas pelas rotas (`app/`) e componentes.

## `lib/access/` — acesso e compradores
| Arquivo | Função |
|---|---|
| `db.ts` | Abre o SQLite (`data/access.db`, modo WAL), cria tabelas `members` e `webhook_log` no boot. ⚠️ SQLite = disco persistente (ver RELATORIO #2) |
| `members.ts` | API do banco: `isMember`, `getMember`, `upsertMember`, `setStatus`, `listMembers`, `logWebhook`. Normaliza email (lowercase+trim) |
| `adapters.ts` | 1 adapter por plataforma — normaliza o JSON de cada uma pro formato único `{ email, name, product, transaction_id, platform, status }` + `expectedToken`, `isPlatform`, `parseWebhook` |

## `lib/sheets/` — planilha premium do Google
| Arquivo | Função |
|---|---|
| `styles.ts` | Paleta navy/dourado/verde + helpers de formato/proteção |
| `builder.ts` | Builder **isomórfico** — gera requests/values puros (usado no cliente e no servidor) |
| `google-sheets.ts` | Wrapper de servidor (service account opcional) |

## Raiz de `lib/`
| Arquivo | Função |
|---|---|
| `types.ts` | Tipos compartilhados (`Expense`, `Income`, `Debt`, `Goal`, etc.) |
| `constants.ts` | Categorias, missões, constantes do app |
| `parse-financial-input.ts` | Interpreta lançamento em linguagem natural (texto/voz) |
| `ai/advisor.ts` | Lógica do consultor financeiro IA |
| `utils.ts` | Utilitários gerais |

> A maioria dos testes em `scripts/test-*.ts` exercita exatamente estes módulos.
