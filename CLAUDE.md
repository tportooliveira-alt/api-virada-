# CLAUDE.md — Virada App (`api-virada-`)

> Fonte de verdade do projeto. Atualizado: 2026-09-11.
> Apesar do nome `api-virada-`, **NÃO é uma API** — é o **Virada App**: controle financeiro
> mobile-first (PWA) vendido como infoproduto (upsell R$ 97 / R$ 197 do Código da Virada).
> Ordem de trabalho acordada: **1º arquitetura + funcionalidade · 2º design.**

## Arquitetura REAL (a verdade — confirmada no código, jun/2026)

Três camadas independentes. **Não confundir.**

| Camada | Onde vive | Tecnologia | Pra quê |
|---|---|---|---|
| **Dados financeiros** | no aparelho do cliente | **IndexedDB** (base `virada`, store `state`) — `localStorage` `virada-app:v1` é só backup legado, migrado 1x | lançamentos, dívidas, metas, missões — offline, privado |
| **Acesso / "porteiro"** | servidor (VPS) | **better-sqlite3** (`data/access.db`) | lista de quem comprou (libera login via webhook) |
| **Planilha** | Google do cliente | **googleapis** (`lib/sheets/`) | export + auto-sync ("planilha plugada") |

Fluxo: compra → webhook libera acesso (SQLite) → cliente usa offline (IndexedDB) → exporta/sincroniza planilha (Google Sheets).

## Decisões tomadas (2026-06-17)

