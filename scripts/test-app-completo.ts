/**
 * test-app-completo.ts
 * Teste completo do app Código da Virada
 * Roda com: npx tsx scripts/test-app-completo.ts
 */

// ─── Imports diretos dos módulos do app ──────────────────────────────────────
import { buildSyncBatch, SyncInput } from "../lib/sheets/builder";
import { getDashboardMetrics, getGoalProgress, sumValues } from "../lib/utils";
import type { ViradaData, Expense, Income, Debt, Goal } from "../lib/types";

// ─── Utilitários de teste ─────────────────────────────────────────────────────

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

function assertCloseTo(actual: number, expected: number, label: string, decimals = 2) {
  const tol = Math.pow(10, -decimals) / 2;
  const ok = Math.abs(actual - expected) < tol;
  assert(ok, label, ok ? undefined : `esperado=${expected}, obtido=${actual}, diff=${Math.abs(actual - expected)}`);
}

function section(name: string) {
  console.log(`\n━━━ ${name} ━━━`);
}

// ─── Dados de teste ───────────────────────────────────────────────────────────

const TODAY = "2026-04-30";
const YESTERDAY = "2026-04-29";
const DAY_BEFORE = "2026-04-28";

const incomes: Income[] = [
  { id: "inc-1", description: "Salário", value: 1500.00, category: "Salário", date: TODAY, scope: "casa", source: "app" },
  { id: "inc-2", description: "Freela", value: 750.50, category: "Serviço", date: YESTERDAY, scope: "casa", source: "app" },
  { id: "inc-3", description: "Venda produto", value: 249.50, category: "Venda", date: DAY_BEFORE, scope: "casa", source: "app" },
];
// 1500.00 + 750.50 + 249.50 = 2500.00

const expenses: Expense[] = [
  { id: "exp-1", description: "Mercado", value: 800.00, category: "Mercado", date: TODAY, paymentMethod: "Pix", nature: "essencial", scope: "casa", source: "app" },
  { id: "exp-2", description: "Aluguel", value: 900.00, category: "Aluguel", date: YESTERDAY, paymentMethod: "Débito", nature: "essencial", scope: "casa", source: "app" },
  { id: "exp-3", description: "Netflix impulso", value: 400.00, category: "Lazer", date: DAY_BEFORE, paymentMethod: "Crédito", nature: "impulso", scope: "casa", source: "app" },
];
// 800.00 + 900.00 + 400.00 = 2100.00

const debts: Debt[] = [
  { id: "dbt-1", name: "Cartão Visa", totalValue: 3000.00, installmentValue: 250.00, dueDate: "2026-05-10", priority: "alta", status: "aberta" },
  { id: "dbt-2", name: "Empréstimo", totalValue: 5000.00, installmentValue: 500.00, dueDate: "2026-05-15", priority: "média", status: "aberta" },
  { id: "dbt-3", name: "Financiamento", totalValue: 10000.00, installmentValue: 800.00, dueDate: "2026-06-01", priority: "baixa", status: "negociando" },
  { id: "dbt-4", name: "Dívida quitada", totalValue: 1000.00, installmentValue: 100.00, dueDate: "2026-03-01", priority: "baixa", status: "quitada" },
];

const goals: Goal[] = [
  { id: "goal-1", name: "Reserva emergência", targetValue: 10000.00, currentValue: 3500.00, type: "reserva" },
  { id: "goal-2", name: "Viagem férias", targetValue: 5000.00, currentValue: 5200.00, type: "economia" },
];

const viradaData: ViradaData = {
  incomes,
  expenses,
  debts,
  goals,
  missionStatus: {},
};

const syncInput: SyncInput = {
  incomes,
  expenses,
  debts,
  goals,
};

// ─────────────────────────────────────────────────────────────────────────────
// A) ARITMÉTICA DE RECEITAS / DESPESAS
// ─────────────────────────────────────────────────────────────────────────────

section("A) Aritmética de receitas/despesas");

