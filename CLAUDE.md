# CLAUDE.md — Código da Virada (`api-virada-`)

> Fonte de verdade do projeto. Atualizado: **2026-09-12**.
> Apesar do nome `api-virada-`, **NÃO é uma API**: é o produto inteiro — a landing de
> vendas + o app do comprador + a entrega.
> **Este é o único repositório vivo.** `codigo-da-virada-mestre` (parou em 18/06) e
> `codigo-da-virada-` (landing antiga, maio) são acervo — não trabalhar neles.

## O produto (set/2026)

**Código da Virada** — app de controle financeiro (PWA) + e-book de 5 capítulos +
3 bônus. **R$ 47, pagamento único**, sem mensalidade. Ancorado em R$ 150.
Checkout: **Kiwify** (`pay.kiwify.com.br/QUVGK3y`). Garantia de 7 dias.
No ar em **codigodavirada.net.br**. Contato/vendas: **(77) 99939-5511**.

Histórico: já foi esteira de 4 preços (R$ 9,90/17/67/197) até maio. **Não é mais** —
qualquer doc que fale nisso está velho.

## Arquitetura real — três camadas independentes

| Camada | Onde vive | Tecnologia | Pra quê |
|---|---|---|---|
| **Dados financeiros** | aparelho do cliente | **IndexedDB** (`lib/db/`, lib `idb`) | lançamentos, dívidas, metas — offline e privados |
| **Acesso ("porteiro")** | VPS | **better-sqlite3** (`data/access.db`) | quem comprou; alimentado pelo webhook |
| **Planilha** | Google Drive do cliente | **googleapis** (`lib/sheets/`) | 9 abas com fórmulas pt-BR |

Fluxo do comprador: paga na Kiwify → webhook grava o e-mail em `access.db` → `/obrigado`
→ entra no app com a conta Google **do mesmo e-mail** (`components/AuthGate.tsx`) →
usa offline → conecta a planilha quando quiser.

Stack: Next 14 (App Router), React 18, TypeScript strict, Tailwind. Sem Supabase.

## A landing

`/` e `/vendas` são **rewrite** (`next.config.mjs`) para `public/vendas.html` — não passam
pelo App Router nem pelo AuthGate. O HTML é **gerado** por `scripts/build-vendas.mjs` a
partir do export do Claude Design em `_design/claude-design/`. Editar o gerador, não o
HTML solto — a não ser em ajuste pontual, que aí precisa voltar pro gerador depois.

⚠️ **Hoje o `vendas.html` no ar já divergiu do gerador**: o widget da consultora
(botão flutuante + simulador de dívida + FAQ) e o rodapé com telefone e e-mail foram
feitos direto no HTML e não existem no export do Claude Design. **Rodar
`node scripts/build-vendas.mjs` agora apaga os dois.** Reconciliar antes de gerar
de novo.

## Pegadinhas que já morderam (leia antes de mexer)

1. **`LAYOUT_VERSION` (`lib/sheets/builder.ts`).** Mudou qualquer coisa no layout da
   planilha? **Suba a versão.** O `upgradeLayout` (`components/GoogleSyncButton.tsx`) só
   reaplica quando ela muda — senão quem já tem planilha nunca recebe o novo. Já
   aconteceu duas vezes (04/09 e 12/09).
2. **Valor novo em célula com formato velho.** Trocar o que vai numa célula do Dashboard
   exige conferir o `numberFormat` correspondente (linhas ~411-414 do `builder.ts`).
   Em 12/09 a taxa de sobra caiu numa célula CURRENCY e 23% virou "R$ 0,23".
3. **Fórmulas em pt-BR.** A planilha é `locale: pt_BR` + `USER_ENTERED`: `SOMA` (não
   `SUM`), separador `;`. Em inglês dá `#NOME?`. Ver sem credencial:
   `npx tsx scripts/dump-formulas.ts`.
4. **O e-mail da compra é a chave do acesso.** Comprou com um e-mail e tenta entrar com
   outro = "conta não encontrada". Causa nº 1 de suporte.
5. **Os dados do cliente estão no aparelho dele.** Trocou de celular, limpou o
   navegador ou usou aba anônima: perdeu. A planilha é a cópia de segurança.
6. **Rotas `/api/admin/*` exigem cookie de sessão assinado** (`lib/access/admin-session.ts`)
   e `ADMIN_SESSION_SECRET` no ambiente. Sem o segredo, o painel admin fecha (fail-closed,
   de propósito). Nunca voltar a autenticar admin por header de texto.

