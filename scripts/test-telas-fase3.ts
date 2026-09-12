/**
 * test-telas-fase3.ts — telas da fase 3 (cluster E): card "Seus 3 bolsos",
 * ExpenseChart controlado pelo pai, e o que cada tela precisa ter no fonte.
 *
 * Cobre a parte de tela dos CA-01..CA-09 e CA-12 que dá pra provar sem navegador:
 *   - PocketsCard renderizado DE VERDADE (react-dom/server): alvos, verde/vermelho,
 *     "passou R$ X", "baseado no que entrou até agora", convite pra informar a renda,
 *     selo de Fase de virada, "Dívidas vencendo neste mês", dados antigos sem NaN.
 *   - ExpenseChart: recebe `period` do pai ("AAAA-MM" ou "all"), sem seletor próprio,
 *     legenda clicável quando o pai quer filtrar por categoria.
 *   - Fonte das páginas: Início usa PocketsCard (não ExpenseChart) e liga cada
 *     lançamento à edição; Relatórios navega por mês (sem "30 dias"/"Ano");
 *     Lançar tem ?tipo/?editar em Suspense, "Mais detalhes" e "Salvar alteração";
 *     manifest com id + shortcuts.
 *
 * O resto (toques, toasts, URL) é o e2e Playwright da fase 3.
 * Roda com: npx tsx scripts/test-telas-fase3.ts   (e de novo com TZ=UTC).
 */

import { readFileSync } from "node:fs";

import React, { createElement } from "react";
import { renderToString } from "react-dom/server";

(globalThis as unknown as { React: typeof React }).React = React;
import { ExpenseChart } from "../components/ExpenseChart";
import { PocketsCard } from "../components/PocketsCard";
import type { Debt, Expense, Income, ViradaData } from "../lib/types";
import { formatCurrency } from "../lib/utils";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
    failures.push(label + (detail ? ` [${detail}]` : ""));
  }
}

function section(name: string) {
  console.log(`\n━━━ ${name} ━━━`);
}

// HTML → texto corrido com "|" entre elementos (mesmo truque do test-calculos-telas).
function textOf(html: string) {
  return html
    .replace(/<!--.*?-->/g, "")
    .replace(/<[^>]+>/g, "|")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\|+/g, "|");
}

const brl = formatCurrency;

const MES = "2026-09";
let n = 0;
const ex = (value: number, over: Partial<Expense> = {}): Expense => ({
  id: `e${++n}`,
  description: "",
  value,
  category: "Mercado",
  date: `${MES}-10`,
  paymentMethod: "Pix",
  nature: "essencial",
  ...over,
});
const inc = (value: number, over: Partial<Income> = {}): Income => ({
  id: `i${++n}`,
  description: "",
  value,
  category: "Salário",
  date: `${MES}-05`,
  ...over,
});
const debt = (over: Partial<Debt> = {}): Debt => ({
  id: `d${++n}`,
  name: "Cartão",
  totalValue: 3200,
  installmentValue: 450,
  dueDate: `${MES}-20`,
  priority: "alta",
  status: "aberta",
  ...over,
});
const base = (over: Partial<ViradaData> = {}): ViradaData => ({
  expenses: [],
  incomes: [],
  debts: [],
  goals: [],
  missionStatus: {},
  ...over,
});

function renderPockets(data: ViradaData, mes = MES, hoje = `${MES}-11`) {
  const html = renderToString(createElement(PocketsCard, { data, mes, hoje }));
  return { html, text: textOf(html) };
}

// ─── PocketsCard ─────────────────────────────────────────────────────────────

