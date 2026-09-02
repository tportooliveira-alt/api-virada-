# _design — fonte do design do Virada App

Projeto no Claude Design: **"Aplicativo Virada local"**
https://claude.ai/design/p/d3577f59-cd50-4fe9-b95e-91c7a7e5a822

O que é fonte de verdade de cada coisa:

| Coisa | Onde vive | Como atualizar |
|---|---|---|
| Design system (tokens, componentes, guidelines) | `.claude/skills/virada-design/` — invocar `/virada-design` no Claude Code | Exportar do Claude Design (Share → Project HTML → Project archive) e copiar `virada-design-system/` por cima |
| Roteiro de implementação (6 commits) + telas bundladas | `design_handoff_virada_v2/` | idem, pasta `design_handoff_virada_v2/` |
| Páginas-fonte do Claude Design (`.dc.html`) | `_design/claude-design/` | idem, os `.dc.html` da raiz do zip + `support.js`/`doc-page.js` |
| Texto do ebook e dos bônus | `content/` (v2 — ver `content/CHANGELOG-v2.md`) | idem, pasta `ebook-v2/` |
| `lib/sheets/{builder,styles}.ts` novos | `design_handoff_virada_v2/lib-sheets/` (commit 6 do roteiro) | idem |
| Landing de vendas (`public/vendas.html`) | gerada de `claude-design/Landing Vendas v2.dc.html` + `animations-v3.jsx` + `virada-demo.jsx` | re-exportar e rodar `node scripts/build-vendas.mjs` |

`claude-design/*.dc.html` são a fonte editável (formato `<x-dc>`); abrem localmente porque
`support.js` e `doc-page.js` estão na mesma pasta. As versões bundladas e autocontidas das 4 telas
do app estão em `design_handoff_virada_v2/referencias/` (mesmo conteúdo, conferido em 2026-09-02).

`scripts/build-vendas.mjs` renderiza o template da landing em Node (`sc-if`/`sc-for`/`{{ }}` viram HTML
fixo, sem runtime do Claude Design) e compila o mini-vídeo do hero com o `tsc` do projeto + React UMD
em `public/vendas-hero.js`. Os "Tweaks" (preço, plataforma, horas da oferta) ficam no `PROPS` do script;
link do checkout e WhatsApp ficam no bloco `CONFIG` dentro do próprio `vendas.html`.

Páginas (2026-09-02): Landing Vendas v2 · Ebook Codigo da Virada v2 · 4 Bonus · Virada App v2 -
Lancar Relatorios Conta · Virada App - Inicio v2 · Virada App - Inicio (v1, histórico) ·
Analise de Usabilidade · Planilha Virada - Redesign.
