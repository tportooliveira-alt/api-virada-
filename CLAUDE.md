# CLAUDE.md — Virada App (`api-virada-`)

> Fonte de verdade do projeto. Atualizado: 2026-09-12.
> Apesar do nome `api-virada-`, **NÃO é uma API** — é o **Virada App**: controle financeiro
> mobile-first (PWA) vendido como infoproduto (upsell R$ 97 / R$ 197 do Código da Virada).
> Ordem de trabalho acordada: **1º arquitetura + funcionalidade · 2º design.**

## Arquitetura REAL (a verdade — confirmada no código, jun/2026)

Três camadas independentes. **Não confundir.**

| Camada | Onde vive | Tecnologia | Pra quê |
|---|---|---|---|
| **Dados financeiros** | no aparelho do cliente | **IndexedDB** (base `virada`, store `state`) — `localStorage` `virada-app:v1` é só backup legado, migrado 1x | lançamentos, dívidas, metas, missões — offline, privado |
| **Acesso / "porteiro"** | servidor (VPS) | **better-sqlite3** (`data/access.db`) | lista de quem comprou (libera login via webhook) |
| **Planilha** | Google do cliente | `fetch` do navegador direto pro Google (`lib/sheets/`), escopo `drive.file` | criar + auto-sync ("planilha plugada"). O token NÃO passa pelo nosso servidor |

Fluxo: compra → webhook libera acesso (SQLite) → cliente usa offline (IndexedDB) → exporta/sincroniza planilha (Google Sheets).

## Decisões tomadas (2026-06-17)

1. **SQLite na VPS, NÃO serverless.** Resolve o conflito #2 do RELATORIO (disco efêmero apagaria o banco de compradores). Deploy = VPS Hostinger (187.77.252.91) com `data/` persistente. Mais barato/simples pra vender app barato.
2. **Supabase removido.** A migração Postgres (`supabase/`) era divergência não usada — apagada.
3. **Python isolado** em `tools/automacao-python/` (28 scripts de automação — fora do runtime).
4. **Planilha "plugada" (auto-sync).** ⚠️ **Leia a nota antes de confiar nesta linha.**
   O motor mora em `lib/sheets/sync-runner.ts` (fora do React, testável sem rede); quem o liga
   é o `AutoSync` instanciado em `providers/virada-provider.tsx`; `components/GoogleSyncButton.tsx`
   é só a interface (botão, estados, mensagens) e chama a MESMA função `sincronizar`.
   Condições reais de disparo, todas provadas em `scripts/test-auto-sync.ts`:
   - (a) **só com planilha já criada** — sem `spreadsheetId` no meta não há o que sincronizar, e
     criar planilha sozinho, sem a pessoa pedir, seria invasivo. A 1ª vez continua manual;
   - (b) **só com autorização válida** — token vencido: o automático para calado e apaga o token.
     NUNCA abre popup sem a pessoa ter tocado em nada (`DEBOUNCE_MS` = 4s de silêncio antes de
     mandar; o token do GIS vive ~1 h e **não há refresh token**, de propósito — ver o cabeçalho
     do `sync-runner`);
   - (c) **só se o dado mudou de verdade** — `assinaturaDados` vira o `baseline` gravado no meta;
     sem isso o app reenviaria tudo a cada abertura, já que o provider recarrega o IndexedDB na
     montagem (é o "baseline anti-loop");
   - (d) **só com a aba na frente** — em segundo plano guarda a vez e dispara ao voltar;
   - (e) **uma de cada vez**, e (f) erro nunca sobe pra tela: 3 tentativas (`ESPERAS_MS`
     8s/20s) e desiste em silêncio. Erro de autorização nem tenta de novo — limpa o token pro
     botão poder religar. **Quem conversa com a pessoa é o botão da tela Conta, nunca o automático.**

   > **Nota de confiança (12/09/2026).** Até esta data esta decisão #4 afirmava, desde
   > 2026-06-17, que o auto-sync estava "implementado em `components/GoogleSyncButton.tsx`,
   > cada mudança sincroniza sozinha (debounce 4s, com baseline anti-loop)". **Era falso.**
   > Não havia uma linha disso: os `useEffect` do botão só carregavam o script do Google, liam
   > o localStorage e preparavam o token client; `doSync` só era chamado por `onClick`. A
   > planilha só andava quando alguém apertava o botão — e `public/vendas.html` vendia
   > "a planilha se cria e atualiza sozinha no seu Drive". O código acima foi escrito em
   > 12/09/2026 para que a promessa passe a ser verdade. Fica o registro: **este documento já
   > mentiu sobre funcionalidade que não existia.** Antes de repetir qualquer afirmação daqui
   > numa página de vendas, abra o arquivo citado e confira. `scripts/test-textos-verdadeiros.ts`
   > existe justamente para quebrar quando texto e código divergirem de novo.
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