1. **SQLite na VPS, NÃO serverless.** Resolve o conflito #2 do RELATORIO (disco efêmero apagaria o banco de compradores). Deploy = VPS Hostinger (187.77.252.91) com `data/` persistente. Mais barato/simples pra vender app barato.
2. **Supabase removido.** A migração Postgres (`supabase/`) era divergência não usada — apagada.
3. **Python isolado** em `tools/automacao-python/` (28 scripts de automação — fora do runtime).
4. **Planilha "plugada" (auto-sync)** implementada em `components/GoogleSyncButton.tsx`: depois de criar a planilha + logar 1x, cada mudança sincroniza sozinha (debounce 4s, com baseline anti-loop). A 1ª vez continua manual.
5. **Removidos:** 2 testes mortos (`scripts/test_finance.js`, `test_performance.js`) e `content/ebook.backup.md` (duplicado).
6. **Planilha "viva" (fórmulas dentro do Google Sheets) — FEITA em 2026-09-11 (layout `2026-09-11.3`).**
   O que é FÓRMULA (recalcula na planilha) e o que é VALOR (colado pelo sync) — lista viva no
   cabeçalho de `lib/sheets/builder.ts`, conferível com `npx tsx scripts/dump-formulas.ts` e
   provada offline por `scripts/test-planilha-formulas.ts` (mini-avaliador
   `scripts/planilha-avaliador.ts`: SOMASES/CONT.SES/SE/MÁXIMO/ARRED… em pt-BR rodando sobre os
   valueRanges gerados; bate com `getDashboardMetrics`/`getPockets` ao centavo, estornado no meio):
   - Dashboard `A6/D6/G6/J6` (mês de referência em `B3`) e `A8/D8/G8/J8`: `SOMASES`/`CONT.SES`/
     `CONT.SE` sobre a aba Lançamentos, sempre com `Estornado = "Não"`; `B12:B21` (gasto por
     categoria): `SOMASES`; `C12:C21`/`K12:K21`: `SPARKLINE`. `G12:J21` (comparativo dos 10 últimos
     meses do calendário): VALOR (o mês ali é data pro gráfico).
   - Filtros `B10:B14` (Entradas/Gastos/Saldo/Nº/Por impulso, menus com "Todos" → `*`) e Bolsos
     `B6`, `C9:F11` (alvo/gasto/sobra/situação): fórmulas; menus, listas `H:L`, renda e fase: VALOR.
   - Dívidas "Em aberto" (`SE(quitada;0;MÁXIMO(0;Total−Pago))`), Metas "Faltando"/"Progresso"
     (protegido contra alvo 0), Fluxo e Resumo "Resultado"/"Saldo acumulado": fórmula por linha.
     Resumo Entradas/Saídas/Economia/Lançamentos e painéis laterais `O4:O7`: VALOR.
   - Colunas de critério de Lançamentos (`Mês` J, `Estornado` K, `Bolso` L) sempre com valor
     ("—" quando não se aplica): `*` não casa célula vazia.
   **Chave de mês (decisão do juiz, rodada 1):** `"2026-09"` — mesmo gravado com apóstrofo — tem
   cara de data, e o `SOMASES` real pode coagir o critério pra data e zerar KPIs, Filtros e Bolsos.
   Sem credencial ninguém viu renderizar, então a chave é `mesChave()` = `"2026-09 (set)"`
   (AAAA-MM + nome do mês entre parênteses): nenhum parser de data engole, ordena
   cronologicamente, e é a MESMA função em Lançamentos!J, Dashboard!B3, lista Filtros!H e
   Bolsos!B6. **Continua pendente validar UMA vez com credencial Google antes de vender** —
   começa por B3/A6 e pela `SPARKLINE`.
   Regra que continua valendo: sintaxe **pt-BR** (`SOMA` não `SUM`, `;` separador, `\` em matriz,
   nenhum decimal com ponto) porque a planilha é `locale: pt_BR` + `USER_ENTERED`.
   **Grade:** cada aba de dados nasce com `GRADE_INICIAL` (1.010) linhas, toda formatada. Acima
   disso o sync cresce por `appendDimension` (`growGridCall` → `growDataSheetRequests`) levando
   junto altura, bordas, R$/data, zebra (`updateBanding`), filtro básico e a faixa livre de
   Anotações (`updateProtectedRange`) — o GET usa `SPREADSHEET_FIELDS` pra ter os ids; regras de
   cor das abas de dados não têm fim de linha. O upgrade de layout usa o rowCount real, então não
   encolhe uma grade crescida. Upgrade de planilha anterior ao v3 (versão gravada ≤ `2026-09-11.1`
   ou ausente) limpa o painel antigo em `J1:M20` das 6 abas Receitas…Resumo (em Lançamentos J:L
   virou dado). Sobrou: os gráficos de Fluxo/Dívidas do Dashboard leem até a linha 1.001; o Resumo
   Mensal continua limitado por construção (`fillMonthGaps`).

## Decisões tomadas (2026-09-05)

7. **Service worker (`public/sw.js`) — offline de verdade.** Os dados já ficavam no aparelho,
   mas a casca (HTML/JS/CSS) vinha do servidor toda vez: sem internet o app nem abria, o que
   contradizia o pilar "offline-first" do `00-LEIA-AQUI`. Estratégias: `/api/*` sempre rede
   (login, `/api/version`, webhooks — o UpdateBanner continua funcionando); `/_next/static/*`
   cache-first (nome já tem hash); navegação rede-primeiro com cache de segurança; resto
   stale-while-revalidate. Registrado por `components/ServiceWorkerRegister.tsx`, **só em
   produção** — em dev ele se desregistra sozinho pra não servir chunk velho no hot reload.
   Subir `SW_VERSION` ao mudar as regras.
8. **`/seed-test` grava no IndexedDB.** A página escrevia só no `localStorage` e o app nunca
   via nada: a migração legada roda **uma vez**, e qualquer navegador de teste já a tinha
   gastado na primeira abertura. Agora chama `saveData()` direto (o `localStorage` segue
   sendo escrito como backup) e os links de saída são `<a>` — navegação client-side não
   remonta o provider, que sobrescreveria o seed com o estado vazio.
9. **Alvo de deploy: VPS.** `netlify.toml` removido — além de contradizer a decisão #1, estava
   quebrado (`publish = ".next"` com `/*` → `404.html` derruba as rotas do App Router).
   `DEPLOY_URL.txt` agora distingue **produção** (VPS, com `data/` persistente pro SQLite)
   de **preview** (Vercel, só pra abrir no celular — lá o SQLite de compradores NÃO funciona,
   disco efêmero; é o conflito #2 do RELATORIO).

## Decisões tomadas (2026-09-11) — contratos de cálculo

10. **Estorno = marca no original, não contra-lançamento.** `Expense`/`Income` ganharam
    `estornadoEm?: string` (AAAA-MM-DD). `estornar()` do provider (`applyEstorno`, função pura)
    só preenche esse campo; o lançamento continua no histórico e **sai de todo total**
    (entradas, gastos, saldo, por categoria, por impulso, fluxo, resumo mensal). Quem agrega
    usa `semEstornados(lista)` / `isEstornado(tx)` de `lib/types.ts` antes de somar. Motivo: o
    contra-lançamento em receita inflava "Entradas" e punha categoria de despesa ("Lazer") em
    receita. Testes: `scripts/test-estorno.ts`, `scripts/test-estorno-totais.ts`.
11. **Dívida "em aberto" = `aberta` OU `negociando`.** Helper `isOpenDebt(debt)` em
    `lib/types.ts`. App usava `!== "quitada"` e a prévia `=== "aberta"` (R$ em "negociando"
    sumiam numa tela). Todos usam o helper.
12. **Teste de mês corrente usa mês LOCAL** (`toInputDate().slice(0, 7)`), nunca
    `toISOString()` (UTC): entre 21h e 0h do último dia do mês em UTC-3 o teste inventava
    lançamentos do mês seguinte.

## ⚠️ Dois artefatos de "planilha" — NÃO confundir

- **Prévia** (`app/app/planilha-demo/page.tsx`): componente React que IMITA o Google Sheets na tela do app. É só visual/demonstração. Quando o Thiago fala "a planilha", **NÃO é essa.**
- **Planilha real** (`lib/sheets/builder.ts` + `google-sheets.ts` + `GoogleSyncButton.tsx`): gera o Google Sheets de verdade no Drive do cliente. **É essa** que importa para fórmulas/profissionalismo. Validação real exige credencial Google (não há `.env` aqui) — usar `scripts/test-sheets-build.ts` (offline) + `dump-formulas.ts`.

## A "casa a organizar" — divergências a corrigir (arquitetura não bate)

O código é coerente (localStorage), mas **textos/docs/tipos mentem** sobre ele:

- [x] ~~UI diz "abas CSV locais"~~ → já não existe nenhum "CSV" no código (grep limpo em 05/09).
- [x] ~~Comentário do provider diz "deploy Netlify"~~ → corrigido; agora descreve IndexedDB + VPS.
- [x] ~~RELATORIO diz "IndexedDB" → é localStorage~~ → **era o CLAUDE.md que estava errado**.
      O código usa IndexedDB (`lib/db/virada-store.ts`) desde antes; o RELATORIO estava certo.
      Tabela de arquitetura acima corrigida.
- [x] ~~`netlify.toml`~~ → removido (ver decisão #9).
- [ ] **`lib/types.ts`**: `TransactionSource="whatsapp"` **é real** (`app/api/whatsapp/webhook/[token]`
      + `lib/agente/whatsapp.ts`). Já `SheetProvider="excel"` não tem uma linha de implementação —
      é futuro/YAGNI, decidir se remove.
- [ ] Warning de lint (`exhaustive-deps`) em `AuthGate.tsx:240` — único que sobrou.

## Validação (como rodar)

```bash
npm install
npm run dev            # localhost:3000 → abre /app/inicio
npm run typecheck      # tsc --noEmit (passou: 0 erros)
npm run lint
# testes TS reais (scripts/test-*.ts, assert próprio, sem framework):
npx tsx scripts/test-sheets-build.ts
npx tsx scripts/test-planilha-formulas.ts   # planilha viva: fórmulas pt-BR avaliadas offline
npx tsx scripts/test-sheets-stress.ts       # limite de linhas e crescimento da grade
npx tsx scripts/test-planilha-bordas.ts
npx tsx scripts/test-planilha-vs-app.ts
npx tsx scripts/test-app-completo.ts
npx tsx scripts/test-estorno.ts
npx tsx scripts/test-estorno-totais.ts
npx tsx scripts/test-deletions.ts
npx tsx scripts/test-admin-session.ts
npx tsx scripts/test-webhooks.ts
```
**Login em dev:** sem `.env.local`, em `localhost` aparece o botão "⚙ Entrar como Dev (localhost)" (bypass — `AuthGate.tsx`).

## Design — Direção "Editorial Financeiro" (PLANEJADA — **não está no código**)

- **Lição:** tirar a "cara de IA" NÃO é trocar cor (find-replace ficou estranho). É **craft** — a skill `open_design/frontend-design` manda **herdar o design system existente**.
- **Decisão:** o app HERDA a craft da **landing** (que já é boa), em vez de inverter pra claro. Unifica a identidade.
- **Tokens (`tailwind.config.ts`):** dark premium `#0a0a0c` · verde-emerald `#34d399` · dourado `#f0a830` (cores reais da landing).
- **Tipografia:** **Instrument Serif** (títulos h1/h2/h3, via `next/font` no `layout.tsx` + `globals.css`) + **Barlow** (corpo). Mesma da landing.
- **Por que dark (não a paleta C clara):** o app tem 149 `text-white` hardcoded; inverter pra claro quebra tudo. Dark premium + serif resolve a cara de IA sem quebrar. (Paleta C clara arquivada — só com refactor dos 149 textos.)
- ⚠️ **Estado real (verificado em 2026-09-05):** nada disso está no código deste branch.
  `tailwind.config.ts`, `app/layout.tsx` e `globals.css` não têm `Instrument Serif`, `#0a0a0c`,
  `#34d399` nem `#f0a830`. As fontes reais são **Onest + Figtree** (`next/font/google`) e o app
  renderiza **claro** (cards brancos, navy só no hero). Ou a mudança nunca foi commitada, ou
  ficou noutro branch.
- Ou seja: isto aqui é a direção **desejada**, não a aplicada. Decidir se vale executar.

## 🎨 Paleta C — "Verde suave & Creme" (planilha · NÃO PERDER)

Paleta oficial escolhida pra a **planilha** (clara, "dinheiro clássico e calmo", DESTACA valores — nada de cor escondida). Aplicada em `lib/sheets/styles.ts`:
- **Creme:** `#F6F1E5` fundo · `#FFFFFF` card de KPI (valor salta) · `#EFE8D6` zebra/painel · `#DED5BF` bordas
- **Verde:** `#5F9E6E` acento/positivo · `#2E5339` escuro (banner/headers) · `#DDEBE1` chip
- **Texto/valores:** `#1E2A20` verde-grafite (alto contraste) · `#6A6E63` secundário
- **Vermelho terroso:** `#B0473A` (negativo calmo) · **Bronze:** `#B98B2E` (acento mínimo)
- Regra de ouro: valor sempre em alto contraste (escuro/verde/vermelho sobre creme claro).

## Skills do arsenal a usar aqui
- **Arquitetura/método:** `/superpowers` (brainstorming → writing-plans → TDD → verification).
- **Design (fase 2):** `/open-design` → `frontend-design` (anti-AI-slop) + a paleta C.
- **Disciplina sempre:** `/karpathy` (simplicidade, mudança cirúrgica).
