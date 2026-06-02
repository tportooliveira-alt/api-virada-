# `providers/` — Estado global do app

| Arquivo | Função |
|---|---|
| `virada-provider.tsx` | Provider central (React Context). Carrega/salva todos os dados financeiros (lançamentos, dívidas, metas, missões) no **IndexedDB** do celular. Fonte única de verdade do estado no cliente. |

O app é **offline-first**: nada de finanças vai pro servidor. O provider lê/escreve
local; o servidor (`app/api/`) só cuida de acesso (compradores) e da planilha Google.

`app/layout.tsx` envolve a árvore inteira neste provider (dentro do `AuthGate`).