## Decisões tomadas (2026-09-12) — o que o app pede ao Google

13. **Escopo `drive.file`, não `spreadsheets`.** `lib/sheets/sync-runner.ts` pede
    **um único** escopo: `https://www.googleapis.com/auth/drive.file` — acesso apenas aos
    arquivos que o PRÓPRIO app criou. Antes pedia `.../auth/spreadsheets`, que é **ler e
    escrever TODAS as planilhas da conta**. Por que trocar:
    - **O app nunca precisou do escopo largo.** Todo `spreadsheetId` vem de `criarPlanilha`
      (POST `/spreadsheets`) ou do meta gravado logo depois dela; não existe em lugar nenhum
      do app um campo pra colar o link de uma planilha que já existe. Escopo largo era pedir
      o que não se usa — o oposto do mínimo necessário.
    - **É o que a pessoa lê na tela do Google.** O escopo largo aparece como "ver, editar e
      apagar todas as suas planilhas" pra alguém que acabou de pagar e está desconfiada.
    - **É o que destrava a venda.** `spreadsheets` é escopo sensível: exige verificação do
      Google. `drive.file` não entra nessa fila.
    Se um dia alguém quiser "consertar" isso de volta: o ÚNICO motivo seria deixar a pessoa
    plugar uma planilha que ela já tem. Nesse dia, mude junto a tela de consentimento no
    Google, o comentário do `SCOPES` e os textos de `public/politica-privacidade.html` e
    `public/termos-de-uso.html` — `scripts/test-textos-verdadeiros.ts` cobra os três.
    ⚠️ **Falta o dono declarar `drive.file` na tela de consentimento do Google** (ela já está
    em Produção/Externo, confirmado pelo dono em 12/09/2026, mas os escopos que o código pede
    não estão declarados lá). Sem isso o consentimento falha na hora de conectar a planilha.
    **Escopo sensível fora de todo o repositório (12/09/2026).** `lib/sheets/google-sheets.ts`
    (wrapper de service account, código morto: o único importador é
    `scripts/test-sheets-build.ts`, com a `googleapis` mockada) também passou a pedir
    `drive.file`. Por que mexer em código que não roda: um grep por `auth/spreadsheets` é
    exatamente o que um auditor — ou o próximo dev — faz, e achar o escopo largo vivo num
    arquivo do projeto convida a "consertar" o app de volta pra ele. Hoje o escopo largo só
    aparece em textos marcados como histórico e em asserções que o proíbem
    (`scripts/test-textos-verdadeiros.ts`, `scripts/test-auto-sync.ts`).
    Apagar o arquivo seria melhor ainda — código morto que duplica a lógica de sincronização é
    o próximo bug —, mas hoje `scripts/test-sheets-build.ts` é construído em cima dele; some
    junto com esse teste, não antes.

14. **Texto de produto é testado como código.** `scripts/test-textos-verdadeiros.ts` lê as
    constantes reais (`SCOPES`, `DEBOUNCE_MS`, o nome da base IndexedDB, as rotas de
    `app/api/`) e exige que a política de privacidade, os termos, este CLAUDE.md,
    `docs/RETOMAR-AQUI.md` e `scripts/README.md` digam a mesma coisa — inclusive proibindo
    frases que já foram falsas. Motivo: a divergência da decisão #4 sobreviveu quase três
    meses porque nada quebrava quando doc e código discordavam.

## ⚠️ Dois artefatos de "planilha" — NÃO confundir

- **Prévia** (`app/app/planilha-demo/page.tsx`): componente React que IMITA o Google Sheets na tela do app. É só visual/demonstração. Quando o Thiago fala "a planilha", **NÃO é essa.**
- **Planilha real** (`lib/sheets/builder.ts` monta o conteúdo + `lib/sheets/sync-requests.ts` monta as chamadas + `lib/sheets/sync-runner.ts` fala com o Google e decide quando; `components/GoogleSyncButton.tsx` é só o botão): gera o Google Sheets de verdade no Drive do cliente. **É essa** que importa para fórmulas/profissionalismo. Validação real exige credencial Google (não há `.env` aqui) — usar `scripts/test-sheets-build.ts` (offline) + `dump-formulas.ts`.
  `lib/sheets/google-sheets.ts` (service account) **não roda no app** — sobrou só pro `test-sheets-build.ts`.

