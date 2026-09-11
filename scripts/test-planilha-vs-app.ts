/**
 * test-planilha-vs-app.ts — a planilha Google tem que mostrar OS MESMOS números
 * que o app mostra na tela Início. O comprador compara os dois; se divergir,
 * pede reembolso.
 *
 * Cobre os achados da auditoria da planilha:
 *  B1  Dashboard A6/D6/G6/J6 = getDashboardMetrics (mês corrente) ao centavo,
 *      com os mesmos rótulos do Início; acumulado do histórico vai num bloco
 *      separado "Desde o início".
 *  B2  Meta estourada: progresso trava em 100%; "meta batida" só com atual ≥ alvo.
 *  B6  Dívidas: prioridade crítica e ordenação usam o contrato isOpenDebt.
 *  B11 Economia = savingsRate do app (lib/utils.ts), em fração; "—" sem entradas.
 *  B12 ESTORNO: lançamento estornado fica na lista com selo e FORA de todo total.
 *
 * "Mês corrente" é sempre data LOCAL (toInputDate), nunca toISOString — perto
 * da meia-noite o UTC já está no dia/mês seguinte e o teste mentiria.
 *
 * Roda com: npx tsx scripts/test-planilha-vs-app.ts
 */

import { buildStaticValues, buildSyncBatch, type SyncInput } from "../lib/sheets/builder";
import { getDashboardMetrics, getGoalProgress, savingsRate, toInputDate } from "../lib/utils";
import { isOpenDebt, semEstornados } from "../lib/types";
import type { Debt, Expense, Goal, Income, ViradaData } from "../lib/types";

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

const centavos = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

type Batch = ReturnType<typeof buildSyncBatch>;
const cell = (batch: Batch, range: string) => batch.valueRanges.find((v) => v.range === range)?.values?.[0]?.[0];
// Intl separa "R$" do número com espaço duro (U+00A0); normaliza pra comparar.
const txt = (v: unknown) => String(v ?? "").replace(/\u00a0/g, " ");
const rows = (batch: Batch, range: string) => (batch.valueRanges.find((v) => v.range === range)?.values ?? []) as unknown[][];
const staticCell = (range: string) => buildStaticValues().find((v) => v.range === range)?.values?.[0] ?? [];

// ─── Datas LOCAIS: mês corrente e mês anterior ───────────────────────────────
const hoje = new Date();
const HOJE = toInputDate(hoje);
const MES_ATUAL_DIA1 = toInputDate(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
const MES_ANTERIOR_DIA5 = toInputDate(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 5));
const MES_ANTERIOR_DIA6 = toInputDate(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 6));

// ─── Dataset de dois meses (mesmo do auditor: app 3.079,93 x planilha 5.279,60)
const incomes: Income[] = [
  { id: "i1", description: "Salário mês passado", value: 3000, category: "Salário", date: MES_ANTERIOR_DIA5, scope: "casa", source: "app" },
  { id: "i2", description: "Salário", value: 3000, category: "Salário", date: MES_ATUAL_DIA1, scope: "casa", source: "app" },
  { id: "i3", description: "Venda", value: 450.55, category: "Venda", date: HOJE, scope: "casa", source: "app" },
];
const expenses: Expense[] = [
  { id: "e1", description: "Mercado mês passado", value: 800.33, category: "Mercado", date: MES_ANTERIOR_DIA6, paymentMethod: "Pix", nature: "essencial", scope: "casa", source: "app" },
  { id: "e2", description: "Lazer", value: 250.12, category: "Lazer", date: MES_ATUAL_DIA1, paymentMethod: "Crédito", nature: "impulso", scope: "casa", source: "app" },
  { id: "e3", description: "Água/Luz", value: 120.5, category: "Água", date: HOJE, paymentMethod: "Boleto", nature: "essencial", scope: "casa", source: "app" },
];
const debts: Debt[] = [
  { id: "d1", name: "Cartão", totalValue: 1800, installmentValue: 600, dueDate: "2026-10-05", priority: "alta", status: "aberta" },
  { id: "d2", name: "Empréstimo", totalValue: 5000, installmentValue: 500, dueDate: "2026-10-15", priority: "média", status: "negociando" },
  { id: "d3", name: "Velha", totalValue: 300, installmentValue: 300, dueDate: "2026-01-01", priority: "alta", status: "quitada" },
];
const goals: Goal[] = [
  { id: "g1", name: "Reserva", targetValue: 12000, currentValue: 3000, type: "reserva" },
  { id: "g2", name: "Cofrinho", targetValue: 1000, currentValue: 2500, type: "economia" }, // estourou o alvo
];

