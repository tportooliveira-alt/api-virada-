---
name: virada-design
description: Use this skill to generate well-branded interfaces and assets for Código da Virada / Virada App (app de fluxo de caixa pessoal em pt-BR), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the readme.md file within this skill, and explore the other available files (tokens/, components/core/, ui_kits/app/, guidelines/, assets/).
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code (Next.js + Tailwind no repositório APP-VIRADA), map the CSS custom properties in tokens/ to the Tailwind theme (tailwind.config.ts → theme.extend.colors) and replace legacy dark-theme classes (text-emerald-300, bg-white/5, border-white/10) with the semantic tokens.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

Regras que não se negociam: verde só para a ação principal e valores positivos (texto sempre #15803D sobre claro); nenhum texto abaixo de 12px; valores em R$ com tabular-nums e sem quebra de linha; Lucide no lugar de emoji; "Planilha" só se refere ao Google Planilhas.