## A "casa a organizar" — divergências a corrigir (arquitetura não bate)

O código é coerente, mas **textos/docs/tipos mentem** sobre ele:

- [x] ~~Política de privacidade diz "não acessamos seus outros dados Google" e "tokens validados
      em servidor"~~ → reescrita em 12/09/2026 (`public/politica-privacidade.html`): descreve
      `drive.file`, diz que o token da planilha **nunca passa pelo servidor**, e separa
      aparelho / servidor / conta Google. `public/termos-de-uso.html` idem.
- [x] ~~CLAUDE.md decisão #4 descreve auto-sync que não existe~~ → o auto-sync foi construído
      e a #4 reescrita, com nota de que o documento já mentiu.
- [ ] **`public/vendas.html` não linka esta política.** O rodapé manda para as âncoras
      `#privacidade` e `#termos` (linhas 316/319/320), dois parágrafos curtos dentro da própria
      landing que **divergem** das páginas completas. Trocar por `/politica-privacidade.html` e
      `/termos-de-uso.html` em `scripts/build-vendas.mjs` (território de marketing). Isso não é
      só estética: a verificação do Google procura o link da política de privacidade na página
      inicial, e o parágrafo da landing não menciona `drive.file` nem os escopos.
- [ ] **`docs/configurar-google-sheets.md` inteiro está obsoleto** — ensina a criar uma
      *conta de serviço* e colar `GOOGLE_SERVICE_ACCOUNT_JSON` no `.env.local` (PASSO 2 e 3).
      O app não usa nada disso: o token vem do navegador, pelo GIS, e a planilha nasce na conta
      do próprio cliente. Reescrever ou apagar.
- [x] ~~**`docs/estrategia-google-sync.md:54`** lista os dois escopos~~ → o bloco ficou, marcado
      como **HISTÓRICO (até 12/09/2026)**, com a explicação de por que o escopo largo saiu.
      Apagar um doc de estratégia esconde a decisão; datá-lo preserva o porquê.
- [ ] **`00-LEIA-AQUI/01-VISAO-GERAL.md:5,11` e `02-O-QUE-JA-FUNCIONA.md:44`** ainda descrevem
      "exportar uma planilha" com botão manual — agora ela também se atualiza sozinha (decisão #4).
- [ ] **`00-LEIA-AQUI/11-AUDITORIA-PRE-VENDA-2026-08-25.md:48` e `RELATORIO-ANALISE.md:59-65`**
      citam `netlify.toml` como conflito aberto; ele foi removido (decisão #9). Marcar como resolvido.
- [ ] **`artifacts/hotmart-launch/07-checklist-deploy.md:3`** e
      **`00-LEIA-AQUI/10-STATUS-ATUAL-01-05-2026.md:78`** repetem o mesmo bloqueio já decidido
      (VPS, decisão #1).
- [x] ~~UI diz "abas CSV locais"~~ → já não existe nenhum "CSV" no código (grep limpo em 05/09).
- [x] ~~Comentário do provider diz "deploy Netlify"~~ → corrigido; agora descreve IndexedDB + VPS.
- [x] ~~RELATORIO diz "IndexedDB" → é localStorage~~ → **era o CLAUDE.md que estava errado**.
      O código usa IndexedDB (`lib/db/virada-store.ts`) desde antes; o RELATORIO estava certo.
      Tabela de arquitetura acima corrigida.
- [x] ~~`netlify.toml`~~ → removido (ver decisão #9).
- [ ] **`lib/types.ts`**: `TransactionSource="whatsapp"` **é real** (`app/api/whatsapp/webhook/[token]`
      + `lib/agente/whatsapp.ts`). Já `SheetProvider="excel"` não tem uma linha de implementação —
      é futuro/YAGNI, decidir se remove.

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
npx tsx scripts/test-authgate.ts
npx tsx scripts/test-auto-sync.ts            # auto-sync da planilha: relógio e rede falsos
npx tsx scripts/test-bolsos.ts
npx tsx scripts/test-dividas-parcela.ts
npx tsx scripts/test-editar-lancamento.ts
npx tsx scripts/test-telas-fase3.ts
npx tsx scripts/test-calculos-telas.ts
npx tsx scripts/test-textos-verdadeiros.ts   # docs e páginas públicas x o que o código faz
```
Índice comentado de tudo que há em `scripts/`: `scripts/README.md`.
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