const data: ViradaData = { incomes, expenses, debts, goals, missionStatus: {} };
const app = getDashboardMetrics(data);
const batch = buildSyncBatch(data as SyncInput);

// ─────────────────────────────────────────────────────────────────────────────
section("B1) Dashboard da planilha = Início do app (mês corrente, ao centavo)");
// ─────────────────────────────────────────────────────────────────────────────

assertEq(cell(batch, "Dashboard!A6"), centavos(app.incomeMonth), "A6 = incomeMonth (entradas do mês)");
assertEq(cell(batch, "Dashboard!D6"), centavos(app.expenseMonth), "D6 = expenseMonth (gastos do mês)");
assertEq(cell(batch, "Dashboard!G6"), centavos(app.balanceMonth), "G6 = balanceMonth (em caixa no mês)");
assertEq(cell(batch, "Dashboard!J6"), app.monthIncomes.length + app.monthExpenses.length, "J6 = lançamentos do mês");

// sanidade: o dataset realmente tem dois meses — senão o teste não prova nada
assert(cell(batch, "Dashboard!A6") !== 6450.55, "A6 NÃO é o histórico inteiro (6.450,55)");
assertEq(cell(batch, "Dashboard!G6"), 3079.93, "G6 = 3.079,93 (o número que o Início mostra)");

const labels = staticCell("Dashboard!A5");
assertEq(labels[0], "Entradas neste mês", "rótulo A5 = 'Entradas neste mês'");
assertEq(labels[3], "Gastos neste mês", "rótulo D5 = 'Gastos neste mês'");
assertEq(labels[6], "Em caixa neste mês", "rótulo G5 = 'Em caixa neste mês'");
assertEq(labels[9], "Lançamentos no mês", "rótulo J5 = 'Lançamentos no mês'");

section("B1) Bloco 'Desde o início' — histórico inteiro, rotulado");
const subLabels = staticCell("Dashboard!A7");
for (const col of [0, 3, 6, 9]) {
  assert(String(subLabels[col] ?? "").toLowerCase().includes("desde o início"), `rótulo do acumulado na coluna ${col} diz 'Desde o início'`);
}
assertEq(cell(batch, "Dashboard!A8"), 6450.55, "A8 = entradas desde o início");
assertEq(cell(batch, "Dashboard!D8"), 1170.95, "D8 = gastos desde o início");
assertEq(cell(batch, "Dashboard!G8"), 5279.6, "G8 = em caixa desde o início");
assertEq(cell(batch, "Dashboard!J8"), 6, "J8 = lançamentos desde o início");

// ─────────────────────────────────────────────────────────────────────────────
section("B2) Meta estourada — progresso trava em 100% como no app");
// ─────────────────────────────────────────────────────────────────────────────

const metas = rows(batch, "Metas!A2");
const cofrinho = metas.find((r) => r[0] === "Cofrinho");
const reserva = metas.find((r) => r[0] === "Reserva");
assertEq(cofrinho?.[5], 1, "Cofrinho (2.500 de 1.000): progresso = 1 (100%), não 2,5");
assertEq(cofrinho?.[4], 0, "Cofrinho: faltando = 0");
assertEq(reserva?.[5], 0.25, "Reserva: progresso = 0,25");
assertEq(getGoalProgress(goals[1]), 100, "app: getGoalProgress(Cofrinho) = 100");
const painelMetas = rows(batch, "Metas!K4:K7");
assert(String(painelMetas[3]?.[0]).includes("100,0%"), "painel 'Melhor progresso' mostra 100,0%", String(painelMetas[3]?.[0]));
assert(!String(painelMetas[3]?.[0]).includes("250"), "painel 'Melhor progresso' não mostra 250%");
assert(String(painelMetas[3]?.[0]).toLowerCase().includes("meta batida"), "painel diz 'meta batida' quando atual ≥ alvo");
{
  const quase = buildSyncBatch({ incomes: [], expenses: [], debts: [], goals: [{ id: "g", name: "Quase", targetValue: 1000, currentValue: 999.99, type: "economia" }] });
  assert(!String(rows(quase, "Metas!K4:K7")[3]?.[0]).toLowerCase().includes("meta batida"), "999,99 de 1.000 NÃO é 'meta batida'");
}

// ─────────────────────────────────────────────────────────────────────────────
section("B6) Dívidas — contrato isOpenDebt (aberta OU negociando)");
// ─────────────────────────────────────────────────────────────────────────────