const totalReceitas = incomes.reduce((s, i) => s + i.value, 0);
const totalDespesas = expenses.reduce((s, e) => s + e.value, 0);
const saldo = totalReceitas - totalDespesas;

assertCloseTo(totalReceitas, 2500.00, "totalReceitas = 2500.00");
assertCloseTo(totalDespesas, 2100.00, "totalDespesas = 2100.00");
assertCloseTo(saldo, 400.00, "saldo = 400.00 (sem erro float)");
assertEq(
  Math.round((totalReceitas - totalDespesas) * 100) / 100,
  400.00,
  "saldo arredondado = receitas - despesas"
);

// Verificar com sumValues do utils.ts
const totalReceitasSumValues = sumValues(incomes, (i) => i.value);
const totalDespesasSumValues = sumValues(expenses, (e) => e.value);
assertCloseTo(totalReceitasSumValues, 2500.00, "sumValues(receitas) = 2500.00");
assertCloseTo(totalDespesasSumValues, 2100.00, "sumValues(despesas) = 2100.00");

// ─────────────────────────────────────────────────────────────────────────────
// B) FLUXO DE CAIXA (builder.ts)
// ─────────────────────────────────────────────────────────────────────────────

section("B) Fluxo de caixa (buildSyncBatch)");

const batch = buildSyncBatch(syncInput);

// Encontrar o range do Fluxo de Caixa
const fluVR = batch.valueRanges.find((vr) => vr.range.startsWith("Fluxo de Caixa"));
assert(fluVR !== undefined, "valueRanges contém Fluxo de Caixa");

if (fluVR) {
  const rows = fluVR.values as unknown[][];

  // Deve ter 3 linhas (3 datas diferentes: hoje, ontem, antes de ontem)
  assertEq(rows.length, 3, "Fluxo de caixa tem 3 linhas (3 datas)");

  // Verificar que o saldo acumulado final == saldo geral
  const lastRow = rows[rows.length - 1];
  const accFinal = lastRow[4] as number;
  assertCloseTo(accFinal, 400.00, "Saldo acumulado final do fluxo = 400.00 (saldo geral)");

  // Verificar que o saldo acumulado cresce corretamente dia a dia
  let prevAcc = 0;
  let accOk = true;
  for (const row of rows) {
    const inn = row[1] as number;
    const out = row[2] as number;
    const diff = row[3] as number;
    const acc = row[4] as number;
    const expectedDiff = inn - out;
    const expectedAcc = prevAcc + diff;
    if (Math.abs(diff - expectedDiff) > 0.01 || Math.abs(acc - expectedAcc) > 0.01) {
      accOk = false;
    }
    prevAcc = acc;
  }
  assert(accOk, "Saldo acumulado dia a dia está correto");

  // Verificar agrupamento por data: cada linha deve ser uma data única
  const dates = rows.map((r) => r[0] as string);
  const uniqueDates = new Set(dates);
  assertEq(uniqueDates.size, dates.length, "Cada linha do fluxo é uma data única");
}

// ─────────────────────────────────────────────────────────────────────────────
// C) RESUMO MENSAL
// ─────────────────────────────────────────────────────────────────────────────

section("C) Resumo mensal");

const resVR = batch.valueRanges.find((vr) => vr.range.startsWith("Resumo Mensal"));
assert(resVR !== undefined, "valueRanges contém Resumo Mensal");

if (resVR) {
  const rows = resVR.values as unknown[][];
  // Todas as transações são do mesmo mês (2026-04), então deve ter 1 linha
  assertEq(rows.length, 1, "Resumo mensal tem 1 linha (mês 2026-04)");

  const [_m, inn, out, result, _accM, eco, _count] = rows[0] as number[];
  assertCloseTo(inn, 2500.00, "Resumo mensal: entradas = 2500.00");
  assertCloseTo(out, 2100.00, "Resumo mensal: saídas = 2100.00");
  assertCloseTo(result, 400.00, "Resumo mensal: resultado = 400.00");

  // Economia% = resultado / entradas
  const expectedEco = 400 / 2500; // 0.16
  assertCloseTo(eco, expectedEco, "Resumo mensal: economia% = result/entradas (0.16)", 4);
  assert(eco >= 0 && eco <= 1, "Economia% está entre 0 e 1");
}

