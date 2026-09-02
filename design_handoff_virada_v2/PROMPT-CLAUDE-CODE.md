# Prompt para colar no Claude Code

Abra o Claude Code na raiz do repositório APP-VIRADA (com `design_handoff_virada_v2/` descompactado e a skill em `.claude/skills/virada-design/`) e cole:

---

Use a skill `/virada-design` e leia `design_handoff_virada_v2/README.md` inteiro antes de mexer em qualquer arquivo.

Objetivo: implementar o redesign v2 do Virada App e as correções de usabilidade descritas no README, recriando os protótipos de `design_handoff_virada_v2/referencias/` (abra os HTML para entender layout e comportamento) dentro do código existente (Next.js 14 App Router, Tailwind, lucide-react, provider `useVirada`).

Faça em 6 commits, nesta ordem, rodando `npm run lint` e `npm run build` ao fim de cada um:

1. **Tokens** — `tailwind.config.ts` e `app/globals.css`: paleta Ink/Verde/Âmbar/Vermelho/Azul do README, fontes Onest + Figtree via `next/font/google`, fundo branco, remover o gradiente do body e todas as regras `.virada-light`. Fazer busca-e-troca das classes de tema escuro (`text-emerald-300`, `text-emerald-200`, `text-rose-300`, `bg-white/5`, `bg-white/[0.045]`, `border-white/10`, `bg-slate-950/*`) pelos tokens novos em todo `app/` e `components/`.
2. **Início** — `app/app/inicio/page.tsx`, `AppShell.tsx`, `Header.tsx`, `BottomNav.tsx`, `QuickLaunchCard.tsx`, `ExpenseChart.tsx` conforme a seção "Início" do README e `referencias/inicio-v2.html`. Renomear o item de menu "Planilha" para "Relatórios".
3. **Lançar** — `app/app/lancar/page.tsx`: campo de valor em centavos (`CurrencyInput`), "Quando?" (Hoje/Ontem/Outra data), botão de voz usando `components/VoiceOrTextInput.tsx`, categorias com ícones Lucide (sem emoji), toast com Desfazer / Ver no Início. Ver `referencias/lancar-relatorios-conta-v2.html`, primeiro celular.
4. **Relatórios** — mover `app/app/evolucao` para `app/app/relatorios` (com redirect), reescrever conforme a seção "Relatórios": abas com texto, listas no celular, menu "⋯" com folha inferior, "Cadastrar dívida" e "Criar meta" inline, sem `GoogleSyncButton`. Redirecionar `/app/dividas` e `/app/metas` para as abas.
5. **Conta** — mover `app/app/aprender` para `app/app/conta` (com redirect), único lugar do `GoogleSyncButton` com os estados do README, componente `Dialog` no lugar de todo `window.confirm`, mensagens de erro humanas.
6. **Planilha** — copiar `design_handoff_virada_v2/lib-sheets/styles.ts` e `builder.ts` por cima de `lib/sheets/`. Conferir que `GoogleSyncButton.tsx` continua compilando.

Regras que não se negociam: nenhum texto abaixo de 12px; valores em R$ com `tabular-nums` e sem quebra de linha; verde de texto sempre `#15803D` sobre fundo claro; Lucide no lugar de emoji; a palavra "Planilha" só se refere ao Google Planilhas. Não altere `lib/types.ts`, o IndexedDB nem as rotas de API. Ao terminar, liste o que ficou fora e por quê.

---
