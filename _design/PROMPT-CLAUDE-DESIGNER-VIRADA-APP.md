# PROMPT — Claude Designer · Virada App V2 (Dark Premium Wallet)

> **Como usar este prompt:**
> 1. Cole TODO o conteúdo deste arquivo (a partir do "## 1. Identidade…" até o final) no claude.ai → New Artifact.
> 2. Anexe os 5 PNGs HD de referência baixados em `_archive/behance-ref/ref-1.png` até `ref-5.png` na MESMA mensagem (drag-and-drop).
> 3. Peça: *"Gere os componentes React JSX e o tailwind.config.ts conforme as 15 seções abaixo. Use Tailwind CSS, sem CSS-in-JS, sem novas dependências."*
> 4. Quando vier o output, cole cada arquivo no lugar correto do projeto (caminhos em §8).

---

> ⚠️ **APP MÓVEL EXCLUSIVO** ⚠️
> Este é um **APLICATIVO MOBILE** (PWA instalável no celular), NÃO um website responsivo.
> Design EXCLUSIVAMENTE para tela de celular 360–414px de largura, como um app nativo iOS/Android.
> Nada de layout desktop, sidebar lateral, grids de 3+ colunas, hover-only states ou interações de mouse.
> Quando rodar em desktop, deve aparecer como um "shell de celular" centralizado (max-width 430px) com bg escuro nas laterais.
> Pense em: Nubank, C6, PicPay, Wallet (iOS), Revolut, Cash App — apps MOBILE, não dashboards web.

## 1. Identidade e contexto do produto

**Produto:** Virada App — **aplicativo móvel** de controle financeiro para o brasileiro real (CLT em aperto, R$ 1.500–7.000/mês, idade 25–55). Roda como PWA instalado no celular (Android/iOS).
**Stack travada (NÃO TROCAR):** Next.js 14 App Router, TypeScript, Tailwind CSS, sem CSS-in-JS, sem novas libs visuais. Apenas Tailwind + componentes React puros + SVG inline para ícones.
**Tom da marca:** premium, calmo, sem moralismo financeiro, alta densidade de dados, hierarquia visual rigorosa.
**Plataforma alvo:** **MOBILE ONLY** — viewport principal 390×844 (iPhone 14 Pro), suporte real 360–430px. Desktop apresenta APENAS o frame mobile centralizado (max-width 430px) com background `#000` nas laterais. NÃO existe versão desktop expandida.
**Modo:** dark exclusivo (sem light mode toggle — decisão de produto).
**Orientação:** retrato apenas. Não suportar landscape.
**Interação:** touch-first — sem hover-only states. Tudo precisa ter equivalente tap. Tap-target mínimo 44×44px.

---

## 2. Referência visual

Anexe os 5 PNGs HD na mensagem (cada um tem várias telas empilhadas):

- `ref-1.png` — capa do projeto + mockup hero
- `ref-2.png` — fluxo de design, user personas, branding
- `ref-3.png` — design system (tipografia "SF Pro Display", paleta, icon set, color blocks roxo/verde)
- `ref-4.png` — **TELAS DO APP** (hero card preto, listagem, detail, sheets) — fonte principal
- `ref-5.png` — mockup final do dispositivo com Hero Card visível