const painelDividas = rows(batch, "Dívidas!K4:K7");
const abertoRef = centavos(debts.filter(isOpenDebt).reduce((s, d) => s + d.totalValue, 0));
assertEq(txt(painelDividas[1]?.[0]), "R$ 6.800,00", "painel 'Total em aberto' = aberta + negociando (6.800)");
assertEq(abertoRef, app.openDebtsTotal, "app openDebtsTotal = mesmo contrato");
const dividas = rows(batch, "Dívidas!A2");
assertEq(dividas.find((r) => r[0] === "Empréstimo")?.[6], 5000, "negociando conta como 'Em aberto' na linha");
assertEq(dividas.find((r) => r[0] === "Velha")?.[6], 0, "quitada tem 'Em aberto' = 0");
assertEq(dividas[dividas.length - 1]?.[0], "Velha", "quitada vai por último na ordenação");
assertEq(dividas[0]?.[0], "Cartão", "aberta de prioridade alta vem primeiro");
{
  const tudoQuitado = buildSyncBatch({ incomes: [], expenses: [], goals: [], debts: [
    { id: "q1", name: "Paga", totalValue: 1000, installmentValue: 100, dueDate: "2026-02-01", priority: "alta", status: "quitada" },
  ] });
  const painel = rows(tudoQuitado, "Dívidas!K4:K7");
  assertEq(painel[3]?.[0], "—", "tudo quitado: 'Prioridade mais crítica' = '—' (não 'Alta')");
  assertEq(painel[2]?.[0], "1", "tudo quitado: 'Quitadas' = 1");
}
{
  const misto = buildSyncBatch({ incomes: [], expenses: [], goals: [], debts: [
    { id: "a", name: "Aberta baixa 5000", totalValue: 5000, installmentValue: 100, dueDate: "2026-02-01", priority: "baixa", status: "aberta" },
    { id: "b", name: "Quitada alta 0", totalValue: 0, installmentValue: 0, dueDate: "2026-02-01", priority: "alta", status: "quitada" },
    { id: "c", name: "Negociando baixa 7000", totalValue: 7000, installmentValue: 100, dueDate: "2026-02-01", priority: "baixa", status: "negociando" },
  ] });
  const nomes = rows(misto, "Dívidas!A2").map((r) => r[0]);
  assertEq(JSON.stringify(nomes), JSON.stringify(["Negociando baixa 7000", "Aberta baixa 5000", "Quitada alta 0"]), "abertas primeiro (prioridade, depois maior valor), quitada por último");
  assertEq(rows(misto, "Dívidas!K4:K7")[3]?.[0], "Baixa", "prioridade crítica só entre abertas (Baixa, não Alta da quitada)");
}

// ─────────────────────────────────────────────────────────────────────────────
section("B11) Economia = taxa de sobra do app; sem entradas → '—'");
// ─────────────────────────────────────────────────────────────────────────────

// R-B4: a coluna Economia é o savingsRate do app (% inteiro) em fração — a
// coluna tem formato PERCENT. Mesmo número nos dois lados, sem cópia da regra.
assertEq(savingsRate(1000, 250), 75, "app: savingsRate(1000, 250) = 75%");
assertEq(savingsRate(100, 300), -200, "app: savingsRate(100, 300) = −200% (gastou 3x o que entrou; sem piso)");
assertEq(savingsRate(0, 110), null, "app: savingsRate(0, 110) = null (não existe taxa sem entrada)");
{
  const soGasto = buildSyncBatch({ incomes: [], expenses: [{ id: "e", description: "Gás", value: 110, category: "Outros", date: HOJE, paymentMethod: "Pix", nature: "essencial" }], debts: [], goals: [] });
  assertEq(rows(soGasto, "Resumo Mensal!A2")[0]?.[5], "—", "mês só com gasto: Economia = '—' (não 0,0%)");
  assertEq(rows(soGasto, "Resumo Mensal!K4:K7")[3]?.[0], "—", "painel 'Economia média' = '—' quando nenhum mês tem entrada");
  const tresVezes = buildSyncBatch({ incomes: [{ id: "i", description: "x", value: 100, category: "Venda", date: HOJE }], expenses: [{ id: "e", description: "Gás", value: 300, category: "Outros", date: HOJE, paymentMethod: "Pix", nature: "essencial" }], debts: [], goals: [] });
  assertEq(rows(tresVezes, "Resumo Mensal!A2")[0]?.[5], -2, "gastou 3x o que entrou: Economia = −2 (−200%, sem piso)");
}
const resumo = rows(batch, "Resumo Mensal!A2");
assertEq(resumo[0]?.[5], 0.73, "mês anterior: Economia = savingsRate(3000, 800,33) = 73% → 0,73 (não 0,7332…)");
for (const r of resumo) {
  const esperado = savingsRate(Number(r[1]), Number(r[2]));
  assertEq(r[5], esperado === null ? "—" : esperado / 100, `Resumo ${String(r[0]).slice(0, 7)}: Economia idêntica ao savingsRate do app`);
}

