# Handoff: Virada App v2 (redesign + correções de usabilidade + planilha v2 + landing)

Pacote para implementar no repositório **APP-VIRADA** (Next.js 14 · React 18 · Tailwind 3 · lucide-react · IndexedDB) com o Claude Code.

## Como usar com o Claude Code

1. Descompacte este zip na raiz do repositório APP-VIRADA (fica a pasta `design_handoff_virada_v2/`).
2. Mova a skill: `mv design_handoff_virada_v2/skill-virada-design .claude/skills/virada-design`
3. Abra o Claude Code na raiz e cole o prompt de `PROMPT-CLAUDE-CODE.md`.

## Sobre os arquivos de referência

Os HTML em `referencias/` são **protótipos de design**, não código de produção. Mostram aparência e comportamento pretendidos. A tarefa é **recriá-los no ambiente existente do app** (páginas em `app/app/*/page.tsx`, componentes em `components/`, Tailwind com tokens em `tailwind.config.ts`), reaproveitando o provider `useVirada`, `lib/utils.ts` e `lib/sheets`.

- `referencias/inicio-v2.html` — tela Início (desktop com sidebar ≥1024px; menu inferior abaixo). Filtros do gráfico funcionam.
- `referencias/lancar-relatorios-conta-v2.html` — Lançar, Relatórios (substitui "Planilha") e Conta, em três celulares lado a lado, clicáveis.
- `referencias/planilha-v2.html` — como a planilha Google exportada deve ficar (Dashboard, Lançamentos, Receitas… Como usar).
- `referencias/analise-usabilidade.html` — os 15 achados que motivaram as mudanças, com gravidade e correção.

## Fidelidade

**Alta (hi-fi).** Cores, tipografia, espaçamento e textos são finais. Reproduzir com precisão usando Tailwind — os valores exatos estão em `skill-virada-design/tokens/*.css` e no `readme.md` da skill.

## Mudanças por tela

### Início (`app/app/inicio/page.tsx`, `components/AppShell.tsx`, `Header.tsx`, `BottomNav.tsx`)
- Remover o gradiente do `body` em `globals.css`; fundo `#FFFFFF`. Remover as overrides `.virada-light` e todas as classes de tema escuro (`text-emerald-300`, `bg-white/5`, `border-white/10`, `text-slate-400` sobre claro) — substituir pelos tokens.
- Hero escuro `#0F172A`, raio 18px, padding 28px: "Olá. Em caixa neste mês" (14px `#94A3B8`) → saldo em Figtree 800 44px `clamp(32px,6vw,44px)`, `tabular-nums`, `white-space:nowrap`; pílula de status à direita (`rgba(34,197,94,.14)` / `#86EFAC`; negativo `rgba(245,197,66,.16)` / `#FDE68A`); grade `auto-fit minmax(150px,1fr)` com três cartões `rgba(255,255,255,.06)` (Entradas em `#4ADE80`, Gastos branco, Lançamentos no mês); botão "Lançar agora" `#22C55E` texto `#052E16` 52px.
- Cabeçalho: eyebrow 12px caixa alta `letter-spacing .14em` `#B45309`; h1 26px/700 `-0.02em`; chip do mês à direita ("Setembro de 2026").
- Grade `auto-fit minmax(400px,1fr)` gap 20px. Card: `#FFF`, borda `#E5E9F0`, raio 16px, padding 22px, sombra `0 1px 2px rgba(15,23,42,.04), 0 8px 24px rgba(15,23,42,.05)`.
- Análise de gastos: segmentado (trilho `#F1F5F9`, ativo branco com sombra) + chips Todos/Essencial/Impulso (ativo `#0F172A`); trio Entradas/Saídas/Saldo em `auto-fit minmax(130px,1fr)`, valores `white-space:nowrap` (nunca quebrar número); donut R=64 furo 46 branco com total no centro; legenda com valor + %; ranking com barras 6px. Remover o gráfico de barras SVG redundante.
- Últimos lançamentos: linhas com divisor `#F1F5F9`, quadrado 36px com a inicial da categoria (`#DCFCE7/#15803D` entrada, `#F1F5F9/#475569` saída), valor com sinal `+R$` / `−R$` (U+2212), desempate por data desc e depois valor desc.
- Cartão "Planilha Google" âmbar (`#FFFBEB`, borda `#E5E9F0`, ícone em `#FDE68A/#92400E`), botão "Conectar" com borda `#FCD34D`. Texto: "Base completa em abas: lançamentos, metas, dívidas, pontos e logs." (sem "CSV").
- Sidebar (≥1024px): 248px, `#F8FAFC`, borda, raio 16px; item ativo `#DCFCE7`/`#166534`; itens: Início, Lançar, Relatórios, Conta, Instalar app.
- Menu inferior (<1024px): flutuante, `bottom:10px`, max 440px, `rgba(255,255,255,.96)` + `backdrop-filter blur(10px)`, ativo `#DCFCE7`/`#166534`, rótulo 12px sempre visível.