**Referência canônica:** [Crypto Wallet Mobile App UI/UX — Behance 248943755](https://www.behance.net/gallery/248943755/Crypto-Wallet-Mobile-App-UI-UX) (Dorrry Studio / Arafat Mahfuz).

**O que aproveitar:** estrutura de hero card escuro com gradient, 4 quick-actions circulares, sistema de cards-em-camadas dark, sparkline charts com gradient, bottom nav minimalista, tipografia condensada premium.
**O que NÃO aproveitar:** terminologia crypto (Buy/Send/Swap/Wallet/Bridge/Ethereum). Substituir por terminologia financeira BR (Lançar/Entrada/Gasto/Meta/Saldo/Dívida).

---

## 3. Filosofia de design

| Princípio | Aplicação concreta |
|---|---|
| **Dark premium, não dark-deprimente** | Background `#0A0A0F` (preto-violeta sutil), cards `#13131A`, gradient roxo apenas no Hero. Nunca cinza-acinzentado. |
| **Hierarquia por escala, não por cor** | Saldo grande = 48-56px. Label pequena = 11-12px UPPERCASE 0.08em. Cor é acento, escala é estrutura. |
| **Densidade calma** | Padding generoso (20-24px nos cards), radius 20-28px, gap 12-16px entre cards. Nunca grudar elementos. |
| **Roxo como vértice, não como tapete** | Roxo `#7C3AED` aparece em: Hero gradient, FAB primário, action ativa do bottom nav, badge "Mais escolhido". NUNCA em background grande de página. |
| **Verde só para sinal positivo** | Verde lime `#10D778` reservado para: variação positiva, meta atingida, lucro mensal. Nunca decorativo. |
| **Vermelho só para alerta** | Vermelho `#EF4444` reservado para: dívida em atraso, saldo negativo. Nunca botão "cancelar". |
| **Tabular nums obrigatório em valores** | `font-variant-numeric: tabular-nums` em todo R$ e %. Configurar via Tailwind. |

---

## 4. Paleta exata (Tailwind tokens)

Adicionar em `tailwind.config.ts → theme.extend.colors.virada`:

```ts
virada: {
  bg:         '#0A0A0F',  // page background
  surface:    '#13131A',  // card background
  surfaceAlt: '#1A1A24',  // elevated card / hover
  line:       '#26262F',  // divider / border subtle
  lineSoft:   '#1F1F28',  // even subtler

  ink:        '#FFFFFF',  // text-primary
  inkMuted:   '#A8A8B3',  // text-secondary
  inkDim:     '#6B6B75',  // text-tertiary / placeholder

  primary:    '#7C3AED',  // violet-600 — FABs, CTA, action ativa
  primaryHi:  '#8B5CF6',  // violet-500 — hover state
  primaryLow: '#5B21B6',  // violet-800 — pressed
  primaryGlow:'#7C3AED33',// 20% alpha — sombra glow do FAB

  heroFrom:   '#3B1D7A',  // gradient hero start (top-left)
  heroVia:    '#2A1450',  // gradient hero middle
  heroTo:     '#16091F',  // gradient hero end (bottom-right)

  success:    '#10D778',  // green positive
  successDim: '#10D77822',// chip bg
  danger:     '#EF4444',  // red alert
  dangerDim:  '#EF444422',// chip bg
  warn:       '#F59E0B',  // amber — "negociando"
  warnDim:    '#F59E0B22',
},
```

**Uso por componente:** ver §9–§13.

---

## 5. Tipografia

- **Família:** Inter (já em uso) + `Inter Tight` opcional para números grandes. **Não usar** SF Pro Display (Apple-only).
- **Carregamento:** `next/font/google` com `Inter` e subset latin.
- **Pesos:** 400 (corpo), 500 (label/meta), 600 (título de card), 700 (saldo grande, headers).
- **Letter-spacing:**
  - Saldo grande (48-56px): `-0.04em` (tracking-tight)
  - Título tela (24-28px): `-0.02em`
  - Label uppercase (11-12px): `0.08em`
- **Tabular-nums:** sempre em R$, % e datas.
- **Escala (Tailwind):**

```ts
fontSize: {
  'kpi-xl':    ['56px',  { lineHeight: '60px', letterSpacing: '-0.04em', fontWeight: '700' }],
  'kpi':       ['32px',  { lineHeight: '36px', letterSpacing: '-0.03em', fontWeight: '700' }],
  'title':     ['22px',  { lineHeight: '28px', letterSpacing: '-0.02em', fontWeight: '700' }],
  'card-title':['16px',  { lineHeight: '22px', fontWeight: '600' }],
  'body':      ['14px',  { lineHeight: '20px', fontWeight: '400' }],
  'meta':      ['12px',  { lineHeight: '16px', fontWeight: '500' }],
  'label':     ['11px',  { lineHeight: '14px', letterSpacing: '0.08em', fontWeight: '600', textTransform: 'uppercase' }],
},
```

---

## 6. Sistema de cards (radius, sombras, gradients)

```ts
borderRadius: {
  '2xl': '20px',  // cards padrão
  '3xl': '28px',  // hero card
  'pill':'999px',
},
boxShadow: {
  'card':      '0 1px 0 0 #1F1F28 inset, 0 12px 32px rgba(0,0,0,0.25)',
  'card-hover':'0 1px 0 0 #26262F inset, 0 16px 48px rgba(124,58,237,0.12)',
  'glow':      '0 0 0 6px #7C3AED1F, 0 12px 24px #7C3AED33',
},
backgroundImage: {
  'hero': 'radial-gradient(120% 100% at 0% 0%, #3B1D7A 0%, #2A1450 45%, #16091F 100%)',
  'spark-up':   'linear-gradient(180deg, #10D77855 0%, transparent 100%)',
  'spark-down': 'linear-gradient(180deg, #EF444455 0%, transparent 100%)',
},
```

---

## 7. Componentes-chave a redesenhar (entregar como JSX)

Entregue um JSX por componente, em código completo (não pseudo-código). Imports apenas de React e Tailwind classes.

1. **`AppShell.tsx`** — wrapper de página com bg `#0A0A0F`, padding-top safe-area, padding-bottom 96px (espaço pra bottom nav).
2. **`Header.tsx`** — header sticky com avatar circular + título página + ícone bell (badge red se notificação).
3. **`BottomNav.tsx`** — 5 ícones (Início, Lançar [FAB central], Gastos, Metas, Conta). Ativo = pill roxo com glow. Inativo = ícone outline `#A8A8B3`. FAB central elevado, 56×56, roxo, ícone "+" branco.
4. **`HeroBalanceCard.tsx`** — gradient hero, label "SALDO ATUAL", valor 56px branco, delta do mês em verde/vermelho com chip, 4 quick-actions circulares abaixo (Lançar/Entrada/Gasto/Meta).
5. **`QuickAction.tsx`** — circular 48×48 com bg `#1A1A24`, ícone branco, label 11px abaixo.
6. **`DashboardCard.tsx`** — card surface `#13131A`, radius 20, padding 20. Variantes: `default`, `accent` (borda roxa sutil), `success`, `danger`.
7. **`TransactionRow.tsx`** — substitui `TransactionList.tsx` linha. Avatar 44×44 radius 14 com ícone categórico + título + meta abaixo + valor à direita (verde/vermelho conforme tipo).
8. **`CategoryBadge.tsx`** — pill 11px uppercase, bg `surfaceAlt`, text `inkMuted`. Variantes por categoria.
9. **`Sparkline.tsx`** — SVG inline line chart 80×32 com gradient `spark-up`/`spark-down`. Sem libs.
10. **`DonutChart.tsx`** — SVG inline donut com gap entre slices, label central com total. Sem libs.
11. **`ProgressBar.tsx`** (refazer) — track `surfaceAlt`, fill `primary` com gradient horizontal, height 6, radius pill.
12. **`DebtCard.tsx`** (refazer) — card com nome dívida + chip prioridade (warn/danger/success) + valor + barra de progresso de quitação.
13. **`GoalCard.tsx`** (refazer) — card com nome meta + valor atual/alvo + barra de progresso + chip "Faltam R$X".
14. **`MissionCard.tsx`** (refazer) — card com ícone missão + título + descrição + CTA "Marcar feita" pill roxo.
15. **`FAB.tsx`** — botão flutuante 64×64 roxo com glow, ícone "+" branco grande, position fixed bottom-right (ou central no nav).
16. **`Sheet.tsx`** — bottom sheet com handle bar + título + content slot, bg `surface`, radius-top 28.
17. **`Input.tsx`, `Select.tsx`, `Button.tsx`** — sistema básico de form. Inputs: bg `surfaceAlt`, border 1px `line` no focus → `primary`, radius 14, padding 14×16, text white.

---

## 8. Páginas a redesenhar (caminho relativo a `02-virada-app/`)

Entregue um JSX por página. Use os componentes da §7.

| Página | Caminho | Conteúdo principal |
|---|---|---|
| **Início (Dashboard)** | `app/app/inicio/page.tsx` | Header → HeroBalanceCard → 2 DashboardCards lado-a-lado (Entradas/Gastos mês) → MissaoDoDia → ExpenseChart (donut) → "Últimos lançamentos" (lista TransactionRow) → 6 QuickLaunchCards |
| **Lançar** | `app/app/lancar/page.tsx` | Header → Toggle "Entrada/Gasto" (segmented) → Input valor grande → Input descrição → Select categoria → Date picker → Button "Salvar" primary full-width |
| **Gastos** | `app/app/gastos/page.tsx` | Header → Toggle "Mês atual/Tudo" → Total chip → Lista TransactionRow agrupada por dia |
| **Entradas** | `app/app/entradas/page.tsx` | Idem Gastos mas com tipo "income" |
| **Dívidas** | `app/app/dividas/page.tsx` | Header → KPI cards (Total devido / Quitadas / Em atraso) → Lista DebtCard ordenada por prioridade |
| **Metas** | `app/app/metas/page.tsx` | Header → KPI (Atingidas / Em progresso) → Grid GoalCards 2 colunas |
| **Missões** | `app/app/missoes/page.tsx` | Header → ProgressBar do mês → Lista MissionCard com chips status |
| **Evolução (planilha)** | `app/app/evolucao/page.tsx` | Header → KPI cards (Saldo / Entradas / Gastos / Lançamentos) → DonutChart top categorias → Tabela resumo mensal → GoogleSyncButton |
| **Renda Extra** | `app/app/renda-extra/page.tsx` | Header → Search → Grid ExtraIncomeIdeaCard 1 coluna |
| **Aprendizado** | `app/app/aprendizado/page.tsx` | Header → AudioTipCard → Lista de tópicos com chevron-right |
| **Conta** | `app/app/conta/page.tsx` | Header → Avatar grande + nome → Settings list (Notificações / Privacidade / Sobre / Sair) cada uma como TransactionRow-like |
| **Instalar** | `app/app/instalar/page.tsx` | Header → InstallGuide com steps numerados |

---

## 9. Hero Balance Card — anatomia exata (REF-4 e REF-5)

```
┌─────────────────────────────────────┐
│  ░░░ gradient roxo radial ░░░       │  ← bg-hero, radius 28
│                                     │
│  SALDO ATUAL                        │  ← text-label, text-white/70
│                                     │
│  R$ 18.198,25                       │  ← text-kpi-xl (56px), text-white
│                                     │     tabular-nums, tracking-tight
│  ↗ +R$ 312 este mês (+2,4%)         │  ← chip green: text-success
│                                     │     bg-successDim, radius pill
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐        │  ← 4 QuickActions, gap 14
│  │ + │ │ ↓ │ │ ↑ │ │ ⊙ │            │     cada 48×48, bg #1A1A24
│  └────┘ └────┘ └────┘ └────┘        │     icon white, label 11px abaixo
│  Lançar  Entrada Gasto  Meta        │
└─────────────────────────────────────┘
   padding: 24px            min-height: 220px
```

**Decisões:**
- Gradient via `bg-hero` (radial 120% 100% at 0% 0% — luminoso top-left, escuro bottom-right)
- Saldo central-left, NUNCA centralizado
- Chip de delta: usa `bg-successDim` (verde 13% alpha) com text `success`. Se negativo: `bg-dangerDim` text `danger`
- QuickActions: bg `surfaceAlt`, NÃO usa cor primary. Roxo só no FAB central do BottomNav.

---

## 10. Action buttons — anatomia

**QuickAction (no Hero):**
- 48×48, radius 14, bg `#1A1A24`, ícone SVG 20px stroke 2 branco
- Active state: bg `#26262F`
- Label 11px text-inkMuted abaixo do círculo, gap 8

**FAB central (BottomNav):**
- 56×56, radius full, bg `primary` (`#7C3AED`)
- Ícone "+" 28px stroke 2.5 branco
- Box-shadow: `0 0 0 6px #7C3AED1F, 0 12px 24px #7C3AED33` (glow + drop)
- Posição: translateY(-12px) em relação ao nav

**Button primary:**
- height 52, padding-x 24, radius 16, bg `primary`, text white, font-weight 600, text-base
- Active: bg `primaryLow`
- Hover (desktop): bg `primaryHi`

**Button secondary:**
- bg transparent, border 1px `line`, text white. Active: bg `surfaceAlt`.

---

## 11. TransactionRow — anatomia (REF-4)

```
┌──────────────────────────────────────────────┐
│  ┌──┐  Mercado Extra              -R$ 287,40 │  ← title 16/600, value 16/700
│  │🛒│  Alimentação · há 2 dias                │  ← meta 12 inkMuted
│  └──┘                                         │
└──────────────────────────────────────────────┘
   padding 14×16   divider abaixo: 1px lineSoft   gap entre rows 0
```

- Avatar 44×44 radius 14 bg `surfaceAlt`, ícone categórico colorido (cor por categoria)
- Title weight 600, value weight 700
- Value cor: `success` se income, `danger` se expense, `ink` se transferência
- Meta linha embaixo do título: categoria + ponto-bullet "·" + data relativa
- Tap zone: row inteira clicável, active state bg `surfaceAlt`

---

## 12. BottomNav — anatomia

```
┌─────────────────────────────────────────────────────────────┐
│  Início    Gastos     [ + ]      Metas    Conta             │
│   ◉         ○          FAB        ○        ○                │
└─────────────────────────────────────────────────────────────┘
   height 72   bg #0A0A0F/95 backdrop-blur   safe-area-bottom
```

- 5 slots: 4 ícones + 1 FAB central elevado
- Slot ativo: ícone fill `primary`, label text `primary`
- Slot inativo: ícone outline `inkMuted`, label `inkDim`
- FAB central: §10
- Label sempre visível (acessibilidade)
- Border-top 1px `line`

---

## 13. Charts — anatomia

**Sparkline (no Hero card, em DashboardCards):**
- SVG 80×32, polyline stroke 2 com `path` + `path filled` usando gradient
- Sem grid, sem eixos
- Endpoint dot 4px na cor do trend (success/danger)

**DonutChart (Top categorias na Evolução):**
- SVG 180×180, donut com 8 slices max, gap 2° entre slices
- Stroke-width 22, raio externo 80
- Cores: `primary`, `success`, `warn`, `danger`, e variações alpha 70/50/30%
- Centro: total grande + label small abaixo

**Bar chart (Resumo mensal):**
- SVG inline, barras verticais 16px width, gap 8, radius-top 4
- Bar fill: gradient `success` (positivo) ou `danger` (negativo)

---

## 14. Anti-patterns / regras INVIOLÁVEIS

1. **NÃO design desktop.** Este é um APP MÓVEL. Sem sidebar, sem grids horizontais de 3+ colunas, sem layout espalhado tipo dashboard web. Tudo cabe em 390px de largura.
2. **NÃO hover-only states.** Toda interação tem que funcionar com TAP no celular. Hover é bônus pra desktop preview, nunca a única forma de revelar ação.
3. **NÃO max-width acima de 430px** em nenhum container raiz. Desktop mostra o app centralizado com `bg-black` nas laterais (frame mobile).
4. **NÃO** introduzir Framer Motion, Radix UI, shadcn, lucide-react, recharts, chart.js ou qualquer lib visual nova. Usar SVG inline.
5. **NÃO** usar emoji como ícone primário. Usar SVG outline 24×24 stroke 2.
6. **NÃO** usar gradiente roxo em background de página. Só no Hero Card e no FAB glow.
7. **NÃO** usar light mode. Dark exclusivo.
8. **NÃO** trocar `next/font` configuração existente sem necessidade — apenas adicionar Inter Tight se quiser tracking-tight melhor.
9. **NÃO** mexer em `lib/`, `app/api/`, `providers/`, `supabase/migrations/`, `app/login/`, `app/cadastro/` — escopo é UI da área `app/app/*` e `components/*` listados.
10. **NÃO** quebrar acessibilidade: aria-label em ícones-only buttons, contraste mínimo 4.5:1 (texto sobre `bg`), tap target mínimo 44×44.
11. **MANTER** todas as rotas atuais (`/app/inicio`, `/app/gastos`, etc.) — só mudar visual.
12. **MANTER** OAuth Google existente (botão GoogleSyncButton apenas re-skin, lógica intacta).
13. **MANTER** suporte a teclado em forms (Enter pra submit, Tab nav, focus visible).
14. **MANTER** `tabular-nums` em todos os valores R$ e %.
15. **MANTER** safe-area mobile (notch/home indicator) via `env(safe-area-inset-*)`.
16. **MANTER** orientação retrato apenas — não suportar landscape.

---

## 15. Deliverable esperado

Entregue, em ordem, dentro de UM artifact:

1. **`tailwind.config.ts`** completo, espelhando §4–§6.
2. **`app/globals.css`** atualizado: import Inter via next/font (referenciado), reset existente preservado, novas CSS variables se necessário, `body { background: #0A0A0F; color: #FFFFFF; }`.
3. **17 componentes** da §7 em `components/` — cada um JSX standalone, props tipadas em TS.
4. **12 páginas** da §8 em `app/app/*/page.tsx` — cada uma usando componentes acima, com `'use client'` se interativa.
5. **1 arquivo de sample**: `components/__samples/HeroExample.tsx` mostrando como compor Header + HeroBalanceCard + DashboardCard em uma página.

**Formato de cada arquivo:**
```tsx
// components/HeroBalanceCard.tsx
'use client';
import React from 'react';
// ...
export function HeroBalanceCard({ balance, deltaMonth, deltaPct, onAction }: Props) {
  return (
    <section className="rounded-3xl bg-hero p-6 ...">
      ...
    </section>
  );
}
```

**Sem placeholders.** Sem `// TODO`. Sem `// implementar depois`. Código production-ready, com:
- props tipadas
- a11y básica (aria-label, role onde aplicável)
- formatação BRL via `Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'})`
- formatação de data via `Intl.DateTimeFormat('pt-BR')`

**Após gerar tudo:** liste em uma linha final cada arquivo entregue + sua função, no formato:
```
- components/HeroBalanceCard.tsx — Hero card de saldo principal com gradient roxo e 4 quick-actions
- ...
```

---

## Checklist final pro Thiago (antes de colar no Claude Designer)

- [ ] Anexar `_archive/behance-ref/ref-1.png` até `ref-5.png` (5 imagens) na mesma mensagem
- [ ] Confirmar que Claude Designer está em modo Artifact (criar novo Artifact)
- [ ] Conferir que o output inclui `tailwind.config.ts` antes dos componentes
- [ ] Salvar cada arquivo no caminho EXATO listado em §7 e §8
- [ ] Rodar `npm run build` localmente — qualquer erro de TS resolver ANTES de fazer commit
- [ ] Validar visualmente em 360px (DevTools mobile) — não pode quebrar
- [ ] Commitar como `feat(design): redesign V2 dark premium wallet — Behance ref`

---

*Prompt gerado por Claude Code em 2026-05-22 a partir do projeto Behance 248943755 (Dorrry Studio). Paleta e tipografia extraídas dos PNGs reais baixados em `_archive/behance-ref/`. Stack travada: Next 14 + Tailwind + TS. Modo dark exclusivo.*