// ─────────────────────────────────────────────────────────────────────────────
// D) DÍVIDAS
// ─────────────────────────────────────────────────────────────────────────────

section("D) Dívidas");

const openDebts = debts.filter((d) => d.status !== "quitada");
const totalDebtsOpen = openDebts.reduce((s, d) => s + d.totalValue, 0);

assertEq(openDebts.length, 3, "3 dívidas não quitadas (aberta + aberta + negociando)");
assertCloseTo(totalDebtsOpen, 18000.00, "totalDívidasAbertas = 3000 + 5000 + 10000 = 18000");

// Verificar que a quitada NÃO está no total
const quitada = debts.find((d) => d.status === "quitada");
assert(quitada !== undefined, "Existe dívida quitada");
assert(!openDebts.some((d) => d.id === quitada?.id), "Dívida quitada não entra em totalDívidasAbertas");

// Verificar coluna "Em aberto" na planilha
const divVR = batch.valueRanges.find((vr) => vr.range.startsWith("Dívidas"));
assert(divVR !== undefined, "valueRanges contém Dívidas");

if (divVR) {
  const rows = divVR.values as unknown[][];
  assertEq(rows.length, 4, "Planilha dívidas tem 4 linhas");

  // Coluna 6 (índice 6) = "Em aberto"
  for (const row of rows) {
    const name = row[0] as string;
    const status = row[3] as string;
    const emAberto = row[6] as number;
    const totalValue = row[5] as number;

    if (status === "quitada") {
      assertEq(emAberto, 0, `"Em aberto" = 0 para dívida quitada (${name})`);
    } else {
      assertEq(emAberto, totalValue, `"Em aberto" = totalValue para dívida ${status} (${name})`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// E) METAS
// ─────────────────────────────────────────────────────────────────────────────

section("E) Metas");

const metVR = batch.valueRanges.find((vr) => vr.range.startsWith("Metas"));
assert(metVR !== undefined, "valueRanges contém Metas");

if (metVR) {
  const rows = metVR.values as unknown[][];
  assertEq(rows.length, 2, "Planilha metas tem 2 linhas");

  for (const row of rows) {
    const name = row[0] as string;
    const targetValue = row[2] as number;
    const currentValue = row[3] as number;
    const missing = row[4] as number;
    const progress = row[5] as number;

    // Faltando = max(target - current, 0) — nunca negativo
    const expectedMissing = Math.max(targetValue - currentValue, 0);
    assertEq(missing, expectedMissing, `Meta "${name}": faltando = max(target - current, 0)`);
    assert(missing >= 0, `Meta "${name}": faltando >= 0 (nunca negativo)`);

    // Progresso entre 0 e 1
    const expectedProgress = targetValue > 0 ? currentValue / targetValue : 0;
    assertCloseTo(progress, expectedProgress, `Meta "${name}": progresso = current/target`, 4);
    // Progresso pode ultrapassar 1 se currentValue > targetValue, mas deve ser >= 0
    assert(progress >= 0, `Meta "${name}": progresso >= 0`);
  }
}

// Teste com getGoalProgress (utils.ts) — retorna 0-100, capped em 100
const goalReserva = goals[0]; // currentValue=3500, target=10000
const goalViagem = goals[1];  // currentValue=5200, target=5000 (excede!)

const progressReserva = getGoalProgress(goalReserva);
const progressViagem = getGoalProgress(goalViagem);

assertEq(progressReserva, 35, "getGoalProgress(reserva): 3500/10000 = 35%");
assertEq(progressViagem, 100, "getGoalProgress(viagem): currentValue > targetValue → capped em 100%");
assert(progressViagem <= 100, "getGoalProgress nunca passa de 100");

// ─────────────────────────────────────────────────────────────────────────────
// F) PLANILHA (builder.ts) — valores exatos
// ─────────────────────────────────────────────────────────────────────────────

section("F) Planilha (builder.ts) — valores exatos");

// Receitas: 3 linhas de dados
const recVR = batch.valueRanges.find((vr) => vr.range.startsWith("Receitas"));
assert(recVR !== undefined, "valueRanges contém Receitas");
if (recVR) {
  assertEq((recVR.values as unknown[][]).length, 3, "Receitas tem exatamente 3 linhas de dados");
}

// Despesas: 3 linhas de dados
const desVR = batch.valueRanges.find((vr) => vr.range.startsWith("Despesas"));
assert(desVR !== undefined, "valueRanges contém Despesas");
if (desVR) {
  assertEq((desVR.values as unknown[][]).length, 3, "Despesas tem exatamente 3 linhas de dados");
}

// Dashboard B6 = 2500, D6 = 2100, F6 = 400
const dashB6 = batch.valueRanges.find((vr) => vr.range === "Dashboard!B6");
const dashD6 = batch.valueRanges.find((vr) => vr.range === "Dashboard!D6");
const dashF6 = batch.valueRanges.find((vr) => vr.range === "Dashboard!F6");

assert(dashB6 !== undefined, "valueRanges contém Dashboard!B6");
assert(dashD6 !== undefined, "valueRanges contém Dashboard!D6");
assert(dashF6 !== undefined, "valueRanges contém Dashboard!F6");

if (dashB6) assertEq((dashB6.values as unknown[][])[0][0], 2500, "Dashboard B6 = 2500 (receitas exatas)");
if (dashD6) assertEq((dashD6.values as unknown[][])[0][0], 2100, "Dashboard D6 = 2100 (despesas exatas)");
if (dashF6) assertEq((dashF6.values as unknown[][])[0][0], 400,  "Dashboard F6 = 400 (saldo exato)");

// Verificar que nenhum valor numérico tem erro de ponto flutuante (>2 casas decimais)
function hasFloatError(v: unknown): boolean {
  if (typeof v !== "number" || !Number.isFinite(v)) return false;
  // Verifica se tem mais de 2 casas decimais "significativas" (ignorando zeros)
  const s = v.toString();
  const dotPos = s.indexOf(".");
  if (dotPos === -1) return false;
  const decimals = s.slice(dotPos + 1);
  // Remove zeros à direita
  const trimmed = decimals.replace(/0+$/, "");
  return trimmed.length > 2;
}

let floatErrors = 0;
for (const vr of batch.valueRanges) {
  for (const row of (vr.values as unknown[][])) {
    for (const cell of row) {
      if (hasFloatError(cell)) {
        floatErrors++;
        console.error(`    FLOAT ERROR em ${vr.range}: valor=${cell}`);
      }
    }
  }
}
assertEq(floatErrors, 0, "Nenhum valor na planilha tem erro de ponto flutuante");

// ─────────────────────────────────────────────────────────────────────────────
// G) PRECISÃO BRL — 100 somas aleatórias
// ─────────────────────────────────────────────────────────────────────────────

section("G) Precisão BRL (aritmética de ponto flutuante)");

function randomBRL(): number {
  // Valor aleatório de 0.01 a 999.99 com 2 casas decimais
  const cents = Math.floor(Math.random() * 99999) + 1;
  return cents / 100;
}

function countDecimalPlaces(v: number): number {
  const s = v.toString();
  const dotPos = s.indexOf(".");
  if (dotPos === -1) return 0;
  return s.slice(dotPos + 1).replace(/0+$/, "").length;
}

// Para evitar erros float, vamos usar arredondamento de 2 casas em cada soma
function sumBRL(values: number[]): number {
  return Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100;
}

let floatFails = 0;
const NUM_TESTS = 100;
for (let t = 0; t < NUM_TESTS; t++) {
  const vals = Array.from({ length: 5 }, randomBRL);
  const sum = vals.reduce((a, b) => a + b, 0);
  const rounded = Math.round(sum * 100) / 100;
  const decimals = countDecimalPlaces(rounded);
  if (decimals > 2) {
    floatFails++;
    console.error(`    FLOAT FAIL: ${vals.join(" + ")} = ${sum} (rounded=${rounded}, decimals=${decimals})`);
  }
}
assertEq(floatFails, 0, `${NUM_TESTS} somas aleatórias BRL: resultado sempre com ≤ 2 casas decimais após Math.round`);

// Teste direto: 0.1 + 0.2 sem round
const raw = 0.1 + 0.2;
const rounded = Math.round(raw * 100) / 100;
assertCloseTo(rounded, 0.30, "0.1 + 0.2 arredondado = 0.30 (correção de ponto flutuante)");
assert(countDecimalPlaces(rounded) <= 2, "0.1 + 0.2 arredondado tem ≤ 2 casas decimais");

// ─────────────────────────────────────────────────────────────────────────────
// H) getDashboardMetrics (utils.ts) — dados do mês atual
// ─────────────────────────────────────────────────────────────────────────────

section("H) getDashboardMetrics (sanidade com dados do mês atual)");

// Criar dados com data do mês atual para acionar isFromCurrentMonth
const currentMonth = new Date().toISOString().slice(0, 7); // "2026-04"
const currentDate = `${currentMonth}-15`;

const dataThisMonth: ViradaData = {
  incomes: [
    { id: "t-inc-1", description: "Teste", value: 1500.00, category: "Salário", date: currentDate, source: "app" },
    { id: "t-inc-2", description: "Teste2", value: 1000.00, category: "Serviço", date: currentDate, source: "app" },
  ],
  expenses: [
    { id: "t-exp-1", description: "Teste", value: 700.00, category: "Mercado", date: currentDate, paymentMethod: "Pix", nature: "essencial", source: "app" },
    { id: "t-exp-2", description: "Teste impulso", value: 300.00, category: "Lazer", date: currentDate, paymentMethod: "Crédito", nature: "impulso", source: "app" },
  ],
  debts: [
    { id: "t-dbt-1", name: "Cartão", totalValue: 2000.00, installmentValue: 200.00, dueDate: currentDate, priority: "alta", status: "aberta" },
    { id: "t-dbt-2", name: "Quitada", totalValue: 500.00, installmentValue: 50.00, dueDate: currentDate, priority: "baixa", status: "quitada" },
  ],
  goals: [{ id: "t-goal-1", name: "Reserva", targetValue: 5000.00, currentValue: 1000.00, type: "reserva" }],
  missionStatus: { m1: true, m2: true, m3: false },
};

const metrics = getDashboardMetrics(dataThisMonth);
assertCloseTo(metrics.incomeMonth, 2500.00, "getDashboardMetrics: incomeMonth = 2500.00");
assertCloseTo(metrics.expenseMonth, 1000.00, "getDashboardMetrics: expenseMonth = 1000.00");
assertCloseTo(metrics.balanceMonth, 1500.00, "getDashboardMetrics: balanceMonth = 1500.00");
assertCloseTo(metrics.openDebtsTotal, 2000.00, "getDashboardMetrics: openDebtsTotal = 2000 (não inclui quitada)");
assertCloseTo(metrics.estimatedEconomy, 300.00, "getDashboardMetrics: estimatedEconomy = 300 (só impulso)");

// ─────────────────────────────────────────────────────────────────────────────
// RESULTADO FINAL
// ─────────────────────────────────────────────────────────────────────────────

console.log("\n" + "═".repeat(60));
console.log(`RESULTADO: ${passed} passaram, ${failed} falharam`);
if (failures.length > 0) {
  console.log("\nFALHAS:");
  failures.forEach((f) => console.log(`  • ${f}`));
}
console.log("═".repeat(60));

if (failed > 0) process.exit(1);