### Lançar (`app/app/lancar/page.tsx`)
- **Valor:** trocar `<input type="number">` por `inputMode="numeric"` guardando **centavos como inteiro**; exibir `R$ 35,90` enquanto digita (só dígitos, `.replace(/\D/g,"")`). Ver `skill-virada-design/components/core/CurrencyInput.jsx`. Ajuda: "Digite só os números — a vírgula entra sozinha."
- **Quando?** segmentado Hoje / Ontem / Outra data (abre `<input type="date">`). Padrão Hoje.
- **Voz:** ligar `components/VoiceOrTextInput.tsx` (já existe) num botão secundário "Falar em vez de digitar" → estado "Ouvindo…" (`#DCFCE7` borda `#22C55E`) → preenche valor/categoria/descrição via `parseFinancialInput`. Se não houver reconhecimento no navegador, esconder o botão.
- Gasto/Entrada em segmentado; Casa/Empresa em dois chips largos; categorias em grade 4 colunas com **ícones Lucide** (mapeamento no `readme.md` da skill, seção Iconografia) — sem emoji; selecionado `#0F172A` com texto branco; altura 72px.
- Rótulos: "Forma de pagamento", "Tipo de gasto" (Essencial / Por impulso). Descrição opcional, placeholder "Onde foi? (ex.: Supermercado Extra, Uber) — opcional".
- Erros em `#FEF2F2` borda `#FECACA` texto `#B91C1C`, com instrução ("Digite o valor. Exemplo: 3590 vira R$ 35,90.").
- Após confirmar: toast escuro `#0F172A` por 7 s com **Desfazer** (remove o lançamento) e **Ver no Início** (navega). Campo Valor volta a receber foco.

### Relatórios (`app/app/evolucao/page.tsx`; renomear rota para `/app/relatorios` e atualizar `pageMeta` e `BottomNav`)
- Título "Relatórios", subtítulo "Histórico completo: lançamentos, dívidas, metas e evolução por mês."
- Faixa âmbar no topo com estado da planilha Google ("ainda não conectada · Conectar em Conta" / "atualizada há 2 h · Abrir"). **Remover** o `GoogleSyncButton` desta tela.
- Período em segmentado (Mês · 30 dias · Ano · Tudo). KPIs 2×2: Entradas (verde), Gastos, Saldo (fundo `#F0FDF4`/`#FEF2F2` conforme sinal, ajuda "O caixa está respirando." / "Gasto maior que entrada."), "Sobrou do que entrou" (%).
- Abas em chips roláveis **sempre com texto**: Resumo · Lançamentos · Entradas · Gastos · Dívidas · Metas · Dia a dia · Por mês. Sem emoji. Nenhum texto abaixo de 12px.
- Listas no lugar de tabelas em telas < 1024px (componente `ListRow`): inicial, título, meta "01 de set. · Mercado · Casa", valor com sinal. Ação por linha via botão "⋯" (36×40px) que abre folha inferior com "Desfazer lançamento" / "Excluir" / "Cancelar" (botões 44px). "Desfazer" = o atual `estornar`. Em ≥1024px a tabela pode continuar, com fonte mínima 12px e as mesmas ações.
- Aba Dívidas: contadores Abertas/Negociando/Quitadas; botão **"Cadastrar dívida"** (`#0F172A`) abrindo formulário inline (nome, valor total, parcela em centavos, prioridade em chips) → `data.addDebt`. Pílulas de status: aberta `#FEF2F2/#B91C1C`, negociando `#FFFBEB/#B45309`, quitada `#DCFCE7/#15803D`.
- Aba Metas: botão **"Criar meta"** → formulário (nome, "Quero chegar em", "Já tenho") → `data.addGoal`; cards com barra 6px e cor por progresso (≥75% verde `#15803D`, ≥35% âmbar `#B45309`, senão vermelho `#EF4444`); texto "R$ 4.500,00 de R$ 12.000,00 · faltam R$ 7.500,00".
- Dia a dia: uma linha por data com resultado e saldo acumulado (azul `#1D4ED8` positivo, `#C2410C` negativo). Por mês: linha por mês com "N lançamentos · sobrou X% do que entrou".
- As rotas `/app/dividas` e `/app/metas` podem ser removidas ou redirecionar para `/app/relatorios?aba=dividas|metas`.