7. **Escopo do Google: só `drive.file`.** É o único que o app pede
   (`components/GoogleSyncButton.tsx`) e ele basta para criar e atualizar a planilha que o
   próprio app cria. **Não voltar a pedir `spreadsheets`**: é escopo *sensível*, exige
   verificação do Google e fazia o comprador ver "app não verificado" bem na hora de
   conectar a planilha. Os escopos declarados no Google Cloud (projeto `virada-app` →
   Auth Platform → Acesso a dados) precisam bater com os do código: hoje são `openid`,
   `userinfo.email`, `userinfo.profile` e `drive.file`, todos não confidenciais.
8. **Webhook sem `<PLATAFORMA>_ALLOWED_PRODUCTS` aceita qualquer produto.** Sem a env,
   qualquer compra aprovada na mesma conta de venda vira membro ativo do app
   (`lib/access/products.ts`). Vale o id **ou** o nome do produto, separados por vírgula.

## Dois artefatos chamados "planilha" — não confundir

- **Prévia** (`app/app/planilha-demo/page.tsx`): componente React que imita a aparência do
  Google Sheets dentro do app. É visual. Quando o Thiago fala "a planilha", **não é essa**.
- **Planilha real** (`lib/sheets/builder.ts` + `google-sheets.ts` + `GoogleSyncButton.tsx`):
  cria o Google Sheets de verdade no Drive do cliente, 9 abas. **É essa que importa.**
  A sincronização é **manual** — o cliente toca em "Atualizar agora".

## Os agentes de venda/atendimento

- `agente-whatsapp/CONHECIMENTO-DO-PRODUTO.md` — **a base**: produto, app tela a tela,
  planilha, e-book capítulo a capítulo, bônus, suporte, e a lista do que **pode** e do que
  **não pode** falar. Qualquer agente lê isto primeiro.
- `agente-whatsapp/AGENTE.md` — comportamento no WhatsApp (Evolution API na VPS).
- `agente-site/AGENTE-SITE.md` — comportamento no widget da landing.

Mudou o produto? **Atualize o CONHECIMENTO junto**, ou os agentes passam a mentir.

## Validação

```bash
npm install
npm run dev            # localhost:3000 → /app/inicio
npm run test           # typecheck + lint + build (é isso que roda antes de subir)
npx tsx scripts/test-sheets-build.ts        # planilha, offline
npx tsx scripts/test-auditoria-matematica.ts
```
Não há CI: **rode `npm run test` antes de todo deploy.**
Em dev sem `.env.local`, o AuthGate mostra o botão "Entrar como Dev (localhost)".

## Deploy (produção)

VPS Hostinger `vps-paperclip` (187.77.252.91) · pm2 `codigo-da-virada` · nginx na frente.
Pasta: **`/var/www/codigo-da-virada`** (a `/opt/virada-app` é resto de maio — ignorar).

```bash
ssh vps-paperclip "cd /var/www/codigo-da-virada && git pull --ff-only origin main && npm run build && pm2 restart codigo-da-virada"
```
`.env.local` da VPS (fora do git) tem: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `KIWIFY_TOKEN`,
`KIWIFY_ALLOWED_PRODUCTS`, `ADMIN_EMAILS`, `ADMIN_SESSION_SECRET`.

Webhook cadastrado na Kiwify (Apps → Webhooks), eventos compra aprovada / reembolso /
chargeback, apontando para `/api/webhooks/kiwify?token=$KIWIFY_TOKEN`. **Sem ele o
cliente paga e não recebe acesso, sem erro visível.**

## Limpeza de 12/09 — o que saiu (não recriar)

- `netlify.toml` e `supabase/migrations/` — deploy é VPS, não há Supabase.
- `/app/renda-extra` + `ExtraIncomeIdeaCard` + `extraIncomeIdeas`: as 50 ideias saíram da
  oferta em 04/09 e a rota seguia acessível por URL. O `content/ebook.md` também parou de
  prometer esse bônus, e os PDFs foram regerados (`python scripts/build_pdfs.py`).
- `/app/missoes` + `MissaoDoDia`: sem link em tela nenhuma e alimentado por um `addPoints`
  vazio. Se a gamificação voltar, tem que religar a pontuação junto.
- `/seed-test` continua existindo para dev, mas **não renderiza em produção** — ele grava
  dados fictícios por cima dos lançamentos reais do comprador.

Ainda de pé, por decisão: `lib/ai/advisor.ts` é mock e a tela `/app/aprender/ia` avisa
que não foi lançada. `public/downloads/bonus-50-ideias.pdf` segue no repositório mas não
é entregue nem citado.

## Disciplina

`/karpathy` sempre (simplicidade, mudança cirúrgica, nada de abstração especulativa).
Design da planilha: paleta clara "Verde suave & Creme" em `lib/sheets/styles.ts` —
regra de ouro, **valor sempre em alto contraste**.
