/**
 * Testa o fluxo completo de estorno:
 * estornar gasto → cria receita oposta (saldo neutro)
 * estornar receita → cria despesa oposta (saldo neutro)
 * Planilha reflete valores exatos com o estorno incluído.
 */
import { buildSyncBatch } from "../lib/sheets/builder";
import type { SyncInput } from "../lib/sheets/builder";

let pass = 0, fail = 0;
const check = (label: string, ok: boolean, hint?: string) => {
  if (ok) { pass++; console.log(`  ✓ ${label}`); }
  else    { fail++; console.log(`  ✗ ${label}${hint ? ` — ${hint}` : ""}`); }
};

const round = (n: number) => Math.round(n * 100) / 100;

// ─── Dados base ──────────────────────────────────────────────────────────────
const baseInput: SyncInput = {
  expenses: [
    { id: "e1", description: "Supermercado",  value: 500,  category: "Mercado",  date: "2026-04-10", paymentMethod: "Pix",     nature: "essencial", scope: "casa", source: "app" },
    { id: "e2", description: "Conta de luz",  value: 200,  category: "Energia",  date: "2026-04-15", paymentMethod: "Boleto",  nature: "essencial", scope: "casa", source: "app" },
    { id: "e3", description: "Saída impulso", value: 150,  category: "Lazer",    date: "2026-04-20", paymentMethod: "Crédito", nature: "impulso",   scope: "casa", source: "app" },
  ],
  incomes: [
    { id: "i1", description: "Salário",       value: 3000, category: "Salário",  date: "2026-04-05", scope: "casa", source: "app" },
    { id: "i2", description: "Freela",        value: 800,  category: "Renda extra", date: "2026-04-12", scope: "casa", source: "app" },
  ],
  debts: [],
  goals: [],
};

const totalReceitas = baseInput.incomes.reduce((s, i) => s + i.value, 0);   // 3800
const totalDespesas = baseInput.expenses.reduce((s, e) => s + e.value, 0);  // 850
const saldoBase = round(totalReceitas - totalDespesas);                       // 2950

// ─── A) Estado base (sem estorno) ────────────────────────────────────────────
console.log("\n[A] Estado base — antes do estorno");
check("totalReceitas = 3800", totalReceitas === 3800);
check("totalDespesas = 850",  totalDespesas === 850);
check("saldo = 2950",          saldoBase === 2950);

const batchBase = buildSyncBatch(baseInput);
const b6base = batchBase.valueRanges.find(v => v.range === "Dashboard!B6")?.values[0][0];
const d6base = batchBase.valueRanges.find(v => v.range === "Dashboard!D6")?.values[0][0];
const f6base = batchBase.valueRanges.find(v => v.range === "Dashboard!F6")?.values[0][0];
check("planilha B6 = 3800", b6base === 3800);
check("planilha D6 = 850",  d6base === 850);
check("planilha F6 = 2950", f6base === 2950);

// ─── B) Estorno de despesa (e1 = Supermercado 500) ───────────────────────────
console.log("\n[B] Estorno de despesa (Supermercado R$ 500)");
// Estorno cria receita oposta com prefixo "ESTORNO —"
const inputEstornoDespesa: SyncInput = {
  ...baseInput,
  incomes: [
    ...baseInput.incomes,
    { id: "est_e1", description: "ESTORNO — Supermercado", value: 500, category: "Outros", date: "2026-04-10", scope: "casa", source: "app" },
  ],
};
// Despesa original PERMANECE no histórico
const recEstorno = inputEstornoDespesa.incomes.reduce((s, i) => s + i.value, 0); // 3800 + 500 = 4300
const desEstorno = inputEstornoDespesa.expenses.reduce((s, e) => s + e.value, 0); // 850 (original permanece)
const saldoEstorno = round(recEstorno - desEstorno); // 3500

check("despesa original permanece no histórico", inputEstornoDespesa.expenses.length === 3);
check("totalReceitas após estorno = 4300 (com estorno)",  recEstorno === 4300);
check("totalDespesas após estorno = 850 (original mantido)", desEstorno === 850);
check("saldo após estorno = 3500 (efeito cancelado + receita original 3800-850=2950, +estorno 500 = 3450)... saldo = receitas - despesas", saldoEstorno === 3450);

const batchEstorno = buildSyncBatch(inputEstornoDespesa);
const b6est = batchEstorno.valueRanges.find(v => v.range === "Dashboard!B6")?.values[0][0];
const d6est = batchEstorno.valueRanges.find(v => v.range === "Dashboard!D6")?.values[0][0];
const f6est = batchEstorno.valueRanges.find(v => v.range === "Dashboard!F6")?.values[0][0];
check("planilha B6 = 4300 (com estorno)",         b6est === 4300);
check("planilha D6 = 850 (despesa original mantida)", d6est === 850);
check("planilha F6 = 3450 (saldo correto)",       f6est === 3450);

// Linha de estorno aparece nas Receitas da planilha
const receitasRange = batchEstorno.valueRanges.find(v => v.range === "Receitas!A2");
const linhaEstorno = (receitasRange?.values ?? []).find(row => String(row[1]).startsWith("ESTORNO"));
check("planilha Receitas tem linha com prefixo ESTORNO", !!linhaEstorno);
check("planilha Receitas tem 3 linhas (2 originais + 1 estorno)", (receitasRange?.values ?? []).length === 3);
check("valor da linha de estorno = 500", Number(linhaEstorno?.[3]) === 500);

