/**
 * Testa o fluxo completo de estorno (contrato em lib/types.ts):
 * estornar gasto  → o gasto fica marcado com `estornadoEm` e sai dos totais
 * estornar receita → a receita fica marcada com `estornadoEm` e sai dos totais
 * Nada é criado: o histórico continua inteiro e nenhum contra-lançamento aparece
 * na planilha. (Os TOTAIS da planilha ignorando estornados são do cluster B.)
 *
 * Roda com: npx tsx scripts/test-estorno.ts
 */
import { applyEstorno } from "../providers/virada-provider";
import { isEstornado, semEstornados } from "../lib/types";
import type { ViradaData } from "../lib/types";
import { buildSyncBatch } from "../lib/sheets/builder";

let pass = 0, fail = 0;
const check = (label: string, ok: boolean, hint?: string) => {
  if (ok) { pass++; console.log(`  ✓ ${label}`); }
  else    { fail++; console.log(`  ✗ ${label}${hint ? ` — ${hint}` : ""}`); }
};

const round = (n: number) => Math.round(n * 100) / 100;
const soma = (items: { value: number }[]) => round(items.reduce((s, i) => s + i.value, 0));

// Totais como app, planilha e prévia devem calcular: filtra estornados, depois soma.
function totais(d: ViradaData) {
  const receitas = soma(semEstornados(d.incomes));
  const despesas = soma(semEstornados(d.expenses));
  return { receitas, despesas, saldo: round(receitas - despesas) };
}

// ─── Dados base ──────────────────────────────────────────────────────────────
const base: ViradaData = {
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
  missionStatus: {},
};

const HOJE = "2026-04-25";

// ─── A) Estado base (sem estorno) ────────────────────────────────────────────
console.log("\n[A] Estado base — antes do estorno");
{
  const t = totais(base);
  check("totalReceitas = 3800", t.receitas === 3800);
  check("totalDespesas = 850",  t.despesas === 850);
  check("saldo = 2950",          t.saldo === 2950);
  check("nada está estornado", ![...base.expenses, ...base.incomes].some(isEstornado));
}

// ─── B) Estorno de despesa (e1 = Supermercado 500) ───────────────────────────
console.log("\n[B] Estorno de despesa (Supermercado R$ 500)");
const depoisB = applyEstorno(base, { id: "e1", type: "expense" }, HOJE);
{
  const t = totais(depoisB);
  const e1 = depoisB.expenses.find((e) => e.id === "e1");
  check("despesa original permanece no histórico (3 despesas)", depoisB.expenses.length === 3);
  check("nenhuma receita foi criada (2 receitas)", depoisB.incomes.length === 2);
  check("despesa marcada com estornadoEm = hoje", e1?.estornadoEm === HOJE);
  check("as outras despesas não foram marcadas", !depoisB.expenses.filter((e) => e.id !== "e1").some(isEstornado));
  check("totalReceitas após estorno = 3800 (não infla)", t.receitas === 3800);
  check("totalDespesas após estorno = 350 (500 abatidos)", t.despesas === 350);
  check("saldo após estorno = 3450", t.saldo === 3450);

  // Planilha: a linha continua no histórico e não existe linha "ESTORNO —"
  const batch = buildSyncBatch({ incomes: depoisB.incomes, expenses: depoisB.expenses, debts: [], goals: [] });
  const receitas = batch.valueRanges.find((v) => v.range === "Receitas!A2")?.values ?? [];
  const despesas = batch.valueRanges.find((v) => v.range === "Despesas!A2")?.values ?? [];
  check("planilha Receitas tem 2 linhas (sem contra-lançamento)", receitas.length === 2);
  check("planilha Despesas tem 3 linhas (estornada continua no histórico)", despesas.length === 3);
  check("planilha não tem linha com prefixo ESTORNO", ![...receitas, ...despesas].some((row) => String(row[1]).startsWith("ESTORNO")));
}

// ─── C) Estorno de receita (i2 = Freela 800) ─────────────────────────────────
console.log("\n[C] Estorno de receita (Freela R$ 800)");
{
  const d = applyEstorno(base, { id: "i2", type: "income" }, HOJE);
  const t = totais(d);
  check("receita original permanece no histórico (2 receitas)", d.incomes.length === 2);
  check("nenhuma despesa foi criada (3 despesas)", d.expenses.length === 3);
  check("receita marcada com estornadoEm", d.incomes.find((i) => i.id === "i2")?.estornadoEm === HOJE);
  check("totalReceitas após estorno = 3000 (800 abatidos)", t.receitas === 3000);
  check("totalDespesas = 850 (não muda)", t.despesas === 850);
  check("saldo após estorno receita = 2150", t.saldo === 2150);
}

// ─── D) Estorno duplo — efeito cumulativo ────────────────────────────────────
console.log("\n[D] Estorno duplo — dois gastos estornados");
{
  const d = applyEstorno(applyEstorno(base, { id: "e1", type: "expense" }, HOJE), { id: "e2", type: "expense" }, HOJE);
  const t = totais(d);
  check("dois estornos: 2 despesas marcadas", d.expenses.filter(isEstornado).length === 2);
  check("dois estornos: receitas = 3800", t.receitas === 3800);
  check("dois estornos: despesas = 150 (só a de impulso)", t.despesas === 150);
  check("dois estornos: saldo = 3650", t.saldo === 3650);
  check("histórico intacto: 3 despesas + 2 receitas", d.expenses.length === 3 && d.incomes.length === 2);
}

// ─── E) Estorno não cria ponto flutuante ────────────────────────────────────
console.log("\n[E] Precisão — valores com centavos");
{
  const centavos: ViradaData = {
    expenses: [
      { id: "ec1", description: "Farmácia", value: 37.45, category: "Saúde", date: "2026-04-01", paymentMethod: "Débito", nature: "essencial", scope: "casa", source: "app" },
      { id: "ec2", description: "Padaria",  value: 0.10,  category: "Mercado", date: "2026-04-01", paymentMethod: "Dinheiro", nature: "essencial", scope: "casa", source: "app" },
      { id: "ec3", description: "Bala",     value: 0.20,  category: "Mercado", date: "2026-04-01", paymentMethod: "Dinheiro", nature: "essencial", scope: "casa", source: "app" },
    ],
    incomes: [
      { id: "ic1", description: "Gorjeta", value: 12.80, category: "Outros", date: "2026-04-01", scope: "casa", source: "app" },
    ],
    debts: [], goals: [], missionStatus: {},
  };
  const d = applyEstorno(centavos, { id: "ec1", type: "expense" }, HOJE);
  const t = totais(d);
  check("despesas com centavos após estorno = 0.30 (0.10 + 0.20, sem 0.30000000000000004)", t.despesas === 0.30, `recebeu ${t.despesas}`);
  check("saldo com centavos e estorno = 12.50", t.saldo === 12.50, `recebeu ${t.saldo}`);
  check("saldo tem no máximo 2 casas decimais", Number(t.saldo.toFixed(2)) === t.saldo);
}

// ─── Resultado ───────────────────────────────────────────────────────────────
console.log(`\nTotal: ${pass} passou, ${fail} falhou`);
if (fail > 0) process.exit(1);
