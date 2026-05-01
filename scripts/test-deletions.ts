/**
 * test-deletions.ts
 * Testa especificamente o comportamento após EXCLUSÕES no Código da Virada.
 * Roda com: npx tsx scripts/test-deletions.ts
 */

import { buildSyncBatch, SyncInput } from "../lib/sheets/builder";
import { sumValues } from "../lib/utils";
import type { Expense, Income, Debt, Goal } from "../lib/types";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeIncome(id: string, value: number, date = "2026-04-15"): Income {
  return { id, description: `Receita ${id}`, value, category: "Serviço", date, scope: "casa", source: "app" };
}

function makeExpense(id: string, value: number, date = "2026-04-15"): Expense {
  return { id, description: `Despesa ${id}`, value, category: "Mercado", date, paymentMethod: "Pix", nature: "essencial", scope: "casa", source: "app" };
}

function makeDebt(id: string, totalValue: number, status: Debt["status"] = "aberta"): Debt {
  return { id, name: `Dívida ${id}`, totalValue, installmentValue: totalValue / 10, dueDate: "2026-05-01", priority: "média", status };
}

function makeGoal(id: string, targetValue: number, currentValue: number): Goal {
  return { id, name: `Meta ${id}`, targetValue, currentValue, type: "economia" };
}

function removeById<T extends { id: string }>(arr: T[], id: string): T[] {
  return arr.filter((item) => item.id !== id);
}

function getRange(batch: ReturnType<typeof buildSyncBatch>, prefix: string) {
  return batch.valueRanges.find((vr) => vr.range.startsWith(prefix));
}

