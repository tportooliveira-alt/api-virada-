# Virada Design System

Sistema visual do **Código da Virada** — infoproduto de organização financeira (e-book + app PWA + planilha Google). Este design system cobre o **Virada App** (Next.js 14, Tailwind, lucide-react) e a **planilha exportada** para o Google Planilhas. Foi criado em 01/09/2026 a partir do redesign aprovado da tela Início (v2) e da planilha v2.

## Fontes consultadas

- Código do app: pasta local `APP-VIRADA/` (`app/app/*/page.tsx`, `components/*.tsx`, `tailwind.config.ts`, `app/globals.css`, `lib/sheets/builder.ts`, `lib/sheets/styles.ts`).
- Documentação do produto: `APP-VIRADA/00-LEIA-AQUI/*.md`.
- Planilhas reais no Google Drive do dono ("Virada Financeira — local@virada.app").
- Redesign aprovado: `Virada App - Inicio v2.dc.html` e `Planilha Virada - Redesign.dc.html` (projeto de origem).
- Análise de usabilidade: `Analise de Usabilidade - Virada App.dc.html`.

## Índice

| Pasta | O que tem |
| --- | --- |
| `styles.css` | Ponto de entrada — só `@import` dos tokens |
| `tokens/` | `colors.css`, `typography.css`, `spacing.css`, `effects.css`, `fonts.css` |
| `components/core/` | Button, StatCard, Pill, SegmentedControl, Chip, CurrencyInput, ListRow, BottomNav, EmptyState, Dialog (`.jsx` + `.d.ts` + `.prompt.md`) |
| `ui_kits/app/` | Tela Início v2 (`index.html`) |
| `guidelines/` | Cards de cores, tipografia, espaçamento, raio/sombra, logo, ícones |
| `assets/` | Logo horizontal (fundo escuro e claro), ícone do app 192/512, capa do e-book, mockup 3D |
| `SKILL.md` | Para usar no Claude Code |

## Produto em uma frase

"Fluxo de caixa no celular. Dados seus, planilha sua." — a pessoa lança gastos e entradas em segundos, vê o que sobrou no mês e, quando quiser, exporta tudo para uma planilha no próprio Google Drive.

## CONTENT FUNDAMENTALS (como escrever)

- **Voz:** você → pessoa ("Seu caixa do mês", "Seus lançamentos ficam guardados aqui"). O app fala em primeira pessoa só em erros e ações ("Não consegui exportar", "Criando sua planilha…").
- **Tom:** direto, acolhedor, sem sermão financeiro. Frases curtas. Sempre diz o próximo passo ("Comece pelo botão Lançar").
- **Palavras do produto:** Em caixa · Entradas · Gastos · Lançar / lançamento · Casa / Empresa · Essencial / Por impulso · Planilha (só para Google Planilhas) · Relatórios (tabelas dentro do app).
- **Evitar:** Estornar (use Desfazer), Natureza (Tipo de gasto), Escopo (Casa ou empresa), Base/CSV/Origem/Sync (termos técnicos), "Dashboard" na interface do app (ok na planilha).
- **Caixa:** Sentence case em títulos e botões ("Lançar agora", "Registre uma compra ou entrada"). Caixa alta só em eyebrows de 12px com letter-spacing.
- **Números:** sempre `R$ 1.260,80` (pt-BR, duas casas). Sinal antes do R$: `+R$ 2.900,00` / `−R$ 950,00` (traço U+2212). Datas curtas "01 de set."; mês por extenso no cabeçalho ("Setembro de 2026").
- **Emoji:** não usar na interface do app. O código atual usa em Lançar e nas abas da Planilha — substituir por Lucide (ver ICONOGRAFIA). Na planilha Google também não.
- **Exemplos reais:** "O caixa está respirando." · "Gasto maior que entrada." · "Coloque a dívida no mapa. Ela pesa menos quando está organizada." · "Nenhum lançamento ainda. Comece pelo botão Lançar."

## VISUAL FOUNDATIONS

