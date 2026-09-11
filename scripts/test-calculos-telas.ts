/**
 * test-calculos-telas.ts — cálculos das telas do app (Início, Relatórios, prévia da planilha)
 *
 * Reproduz cada achado da auditoria de cálculos (A1..A12) com o caso que o auditor
 * usou pra provar o erro, e garante que a correção fecha:
 *   A1  dia 1º do mês sumia do gráfico em America/Sao_Paulo (new Date("AAAA-MM-DD") é UTC)
 *   A2  percentuais de categoria não fechavam 100% (top-8 cortava, dividia pelo total de tudo)
 *   A3  Math.round dizia "Meta alcançada" com 99,5%
 *   A4  saldo zero virava "-R$ 0,00 · Negativo" por ruído de ponto flutuante
 *   A5  chip Impulso filtrava gastos mas o card Saldo mantinha as entradas
 *   A6  "Economia" com duas definições (travada em 0 vs negativa)
 *   A7  dívida "negociando" sumia do total na prévia
 *   A8  janela "30 dias" com 31 dias numa tela e 29/30 na outra
 *   A9  data futura entrava em 7d/30d
 *   A10 getGoalProgress negativo
 *   A11 estorno: contrato do lib/types.ts aplicado nos totais das telas
 *   A12 código morto com conta errada (getMonthlyChart, calculateViradaScore, getMissionOfDay, missionProgress)
 *   R-A1 regressão: getGoalProgress com Math.floor(ratio * 100) caía no trap de float (29/100 → 28%)
 *   R-A2 "Dia a dia" de Relatórios: resultado/acumulado sem roundMoney (−R$ 0,00 em vermelho)
 *   R-A3 prévia: "Status Geral → Lançamentos" contava estornados; KPIs da mesma tela não
 *   R-A4 TransactionList (morto) prometia "lançamento oposto" — contradiz o contrato de estorno
 *
 * O ExpenseChart é renderizado DE VERDADE (react-dom/server) — o que se testa é o HTML
 * que a pessoa vê. As páginas (Início, Relatórios, prévia) dependem do provider/router
 * do Next e não renderizam fora do navegador: a lógica delas vive em lib/utils.ts (testada
 * aqui) e o teste confere, no fonte, que cada tela chama esses helpers e não a conta antiga.
 *
 * Roda com: npx tsx scripts/test-calculos-telas.ts   (TZ=America/Sao_Paulo por padrão;
 * as partes sensíveis a fuso rodam também em UTC — o Node aceita trocar process.env.TZ em execução)
 */

if (!process.env.TZ) process.env.TZ = "America/Sao_Paulo";

import { readFileSync } from "node:fs";
import React, { createElement } from "react";
import { renderToString } from "react-dom/server";

// O tsconfig do Next usa "jsx": "preserve" e o tsx transpila o JSX no modo clássico
// (React.createElement) — fora do Next não há React global, então expomos aqui.
(globalThis as unknown as { React: typeof React }).React = React;
import { ExpenseChart } from "../components/ExpenseChart";
import { missions } from "../lib/constants";
import { isOpenDebt, semEstornados } from "../lib/types";
import type { Debt, Expense, Goal, Income, ViradaData } from "../lib/types";
import {
  calculateViradaScore,
  dailyFlow,
  formatCurrency,
  getDashboardMetrics,
  getGoalProgress,
  getMissionOfDay,
  getMonthlyChart,
  groupTopCategories,
  inPeriod,
  isGoalReached,
  isWithinLastDays,
  roundMoney,
  roundPercentages,
  savingsRate,
  toInputDate,
} from "../lib/utils";

// ─── Utilitários de teste (mesmo padrão de test-app-completo.ts) ─────────────

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

function assertEq(actual: unknown, expected: unknown, label: string) {
  const ok = actual === expected;
  assert(ok, label, ok ? undefined : `esperado=${JSON.stringify(expected)}, obtido=${JSON.stringify(actual)}`);
}

