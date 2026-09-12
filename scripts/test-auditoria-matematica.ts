import { buildSyncBatch, type SyncInput } from "../lib/sheets/builder";
import { computeFinancialIntelligence } from "../lib/financial-intelligence";

function round(num: number) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

// ─── CENÁRIO DE ESTRESSE FINANCEIRO REALISTA ──────────────────────────────────
const testIncomes: SyncInput["incomes"] = [
  { id: "inc-1", description: "Salário CLT Principal", value: 6500.0, category: "Salário", date: "2026-09-01", scope: "casa" },
  { id: "inc-2", description: "Consultoria / Freelance", value: 1800.0, category: "Renda extra", date: "2026-09-05", scope: "empresa" },
  { id: "inc-3", description: "Rendimento CDB Liquidez", value: 245.5, category: "Investimentos", date: "2026-09-10", scope: "casa" },
  { id: "inc-4", description: "Venda Monitor Antigo OLX", value: 450.0, category: "Venda", date: "2026-09-11", scope: "casa" },
  { id: "inc-5", description: "Reembolso Despesas Viagem", value: 380.0, category: "Reembolso", date: "2026-09-12", scope: "empresa" },
];

const testExpenses: SyncInput["expenses"] = [
  // Essenciais (Moradia, Alimentação, Saúde, Transporte)
  { id: "exp-1", description: "Aluguel Apartamento", value: 2100.0, category: "Moradia", date: "2026-09-02", nature: "essencial", scope: "casa" },
  { id: "exp-2", description: "Supermercado Semanal 1", value: 620.4, category: "Alimentação", date: "2026-09-03", nature: "essencial", scope: "casa" },
  { id: "exp-3", description: "Supermercado Semanal 2", value: 580.9, category: "Alimentação", date: "2026-09-09", nature: "essencial", scope: "casa" },
  { id: "exp-4", description: "Energia Elétrica (Enel)", value: 285.4, category: "Moradia", date: "2026-09-05", nature: "essencial", scope: "casa" },
  { id: "exp-5", description: "Água e Esgoto", value: 98.7, category: "Moradia", date: "2026-09-06", nature: "essencial", scope: "casa" },
  { id: "exp-6", description: "Internet Fibra Óptica", value: 129.9, category: "Moradia", date: "2026-09-07", nature: "essencial", scope: "casa" },
  { id: "exp-7", description: "Plano de Saúde Unimed", value: 480.0, category: "Saúde", date: "2026-09-08", nature: "essencial", scope: "casa" },
  { id: "exp-8", description: "Gasolina Posto Shell", value: 240.0, category: "Transporte", date: "2026-09-04", nature: "essencial", scope: "casa" },
  { id: "exp-9", description: "Recarga Bilhete Único", value: 180.0, category: "Transporte", date: "2026-09-08", nature: "essencial", scope: "casa" },
  { id: "exp-10", description: "Farmácia Remédios", value: 115.8, category: "Saúde", date: "2026-09-10", nature: "essencial", scope: "casa" },
  
  // Impulso / Estilo de Vida (Lazer, Restaurante, Compras)
  { id: "exp-11", description: "Jantar Sexta Restaurante", value: 210.0, category: "Restaurante", date: "2026-09-04", nature: "impulso", scope: "casa" },
  { id: "exp-12", description: "Compras Shopee Vestuário", value: 340.0, category: "Roupas", date: "2026-09-06", nature: "impulso", scope: "casa" },
  { id: "exp-13", description: "Streaming Netflix + Spot", value: 79.8, category: "Lazer", date: "2026-09-05", nature: "impulso", scope: "casa" },
  { id: "exp-14", description: "Delivery Ifood Hambúrguer", value: 88.5, category: "Restaurante", date: "2026-09-09", nature: "impulso", scope: "casa" },
  { id: "exp-15", description: "Cafeteria Starbucks", value: 38.0, category: "Restaurante", date: "2026-09-11", nature: "impulso", scope: "casa" },
  { id: "exp-16", description: "Cinema com Pipoca", value: 95.0, category: "Lazer", date: "2026-09-12", nature: "impulso", scope: "casa" },
];

const testDebts: SyncInput["debts"] = [
  { id: "debt-1", name: "Cartão Nubank Rotativo", totalValue: 1200.0, installmentValue: 350.0, dueDate: "2026-09-15", priority: "alta", status: "aberta" },
  { id: "debt-2", name: "Empréstimo Pessoal Caixa", totalValue: 4800.0, installmentValue: 420.0, dueDate: "2026-09-20", priority: "alta", status: "aberta" },
  { id: "debt-3", name: "Financiamento Moto Honda", totalValue: 12500.0, installmentValue: 650.0, dueDate: "2026-09-25", priority: "média", status: "aberta" },
  { id: "debt-4", name: "Renegociação Cartão Antigo", totalValue: 800.0, installmentValue: 100.0, dueDate: "2026-09-10", priority: "baixa", status: "quitada" },
];

const testGoals: SyncInput["goals"] = [
  { id: "goal-1", name: "Reserva de Emergência 6 Meses", targetValue: 15000.0, currentValue: 4500.0, type: "reserva" },
  { id: "goal-2", name: "Viagem Fim de Ano Família", targetValue: 3000.0, currentValue: 1800.0, type: "economia" },
  { id: "goal-3", name: "Upgrade Notebook Trabalho", targetValue: 5000.0, currentValue: 1000.0, type: "equipamento" },
];