// Fluxo de caixa do dia 10 agora soma: receita 500 estorno + despesa 500 original → resultado 0
const fluxoRange = batchEstorno.valueRanges.find(v => v.range === "Fluxo de Caixa!A2");
const dia10 = (fluxoRange?.values ?? []).find(row => String(row[0]) === "10/04/2026");
check("fluxo dia 10: entradas = 500 (estorno)", Number(dia10?.[1]) === 500);
check("fluxo dia 10: saídas = 500 (original)", Number(dia10?.[2]) === 500);
check("fluxo dia 10: resultado = 0 (neutro)",  Number(dia10?.[3]) === 0);

// ─── C) Estorno de receita (i2 = Freela 800) ─────────────────────────────────
console.log("\n[C] Estorno de receita (Freela R$ 800)");
const inputEstornoReceita: SyncInput = {
  ...baseInput,
  expenses: [
    ...baseInput.expenses,
    { id: "est_i2", description: "ESTORNO — Freela", value: 800, category: "Outros", paymentMethod: "Outro", nature: "essencial", date: "2026-04-12", scope: "casa", source: "app" },
  ],
};
const recER  = inputEstornoReceita.incomes.reduce((s, i) => s + i.value, 0);   // 3800
const desER  = inputEstornoReceita.expenses.reduce((s, e) => s + e.value, 0);  // 850 + 800 = 1650
const saldoER = round(recER - desER); // 2150

check("receita original permanece no histórico", inputEstornoReceita.incomes.length === 2);
check("totalDespesas após estorno receita = 1650", desER === 1650);
check("totalReceitas = 3800 (não muda)", recER === 3800);
check("saldo após estorno receita = 2150", saldoER === 2150);

const batchER = buildSyncBatch(inputEstornoReceita);
check("planilha B6 = 3800 (receitas não mudam)", batchER.valueRanges.find(v => v.range === "Dashboard!B6")?.values[0][0] === 3800);
check("planilha D6 = 1650 (com estorno)",         batchER.valueRanges.find(v => v.range === "Dashboard!D6")?.values[0][0] === 1650);
check("planilha F6 = 2150 (saldo correto)",        batchER.valueRanges.find(v => v.range === "Dashboard!F6")?.values[0][0] === 2150);

const despesasRange = batchER.valueRanges.find(v => v.range === "Despesas!A2");
const linhaEstornoD = (despesasRange?.values ?? []).find(row => String(row[1]).startsWith("ESTORNO"));
check("planilha Despesas tem linha ESTORNO", !!linhaEstornoD);
check("planilha Despesas tem 4 linhas (3 originais + 1 estorno)", (despesasRange?.values ?? []).length === 4);
check("valor da linha de estorno = 800", Number(linhaEstornoD?.[3]) === 800);

// ─── D) Estorno duplo — efeito cumulativo ────────────────────────────────────
console.log("\n[D] Estorno duplo — dois gastos estornados");
const inputDuplo: SyncInput = {
  ...baseInput,
  incomes: [
    ...baseInput.incomes,
    { id: "est_e1b", description: "ESTORNO — Supermercado", value: 500, category: "Outros", date: "2026-04-10", scope: "casa", source: "app" },
    { id: "est_e2b", description: "ESTORNO — Conta de luz", value: 200, category: "Outros", date: "2026-04-15", scope: "casa", source: "app" },
  ],
};
const recDuplo = inputDuplo.incomes.reduce((s, i) => s + i.value, 0);  // 3800 + 700 = 4500
const desDuplo = inputDuplo.expenses.reduce((s, e) => s + e.value, 0); // 850 (originais permanecem)
const saldoDuplo = round(recDuplo - desDuplo); // 3650

check("dois estornos: receitas = 4500", recDuplo === 4500);
check("dois estornos: despesas = 850 (originais)", desDuplo === 850);
check("dois estornos: saldo = 3650", saldoDuplo === 3650);
check("planilha F6 com duplo estorno = 3650",
  buildSyncBatch(inputDuplo).valueRanges.find(v => v.range === "Dashboard!F6")?.values[0][0] === 3650
);

// ─── E) Estorno não cria ponto flutuante ────────────────────────────────────
console.log("\n[E] Precisão — valores com centavos");
const inputCentavos: SyncInput = {
  expenses: [
    { id: "ec1", description: "Farmácia", value: 37.45, category: "Saúde", date: "2026-04-01", paymentMethod: "Débito", nature: "essencial", scope: "casa", source: "app" },
  ],
  incomes: [
    { id: "ic1", description: "Gorjeta", value: 12.80, category: "Outros", date: "2026-04-01", scope: "casa", source: "app" },
    { id: "est_ec1", description: "ESTORNO — Farmácia", value: 37.45, category: "Outros", date: "2026-04-01", scope: "casa", source: "app" },
  ],
  debts: [], goals: [],
};
const batchCentavos = buildSyncBatch(inputCentavos);
const f6centavos = Number(batchCentavos.valueRanges.find(v => v.range === "Dashboard!F6")?.values[0][0]);
const saldoEsperado = round(12.80 + 37.45 - 37.45); // 12.80
check("saldo com centavos e estorno = 12.80 (sem ponto flutuante)", f6centavos === 12.80, `recebeu ${f6centavos}`);
check("f6 tem no máximo 2 casas decimais", Number(f6centavos.toFixed(2)) === f6centavos);

// ─── Resultado ───────────────────────────────────────────────────────────────
console.log(`\nTotal: ${pass} passou, ${fail} falhou`);
if (fail > 0) process.exit(1);
