import { buildSyncBatch, type SyncInput } from "../lib/sheets/builder";

function dateByIndex(i: number) {
  const day = (i % 28) + 1;
  return `2026-04-${String(day).padStart(2, "0")}`;
}

function makeInput(total: number): SyncInput {
  const half = Math.floor(total / 2);

  const incomes: SyncInput["incomes"] = Array.from({ length: half }, (_, i) => ({
    id: `inc-${i + 1}`,
    description: `Receita ${i + 1}`,
    value: 100 + (i % 23) * 7,
    category: i % 2 === 0 ? "Venda" : "Renda extra",
    date: dateByIndex(i),
    scope: i % 3 === 0 ? "empresa" : "casa",
    source: "app",
  }));

  const expenses: SyncInput["expenses"] = Array.from({ length: total - half }, (_, i) => ({
    id: `exp-${i + 1}`,
    description: `Despesa ${i + 1}`,
    value: 50 + (i % 19) * 5,
    category: i % 2 === 0 ? "Mercado" : "Marketing",
    date: dateByIndex(i),
    paymentMethod: i % 2 === 0 ? "Pix" : "Crédito",
    nature: i % 4 === 0 ? "impulso" : "essencial",
    scope: i % 3 === 0 ? "empresa" : "casa",
    source: "app",
  }));

  const debts: SyncInput["debts"] = Array.from({ length: 24 }, (_, i) => ({
    id: `debt-${i + 1}`,
    name: `Divida ${i + 1}`,
    totalValue: 1000 + i * 120,
    installmentValue: 120 + i * 10,
    dueDate: `2026-05-${String((i % 28) + 1).padStart(2, "0")}`,
    priority: i % 3 === 0 ? "alta" : i % 3 === 1 ? "média" : "baixa",
    status: i % 5 === 0 ? "quitada" : i % 2 === 0 ? "aberta" : "negociando",
  }));

  const goals: SyncInput["goals"] = Array.from({ length: 12 }, (_, i) => ({
    id: `goal-${i + 1}`,
    name: `Meta ${i + 1}`,
    targetValue: 5000 + i * 800,
    currentValue: 800 + i * 420,
    type: i % 2 === 0 ? "reserva" : "economia",
  }));

  return { incomes, expenses, debts, goals };
}

function must(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function main() {
  const TOTAL_LANCAMENTOS = 360;
  const input = makeInput(TOTAL_LANCAMENTOS);
  const batch = buildSyncBatch(input);

  const ranges = new Map(batch.valueRanges.map((r) => [r.range, r.values]));

  const lancamentos = ranges.get("Lançamentos!A2") ?? [];
  const receitas = ranges.get("Receitas!A2") ?? [];
  const despesas = ranges.get("Despesas!A2") ?? [];
  const fluxo = ranges.get("Fluxo de Caixa!A2") ?? [];
  const resumo = ranges.get("Resumo Mensal!A2") ?? [];

  must(lancamentos.length === TOTAL_LANCAMENTOS, `Lançamentos esperado ${TOTAL_LANCAMENTOS}, veio ${lancamentos.length}`);
  must(receitas.length === input.incomes.length, `Receitas esperado ${input.incomes.length}, veio ${receitas.length}`);
  must(despesas.length === input.expenses.length, `Despesas esperado ${input.expenses.length}, veio ${despesas.length}`);
  must(fluxo.length > 0, "Fluxo vazio");
  must(resumo.length > 0, "Resumo vazio");

  const dashboardLanc = ranges.get("Dashboard!J6")?.[0]?.[0];
  must(Number(dashboardLanc) === TOTAL_LANCAMENTOS, `Dashboard J6 esperado ${TOTAL_LANCAMENTOS}, veio ${String(dashboardLanc)}`);

  console.log("STRESS OK");
  console.log(`Lançamentos: ${lancamentos.length}`);
  console.log(`Receitas: ${receitas.length}`);
  console.log(`Despesas: ${despesas.length}`);
  console.log(`Fluxo (dias): ${fluxo.length}`);
  console.log(`Resumo (meses): ${resumo.length}`);
}

main();