section("CA-02 · renda informada R$ 2.500, fase Organizando → alvos 1.250 / 750 / 500");
{
  const { text, html } = renderPockets(base({ settings: { expectedIncome: 2500 } }));
  assert(text.includes("Seus 3 bolsos"), "título 'Seus 3 bolsos'");
  for (const alvo of [1250, 750, 500]) assert(text.includes(brl(alvo)), `alvo ${brl(alvo)} aparece`);
  assert(text.includes("Contas") && text.includes("Dívidas e reserva") && text.includes("Vida"), "os três rótulos");
  assert(!text.includes("baseado no que entrou"), "renda informada NÃO diz 'baseado no que entrou'");
  assert(/sobra/.test(text), "sem gasto: mostra 'sobra'");
  assert(!/passou/.test(text), "sem gasto: nada 'passou'");
  assert(!/NaN/.test(html), "sem NaN");
}

section("CA-02 · Fase de virada com Mercado 300 / Cartão 200 / Delivery 260 → Vida passou R$ 10");
{
  const data = base({
    settings: { expectedIncome: 2500, budgetPhase: "virada" },
    expenses: [
      ex(300, { category: "Mercado" }),
      ex(200, { category: "Cartão" }),
      ex(260, { category: "Delivery", nature: "impulso" }),
      ex(999, { category: "Fornecedor", scope: "empresa" }), // Empresa: fora dos bolsos
    ],
  });
  const { text, html } = renderPockets(data);
  assert(text.includes(`${brl(300)} de ${brl(1250)}`), "Contas · R$ 300,00 de R$ 1.250,00");
  assert(text.includes(`sobra ${brl(950)}`), "Contas · sobra R$ 950,00");
  assert(text.includes(`${brl(200)} de ${brl(1000)}`), "Dívidas · R$ 200,00 de R$ 1.000,00");
  assert(text.includes(`${brl(260)} de ${brl(250)}`), "Vida · R$ 260,00 de R$ 250,00");
  assert(text.includes(`passou ${brl(10)}`), "Vida · 'passou R$ 10,00'");
  assert(!text.includes(brl(1299)) && !text.includes(brl(999)), "gasto de Empresa não entra em bolso nenhum");
  assert(/data-estado="vermelho"/.test(html), "algum bolso marcado vermelho");
  assert((html.match(/data-estado="verde"/g) ?? []).length === 2, "dois bolsos verdes");
  assert(!/culpa|errado|vergonha/i.test(text), "sem culpa no texto");
}

section("CA-02 · sem renda informada → média dos 3 meses anteriores + 'baseado no que entrou até agora'");
{
  const data = base({
    incomes: [inc(2000, { date: "2026-08-05" }), inc(3000, { date: "2026-07-05" })], // junho sem entrada não conta
  });
  const { text, html } = renderPockets(data);
  assert(text.includes("baseado no que entrou até agora"), "texto 'baseado no que entrou até agora'");
  assert(text.includes(brl(2500)), "renda = média R$ 2.500,00 (2.000 e 3.000; mês sem entrada não conta)");
  assert(text.includes(brl(1250)), "alvo Contas R$ 1.250,00 da média");
  assert(/href="\/app\/conta"/.test(html), "link pra Conta pra informar a renda");
}

section("CA-02 · só entradas do próprio mês → usa o mês");
{
  const { text } = renderPockets(base({ incomes: [inc(1000)] }));
  assert(text.includes("baseado no que entrou até agora"), "texto 'baseado no que entrou'");
  assert(text.includes(brl(500)), "alvo Contas R$ 500,00 (50% de 1.000)");
}

section("CA-02 / CA-12 · nada entrou nunca → convite pra informar a renda, sem R$ 0 silencioso");
{
  const { text, html } = renderPockets(base({ expenses: [ex(80)] }));
  assert(/quanto entra/i.test(text), "convite: pergunta quanto entra por mês");
  assert(/href="\/app\/conta"/.test(html), "convite leva pra Conta");
  assert(!text.includes(`de ${brl(0)}`), "não mostra 'de R$ 0,00' como alvo");
  assert(text.includes(brl(80)), "o gasto do bolso aparece mesmo sem alvo");
  assert(!/NaN/.test(html), "sem NaN");
}