// ─────────────────────────────────────────────────────────────────────────────
section("B12) ESTORNO — fica na lista com selo, sai de todo total");
// ─────────────────────────────────────────────────────────────────────────────

const comEstorno: ViradaData = {
  ...data,
  expenses: expenses.map((e) => (e.id === "e2" ? { ...e, estornadoEm: HOJE } : e)),
  incomes: incomes.map((i) => (i.id === "i3" ? { ...i, estornadoEm: HOJE } : i)),
};
const be = buildSyncBatch(comEstorno as SyncInput);
const validos = { incomes: semEstornados(comEstorno.incomes), expenses: semEstornados(comEstorno.expenses) };
const mesKey = HOJE.slice(0, 7);
const refEntradasMes = centavos(validos.incomes.filter((i) => i.date.startsWith(mesKey)).reduce((s, i) => s + i.value, 0));
const refGastosMes = centavos(validos.expenses.filter((e) => e.date.startsWith(mesKey)).reduce((s, e) => s + e.value, 0));

assertEq(rows(be, "Despesas!A2").length, 3, "Despesas: estornada continua listada (3 linhas)");
assertEq(rows(be, "Receitas!A2").length, 3, "Receitas: estornada continua listada (3 linhas)");
assertEq(rows(be, "Lançamentos!A2").length, 6, "Lançamentos: 6 linhas (histórico inteiro)");
const linhaLazer = rows(be, "Despesas!A2").find((r) => String(r[1]).startsWith("Lazer"));
assert(String(linhaLazer?.[1] ?? "").toLowerCase().includes("estornad"), "linha estornada tem selo 'estornado' na descrição", String(linhaLazer?.[1]));
assert(!rows(be, "Receitas!A2").some((r) => String(r[1]).startsWith("ESTORNO")), "nenhuma linha 'ESTORNO —' (não existe contra-lançamento)");

assertEq(cell(be, "Dashboard!A6"), refEntradasMes, "KPI entradas do mês ignora receita estornada");
assertEq(cell(be, "Dashboard!D6"), refGastosMes, "KPI gastos do mês ignora despesa estornada");
assertEq(cell(be, "Dashboard!G6"), centavos(refEntradasMes - refGastosMes), "KPI em caixa ignora estornados");
assertEq(cell(be, "Dashboard!J6"), 2, "KPI lançamentos do mês = 2 (4 − 2 estornados)");
assertEq(cell(be, "Dashboard!A8"), 6000, "Desde o início: entradas sem a receita estornada");
assertEq(cell(be, "Dashboard!D8"), centavos(800.33 + 120.5), "Desde o início: gastos sem a despesa estornada");
assertEq(cell(be, "Dashboard!J8"), 4, "Desde o início: 4 lançamentos válidos");

const topCat = rows(be, "Dashboard!A12:B21").map((r) => r[0]);
assert(!topCat.includes("Lazer"), "top categorias não inclui a categoria só da despesa estornada");
const fluxo = rows(be, "Fluxo de Caixa!A2");
const somaFluxoSaidas = centavos(fluxo.reduce((s, r) => s + Number(r[2] || 0), 0));
assertEq(somaFluxoSaidas, centavos(800.33 + 120.5), "Fluxo: saídas diárias sem a estornada");
const resumoE = rows(be, "Resumo Mensal!A2");
const mesAtual = resumoE.find((r) => String(r[0]).startsWith(mesKey));
assertEq(mesAtual?.[1], 3000, "Resumo: entradas do mês sem a receita estornada");
assertEq(mesAtual?.[2], 120.5, "Resumo: saídas do mês sem a despesa estornada");
assertEq(mesAtual?.[6], 2, "Resumo: 2 lançamentos no mês (estornados fora)");
assertEq(rows(be, "Lançamentos!K4:K7")[0]?.[0], "4", "painel Lançamentos 'Total lançado' = 4 válidos");
assertEq(rows(be, "Receitas!K4:K7")[0]?.[0], "2", "painel Receitas 'Qtde de entradas' = 2 válidas");
assertEq(txt(rows(be, "Despesas!K4:K7")[1]?.[0]), "R$ 920,83", "painel Despesas 'Total gasto' sem a estornada");

// ─────────────────────────────────────────────────────────────────────────────
console.log("\n" + "═".repeat(60));
console.log(`RESULTADO: ${passed} passaram, ${failed} falharam`);
if (failures.length > 0) {
  console.log("\nFALHAS:");
  failures.forEach((f) => console.log(`  • ${f}`));
}
console.log("═".repeat(60));
if (failed > 0) process.exit(1);