### Conta (`app/app/aprender/page.tsx`; renomear rota para `/app/conta`)
- Cartão do usuário (inicial em quadrado `#0F172A`, nome, e-mail) + "Dados no seu celular · N lançamentos · N dívidas · N metas".
- **Único lugar** do Google Planilhas: cartão âmbar (`#FFFBEB`, borda `#FCD34D`). Não conectado → texto + botão verde "Conectar Google Planilhas" com o G do Google. Conectado → nome "Virada Financeira", pílula "Atualizada há 2 h", botões "Abrir planilha" (borda âmbar) e "Atualizar agora" (verde), link "Desconectar planilha". Estados de carregamento: "Criando sua planilha…" / "Atualizando…".
- Instalar no celular em cartão compacto com botão "Ver como". "Sair da conta" secundário. Zona de perigo `#FEF2F2` borda `#FECACA`.
- **Substituir `window.confirm`** por `Dialog` (folha inferior, botões 44px, confirmar vermelho `#EF4444` só em ação irreversível). Texto muda se a planilha está conectada ou não.
- Mensagens de erro para o usuário sempre humanas ("Não deu para entrar agora. Tente de novo em alguns segundos."); detalhe técnico só no `console`.

### Entrar (`components/AuthGate.tsx`) — menor prioridade
- Card no tema claro (não `bg-slate-900`), sem emoji 💰 (usar `assets/icon-192.png`), corrigir "Ainda não comprou?", erros humanos.

## Planilha Google (`lib/sheets/`)
Copiar `lib-sheets/styles.ts` e `lib-sheets/builder.ts` por cima de `lib/sheets/`. Já incluem: fonte única `FONT` ("Onest"), cabeçalho Ink com linha verde, KPIs como cartões, tabelas claras, pílulas Entrada/Saída, barras SPARKLINE nas colunas C:E e K:L do Dashboard, linhas separadoras de 12px, gráficos em largura total. O layout só se aplica em planilha nova: em Conta, desconectar e conectar de novo.