section("CA-03 · dívida em aberto + fase Organizando → selo sugerindo Fase de virada (nunca troca sozinho)");
{
  const comDivida = renderPockets(base({ settings: { expectedIncome: 2500 }, debts: [debt()] }));
  assert(/Fase de virada/.test(comDivida.text), "selo fala em 'Fase de virada'");
  assert(comDivida.text.includes(brl(750)), "fase segue Organizando (alvo Dívidas 750, não 1.000)");
  const jaVirada = renderPockets(base({ settings: { expectedIncome: 2500, budgetPhase: "virada" }, debts: [debt()] }));
  assert(!/ativar|sugest/i.test(jaVirada.text), "já na Fase de virada: sem sugestão");
  const semDivida = renderPockets(base({ settings: { expectedIncome: 2500 } }));
  assert(!/sugest/i.test(semDivida.text), "sem dívida: sem sugestão");
}

section("CA-08 · 'Dívidas vencendo neste mês: R$ X (N)'");
{
  const data = base({
    settings: { expectedIncome: 2500 },
    debts: [debt(), debt({ name: "Empréstimo", totalValue: 1000, installmentValue: 100, dueDate: `${MES}-28` }), debt({ dueDate: "2026-10-05" })],
  });
  const { text } = renderPockets(data);
  assert(text.includes(`Dívidas vencendo neste mês`) && text.includes(`${brl(550)} (2)`), "R$ 550,00 (2) — só as do mês");
  const semVenc = renderPockets(base({ settings: { expectedIncome: 2500 } }));
  assert(!/vencendo/.test(semVenc.text), "sem dívida vencendo: linha não aparece");
}

