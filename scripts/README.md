# `scripts/` — Testes e automação

Três famílias bem diferentes convivem aqui.

## 1. ✅ Testes automatizados (TypeScript) — VÁLIDOS
Rodam com `TZ=America/Sao_Paulo npx tsx scripts/<arquivo>` (cada um tem `assert` próprio e
sai com código 1 se algo falhar). Exercitam a lógica de `lib/`, `providers/` e o fonte das telas.

| Arquivo | Cobre |
|---|---|
| `test-app-completo.ts` | Métricas do dashboard + planilha gerada a partir dos mesmos dados |
| `test-calculos-telas.ts` | Cálculos das telas (Início, Relatórios, prévia): auditoria A1..A12 e reparos R-A1..R-A4 |
| `test-estorno.ts` | Fluxo de estorno + precisão BRL |
| `test-estorno-totais.ts` | Contrato de estorno nos totais + migração dos estornos antigos ("ESTORNO — X") |
| `test-deletions.ts` | Exclusões e cascata |
| `test-sheets-build.ts` | Geração da planilha Google (estrutura + fórmulas + dados), offline |
| `test-sheets-stress.ts` | Massa de dados na planilha (smoke), limite de linhas e crescimento da grade (formatos/filtro/zebra/proteção acompanham) |
| `test-planilha-bordas.ts` | Casos de borda da planilha Google (inclui upgrade de planilha antiga) |
| `test-planilha-vs-app.ts` | Planilha e tela Início têm que mostrar os mesmos números |
| `test-planilha-formulas.ts` | Planilha "viva": toda fórmula é pt-BR (varredura), e Dashboard/Filtros/Bolsos/Dívidas/Metas/Fluxo/Resumo avaliados batem com o app ao centavo; planilha vazia sem `#…` |
| `planilha-avaliador.ts` | Mini-avaliador de fórmulas do Sheets em pt-BR (SOMASES, CONT.SES, SE, MÁXIMO…) sobre os valueRanges gerados — módulo auxiliar dos testes de planilha e do `dump-formulas.ts` |
| `test-webhooks.ts` | 6 adapters de webhook + ciclo refund + normalização (SQLite) |
| `test-admin-session.ts` | Assinatura/verificação do cookie de admin |
| `fake-googleapis.cjs` | Mock auxiliar dos testes de planilha |

Sem credencial Google: `dump-formulas.ts` mostra as fórmulas da planilha (e o valor que cada uma dá,
pelo `planilha-avaliador.ts`) e `preview-planilha.ts` gera a prévia — os dois são utilitários, não testes.

## 2. Testes de integração HTTP antigos — REMOVIDOS
`test_finance.js` e `test_performance.js` chamavam `POST /api/auth/login` e `GET/POST /api/finance`,
rotas de uma arquitetura que não existe mais (login por senha + finanças no servidor). Foram
apagados em 2026-06-17 (CLAUDE.md, decisão #5). O que valia deles virou teste client-side acima.

## 3. 🐍 Automação de lançamento (Python + JS) — operação
Scripts que dirigem o navegador / geram material. Dependências fora do `package.json`
(Python + libs). Use sob demanda, não no CI.

| Família | Arquivos | O que faz |
|---|---|---|
| Hotmart | `hotmart_*.py` | Cria produto, define preço, faz upload, tira prints |
| Cakto | `cakto_*.py` | Abre painel, dashboard, screenshots |
| Canva | `canva_*.py` | Upload/inspeção de design |
| Chrome | `chrome_*.py` | Sessões/perfis de navegador pra automação |
| Deploy | `deploy_netlify_drop.py` | Deploy via Netlify Drop |
| Produto | `build_pdfs.py`, `build_videos.py`, `build_assets.py`, `build-ebook-pdf.mjs` | Gera PDFs (de `content/`), vídeos e assets |
| Screenshots | `screenshot.js`, `screenshot-all.js`, `screenshot_app.*` | Capturas do app |
| Outros | `open_gmail.py` | Utilitário |

> ⚠️ `build-ebook-pdf.mjs` está com 0 bytes (vazio) — provável arquivo abandonado.