## Tokens (resumo — completos em `skill-virada-design/tokens/`)
- Ink: 900 `#0F172A` · 700 `#334155` · 600 `#475569` · 500 `#64748B` · 400 `#94A3B8` · 300 `#CBD5E1` · 200 `#E5E9F0` · 100 `#F1F5F9` · 50 `#F8FAFC`.
- Verde: 500 `#22C55E` (ação) · 400 `#4ADE80` (hover) · 700 `#15803D` (texto) · 800 `#166534` · 100 `#DCFCE7` · 50 `#F0FDF4` · 900 `#052E16` (texto sobre verde).
- Âmbar: 500 `#F5C542` · 700 `#B45309` · 800 `#92400E` · 300 `#FCD34D` · 100 `#FDE68A` · 50 `#FFFBEB`.
- Vermelho: 500 `#EF4444` · 700 `#B91C1C` · 100 `#FEE2E2` · 50 `#FEF2F2`. Azul: 700 `#1D4ED8` · 50 `#EFF6FF`.
- Tipografia: Onest (corpo) · Figtree 700/800 (números grandes e títulos). 12 / 13 / 14 / 15 / 18 / 20 / 24 / 26 / 44 px. `font-variant-numeric: tabular-nums` em valores.
- Raio: 6 · 10 · 12 · 16 · 18 · 999. Espaço: base 4px; card 22px; hero 28px; gap 20px. Alvo de toque ≥ 44px.
- Sombras: card `0 1px 2px rgba(15,23,42,.04), 0 8px 24px rgba(15,23,42,.05)`; flutuante `0 12px 32px rgba(15,23,42,.14)`.
- Gráficos: `#22C55E #F5C542 #3B82F6 #EF4444 #A855F7 #F97316 #06B6D4 #EC4899 #84CC16 #14B8A6`; entradas verde, saídas vermelho, saldo azul.

## Sugestão para `tailwind.config.ts`
Substituir `colors.virada` por: `ink: {50..900}`, `green: {...}`, `amber: {...}` com os hex acima; `fontFamily: { sans: ["Onest", ...], display: ["Figtree", "Onest", ...] }`; `boxShadow: { card: ..., float: ... }`; `borderRadius: { xl: "16px", "2xl": "18px" }`. Carregar Onest e Figtree via `next/font/google`.

## Assets
`skill-virada-design/assets/`: `icon-192.png`, `icon-512.png` (ícone do app), `logo-horizontal-dark.png` / `-light.png` (marca do e-book), `capa-ebook.png`, `mockup-3d.png`. Ícones: lucide-react (já é dependência).

## Estado e dados
Nada muda no modelo (`lib/types.ts`, IndexedDB). Novos campos de UI são locais: `quando` (hoje/ontem/outra), `cents`, `toast`, `acao` (linha selecionada), `aba`, `periodo`. O `Dialog` substitui `window.confirm` sem mudar as chamadas `removeDebt/removeGoal/resetLocalData`.

## Landing (`public/vendas.html`)
`landing/vendas.html` é arquivo único (vídeo do hero, temporizador, fontes, capas dos bônus embutidos). Termos, privacidade e reembolso já estão dentro da página. Pendências em `landing/LEIA-ME-vendas.md`.

> **Neste repositório** o `public/vendas.html` não é copiado do pacote — é gerado por `node scripts/build-vendas.mjs` a partir de `_design/claude-design/Landing Vendas v2.dc.html` (ver a nota no `LEIA-ME-vendas.md`).

## Arquivos deste pacote
- `README.md` (este) · `PROMPT-CLAUDE-CODE.md` (prompt pronto)
- `referencias/*.html` — protótipos (abrir no navegador)
- `lib-sheets/styles.ts`, `lib-sheets/builder.ts` — planilha v2, prontos para copiar
- `skill-virada-design/` — design system + `SKILL.md` (mover para `.claude/skills/virada-design/`)
- `landing/vendas.html` + `landing/LEIA-ME-vendas.md` — landing de vendas pronta para `public/vendas.html` (termos, privacidade e reembolso já estão dentro da página), com a lista do que preencher depois do cadastro na Kiwify

## PENDÊNCIA PARA O CLAUDE CODE LEMBRAR — Kiwify ainda não cadastrada
Quando a conta Kiwify existir: (1) colar a URL do checkout nos botões de compra da landing, (2) colocar o número do WhatsApp de suporte, (3) conferir que o preço cheio R$ 150 bate com o checkout, (4) trocar o `og:image` da landing por URL absoluta com o domínio final (`https://SEU-DOMINIO/assets/og-image.png`), (5) cadastrar o webhook Kiwify em `/api/webhooks/kiwify` (adapter já existe em `lib/access/adapters.ts`) e testar uma compra de R$ 1. Detalhes em `landing/LEIA-ME-vendas.md`.