section("Juiz #7 · 'Dívidas vencidas: R$ X (N)' acima de 'vencendo', sem contar duas vezes");
{
  const data = base({
    settings: { expectedIncome: 2500 },
    debts: [
      debt({ name: "Velha", totalValue: 500, installmentValue: 100, dueDate: "2026-08-10" }), // mês passado
      debt({ name: "Cartão", dueDate: `${MES}-05` }), // este mês, mas já passou (hoje = 11)
      debt({ name: "Empréstimo", totalValue: 1000, installmentValue: 100, dueDate: `${MES}-28` }), // ainda vai vencer
      debt({ name: "Quitada", status: "quitada", dueDate: "2026-07-10" }),
    ],
  });
  const { text, html } = renderPockets(data);
  assert(text.includes(`Dívidas vencidas: ${brl(550)} (2)`), "vencidas = 100 (mês passado) + 450 (dia 5 deste mês) = R$ 550,00 (2)", text);
  assert(text.includes(`Dívidas vencendo neste mês: ${brl(100)} (1)`), "vencendo = só a que ainda vai vencer (R$ 100,00 (1)); a do dia 5 não conta duas vezes", text);
  assert(text.indexOf("Dívidas vencidas") < text.indexOf("Dívidas vencendo"), "vencidas vem acima de vencendo");
  assert((html.match(/href="\/app\/relatorios\?aba=dividas[^"]*"/g) ?? []).length >= 2, "as duas linhas levam pra ?aba=dividas");
  assert(!/culpa|atras[oa]d[oa]|errad/i.test(text), "sem culpa no texto");
  const semVencida = renderPockets(base({ settings: { expectedIncome: 2500 }, debts: [debt({ dueDate: `${MES}-28` })] }));
  assert(!/vencidas/.test(semVencida.text), "sem dívida vencida: linha não aparece");
  // Mês escolhido no passado: tudo daquele mês já venceu — só a linha de vencidas.
  const passado = renderPockets(base({ settings: { expectedIncome: 2500 }, debts: [debt({ dueDate: "2026-08-10" })] }), "2026-08");
  assert(/vencidas/.test(passado.text) && !/vencendo/.test(passado.text), "mês passado: vencida sim, 'vencendo' não");
}

section("CA-12 · dados antigos (sem settings, dívida sem paidValue) abrem sem NaN");
{
  const antigo = { expenses: [ex(100)], incomes: [inc(900)], debts: [debt()], goals: [], missionStatus: {} } as ViradaData;
  const { html, text } = renderPockets(antigo);
  assert(!/NaN|undefined/.test(html), "sem NaN/undefined");
  assert(text.includes("baseado no que entrou até agora"), "bolsos 'baseado no que entrou'");
}

// ─── ExpenseChart controlado pelo pai ────────────────────────────────────────

section("CA-06 / CA-09 · ExpenseChart recebe o período do pai e a legenda filtra");
{
  const expenses = [ex(100, { date: "2026-08-10", category: "Lazer" }), ex(200, { date: "2026-09-10", category: "Mercado" })];
  const setembro = renderToString(createElement(ExpenseChart, { expenses, incomes: [], period: "2026-09" }));
  const agosto = renderToString(createElement(ExpenseChart, { expenses, incomes: [], period: "2026-08" }));
  const tudo = renderToString(createElement(ExpenseChart, { expenses, incomes: [], period: "all" }));
  assert(textOf(setembro).includes("|Mercado|") && !textOf(setembro).includes("|Lazer|"), "period '2026-09' mostra só setembro");
  assert(textOf(agosto).includes("|Lazer|") && !textOf(agosto).includes("|Mercado|"), "period '2026-08' mostra só agosto");
  assert(textOf(tudo).includes("|Lazer|") && textOf(tudo).includes("|Mercado|"), "period 'all' mostra tudo");
  assert(!/aria-label="Período"/.test(setembro), "sem seletor de período próprio");
  assert(/Essencial/.test(setembro) && /Impulso/.test(setembro), "chip Essencial/Impulso continua");
  const clicavel = renderToString(
    createElement(ExpenseChart, { expenses, incomes: [], period: "all", selectedCategory: "Lazer", onSelectCategory: () => {} }),
  );
  // O botão marcado (aria-pressed) que contém "Lazer" — os chips Todos/Essencial/Impulso também têm aria-pressed.
  assert(/<button[^>]*aria-pressed="true"[^>]*>(?:(?!<\/button>)[\s\S])*Lazer/.test(clicavel), "legenda vira botão com a categoria escolhida marcada");
  assert(!/<button[^>]*>[\s\S]{0,200}Lazer/.test(setembro.replace(/Essencial|Impulso|Todos/g, "")), "sem onSelectCategory a legenda não é botão");
  // Juiz #4: em 360–430 px a legenda fica ABAIXO do donut e o nome não trunca ("M…").
  assert(/flex-col min-\[480px\]:flex-row/.test(tudo), "donut + legenda empilham abaixo de 480 px");
  assert(/<span class="min-w-0 flex-1 text-left">Lazer<\/span>/.test(tudo), "nome da categoria na legenda sem truncate");
}

// ─── Fonte das páginas (o que não renderiza fora do Next) ────────────────────

section("Fonte das telas");
{
  const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  const inicio = src("app/app/inicio/page.tsx");
  const lancar = src("app/app/lancar/page.tsx");
  const relatorios = src("app/app/relatorios/page.tsx");
  const conta = src("app/app/conta/page.tsx");
  const chart = src("components/ExpenseChart.tsx");
  const manifest = JSON.parse(src("public/manifest.webmanifest")) as { id?: string; shortcuts?: { url: string }[] };

  assert(/PocketsCard/.test(inicio) && !/ExpenseChart/.test(inicio), "Início: PocketsCard no lugar do ExpenseChart");
  assert(/Sem lançamentos neste mês/.test(inicio), "Início: chip neutro 'Sem lançamentos neste mês'");
  assert(/\/app\/lancar\?editar=/.test(inicio), "Início: lançamento liga pra edição");
  assert(/useSearchParams/.test(lancar) && /Suspense/.test(lancar), "Lançar: useSearchParams em Suspense");
  assert(/Salvar alteração/.test(lancar) && /Mais detalhes/.test(lancar), "Lançar: 'Salvar alteração' e 'Mais detalhes'");
  assert(/updateExpense|updateIncome/.test(lancar), "Lançar: salva por updateExpense/updateIncome");
  assert(/anoAtual - 10/.test(lancar) && /anoAtual \+ 1/.test(lancar) && /não parece certa/.test(lancar), "Lançar: ano em [atual − 10, atual + 1] com erro claro");
  assert(/tipo.*entrada/.test(lancar) && /Salário/.test(lancar), "Lançar: ?tipo=entrada e Salário pré-marcado");
  assert(!/30 dias|"ano"/.test(relatorios), "Relatórios: sem '30 dias' nem 'Ano'");
  assert(/shiftMonth/.test(relatorios) && /searchParams\.get\("mes"\)/.test(relatorios), "Relatórios: navega por mês com ?mes");
  assert(/restoreExpense|restoreIncome/.test(relatorios) && /undoDebtPayment/.test(relatorios), "Relatórios: Desfazer de Excluir e de parcela");
  assert(/payDebtInstallment/.test(relatorios) && /debtInstallmentsLeft/.test(relatorios), "Relatórios: Paguei a parcela + faltam N parcelas");
  assert(!/Desfazer lançamento|estornar\(/.test(relatorios), "Relatórios: estornar não aparece pra pessoa comum");
  assert(/setSettings/.test(conta) && /BUDGET_PHASES/.test(conta) && /Quanto entra por mês/.test(conta), "Conta: renda + fase via setSettings");
  assert(/inPeriod\(/.test(chart) && !/new Date\(e\.date\)/.test(chart), "ExpenseChart: inPeriod por string");
  assert(typeof manifest.id === "string" && (manifest.shortcuts ?? []).some((s) => /tipo=gasto/.test(s.url)) && (manifest.shortcuts ?? []).some((s) => /tipo=entrada/.test(s.url)), "manifest: id + shortcuts ?tipo=gasto/entrada");

  // Correções pedidas pelo juiz (rodada 2)
  const shell = src("components/AppShell.tsx");
  const demo = src("app/app/planilha-demo/page.tsx");
  const MONTH_RE = "/^\\d{4}-(0[1-9]|1[0-2])$/";
  assert(relatorios.includes(MONTH_RE), "#2 Relatórios: ?mes só aceita 01–12 (2026-13 cai no mês corrente)", MONTH_RE);
  assert(/setTab\(tipoParam === "entrada" \? "entrada" : "gasto"\)/.test(lancar) && /setDetalhes\(usaEmpresa\)/.test(lancar), "#3 Lançar: sair da edição volta a aba e o 'Mais detalhes' ao padrão");
  assert(/PenLine/.test(inicio) && /SpeechRecognition/.test(inicio) && !/<Mic className="h-\[18px\] w-\[18px\] shrink-0" \/>\s*<span className="text-center">\s*Lançar agora <span/.test(inicio), "#5 Início: CTA só promete voz quando o navegador tem SpeechRecognition");
  assert(!/pontos e logs/.test(inicio) && /Dashboard/.test(inicio), "#6 Início: card da planilha fala das abas que existem");
  assert(/Quando\?/.test(lancar) && lancar.indexOf("Quando?") > lancar.indexOf("Mais detalhes <span") && /Hoje/.test(lancar), "#1 Lançar: 'Quando?' dentro de 'Mais detalhes', padrão Hoje");
  assert(/sticky bottom-\[calc\(76px\+env\(safe-area-inset-bottom\)\)\]/.test(lancar), "#1 Lançar: Confirmar sticky acima do menu");
  assert(/\/app\/lancar/.test(shell) && /lg:hidden|hidden lg:/.test(shell), "#1 AppShell: cabeçalho compacto em /app/lancar no celular");
  assert(/period=\{/.test(demo) && /shiftMonth/.test(demo), "#8 Prévia da planilha: ExpenseChart com período + navegação ‹ mês ›");
}

console.log(`\n${"═".repeat(60)}`);
console.log(`RESULTADO: ${passed} passaram, ${failed} falharam`);
if (failed > 0) {
  console.log("Falhas:");
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