function section(name: string) {
  console.log(`\n━━━ ${name} ━━━`);
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const hoje = toInputDate();
const ym = hoje.slice(0, 7);
const ano = hoje.slice(0, 4);

function shift(days: number, from = hoje) {
  const [y, m, d] = from.split("-").map(Number);
  return toInputDate(new Date(y, m - 1, d + days));
}

let seq = 0;
const ex = (value: number, p: Partial<Expense> = {}): Expense => ({
  id: `e${++seq}`, description: "gasto", value, category: "Mercado", date: `${ym}-05`,
  paymentMethod: "Pix", nature: "essencial", ...p,
});
const inc = (value: number, p: Partial<Income> = {}): Income => ({
  id: `i${++seq}`, description: "entrada", value, category: "Salário", date: `${ym}-05`, ...p,
});
const goal = (targetValue: number, currentValue: number): Goal => ({ id: "g", name: "Meta", targetValue, currentValue, type: "reserva" });
const vazio: ViradaData = { expenses: [], incomes: [], debts: [], goals: [], missionStatus: {} };

// HTML do ExpenseChart renderizado → texto corrido ("|" separa os elementos).
// O SSR do React põe "<!-- -->" entre {valor} e "%" e usa \u00a0 no "R$ 1,00".
type ChartProps = Parameters<typeof ExpenseChart>[0];
function renderChart(props: ChartProps) {
  const html = renderToString(createElement(ExpenseChart, props));
  const text = html
    .replace(/<!--.*?-->/g, "")
    .replace(/<[^>]+>/g, "|")
    .replace(/\|+/g, "|")
    .replace(/&nbsp;|\u00a0/g, " ");
  return { html, text };
}
// Valor mostrado logo depois de um rótulo de card ("Saídas|R$ 70,00")
function cardValue(text: string, label: string) {
  const m = text.match(new RegExp(`\\|${label}\\|([^|]+)\\|`));
  return m ? m[1].replace(/ /g, " ") : null;
}
const brl = (v: number) => formatCurrency(v).replace(/ /g, " ");

const fontes = {
  inicio: readFileSync(new URL("../app/app/inicio/page.tsx", import.meta.url), "utf8"),
  relatorios: readFileSync(new URL("../app/app/relatorios/page.tsx", import.meta.url), "utf8"),
  previa: readFileSync(new URL("../app/app/planilha-demo/page.tsx", import.meta.url), "utf8"),
  chart: readFileSync(new URL("../components/ExpenseChart.tsx", import.meta.url), "utf8"),
  transactionList: readFileSync(new URL("../components/TransactionList.tsx", import.meta.url), "utf8"),
};

// ═════════════════════════════════════════════════════════════════════════════
// A1 — dia 1º do mês / fuso horário (roda em America/Sao_Paulo E em UTC)
// ═════════════════════════════════════════════════════════════════════════════

for (const tz of ["America/Sao_Paulo", "UTC"]) {
  process.env.TZ = tz;
  // "hoje" é o do fuso em teste (à 1h UTC ainda é ontem em São Paulo)
  const hojeTz = toInputDate();
  const ym = hojeTz.slice(0, 7);
  const ano = hojeTz.slice(0, 4);
  section(`A1 · dia 1º do mês no ExpenseChart — TZ=${tz} (hoje ${hojeTz})`);

  const dia1 = `${ym}-01`;
  const { text } = renderChart({
    expenses: [ex(1200, { category: "Aluguel", date: dia1 })],
    incomes: [inc(3000, { date: dia1 })],
  });
  assert(!text.includes("Nenhum gasto neste período"), "salário + aluguel no dia 01: o gráfico NÃO diz 'Nenhum gasto neste período'");
  assertEq(cardValue(text, "Entradas"), brl(3000), "card Entradas do mês inclui o salário do dia 01");
  assertEq(cardValue(text, "Saídas"), brl(1200), "card Saídas do mês inclui o aluguel do dia 01");
  assertEq(cardValue(text, "Saldo"), brl(1800), "card Saldo = 3.000 − 1.200");
  assert(text.includes("|Aluguel|"), "Aluguel aparece na legenda do donut");

  const primeiroJan = renderChart({ expenses: [ex(500, { date: `${ano}-01-01` })], incomes: [], defaultPeriod: "ano" });
  assertEq(cardValue(primeiroJan.text, "Saídas"), brl(500), "'Ano' inclui 1º de janeiro");

  assertEq(inPeriod(dia1, "mes", hojeTz), true, `inPeriod('${dia1}', 'mes') = true`);
  assertEq(inPeriod(`${ano}-01-01`, "ano", hojeTz), true, "inPeriod(1º de janeiro, 'ano') = true");
}
process.env.TZ = "America/Sao_Paulo";

// ═════════════════════════════════════════════════════════════════════════════
// A8 / A9 — janela de dias única (7d = hoje + 6 anteriores; 30d = hoje + 29), sem futuro
// ═════════════════════════════════════════════════════════════════════════════

section("A8 · A9 · janela '7 dias' / '30 dias' (helper único, por texto de data)");
{
  // um gasto de R$ 10 por dia: de 40 dias atrás até 3 dias no futuro
  const serie: Expense[] = [];
  for (let k = -40; k <= 3; k++) serie.push(ex(10, { date: shift(k) }));

  assertEq(serie.filter((e) => isWithinLastDays(e.date, 7, hoje)).length, 7, "isWithinLastDays(…, 7) = hoje + 6 anteriores = 7 dias");
  assertEq(serie.filter((e) => isWithinLastDays(e.date, 30, hoje)).length, 30, "isWithinLastDays(…, 30) = hoje + 29 anteriores = 30 dias");
  assertEq(isWithinLastDays(hoje, 7, hoje), true, "hoje entra na janela");
  assertEq(isWithinLastDays(shift(-6), 7, hoje), true, "6 dias atrás entra em 7d");
  assertEq(isWithinLastDays(shift(-7), 7, hoje), false, "7 dias atrás NÃO entra em 7d");
  assertEq(isWithinLastDays(shift(-29), 30, hoje), true, "29 dias atrás entra em 30d");
  assertEq(isWithinLastDays(shift(-30), 30, hoje), false, "30 dias atrás NÃO entra em 30d");
  assertEq(isWithinLastDays(shift(1), 7, hoje), false, "A9: amanhã NÃO entra em 7d");
  assertEq(isWithinLastDays(shift(1), 30, hoje), false, "A9: amanhã NÃO entra em 30d");

  // virada de mês/ano: 2026-01-03 com 7d tem que pegar 28/12/2025
  assertEq(isWithinLastDays("2025-12-28", 7, "2026-01-03"), true, "janela cruza a virada do ano (28/12 entra em 7d de 03/01)");
  assertEq(isWithinLastDays("2025-12-27", 7, "2026-01-03"), false, "27/12 fica fora de 7d de 03/01");

  for (const tz of ["America/Sao_Paulo", "UTC"]) {
    process.env.TZ = tz;
    const hojeTz = toInputDate();
    const serieTz: Expense[] = [];
    for (let k = -40; k <= 3; k++) serieTz.push(ex(10, { date: shift(k, hojeTz) }));
    const sete = renderChart({ expenses: serieTz, incomes: [], defaultPeriod: "7d" });
    assertEq(cardValue(sete.text, "Saídas"), brl(70), `ExpenseChart '7d' soma exatamente 7 dias (TZ=${tz}, hoje ${hojeTz})`);
    const trinta = renderChart({ expenses: serieTz, incomes: [], defaultPeriod: "30d" });
    assertEq(cardValue(trinta.text, "Saídas"), brl(300), `ExpenseChart '30d' soma exatamente 30 dias (TZ=${tz})`);
  }
  process.env.TZ = "America/Sao_Paulo";

  assert(!/function inPeriod/.test(fontes.relatorios) && /inPeriod\(/.test(fontes.relatorios), "Relatórios usa o inPeriod de lib/utils (não tem mais o seu próprio)");
  assert(!/new Date\(i\.date\)/.test(fontes.chart) && /inPeriod\(/.test(fontes.chart), "ExpenseChart usa o inPeriod de lib/utils (sem new Date('AAAA-MM-DD'))");
}

// ═════════════════════════════════════════════════════════════════════════════
// A2 — percentuais de categoria fecham 100% (maior resto) e resto vira "Outros"
// ═════════════════════════════════════════════════════════════════════════════

section("A2 · percentuais por categoria fecham 100%");
{
  assertEq(roundPercentages([1000, 1000, 1000]).join("+"), "34+33+33", "3 categorias iguais → 34+33+33 = 100 (maior resto)");
  assertEq(roundPercentages([1, 1, 1, 1, 1, 1, 1]).reduce((a, b) => a + b, 0), 100, "7 iguais somam 100");
  assertEq(roundPercentages([50, 50]).join("+"), "50+50", "50/50 fica 50+50");
  assertEq(roundPercentages([999, 1]).join("+"), "100+0", "999/1 → 100+0 (99,9 arredonda pra 100; 0,1 pra 0)");
  assertEq(roundPercentages([994, 6]).join("+"), "99+1", "994/6 → 99+1 (0,6 ganha o resto)");
  assertEq(roundPercentages([]).length, 0, "lista vazia → vazia");
  assertEq(roundPercentages([0, 0]).join("+"), "0+0", "total zero → 0+0 (não divide por zero)");

  const cats = ["Mercado", "Energia", "Transporte", "Aluguel", "Saúde", "Delivery", "Lazer", "Cartão", "Internet", "Educação"];
  const dez = cats.map((c) => ex(100, { category: c as Expense["category"] }));
  const grupos = groupTopCategories(dez, 8);
  assertEq(grupos.length, 8, "10 categorias de R$ 100 → 8 fatias (7 maiores + Outros)");
  assertEq(grupos[grupos.length - 1].name, "Outros", "última fatia é 'Outros'");
  assertEq(grupos[grupos.length - 1].value, 300, "'Outros' soma as 3 categorias que não couberam (R$ 300)");
  assertEq(grupos.reduce((s, g) => s + g.value, 0), 1000, "as fatias somam o total (→ 360° no donut, sem buraco)");
  assertEq(grupos.reduce((s, g) => s + g.pct, 0), 100, "percentuais exibidos somam 100");

  const comOutros = [...dez, ex(50, { category: "Outros" })];
  const g2 = groupTopCategories(comOutros, 8);
  assertEq(g2.filter((g) => g.name === "Outros").length, 1, "categoria real 'Outros' não duplica: vira uma fatia só");
  assertEq(g2.find((g) => g.name === "Outros")?.value, 350, "'Outros' real (50) + resto (300) = 350");
  assertEq(g2.reduce((s, g) => s + g.value, 0), 1050, "total preservado com 'Outros' real");

  const tres = groupTopCategories([ex(1000, { category: "Mercado" }), ex(1000, { category: "Energia" }), ex(1000, { category: "Lazer" })]);
  assertEq(tres.map((g) => g.pct).join("+"), "34+33+33", "3 iguais sem corte → 34+33+33");
  assertEq(groupTopCategories([]).length, 0, "sem gastos → sem fatias");

  const { html, text } = renderChart({ expenses: dez, incomes: [] });
  const pcts = [...text.matchAll(/\|(\d+)%\|/g)].map((m) => Number(m[1]));
  assertEq(pcts.reduce((a, b) => a + b, 0), 100, `legenda do ExpenseChart soma 100% (${pcts.join("+")})`);
  assertEq(pcts.length, 8, "legenda mostra TODAS as fatias do donut (8), não 6");
  assertEq((html.match(/<path /g) ?? []).length, 8, "donut desenha 8 fatias (7 + Outros)");
  assert(text.includes("|Outros|"), "'Outros' aparece na legenda");

  const iguais = renderChart({ expenses: tres.map((g) => ex(g.value, { category: g.name as Expense["category"] })), incomes: [] });
  const p3 = [...iguais.text.matchAll(/\|(\d+)%\|/g)].map((m) => Number(m[1]));
  assertEq(p3.join("+"), "34+33+33", "3 categorias iguais na legenda: 34+33+33 (não 33+33+33 = 99)");

  assert(/groupTopCategories\(/.test(fontes.relatorios) && !/\.slice\(0, 8\)/.test(fontes.relatorios), "Relatórios usa groupTopCategories (sem top-8 solto)");
  assert(/groupTopCategories\(/.test(fontes.previa), "prévia usa groupTopCategories nas categorias");
}

// ═════════════════════════════════════════════════════════════════════════════
// A3 / A10 — meta: "alcançada" só com currentValue >= targetValue; progresso em [0, 100]
// ═════════════════════════════════════════════════════════════════════════════

section("A3 · A10 · progresso de meta");
{
  assertEq(getGoalProgress(goal(10000, 9951)), 99, "R$ 9.951 de R$ 10.000 → 99% (floor, não round)");
  assertEq(isGoalReached(goal(10000, 9951)), false, "R$ 9.951 de R$ 10.000 NÃO é 'Meta alcançada'");
  assertEq(getGoalProgress(goal(1000, 999.5)), 99, "99,95% → 99%");
  assertEq(getGoalProgress(goal(1000, 1000)), 100, "igual ao alvo → 100%");
  assertEq(isGoalReached(goal(1000, 1000)), true, "igual ao alvo → alcançada");
  assertEq(getGoalProgress(goal(1000, 1500)), 100, "acima do alvo trava em 100");
  assertEq(isGoalReached(goal(1000, 1500)), true, "acima do alvo → alcançada");
  assertEq(getGoalProgress(goal(1000, -50)), 0, "A10: currentValue negativo → 0 (não −5)");
  assertEq(getGoalProgress(goal(0, 500)), 0, "alvo 0 → 0");
  assertEq(isGoalReached(goal(0, 0)), false, "alvo 0 nunca é 'alcançada'");
  assertEq(getGoalProgress(goal(3, 1)), 33, "1 de 3 → 33");
  assertEq(getGoalProgress(goal(0.3, 0.1 + 0.2)), 100, "ruído de float (0.1+0.2 de 0.3) → 100");

  assert(/isGoalReached\(/.test(fontes.relatorios) && /getGoalProgress\(/.test(fontes.relatorios) && !/Math\.round\(\(goal\.currentValue/.test(fontes.relatorios),
    "Relatórios usa getGoalProgress/isGoalReached (sem Math.round próprio)");
  assert(/getGoalProgress\(/.test(fontes.previa) && !/toFixed\(0\)/.test(fontes.previa), "prévia usa getGoalProgress (sem toFixed(0))");
}

// ═════════════════════════════════════════════════════════════════════════════
// R-A1 — progresso de meta em inteiros de centavos (Math.floor(0.29 * 100) = 28)
// ═════════════════════════════════════════════════════════════════════════════

section("R-A1 · getGoalProgress sem trap de float (conta em centavos)");
{
  // casos provados pelo verificador
  assertEq(getGoalProgress(goal(100, 29)), 29, "29 de 100 → 29 (não 28)");
  assertEq(getGoalProgress(goal(1000, 290)), 29, "290 de 1.000 → 29");
  assertEq(getGoalProgress(goal(10000, 2900)), 29, "2.900 de 10.000 → 29");
  assertEq(getGoalProgress(goal(100, 57)), 57, "57 de 100 → 57 (não 56)");
  assertEq(getGoalProgress(goal(250, 72.5)), 29, "72,50 de 250 → 29");
  assertEq(getGoalProgress(goal(3.5, 0.49)), 14, "0,49 de 3,50 → 14 (não 13)");

  // varredura: k/100 pra todo k ∈ [0..100] e alvos variados — floor exato sempre
  let erros = 0;
  for (const target of [100, 1000, 10000, 250, 3.5]) {
    for (let k = 0; k <= 100; k++) {
      const current = roundMoney((target * k) / 100);
      const esperado = Math.floor((Math.round(current * 100) * 100) / Math.round(target * 100));
      if (getGoalProgress(goal(target, current)) !== esperado) erros++;
    }
  }
  assertEq(erros, 0, "varredura k/100 (k∈[0..100]) × alvos {100, 1000, 10000, 250, 3.5}: floor exato em todos");

  assertEq(getGoalProgress(goal(5000, 5200)), 100, "5.200 de 5.000 → 100 (clamp)");
  assertEq(isGoalReached(goal(5000, 5200)), true, "5.200 de 5.000 → alcançada");
  assertEq(getGoalProgress(goal(1000, -100)), 0, "−100 de 1.000 → 0 (clamp)");
  assertEq(getGoalProgress(goal(0, 0)), 0, "0 de 0 → 0");
  assertEq(isGoalReached(goal(0, 0)), false, "0 de 0 não é 'alcançada'");
  assertEq(getGoalProgress(goal(100, 99.99)), 99, "99,99 de 100 → 99 (floor continua)");
}

// ═════════════════════════════════════════════════════════════════════════════
// A4 — saldo zero por ruído de float
// ═════════════════════════════════════════════════════════════════════════════

section("A4 · saldo exatamente zero (201,23 − 100,00 − 101,23)");
{
  assertEq(roundMoney(201.23 - 100 - 101.23), 0, "roundMoney(−2.8e-14) = 0");
  assert(Object.is(roundMoney(-0), 0), "roundMoney(−0) = +0 (senão o Intl imprime '-R$ 0,00')");
  assertEq(roundMoney(0.1 + 0.2), 0.3, "roundMoney(0.1 + 0.2) = 0.3");
  assertEq(roundMoney(1234.565), 1234.57, "roundMoney arredonda pra 2 casas");
  assertEq(brl(-0), "R$ 0,00", "formatCurrency(−0) = 'R$ 0,00'");
  assertEq(brl(-2.8e-14), "R$ 0,00", "formatCurrency(−2.8e-14) = 'R$ 0,00'");
  assertEq(brl(-0.004), "R$ 0,00", "formatCurrency(−0.004) = 'R$ 0,00' (nunca '-R$ 0,00')");
  assertEq(brl(-0.006), "-R$ 0,01", "formatCurrency(−0.006) = '-R$ 0,01' (centavo real negativo continua negativo)");

  const data: ViradaData = {
    ...vazio,
    expenses: [ex(100, { category: "Aluguel" }), ex(101.23, { category: "Mercado" })],
    incomes: [inc(201.23, { category: "Serviço" })],
  };
  const m = getDashboardMetrics(data);
  assertEq(m.balanceMonth, 0, "getDashboardMetrics: balanceMonth = 0 exato");
  assert(m.balanceMonth >= 0, "hero do Início: 'Positivo' (não 'Negativo · Gasto maior que entrada')");
  assertEq(brl(m.balanceMonth), "R$ 0,00", "hero do Início mostra 'R$ 0,00'");
  assertEq(m.incomeMonth - m.expenseMonth, 0, "Relatórios: totInc − totExp = 0 exato (KPI Saldo verde)");

  const { text } = renderChart({ expenses: data.expenses, incomes: data.incomes });
  assertEq(cardValue(text, "Saldo"), "R$ 0,00", "ExpenseChart: card Saldo = 'R$ 0,00'");
  assert(/text-blue-700[^>]*>R\$(\s|&nbsp;| )0,00/.test(renderChart({ expenses: data.expenses, incomes: data.incomes }).html), "ExpenseChart: saldo zero com tom positivo (azul)");

  assert(/roundMoney\(/.test(fontes.relatorios), "Relatórios arredonda os totais com roundMoney");
  assert(/roundMoney\(/.test(fontes.previa), "prévia arredonda os totais com roundMoney");
}

// ═════════════════════════════════════════════════════════════════════════════
// A5 — chip Essencial/Impulso não distorce o card Saldo
// ═════════════════════════════════════════════════════════════════════════════

section("A5 · chip 'Impulso' e o card Saldo");
{
  const expenses = [ex(2500, { category: "Aluguel", nature: "essencial" }), ex(300, { category: "Lazer", nature: "impulso" })];
  const incomes = [inc(3000)];
  for (const nature of ["all", "essencial", "impulso"] as const) {
    const { text } = renderChart({ expenses, incomes, defaultNature: nature });
    assertEq(cardValue(text, "Saldo"), brl(200), `filtro=${nature}: card Saldo continua R$ 200,00 (saldo real do mês)`);
    assertEq(cardValue(text, "Entradas"), brl(3000), `filtro=${nature}: card Entradas = R$ 3.000,00`);
    assertEq(cardValue(text, "Saídas"), brl(2800), `filtro=${nature}: card Saídas = todos os gastos do período`);
  }
  const imp = renderChart({ expenses, incomes, defaultNature: "impulso" });
  assert(imp.text.includes("|Lazer|") && !imp.text.includes("|Aluguel|"), "filtro Impulso: donut/legenda só com o gasto por impulso");
  assert(imp.text.includes(brl(300)), "filtro Impulso: total do donut = R$ 300,00");
  const semImpulso = renderChart({ expenses: [expenses[0]], incomes, defaultNature: "impulso" });
  assert(/Nenhum gasto por impulso/.test(semImpulso.text), "filtro Impulso sem gasto por impulso: aviso diz que é 'por impulso'");
}

// ═════════════════════════════════════════════════════════════════════════════
// A6 — "Sobrou do que entrou": uma função só, negativo é informação real
// ═════════════════════════════════════════════════════════════════════════════

section("A6 · savingsRate (Relatórios e prévia com a MESMA conta)");
{
  assertEq(savingsRate(1000, 2500), -150, "entradas 1.000 / gastos 2.500 → −150 (não trava em 0)");
  assertEq(savingsRate(0, 500), null, "entradas 0 → null (tela mostra '—')");
  assertEq(savingsRate(0, 0), null, "tudo zero → null");
  assertEq(savingsRate(3000, 2400), 20, "sobrou 600 de 3.000 → 20");
  assertEq(savingsRate(3000, 0), 100, "nada gasto → 100");
  assertEq(savingsRate(3000, 1000), 67, "2.000 de 3.000 → 67 (arredondamento único, inteiro)");
  assertEq(savingsRate(201.23, 201.23), 0, "saldo zero → 0 (não −0)");
  assert(Object.is(savingsRate(201.23, 100 + 101.23), 0), "ruído de float → +0");

  assert(/savingsRate\(/.test(fontes.relatorios) && !/Math\.max\(0, Math\.round\(\(saldo/.test(fontes.relatorios) && !/Math\.max\(0, Math\.round\(\(result/.test(fontes.relatorios),
    "Relatórios usa savingsRate (KPI e 'Por mês'), sem Math.max(0, …)");
  assert(/savingsRate\(/.test(fontes.previa) && !/toFixed\(1\)/.test(fontes.previa), "prévia usa savingsRate (KPI e Resumo mensal), sem toFixed(1)");
  assert(/Sobrou do que entrou/.test(fontes.relatorios) && !/economia do período/.test(fontes.relatorios), "rótulo 'Sobrou do que entrou' fica; subtítulo 'economia do período' sai");
}

// ═════════════════════════════════════════════════════════════════════════════
// A7 — dívida "negociando" é dívida em aberto em toda tela
// ═════════════════════════════════════════════════════════════════════════════

section("A7 · dívida 'negociando' conta como em aberto");
{
  const debts: Debt[] = [
    { id: "d1", name: "Cartão", totalValue: 1000, installmentValue: 100, dueDate: hoje, priority: "alta", status: "aberta" },
    { id: "d2", name: "Empréstimo", totalValue: 2000, installmentValue: 200, dueDate: hoje, priority: "alta", status: "negociando" },
    { id: "d3", name: "Antiga", totalValue: 4000, installmentValue: 400, dueDate: hoje, priority: "alta", status: "quitada" },
  ];
  const m = getDashboardMetrics({ ...vazio, debts });
  assertEq(m.openDebtsTotal, 3000, "getDashboardMetrics: aberta + negociando = R$ 3.000 (quitada fora)");
  assertEq(m.openDebts.length, 2, "getDashboardMetrics: 2 dívidas em aberto");
  assertEq(debts.filter(isOpenDebt).reduce((s, d) => s + d.totalValue, 0), 3000, "prévia (mesma regra): total em dívidas = R$ 3.000");
  assert(/isOpenDebt/.test(fontes.previa) && !/status\s*===\s*"aberta"/.test(fontes.previa), "prévia usa isOpenDebt (sem status === 'aberta' nos totais)");
  assert(/isOpenDebt/.test(readFileSync(new URL("../lib/utils.ts", import.meta.url), "utf8")) && !/!== "quitada"/.test(readFileSync(new URL("../lib/utils.ts", import.meta.url), "utf8")),
    "lib/utils usa isOpenDebt (sem !== 'quitada')");
}

// ═════════════════════════════════════════════════════════════════════════════
// A11 — estorno: contrato do cluster C aplicado nos totais das telas
// ═════════════════════════════════════════════════════════════════════════════

section("A11 · estorno de gasto por impulso de R$ 1.000");
{
  const data: ViradaData = {
    ...vazio,
    incomes: [inc(3000)],
    expenses: [
      ex(1200, { category: "Aluguel" }),
      ex(1000, { category: "Lazer", nature: "impulso", estornadoEm: hoje }),
      ex(200, { category: "Delivery", nature: "impulso" }),
    ],
  };
  const m = getDashboardMetrics(data);
  assertEq(m.incomeMonth, 3000, "Entradas NÃO sobem (sem contra-lançamento)");
  assertEq(m.expenseMonth, 1400, "Gastos caem: 1.200 + 200 (o estornado fica fora)");
  assertEq(m.balanceMonth, 1600, "Saldo = 3.000 − 1.400");
  assertEq(m.estimatedEconomy, 200, "'por impulso' cai pra R$ 200");
  assertEq(m.monthExpenses.length, 2, "'Lançamentos no mês' não conta o estornado");
  assertEq(m.monthIncomes.length, 1, "entradas do mês: 1");
  assert(!m.monthIncomes.some((i) => (i.category as string) === "Lazer"), "nenhuma categoria de receita inválida (ex.: 'Lazer')");

  // ExpenseChart (Início e prévia): estornado fora de tudo
  const { text } = renderChart({ expenses: data.expenses, incomes: data.incomes });
  assertEq(cardValue(text, "Saídas"), brl(1400), "ExpenseChart: Saídas = R$ 1.400,00");
  assertEq(cardValue(text, "Saldo"), brl(1600), "ExpenseChart: Saldo = R$ 1.600,00");
  assert(!text.includes("|Lazer|"), "ExpenseChart: 'Lazer' (estornado) não vira fatia");
  const imp = renderChart({ expenses: data.expenses, incomes: data.incomes, defaultNature: "impulso" });
  assert(imp.text.includes(brl(200)) && !imp.text.includes(brl(1000)), "ExpenseChart filtro Impulso: R$ 200 (não R$ 1.000 nem R$ 1.200)");

  // Relatórios: totais/categorias/impulso/dia a dia/por mês com semEstornados; histórico continua mostrando
  const rel = fontes.relatorios;
  assert(/semEstornados\(/.test(rel), "Relatórios filtra com semEstornados antes de somar");
  assert(/Estornado/.test(rel), "Relatórios mostra selo 'Estornado' no histórico");
  assert(!/cria um lançamento contrário/.test(rel), "texto da folha não promete mais 'lançamento contrário'");
  assert(/semEstornados\(/.test(fontes.previa), "prévia filtra com semEstornados antes de somar");
  assert(/isEstornado|Estornad/.test(fontes.inicio), "Início marca lançamento estornado em 'Últimos lançamentos'");

  // sanidade da regra única
  assertEq(semEstornados(data.expenses).length, 2, "semEstornados tira só o marcado");
}

// ═════════════════════════════════════════════════════════════════════════════
// R-A2 — "Dia a dia" (Relatórios): resultado e acumulado em centavos exatos
// ═════════════════════════════════════════════════════════════════════════════

section("R-A2 · Dia a dia: 201,23 − (100 + 101,23) = 0 exato (e não −2.8e-14)");
{
  const d = `${ym}-05`;
  const fluxo = dailyFlow([inc(201.23, { date: d })], [ex(100, { date: d }), ex(101.23, { date: d })]);
  assertEq(fluxo.length, 1, "um dia");
  assertEq(fluxo[0].result, 0, "resultado do dia = 0 exato");
  assert(Object.is(fluxo[0].result, 0), "resultado é +0 (não −0)");
  assert(fluxo[0].result >= 0, "linha do dia fica positiva (sem 'resultado −R$ 0,00' em vermelho)");
  assertEq(fluxo[0].acc, 0, "acumulado = 0 exato");
  assertEq(brl(fluxo[0].result), "R$ 0,00", "formata 'R$ 0,00'");

  const centavos = dailyFlow([inc(0.3, { date: d })], [ex(0.1, { date: d }), ex(0.2, { date: d })]);
  assertEq(centavos[0].result, 0, "0,30 − (0,10 + 0,20) = 0 exato");
  assertEq(centavos[0].acc, 0, "acumulado de 0,30 − 0,30 = 0");

  // acumulado arredondado a cada passo, em ordem de data crescente
  const d1 = `${ym}-01`, d2 = `${ym}-02`, d3 = `${ym}-03`;
  const varios = dailyFlow(
    [inc(0.1, { date: d1 }), inc(0.2, { date: d2 })],
    [ex(0.3, { date: d3 })],
  );
  assertEq(varios.map((x) => x.date).join(","), `${d1},${d2},${d3}`, "ordem crescente de data");
  assertEq(varios[1].acc, 0.3, "acumulado 0,10 + 0,20 = 0,30 (não 0.30000000000000004)");
  assertEq(varios[2].acc, 0, "acumulado 0,30 − 0,30 = 0 exato");
  assertEq(varios[2].result, -0.3, "resultado do dia 3 = −0,30");

  assert(/dailyFlow\(/.test(fontes.relatorios) && !/acc \+= day\.inc - day\.exp/.test(fontes.relatorios),
    "Relatórios usa dailyFlow (sem o acumulado solto sem roundMoney)");
}

// ═════════════════════════════════════════════════════════════════════════════
// R-A3 — prévia: "Status Geral → Lançamentos" conta só não-estornados (como os KPIs)
// ═════════════════════════════════════════════════════════════════════════════

section("R-A3 · prévia: 'Lançamentos (total)' do Status Geral sem estornados");
{
  const statusGeral = fontes.previa.match(/label: "Lançamentos", value: ([^,]+),/);
  assert(statusGeral !== null, "prévia tem a linha 'Lançamentos' do Status Geral");
  assertEq(statusGeral?.[1], "incomes.length + expenses.length", "Status Geral conta incomes/expenses já filtrados (semEstornados), não data.*");
  assert(/sub=\{`\$\{incomes\.length\} lançamentos`\}/.test(fontes.previa) && /sub=\{`\$\{expenses\.length\} lançamentos`\}/.test(fontes.previa),
    "KPIs 'n lançamentos' continuam nos filtrados — os dois números batem");
}

// ═════════════════════════════════════════════════════════════════════════════
// R-A4 — TransactionList (código morto): texto do confirm não mente sobre o contrato
// ═════════════════════════════════════════════════════════════════════════════

section("R-A4 · TransactionList não promete 'lançamento oposto'");
{
  assert(!/lançamento oposto|lançamento contrário/.test(fontes.transactionList), "confirm de estorno não fala em lançamento oposto/contrário");
  assert(/estornado/i.test(fontes.transactionList), "confirm explica que o lançamento fica marcado como estornado");
}

// ═════════════════════════════════════════════════════════════════════════════
// A12 — código morto: conta certa pra quando alguém ligar
// ═════════════════════════════════════════════════════════════════════════════

section("A12 · getMonthlyChart / calculateViradaScore / getMissionOfDay / missionProgress");
{
  const chart = getMonthlyChart([ex(300, { nature: "essencial" }), ex(100, { nature: "impulso" })], [inc(1000)]);
  assertEq(chart.reduce((s, c) => s + c.percentage, 0), 100, "getMonthlyChart: percentuais somam 100 (não 140)");
  assertEq(chart.map((c) => c.percentage).join("+"), "72+21+7", "1.000 / 300 / 100 → 72+21+7 (maior resto)");
  assertEq(getMonthlyChart([], []).reduce((s, c) => s + c.percentage, 0), 0, "getMonthlyChart vazio → 0+0+0");

  const full: ViradaData = {
    expenses: [ex(1, { nature: "impulso" })],
    incomes: [inc(1, { category: "Venda" })],
    debts: [{ id: "d", name: "n", totalValue: 1, installmentValue: 1, dueDate: hoje, priority: "alta", status: "quitada" }],
    goals: [goal(100, 10)],
    missionStatus: { "mission-1": true },
  };
  assertEq(calculateViradaScore(vazio, -100, -5), calculateViradaScore(vazio, 0, 0), "pontos/dias negativos não tiram score (piso por parcela)");
  assert(calculateViradaScore(vazio, -100, -5) >= 0, "score nunca é negativo");
  assertEq(calculateViradaScore({ ...full, debts: [] }, 0, 0), calculateViradaScore(full, 0, 0), "quem NÃO tem dívida não perde os 10 pontos de 'revisão de dívida'");
  assert(calculateViradaScore({ ...full, debts: [{ ...full.debts[0], status: "aberta" }] }, 0, 0) < calculateViradaScore(full, 0, 0), "dívida só 'aberta' (sem revisão) pontua menos que quitada");
  assertEq(calculateViradaScore(full, 1000, 30), 100, "teto 100");

  assertEq(getMissionOfDay(missions, 1).day, 1, "dia 1 → missão 1");
  assertEq(getMissionOfDay(missions, 30).day, 30, "dia 30 → missão 30");
  assertEq(getMissionOfDay(missions, 31).day, 30, "dia 31 → fica na missão 30 (não volta pra 1)");
  assertEq(missions.length, 30, "(há 30 missões)");

  const todas = getDashboardMetrics({ ...vazio, missionStatus: Object.fromEntries(missions.map((m) => [m.id, true])) });
  assertEq(todas.missionProgress, 100, "todas as missões feitas → 100%");
  const orfas = getDashboardMetrics({ ...vazio, missionStatus: Object.fromEntries(Array.from({ length: 40 }, (_, i) => ["k" + i, true])) });
  assert(orfas.missionProgress <= 100, "chaves órfãs não passam de 100%");
  const metade = getDashboardMetrics({ ...vazio, missionStatus: Object.fromEntries(missions.slice(0, 15).map((m) => [m.id, true])) });
  assertEq(metade.missionProgress, 50, "15 de 30 → 50% (divide pelo número real de missões)");
}

// ─── Resultado ───────────────────────────────────────────────────────────────

console.log("\n" + "═".repeat(60));
console.log(`RESULTADO: ${passed} passaram, ${failed} falharam`);
console.log("═".repeat(60));
if (failed > 0) {
  console.error("\nFalhas:");
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}
