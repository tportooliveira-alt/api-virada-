/**
 * Massa de dados na planilha: 360 lançamentos (smoke) e o limite de linhas.
 *
 * B5 (auditoria): os dados começam em A2, então o 1000º lançamento cai na linha
 * 1001 — a limpeza antiga ia só até a 1000 e essa linha virava fantasma
 * permanente. A limpeza agora é aberta ("A2:I", até o fim da coluna) e tem que
 * cobrir a última linha escrita com 1.000 E com 1.001 lançamentos.
 *
 * Roda com: npx tsx scripts/test-sheets-stress.ts
 */
import { buildSyncBatch, MAX_DATA_ROWS, type SyncInput } from "../lib/sheets/builder";

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

// Última linha que uma limpeza "Aba!A2:I" ou "Aba!A2:I1000" alcança (Infinity = até o fim).
function clearEndRow(range: string) {
  const end = range.split("!")[1].split(":")[1] ?? "";
  const digits = end.replace(/[A-Z]+/, "");
  return digits ? Number(digits) : Infinity;
}

function smoke() {
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

  // J6 é o mês corrente (igual ao Início do app); o histórico inteiro fica em J8.
  const dashboardTotal = ranges.get("Dashboard!J8")?.[0]?.[0];
  must(Number(dashboardTotal) === TOTAL_LANCAMENTOS, `Dashboard J8 esperado ${TOTAL_LANCAMENTOS}, veio ${String(dashboardTotal)}`);

  console.log("STRESS OK");
  console.log(`Lançamentos: ${lancamentos.length}`);
  console.log(`Receitas: ${receitas.length}`);
  console.log(`Despesas: ${despesas.length}`);
  console.log(`Fluxo (dias): ${fluxo.length}`);
  console.log(`Resumo (meses): ${resumo.length}`);
}

function limiteDeLinhas() {
  for (const total of [MAX_DATA_ROWS, MAX_DATA_ROWS + 1]) {
    const batch = buildSyncBatch(makeInput(total));
    const escritas = batch.valueRanges.find((r) => r.range === "Lançamentos!A2")?.values.length ?? 0;
    const ultimaLinha = 2 + escritas - 1;
    const clear = batch.clearRanges.find((r) => r.startsWith("Lançamentos!A2:I"));
    must(escritas === total, `${total}: esperava ${total} linhas escritas, veio ${escritas}`);
    must(!!clear, `${total}: falta limpeza de Lançamentos`);
    must(clearEndRow(clear!) >= ultimaLinha, `${total}: limpeza (${clear}) não alcança a linha ${ultimaLinha} — viraria linha fantasma`);
    for (const r of batch.clearRanges.filter((x) => !x.startsWith("Dashboard!"))) {
      must(clearEndRow(r) === Infinity, `${total}: limpeza de aba de dados deve ser aberta (até o fim da coluna): ${r}`);
    }
    console.log(`LIMITE OK — ${total} lançamentos: escreve A2..A${ultimaLinha}, limpeza ${clear}`);
  }
  // Com 1.000 lançamentos a última linha (1001) ainda está dentro da faixa de
  // formato/filtro/zebra (MAX_DATA_ROWS + 1). Acima disso a linha continua sendo
  // limpa (limpeza aberta), mas fica sem formatação — e a grade tem só +10.
}

smoke();
limiteDeLinhas();
