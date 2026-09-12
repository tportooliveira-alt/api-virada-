# `scripts/` — Testes e automação

Três famílias bem diferentes convivem aqui.

## 1. ✅ Testes automatizados (TypeScript) — VÁLIDOS
Rodam com `TZ=America/Sao_Paulo npx tsx scripts/<arquivo>` (cada um tem `assert` próprio e
sai com código 1 se algo falhar). Exercitam a lógica de `lib/`, `providers/` e o fonte das telas.
Convenção do repositório: **rodar também com `TZ=UTC`** — vários bugs de mês/dia só aparecem
quando o fuso muda de lado.

### Cálculo e dados do app
| Arquivo | Cobre |
|---|---|
| `test-app-completo.ts` | Métricas do dashboard + planilha gerada a partir dos mesmos dados |
| `test-calculos-telas.ts` | Cálculos das telas (Início, Relatórios, prévia): auditoria A1..A12 e reparos R-A1..R-A4 |
| `test-bolsos.ts` | Os três bolsos (Contas / Dívidas / Vida), presets 50-30-20 e 50-40-10, avisos de dívida |
| `test-dividas-parcela.ts` | "Paguei a parcela" e o Desfazer dela (`applyDebtPayment`), vencimento +1 mês, 31/01→28/02 |
| `test-editar-lancamento.ts` | Editar, excluir com Desfazer e as preferências (renda esperada / fase) |
| `test-estorno.ts` | Fluxo de estorno + precisão BRL |
| `test-estorno-totais.ts` | Contrato de estorno nos totais + migração dos estornos antigos ("ESTORNO — X") |
| `test-deletions.ts` | Exclusões e cascata |
| `test-telas-fase3.ts` | Telas da fase 3: `PocketsCard` renderizado de verdade, `ExpenseChart` controlado pelo pai, fonte das páginas |

### Planilha Google
| Arquivo | Cobre |
|---|---|
| `test-sheets-build.ts` | Geração da planilha Google (estrutura + fórmulas + dados), offline |
| `test-sheets-stress.ts` | Massa de dados na planilha (smoke), limite de linhas e crescimento da grade (formatos/filtro/zebra/proteção acompanham) |
| `test-planilha-bordas.ts` | Casos de borda da planilha Google (inclui upgrade de planilha antiga) |
| `test-planilha-vs-app.ts` | Planilha e tela Início têm que mostrar os mesmos números |
| `test-planilha-formulas.ts` | Planilha "viva": toda fórmula é pt-BR (varredura), e Dashboard/Filtros/Bolsos/Dívidas/Metas/Fluxo/Resumo avaliados batem com o app ao centavo; planilha vazia sem `#…` |
| `planilha-avaliador.ts` | Mini-avaliador de fórmulas do Sheets em pt-BR (SOMASES, CONT.SES, SE, MÁXIMO…) sobre os valueRanges gerados — módulo auxiliar dos testes de planilha e do `dump-formulas.ts` |
| `test-auto-sync.ts` | **Quando** a planilha é enviada sozinha (`AutoSync` de `lib/sheets/sync-runner.ts`): espera de 4 s, baseline anti-loop, token vencido, aba de fundo, 3 tentativas. Relógio e rede falsos — nada de `setTimeout` de verdade |
| `fake-googleapis.cjs` | Mock auxiliar dos testes de planilha |

### Acesso, entrada e textos
| Arquivo | Cobre |
|---|---|
| `test-webhooks.ts` | 6 adapters de webhook + ciclo refund + normalização + filtro `<PLATAFORMA>_ALLOWED_PRODUCTS` (SQLite) |
| `test-authgate.ts` | A porta de entrada (`AuthGate`): rotas que abrem sem login, resposta do Google depois do cronômetro, `prompt` enviado |
| `test-admin-session.ts` | Assinatura/verificação do cookie de admin |
| `test-textos-verdadeiros.ts` | **Os textos do produto contra o código**: escopo pedido ao Google, caminho do token da planilha, onde os dados moram, links das páginas públicas, e se `CLAUDE.md` / `docs/RETOMAR-AQUI.md` / este README ainda batem com a realidade |

Sem credencial Google: `dump-formulas.ts` mostra as fórmulas da planilha (e o valor que cada uma dá,
pelo `planilha-avaliador.ts`) e `preview-planilha.ts` gera a prévia — os dois são utilitários, não testes.

> **Por que existe um teste de texto.** Em 12/09/2026 descobrimos que o `CLAUDE.md` afirmava
> desde junho que a planilha "sincroniza sozinha" — e não havia uma linha disso no código — e
> que a política de privacidade prometia coisas que o app não cumpria. Nada quebrava quando
> doc e código discordavam, e por isso a mentira durou quase três meses. `test-textos-verdadeiros.ts`
> é a trava: mudou o escopo, o tempo do auto-sync ou o lugar onde os dados moram? O teste fica
> vermelho até o texto acompanhar.

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