function getDashCell(batch: ReturnType<typeof buildSyncBatch>, cell: string) {
  return batch.valueRanges.find((vr) => vr.range === `Dashboard!${cell}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// A) Exclusão de receita — todos os totais regridem corretamente
// ─────────────────────────────────────────────────────────────────────────────

section("A) Exclusão de receita — totais regridem");

{
  // Estado inicial: 3 receitas, 0 despesas
  let incomes: Income[] = [
    makeIncome("r1", 1000),
    makeIncome("r2", 500),
    makeIncome("r3", 250),
  ];
  const expenses: Expense[] = [];

  // Antes da exclusão
  const totalAntes = sumValues(incomes, (i) => i.value);
  assertCloseTo(totalAntes, 1750, "A: totalReceitas antes = 1750");

  // Remove a de 500
  incomes = removeById(incomes, "r2");
  const totalDepois = sumValues(incomes, (i) => i.value);
  assertCloseTo(totalDepois, 1250, "A: totalReceitas após remover 500 = 1250 (não 1750)");

  const saldo = totalDepois - sumValues(expenses, (e) => e.value);
  assertCloseTo(saldo, 1250, "A: saldo recalcula para 1250 - 0 = 1250");

  const batch = buildSyncBatch({ incomes, expenses, debts: [], goals: [] });

  // Planilha reflete só 2 receitas
  const recVR = getRange(batch, "Receitas");
  assert(recVR !== undefined, "A: valueRanges contém Receitas");
  if (recVR) {
    assertEq((recVR.values as unknown[][]).length, 2, "A: planilha tem 2 receitas (não 3)");
  }

  // Dashboard B6 = 1250
  const dashB6 = getDashCell(batch, "B6");
  assert(dashB6 !== undefined, "A: Dashboard!B6 presente");
  if (dashB6) {
    assertEq((dashB6.values as unknown[][])[0][0], 1250, "A: Dashboard B6 = 1250 (não 1750)");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// B) Exclusão de despesa — saldo sobe corretamente
// ─────────────────────────────────────────────────────────────────────────────

section("B) Exclusão de despesa — saldo sobe");

{
  const incomes: Income[] = [makeIncome("baseInc", 2000)];
  let expenses: Expense[] = [
    makeExpense("d1", 400),
    makeExpense("d2", 300),
    makeExpense("d3", 200),
  ];

  const totalAntes = sumValues(expenses, (e) => e.value);
  assertCloseTo(totalAntes, 900, "B: totalDespesas antes = 900");

  // Remove a de 300
  expenses = removeById(expenses, "d2");
  const totalDepois = sumValues(expenses, (e) => e.value);
  assertCloseTo(totalDepois, 600, "B: totalDespesas após remover 300 = 600 (não 900)");

  const totalReceitas = sumValues(incomes, (i) => i.value);
  const saldo = totalReceitas - totalDepois;
  assertCloseTo(saldo, 1400, "B: saldo = 2000 - 600 = 1400 (não 2000 - 900 = 1100)");

  const batch = buildSyncBatch({ incomes, expenses, debts: [], goals: [] });

  // Planilha tem 2 despesas
  const desVR = getRange(batch, "Despesas");
  assert(desVR !== undefined, "B: valueRanges contém Despesas");
  if (desVR) {
    assertEq((desVR.values as unknown[][]).length, 2, "B: planilha tem 2 despesas (não 3)");
  }

  // Dashboard D6 = 600
  const dashD6 = getDashCell(batch, "D6");
  assert(dashD6 !== undefined, "B: Dashboard!D6 presente");
  if (dashD6) {
    assertEq((dashD6.values as unknown[][])[0][0], 600, "B: Dashboard D6 = 600 (não 900)");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// C) Exclusão do único item — não quebra, volta a zero
// ─────────────────────────────────────────────────────────────────────────────

section("C) Exclusão do único item — não quebra, volta a zero");

{
  let incomes: Income[] = [makeIncome("solo1", 500)];
  const expenses: Expense[] = [];

  // Remove ela
  incomes = removeById(incomes, "solo1");
  assertEq(incomes.length, 0, "C: lista de receitas ficou vazia");

  const totalReceitas = sumValues(incomes, (i) => i.value);
  assertEq(totalReceitas, 0, "C: totalReceitas = 0 (não NaN)");
  assert(Number.isFinite(totalReceitas), "C: totalReceitas é Number.isFinite (não NaN/Infinity)");

  const totalDespesas = sumValues(expenses, (e) => e.value);
  const saldo = totalReceitas - totalDespesas;
  assertEq(saldo, 0, "C: saldo = 0 - 0 = 0 (não explode)");
  assert(Number.isFinite(saldo), "C: saldo é Number.isFinite");

  // buildSyncBatch com arrays vazios não deve lançar erro
  let batch: ReturnType<typeof buildSyncBatch> | undefined;
  let threw = false;
  try {
    batch = buildSyncBatch({ incomes, expenses, debts: [], goals: [] });
  } catch (e) {
    threw = true;
  }
  assert(!threw, "C: buildSyncBatch com arrays vazios não lança exceção");

  if (batch) {
    // Planilha retorna arrays vazios para receitas (range ausente ou vazio)
    const recVR = getRange(batch, "Receitas");
    assert(
      recVR === undefined || (recVR.values as unknown[][]).length === 0,
      "C: planilha Receitas retorna ausente ou vazio (não undefined explosivo)"
    );

    // Fluxo de caixa vazio
    const fluVR = getRange(batch, "Fluxo de Caixa");
    assert(
      fluVR === undefined || Array.isArray((fluVR.values as unknown[][])),
      "C: fluxo de caixa não crasheia — retorna array ou está ausente"
    );
    if (fluVR) {
      assertEq((fluVR.values as unknown[][]).length, 0, "C: fluxo de caixa = [] (0 linhas)");
    }

    // Resumo mensal vazio
    const resVR = getRange(batch, "Resumo Mensal");
    assert(
      resVR === undefined || Array.isArray((resVR.values as unknown[][])),
      "C: resumo mensal não crasheia — retorna array ou está ausente"
    );
    if (resVR) {
      assertEq((resVR.values as unknown[][]).length, 0, "C: resumo mensal = [] (0 linhas)");
    }

    // Dashboard B6 deve ser 0
    const dashB6 = getDashCell(batch, "B6");
    if (dashB6) {
      assertEq((dashB6.values as unknown[][])[0][0], 0, "C: Dashboard B6 = 0 com lista vazia");
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// D) Exclusão de dívida — totais de dívidas somam correto
// ─────────────────────────────────────────────────────────────────────────────

section("D) Exclusão de dívida — totais corretos");

{
  let debts: Debt[] = [
    makeDebt("dv1", 1000),
    makeDebt("dv2", 2000),
    makeDebt("dv3", 3000),
    makeDebt("dv4", 500),
  ];

  const totalAntes = sumValues(debts.filter((d) => d.status !== "quitada"), (d) => d.totalValue);
  assertCloseTo(totalAntes, 6500, "D: totalDívidasAbertas antes = 6500");
  assertEq(debts.filter((d) => d.status !== "quitada").length, 4, "D: contagem antes = 4");

  // Remove a de 2000
  debts = removeById(debts, "dv2");
  const abertas = debts.filter((d) => d.status !== "quitada");
  const totalDepois = sumValues(abertas, (d) => d.totalValue);

  assertCloseTo(totalDepois, 4500, "D: totalDívidasAbertas após remover 2000 = 4500 (não 6500)");
  assertEq(abertas.length, 3, "D: contagem de dívidas abertas = 3 (não 4)");

  const batch = buildSyncBatch({ incomes: [], expenses: [], debts, goals: [] });

  const divVR = getRange(batch, "Dívidas");
  assert(divVR !== undefined, "D: valueRanges contém Dívidas");
  if (divVR) {
    assertEq((divVR.values as unknown[][]).length, 3, "D: planilha Dívidas tem 3 linhas (não 4)");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// E) Exclusão de meta — progresso some
// ─────────────────────────────────────────────────────────────────────────────

section("E) Exclusão de meta — progresso some");

{
  let goals: Goal[] = [
    makeGoal("gA", 1000, 500),
    makeGoal("gB", 2000, 1000),
  ];

  assertEq(goals.length, 2, "E: lista antes = 2 metas");

  // Remove meta A
  goals = removeById(goals, "gA");

  assertEq(goals.length, 1, "E: lista após exclusão = 1 meta (não 2)");

  // A restante é B com os valores corretos
  const metaB = goals[0];
  assertEq(metaB.id, "gB", "E: a meta restante tem id=gB");
  assertEq(metaB.targetValue, 2000, "E: meta B targetValue = 2000");
  assertEq(metaB.currentValue, 1000, "E: meta B currentValue = 1000");

  const batch = buildSyncBatch({ incomes: [], expenses: [], debts: [], goals });

  const metVR = getRange(batch, "Metas");
  assert(metVR !== undefined, "E: valueRanges contém Metas");
  if (metVR) {
    assertEq((metVR.values as unknown[][]).length, 1, "E: planilha Metas tem 1 linha (não 2)");
    const row = (metVR.values as unknown[][])[0];
    assertEq(row[0], "Meta gB", "E: linha da planilha é a meta B");
    assertEq(row[2], 2000, "E: targetValue na planilha = 2000");
    assertEq(row[3], 1000, "E: currentValue na planilha = 1000");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// F) Exclusão + reinserção — sem duplicata
// ─────────────────────────────────────────────────────────────────────────────

section("F) Exclusão + reinserção — sem duplicata fantasma");

{
  // Adiciona receita ID="rx1" valor 300
  let incomes: Income[] = [makeIncome("rx1", 300)];
  assertEq(sumValues(incomes, (i) => i.value), 300, "F: totalReceitas após inserção = 300");

  // Remove rx1
  incomes = removeById(incomes, "rx1");
  assertEq(incomes.length, 0, "F: lista vazia após remoção");

  // Re-adiciona rx1 valor 300
  incomes = [makeIncome("rx1", 300)];
  assertEq(incomes.length, 1, "F: 1 item após reinserção");

  const total = sumValues(incomes, (i) => i.value);
  assertEq(total, 300, "F: totalReceitas = 300 (não 600 — sem duplicata fantasma)");

  const batch = buildSyncBatch({ incomes, expenses: [], debts: [], goals: [] });

  const recVR = getRange(batch, "Receitas");
  assert(recVR !== undefined, "F: valueRanges contém Receitas");
  if (recVR) {
    assertEq((recVR.values as unknown[][]).length, 1, "F: planilha tem exatamente 1 linha de receita (não 2)");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// G) Exclusão intercalada — ordem não importa
// ─────────────────────────────────────────────────────────────────────────────

section("G) Exclusão intercalada — ordem não importa");

{
  let incomes: Income[] = [
    makeIncome("A", 100),
    makeIncome("B", 200),
    makeIncome("C", 300),
    makeIncome("D", 400),
  ];

  const totalAntes = sumValues(incomes, (i) => i.value);
  assertEq(totalAntes, 1000, "G: total antes = 1000");

  // Remove B (200) e D (400)
  incomes = removeById(incomes, "B");
  incomes = removeById(incomes, "D");

  const totalDepois = sumValues(incomes, (i) => i.value);
  assertEq(totalDepois, 400, "G: total após remover B e D = 400 (A + C = 100 + 300)");
  assertEq(incomes.length, 2, "G: 2 itens restantes");

  const batch = buildSyncBatch({ incomes, expenses: [], debts: [], goals: [] });

  const recVR = getRange(batch, "Receitas");
  assert(recVR !== undefined, "G: valueRanges contém Receitas");
  if (recVR) {
    const rows = recVR.values as unknown[][];
    assertEq(rows.length, 2, "G: planilha tem 2 linhas de receitas");

    // Valores presentes na coluna 3 (index 3 = Valor)
    const valores = rows.map((r) => r[3] as number);
    assert(valores.includes(100), "G: valor 100 (A) presente na planilha");
    assert(valores.includes(300), "G: valor 300 (C) presente na planilha");
    assert(!valores.includes(200), "G: valor 200 (B excluído) ausente da planilha");
    assert(!valores.includes(400), "G: valor 400 (D excluído) ausente da planilha");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// H) Fluxo de caixa após exclusão — saldo acumulado recalcula
// ─────────────────────────────────────────────────────────────────────────────

section("H) Fluxo de caixa após exclusão — saldo acumulado recalcula");

{
  const DIA1 = "2026-04-01";
  const DIA2 = "2026-04-02";

  const incomes: Income[] = [
    makeIncome("inc_d1", 500, DIA1),
    makeIncome("inc_d2", 100, DIA2),
  ];

  let expenses: Expense[] = [
    makeExpense("exp_d1", 200, DIA1),
    makeExpense("exp_d2_400", 400, DIA2),
  ];

  // Estado antes da exclusão
  const batchAntes = buildSyncBatch({ incomes, expenses, debts: [], goals: [] });
  const fluAntes = getRange(batchAntes, "Fluxo de Caixa");
  assert(fluAntes !== undefined, "H: fluxo de caixa antes existe");

  if (fluAntes) {
    const rows = fluAntes.values as unknown[][];
    assertEq(rows.length, 2, "H: fluxo tem 2 linhas antes (dias 1 e 2)");

    // Dia 1: receita 500, despesa 200 → resultado +300, acumulado +300
    const d1 = rows[0];
    assertCloseTo(d1[1] as number, 500, "H: dia 1 entradas = 500");
    assertCloseTo(d1[2] as number, 200, "H: dia 1 saídas = 200");
    assertCloseTo(d1[3] as number, 300, "H: dia 1 resultado = +300");
    assertCloseTo(d1[4] as number, 300, "H: dia 1 acumulado = +300");

    // Dia 2: receita 100, despesa 400 → resultado -300, acumulado 0
    const d2 = rows[1];
    assertCloseTo(d2[1] as number, 100, "H: dia 2 entradas = 100");
    assertCloseTo(d2[2] as number, 400, "H: dia 2 saídas = 400 (antes da exclusão)");
    assertCloseTo(d2[3] as number, -300, "H: dia 2 resultado = -300 (antes da exclusão)");
    assertCloseTo(d2[4] as number, 0, "H: dia 2 acumulado = 0 (antes da exclusão)");
  }

  // Remove a despesa 400 do dia 2
  expenses = removeById(expenses, "exp_d2_400");

  const batchDepois = buildSyncBatch({ incomes, expenses, debts: [], goals: [] });
  const fluDepois = getRange(batchDepois, "Fluxo de Caixa");
  assert(fluDepois !== undefined, "H: fluxo de caixa após exclusão existe");

  if (fluDepois) {
    const rows = fluDepois.values as unknown[][];
    assertEq(rows.length, 2, "H: fluxo ainda tem 2 linhas (dia 2 ainda tem receita)");

    // Dia 2 após exclusão: receita 100, despesa 0 → resultado +100
    const d2after = rows[1];
    assertCloseTo(d2after[1] as number, 100, "H: dia 2 entradas = 100 (após exclusão)");
    assertCloseTo(d2after[2] as number, 0, "H: dia 2 saídas = 0 (despesa 400 removida)");
    assertCloseTo(d2after[3] as number, 100, "H: dia 2 resultado = +100 (não -300)");

    // Acumulado final = 300 (dia 1) + 100 (dia 2) = 400
    assertCloseTo(d2after[4] as number, 400, "H: acumulado final = 400 (não 0) — 300 + 100");
  }
}

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

// ─── I) Estorno ──────────────────────────────────────────────────────────────
console.log("\n[I] Estorno — lançamento oposto cancela o efeito no saldo");

{
  const expenses = [
    { id: "e1", description: "Supermercado", value: 500, category: "Mercado", date: "2026-04-10", paymentMethod: "Pix", nature: "essencial", scope: "casa", source: "app" },
  ];
  const incomes = [
    { id: "i1", description: "Salário", value: 3000, category: "Salário", date: "2026-04-05", scope: "casa", source: "app" },
  ];

  // Estado antes do estorno
  const saldoAntes = 3000 - 500;
  check("saldo antes do estorno = 2500", saldoAntes === 2500);

  // Estorno da despesa: cria receita de 500
  const estornoReceita = { id: "est1", description: "ESTORNO — Supermercado", value: 500, category: "Outros", date: "2026-04-10", scope: "casa", source: "app" };
  const incomesComEstorno = [...incomes, estornoReceita];

  const totalReceitas = incomesComEstorno.reduce((s, i) => s + i.value, 0);
  const totalDespesas = expenses.reduce((s, e) => s + e.value, 0);
  const saldoApos = totalReceitas - totalDespesas;

  check("após estorno totalReceitas = 3500", totalReceitas === 3500);
  check("após estorno totalDespesas = 500 (original permanece)", totalDespesas === 500);
  check("após estorno saldo = 3000 (neutro)", saldoApos === 3000);

  // Planilha reflete 3 lançamentos (original + estorno receita)
  const batch = buildSyncBatch({ expenses, incomes: incomesComEstorno, debts: [], goals: [] });
  const recRange = batch.valueRanges.find(v => v.range === "Receitas!A2");
  const desRange = batch.valueRanges.find(v => v.range === "Despesas!A2");
  check("planilha tem 2 receitas (salário + estorno)", (recRange?.values ?? []).length === 2);
  check("planilha tem 1 despesa (original permanece)", (desRange?.values ?? []).length === 1);
  check("linha de estorno tem prefixo ESTORNO", String((recRange?.values ?? [])[1]?.[1] ?? "").startsWith("ESTORNO"));
  check("Dashboard B6 = 3500 (com estorno)", batch.valueRanges.find(v => v.range === "Dashboard!B6")?.values[0][0] === 3500);
  check("Dashboard F6 = 3000 (saldo neutro)", batch.valueRanges.find(v => v.range === "Dashboard!F6")?.values[0][0] === 3000);

  // Estorno de receita: cria despesa
  const estornoDespesa = { id: "est2", description: "ESTORNO — Salário", value: 3000, category: "Outros", paymentMethod: "Outro" as const, nature: "essencial" as const, date: "2026-04-05", scope: "casa" as const, source: "app" as const };
  const expensesComEstorno = [...expenses, estornoDespesa];
  const totalDespesasComEstorno = expensesComEstorno.reduce((s, e) => s + e.value, 0);
  check("estorno de receita cria despesa correta (3500)", totalDespesasComEstorno === 3500);
  check("saldo após estornar receita = -500", totalReceitas - totalDespesasComEstorno === -500);
}

console.log(`\nTotal estorno: ${pass} passou, ${fail} falhou`);