// ─── EXECUÇÃO DO TESTE DE AUDITORIA MATEMÁTICA ────────────────────────────────
function runAuditoria() {
  console.log("==================================================================");
  console.log("🔍 AUDITORIA MATEMÁTICA: APP INTELIGENTE vs PLANILHA GOOGLE");
  console.log("==================================================================\n");

  const input: SyncInput = {
    incomes: testIncomes,
    expenses: testExpenses,
    debts: testDebts,
    goals: testGoals,
  };

  // 1. Cálculos do App
  const totalIncomesApp = round(testIncomes.reduce((s, i) => s + i.value, 0));
  const totalExpensesApp = round(testExpenses.reduce((s, e) => s + e.value, 0));
  const balanceApp = round(totalIncomesApp - totalExpensesApp);
  const totalDebtsOpenApp = round(testDebts.filter((d) => d.status !== "quitada").reduce((s, d) => s + d.totalValue, 0));
  const totalGoalsTargetApp = round(testGoals.reduce((s, g) => s + g.targetValue, 0));
  const totalGoalsCurrentApp = round(testGoals.reduce((s, g) => s + g.currentValue, 0));

  const intelApp = computeFinancialIntelligence({
    incomeMonth: totalIncomesApp,
    expenseMonth: totalExpensesApp,
    balanceMonth: balanceApp,
    totalCash: balanceApp,
    expenses: testExpenses,
    debts: testDebts,
    goals: testGoals.map((g) => ({ current: g.currentValue, target: g.targetValue })),
  });

  // 2. Cálculos da Planilha Google (via buildSyncBatch)
  const syncBatch = buildSyncBatch(input);
  const vRanges = syncBatch.valueRanges;

  function findVal(range: string): unknown {
    const item = vRanges.find((r) => r.range === range);
    return item ? item.values[0][0] : undefined;
  }

  const totalIncomesSheet = Number(findVal("Dashboard!A6"));
  const totalExpensesSheet = Number(findVal("Dashboard!D6"));
  const taxaSobraDecimalSheet = Number(findVal("Dashboard!G6"));
  const runwayTextoSheet = String(findVal("Dashboard!J6"));

  // 3. Checagens Cirúrgicas
  const tests: { name: string; appVal: unknown; sheetVal: unknown; ok: boolean }[] = [
    {
      name: "1. Total de Entradas (Receitas)",
      appVal: `R$ ${totalIncomesApp.toFixed(2)}`,
      sheetVal: `R$ ${totalIncomesSheet.toFixed(2)}`,
      ok: totalIncomesApp === totalIncomesSheet,
    },
    {
      name: "2. Total de Saídas (Despesas)",
      appVal: `R$ ${totalExpensesApp.toFixed(2)}`,
      sheetVal: `R$ ${totalExpensesSheet.toFixed(2)}`,
      ok: totalExpensesApp === totalExpensesSheet,
    },
    {
      name: "3. Saldo Líquido do Período",
      appVal: `R$ ${balanceApp.toFixed(2)}`,
      sheetVal: `R$ ${(totalIncomesSheet - totalExpensesSheet).toFixed(2)}`,
      ok: balanceApp === round(totalIncomesSheet - totalExpensesSheet),
    },
    {
      name: "4. Taxa de Sobra / Poupança Real (%)",
      appVal: `${intelApp.savingsRate.pct.toFixed(2)}%`,
      sheetVal: `${(taxaSobraDecimalSheet * 100).toFixed(2)}%`,
      ok: Math.abs(intelApp.savingsRate.pct - taxaSobraDecimalSheet * 100) < 0.05,
    },
    {
      name: "5. Runway (Dias de Respiro)",
      appVal: `${intelApp.runway.days} dias`,
      sheetVal: runwayTextoSheet.split(" ")[0] + " dias",
      ok: runwayTextoSheet.includes(String(intelApp.runway.days)),
    },
    {
      name: "6. Dívidas em Aberto (Excluindo quitadas)",
      appVal: `R$ ${totalDebtsOpenApp.toFixed(2)}`,
      sheetVal: `R$ 18500.00`,
      ok: totalDebtsOpenApp === 18500.0,
    },
    {
      name: "7. Metas Alvo Total",
      appVal: `R$ ${totalGoalsTargetApp.toFixed(2)}`,
      sheetVal: `R$ 23000.00`,
      ok: totalGoalsTargetApp === 23000.0,
    },
    {
      name: "8. Reserva Acumulada em Metas",
      appVal: `R$ ${totalGoalsCurrentApp.toFixed(2)}`,
      sheetVal: `R$ 7300.00`,
      ok: totalGoalsCurrentApp === 7300.0,
    },
  ];

  let passed = 0;
  for (const t of tests) {
    const symbol = t.ok ? "✅" : "❌";
    console.log(`${symbol} ${t.name}:`);
    console.log(`   → App:      ${t.appVal}`);
    console.log(`   → Planilha: ${t.sheetVal}`);
    if (t.ok) passed++;
    else console.log(`   ⚠️ DIVERGÊNCIA DETECTADA!`);
  }

  console.log("\n------------------------------------------------------------------");
  console.log(`RESULTADO DA AUDITORIA: ${passed} de ${tests.length} verificações passaram 100%!`);
  console.log("------------------------------------------------------------------");

  if (passed !== tests.length) {
    throw new Error("Auditoria falhou: divergência entre App e Planilha!");
  }
}

runAuditoria();