- **Cores:** fundo branco (`--bg-page`), neutros Ink frios (`#0F172A` → `#F8FAFC`). Verde `#22C55E` é a **única** cor de ação; seu texto é verde-escuro `#15803D` (nunca verde-claro sobre branco — este era o principal defeito do app). Âmbar `#F5C542`/`#B45309` marca eyebrows e tudo que envolve a planilha Google. Vermelho só para saídas e exclusão. Azul só para saldo/informação. Estados sempre em par fundo-claro + texto-escuro (`--state-*-bg/fg`).
- **Fundo escuro:** um único bloco por tela — o hero em Ink 900 com o número grande. Dentro dele, cartões em branco 6% (`--surface-inverse-muted`), texto secundário Ink 400, verde-claro 400/300 permitido (aqui o contraste funciona).
- **Tipografia:** Onest para tudo; Figtree 700/800 apenas em números grandes e títulos de página. Corpo 14px, mínimo absoluto 12px. `font-variant-numeric: tabular-nums` em qualquer valor. Títulos com letter-spacing negativo (-0.02em); eyebrows com +0.14em.
- **Espaçamento:** base 4px. Cards com 22px de padding, hero 28px, gap entre cards 20px, entre cards internos 12px. Conteúdo até 1240px; sidebar 248px.
- **Layout:** celular = coluna única + menu inferior flutuante (fixo, 10px do rodapé, max 440px). Desktop (≥1024px) = sidebar sticky à esquerda + grade `auto-fit minmax(400px, 1fr)`. Nunca deixar um valor em R$ quebrar linha — o grid reorganiza, o número não.
- **Cantos:** generosos. 10px controles, 12px blocos internos, 16px cards, 18px hero, pílulas 999px.
- **Bordas e sombras:** todo card tem borda 1px Ink 200 e sombra quase invisível (`--shadow-card`). O hero não tem sombra nem borda. Menu inferior e diálogos usam `--shadow-float`. Sem sombras coloridas (o app antigo tinha glow verde — removido).
- **Fundos:** planos. Nada de gradiente, textura, ilustração ou imagem de fundo. O gradiente azulado do body antigo foi removido.
- **Hover:** primário clareia (`--brand-primary-hover`); links escurecem; itens de menu ganham fundo Ink 200. Sem mudar tamanho.
- **Press:** sem escala. Transições 150ms `--ease-out`, só em cor e fundo. Barras de progresso animam width em 300ms. Nenhuma outra animação.
- **Transparência e blur:** somente no menu inferior (branco 96% + blur 10px) para flutuar sobre o conteúdo.
- **Ícones:** Lucide, traço 2px, 16px inline / 18px em botões e menu / 20px em cartões. Sempre `currentColor`.
- **Gráficos:** donut com furo branco e total no centro, paleta `--chart-1..10` por posição (maior categoria sempre `--chart-1` verde). Barras de ranking finas (6px) com mesma cor da legenda. Entradas verde, saídas vermelho, saldo azul.
- **Imagens:** não há fotografia. Os únicos bitmaps são o logo do e-book, o ícone do app e a capa/mockup para marketing.

## ICONOGRAFIA

- Sistema: **Lucide** (`lucide-react` no app; CDN `https://unpkg.com/lucide@latest` nos cards). Nenhuma icon font, nenhum SVG próprio.
- Navegação: Início `gauge` · Lançar `pen-line` · Relatórios `table` · Conta `settings` · Instalar `smartphone` · Voz `mic` · Novo/Conectar `arrow-right` · Abrir externo `external-link` · Sincronizar `refresh-ccw` · Desconectar `unlink` · Excluir `trash-2` · Desfazer `rotate-ccw` · Sair `log-out`.
- Categorias de gasto (substituem os emojis do código): Mercado `shopping-cart` · Energia `zap` · Transporte `car` · Aluguel/Moradia `home` · Saúde/Farmácia `pill` · Delivery `utensils` · Lazer `gamepad-2` · Cartão `credit-card` · Internet `wifi` · Educação `book-open` · Água `droplets` · Outros `plus`.
- Categorias de entrada: Salário `briefcase` · Venda `handshake` · Serviço `wrench` · Renda extra `lightbulb` · Recebimento `inbox` · Comissão `bar-chart-3`.
- Emoji e caracteres unicode como ícone: proibidos na interface. Marca: o losango verde vem só do PNG em `assets/`; não redesenhar.

## Componentes (components/core)

Button · StatCard · Pill · SegmentedControl · Chip · CurrencyInput · ListRow · BottomNav · EmptyState · Dialog. Cada um tem `.d.ts` (props) e `.prompt.md` (quando usar).

**Adições intencionais** (não existiam no código): `CurrencyInput` (corrige o campo de valor que rejeita vírgula), `Dialog` (unifica `window.confirm` e o "Sim/Não" inline), `ListRow` (substitui tabelas de 10px no celular), `Chip`/`SegmentedControl` (formalizam os filtros do gráfico).

## UI kits

- `ui_kits/app/index.html` — Início v2, responsivo (sidebar ≥1024px, menu inferior abaixo).

## Fontes

Onest e Figtree carregam do Google Fonts (`tokens/fonts.css`). Não há arquivos .woff2 no repositório — para uso offline no PWA, baixe os dois e troque o `@import` por `@font-face`. Na planilha Google, a fonte é "Onest" via API (fallback "Roboto").

## Caveats

- O logo horizontal é o do e-book ("Guia prático · Edição 2026"); o app não tem marca própria além do ícone. Não inventamos uma.
- Só a tela Início foi recriada no UI kit. Lançar, Relatórios, Conta e Entrar seguem as regras acima mas ainda não têm kit.
- Cards de componentes são demonstrações estáticas; os `.jsx` são a fonte para produção.
