/**
 * test-bolsos.ts — os "três bolsos" (Contas / Dívidas e reserva / Vida) do e-book,
 * com os presets fixos "Organizando" (50/30/20) e "Fase de virada" (50/40/10).
 *
 * Cobre o CA-02 (alvos, verde/vermelho, Outros por natureza, Empresa fora, renda
 * "baseado no que entrou") e o CA-12 (dados antigos sem `settings` abrem sem NaN),
 * mais sugerirFaseVirada e dividasVencendoNoMes na virada de ano.
 *
 * Nada aqui depende do relógio: "hoje" e o mês são strings fixas passadas
 * explicitamente. Roda com: npx tsx scripts/test-bolsos.ts  (e com TZ=UTC).
 */

import { BUDGET_PHASES, BUDGET_PRESETS, POCKETS, POCKET_BY_CATEGORY, expenseCategories } from "../lib/constants";
import type { Debt, Expense, Income, ViradaData } from "../lib/types";
import { diasAte, dividasVencendoNoMes, getPockets, pocketOf, shiftMonth, sugerirFaseVirada } from "../lib/utils";

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
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  assert(ok, label, ok ? undefined : `esperado=${JSON.stringify(expected)}, obtido=${JSON.stringify(actual)}`);
}

function section(name: string) {
  console.log(`\n━━━ ${name} ━━━`);
}

// ─── Fixtures (datas fixas, sem relógio) ─────────────────────────────────────

const HOJE = "2026-09-15";
const MES = "2026-09";

let seq = 0;
const ex = (value: number, p: Partial<Expense> = {}): Expense => ({
  id: `e${++seq}`, description: "gasto", value, category: "Mercado", date: HOJE,
  paymentMethod: "Pix", nature: "essencial", ...p,
});
const inc = (value: number, p: Partial<Income> = {}): Income => ({
  id: `i${++seq}`, description: "entrada", value, category: "Salário", date: HOJE, ...p,
});
const debt = (p: Partial<Debt> = {}): Debt => ({
  id: `d${++seq}`, name: "Cartão", totalValue: 3200, installmentValue: 450, dueDate: `${MES}-20`,
  priority: "alta", status: "aberta", ...p,
});
const vazio: ViradaData = { expenses: [], incomes: [], debts: [], goals: [], missionStatus: {} };

const alvos = (r: ReturnType<typeof getPockets>) => r.bolsos.map((b) => b.alvo);
const bolso = (r: ReturnType<typeof getPockets>, key: string) => r.bolsos.find((b) => b.key === key)!;

// ═════════════════════════════════════════════════════════════════════════════
section("Presets e constantes");
{
  assertEq(POCKETS.map((p) => p.key), ["contas", "dividas", "vida"], "POCKETS na ordem do e-book: contas, dividas, vida");
  assertEq(POCKETS.map((p) => p.label), ["Contas", "Dívidas e reserva", "Vida"], "rótulos dos bolsos");
  assertEq(BUDGET_PRESETS.organizando, { contas: 0.5, dividas: 0.3, vida: 0.2 }, "Organizando = 50/30/20");
  assertEq(BUDGET_PRESETS.virada, { contas: 0.5, dividas: 0.4, vida: 0.1 }, "Fase de virada = 50/40/10");
  for (const fase of ["organizando", "virada"] as const) {
    const soma = Object.values(BUDGET_PRESETS[fase]).reduce((s, v) => s + v, 0);
    assertEq(Math.round(soma * 100), 100, `preset ${fase} soma 100%`);
  }
  assertEq(BUDGET_PHASES.map((f) => f.key), ["organizando", "virada"], "BUDGET_PHASES: as duas fases, nessa ordem");
  assert(BUDGET_PHASES.every((f) => f.label.length > 0 && f.split.length > 0 && f.hint.length > 0), "cada fase tem label, split e hint pra UI");

  // toda categoria de gasto tem bolso (ou decide por natureza)
  for (const cat of expenseCategories) {
    assert(cat in POCKET_BY_CATEGORY, `POCKET_BY_CATEGORY cobre "${cat}"`);
  }
  assertEq(POCKET_BY_CATEGORY.Mercado, "contas", "Mercado → contas");
  assertEq(POCKET_BY_CATEGORY.Aluguel, "contas", "Aluguel → contas");
  assertEq(POCKET_BY_CATEGORY.Impostos, "contas", "Impostos → contas");
  assertEq(POCKET_BY_CATEGORY["Dívida"], "dividas", "Dívida → dividas");
  assertEq(POCKET_BY_CATEGORY["Cartão"], "dividas", "Cartão → dividas");
  assertEq(POCKET_BY_CATEGORY.Lazer, "vida", "Lazer → vida");
  assertEq(POCKET_BY_CATEGORY.Delivery, "vida", "Delivery → vida");
  assertEq(POCKET_BY_CATEGORY.Compra, "por_natureza", "Compra decide por natureza");
  assertEq(POCKET_BY_CATEGORY.Outros, "por_natureza", "Outros decide por natureza");
  assertEq(POCKET_BY_CATEGORY.Fornecedor, "contas", "Fornecedor (empresa) → contas");
  assertEq(pocketOf({ category: "Outros", nature: "impulso" }), "vida", "pocketOf(Outros, impulso) = vida");
  assertEq(pocketOf({ category: "Outros", nature: "essencial" }), "contas", "pocketOf(Outros, essencial) = contas");
  assertEq(pocketOf({ category: "Compra", nature: "impulso" }), "vida", "pocketOf(Compra, impulso) = vida");
  assertEq(pocketOf({ category: "Mercado", nature: "impulso" }), "contas", "pocketOf(Mercado, impulso) = contas (categoria manda)");
  assertEq(pocketOf({ category: "Categoria inventada" as Expense["category"], nature: "impulso" }), "vida", "categoria desconhecida (dado antigo) decide por natureza");
}

// ═════════════════════════════════════════════════════════════════════════════
section("CA-02 · renda informada R$ 2.500 — alvos por fase");
{
  const org = getPockets({ ...vazio, settings: { expectedIncome: 2500 } }, MES, HOJE);
  assertEq(org.fase, "organizando", "sem budgetPhase → fase 'organizando'");
  assertEq(org.renda, { valor: 2500, origem: "informada" }, "renda informada 2.500");
  assertEq(alvos(org), [1250, 750, 500], "Organizando: 1.250 / 750 / 500");
  assertEq(org.bolsos.map((b) => b.estado), ["verde", "verde", "verde"], "sem gasto: tudo verde");
  assertEq(org.bolsos.map((b) => b.sobra), [1250, 750, 500], "sobra = alvo quando não gastou");
  assertEq(org.bolsos.map((b) => b.label), ["Contas", "Dívidas e reserva", "Vida"], "bolsos com rótulo pra UI");

  const vir = getPockets({ ...vazio, settings: { expectedIncome: 2500, budgetPhase: "virada" } }, MES, HOJE);
  assertEq(vir.fase, "virada", "fase 'virada'");
  assertEq(alvos(vir), [1250, 1000, 250], "Fase de virada: 1.250 / 1.000 / 250");

  const centavos = getPockets({ ...vazio, settings: { expectedIncome: 1234.57 } }, MES, HOJE);
  assertEq(alvos(centavos), [617.29, 370.37, 246.91], "alvo = roundMoney(renda × pct) (1.234,57)");
}

// ═════════════════════════════════════════════════════════════════════════════
section("CA-02 · gastos caem no bolso certo; Vida vermelha com 'passou R$ 10'");
{
  const data: ViradaData = {
    ...vazio,
    settings: { expectedIncome: 2500, budgetPhase: "virada" },
    expenses: [
      ex(300, { category: "Mercado" }),
      ex(200, { category: "Cartão" }),
      ex(260, { category: "Delivery", nature: "impulso" }),
    ],
  };
  const r = getPockets(data, MES, HOJE);
  assertEq(bolso(r, "contas").gasto, 300, "Mercado 300 → Contas");
  assertEq(bolso(r, "dividas").gasto, 200, "Cartão 200 → Dívidas e reserva");
  assertEq(bolso(r, "vida").gasto, 260, "Delivery 260 → Vida");
  assertEq(bolso(r, "vida").estado, "vermelho", "Vida: 260 > 250 → vermelho");
  assertEq(bolso(r, "vida").sobra, -10, "Vida: sobra −10 (a tela mostra 'passou R$ 10')");
  assertEq(bolso(r, "contas").estado, "verde", "Contas verde");
  assertEq(bolso(r, "contas").sobra, 950, "Contas: sobra 1.250 − 300 = 950");
  assertEq(bolso(r, "dividas").estado, "verde", "Dívidas verde");
  assertEq(bolso(r, "dividas").sobra, 800, "Dívidas: sobra 1.000 − 200 = 800");

  // no limite exato: gasto == alvo não é vermelho
  const exato = getPockets({ ...data, expenses: [ex(250, { category: "Delivery" })] }, MES, HOJE);
  assertEq(bolso(exato, "vida").estado, "verde", "gasto igual ao alvo continua verde (só passa se gasto > alvo)");
  assertEq(bolso(exato, "vida").sobra, 0, "sobra 0 exato");

  // ruído de float: 0.1 + 0.2 não vira vermelho contra alvo 0.3
  const ruido = getPockets({ ...vazio, settings: { expectedIncome: 1.5 }, expenses: [ex(0.1, { category: "Lazer" }), ex(0.2, { category: "Lazer" })] }, MES, HOJE);
  assertEq(bolso(ruido, "vida").alvo, 0.3, "alvo 0,30");
  assertEq(bolso(ruido, "vida").gasto, 0.3, "gasto 0,10 + 0,20 = 0,30 exato");
  assertEq(bolso(ruido, "vida").estado, "verde", "0,30 vs 0,30 → verde (sem ruído de ponto flutuante)");
}

// ═════════════════════════════════════════════════════════════════════════════
section("CA-02 · Outros por natureza · Empresa fora · estornado fora · mês certo");
{
  const data: ViradaData = {
    ...vazio,
    settings: { expectedIncome: 2500 },
    expenses: [
      ex(100, { category: "Outros", nature: "impulso" }),
      ex(50, { category: "Outros", nature: "essencial" }),
      ex(70, { category: "Compra", nature: "impulso" }),
      ex(999, { category: "Fornecedor", scope: "empresa" }),
      ex(888, { category: "Lazer", scope: "empresa" }),
      ex(500, { category: "Lazer", estornadoEm: HOJE }),
      ex(400, { category: "Mercado", date: "2026-08-31" }),
      ex(30, { category: "Mercado", scope: "casa" }),
      ex(20, { category: "Mercado" }), // scope undefined = casa
    ],
  };
  const r = getPockets(data, MES, HOJE);
  assertEq(bolso(r, "vida").gasto, 170, "Outros impulso (100) + Compra impulso (70) → Vida; estornado (500) e empresa (888) fora");
  assertEq(bolso(r, "contas").gasto, 100, "Outros essencial (50) + Mercado (30 + 20) → Contas; empresa (999) e agosto (400) fora");
  assertEq(bolso(r, "dividas").gasto, 0, "nada em Dívidas");
  const totalBolsos = r.bolsos.reduce((s, b) => s + b.gasto, 0);
  assertEq(totalBolsos, 270, "os três bolsos somam só os gastos de casa, do mês, não estornados");

  const agosto = getPockets(data, "2026-08", HOJE);
  assertEq(bolso(agosto, "contas").gasto, 400, "monthKey 2026-08 pega o gasto de 31/08 (comparação por texto, sem fuso)");
}

// ═════════════════════════════════════════════════════════════════════════════
section("Renda sem informar: média dos 3 meses anteriores com entrada");
{
  const data: ViradaData = {
    ...vazio,
    incomes: [
      inc(3000, { date: "2026-08-05" }),
      inc(1000, { date: "2026-08-20" }),   // agosto = 4.000
      inc(2000, { date: "2026-06-05" }),   // junho = 2.000; julho sem entrada → ignorado
      inc(9999, { date: "2026-05-05" }),   // maio: fora da janela (4º mês)
      inc(500, { date: "2026-09-01" }),    // mês corrente não entra na média
      inc(700, { date: "2026-07-10", estornadoEm: "2026-07-11" }), // julho estornado → julho continua sem entrada
      inc(5000, { date: "2026-07-15", scope: "empresa" }),         // empresa fora
    ],
  };
  const r = getPockets(data, MES, HOJE);
  assertEq(r.renda, { valor: 3000, origem: "media3m" }, "média (4.000 + 2.000) / 2 = 3.000 — julho (sem entrada de casa) não conta como zero");
  assertEq(alvos(r), [1500, 900, 600], "alvos sobre a média: 1.500 / 900 / 600");

  const informada = getPockets({ ...data, settings: { expectedIncome: 2500 } }, MES, HOJE);
  assertEq(informada.renda.origem, "informada", "renda informada tem prioridade sobre a média");
  const zero = getPockets({ ...data, settings: { expectedIncome: 0 } }, MES, HOJE);
  assertEq(zero.renda.origem, "media3m", "expectedIncome 0 = não informada → média");

  // média com centavos: (100 + 100 + 100.01) / 3 = 100.00333… → 100
  const cent = getPockets({ ...vazio, incomes: [inc(100, { date: "2026-08-01" }), inc(100, { date: "2026-07-01" }), inc(100.01, { date: "2026-06-01" })] }, MES, HOJE);
  assertEq(cent.renda.valor, 100, "média passa por roundMoney");

  // virada de ano: janela de jan/2027 é out, nov, dez/2026
  const ano = getPockets({ ...vazio, incomes: [inc(1000, { date: "2026-12-31" }), inc(3000, { date: "2026-10-01" }), inc(9999, { date: "2026-09-30" })] }, "2027-01", "2027-01-05");
  assertEq(ano.renda, { valor: 2000, origem: "media3m" }, "jan/2027 olha out–dez/2026 (set fica fora)");
  assertEq(shiftMonth("2027-01", -3), "2026-10", "shiftMonth(2027-01, −3) = 2026-10");
  assertEq(shiftMonth("2026-12", 1), "2027-01", "shiftMonth(2026-12, +1) = 2027-01");
}

// ═════════════════════════════════════════════════════════════════════════════
section("Renda sem histórico: entradas do próprio mês; sem nada: 'nenhuma'");
{
  const mes = getPockets({ ...vazio, incomes: [inc(1800, { date: `${MES}-05` }), inc(200, { date: `${MES}-10` }), inc(50, { date: `${MES}-11`, estornadoEm: HOJE })] }, MES, HOJE);
  assertEq(mes.renda, { valor: 2000, origem: "mes" }, "sem 3 meses anteriores: usa as entradas do próprio mês (estornada fora)");
  assertEq(alvos(mes), [1000, 600, 400], "alvos sobre 2.000");

  const nada = getPockets({ ...vazio, expenses: [ex(300)] }, MES, HOJE);
  assertEq(nada.renda, { valor: 0, origem: "nenhuma" }, "sem entrada nenhuma → origem 'nenhuma', valor 0");
  assertEq(nada.bolsos.map((b) => b.estado), ["sem_alvo", "sem_alvo", "sem_alvo"], "todos os bolsos 'sem_alvo'");
  assertEq(alvos(nada), [0, 0, 0], "alvo 0 em todos");
  assertEq(bolso(nada, "contas").gasto, 300, "o gasto ainda aparece (a pessoa vê onde foi)");
  assertEq(bolso(nada, "contas").sobra, -300, "sobra = 0 − gasto");
  assert(nada.bolsos.every((b) => Number.isFinite(b.alvo) && Number.isFinite(b.gasto) && Number.isFinite(b.sobra)), "nada de NaN");

  const soEmpresa = getPockets({ ...vazio, incomes: [inc(5000, { scope: "empresa" })] }, MES, HOJE);
  assertEq(soEmpresa.renda.origem, "nenhuma", "entrada só de Empresa não vira renda de casa");
}

// ═════════════════════════════════════════════════════════════════════════════
section("CA-12 · dados antigos (sem settings, sem paidValue, sem debtId) passam sem NaN");
{
  const antigo = JSON.parse(JSON.stringify({
    expenses: [{ id: "e1", description: "Mercado", value: 650, category: "Mercado", date: `${MES}-05`, paymentMethod: "Pix", nature: "essencial" }],
    incomes: [{ id: "i1", description: "Salário", value: 2500, category: "Salário", date: `${MES}-01` }],
    debts: [{ id: "d1", name: "Cartão", totalValue: 3200, installmentValue: 450, dueDate: `${MES}-20`, priority: "alta", status: "aberta" }],
    goals: [],
    missionStatus: {},
  })) as ViradaData;
  const r = getPockets(antigo, MES, HOJE);
  assertEq(r.fase, "organizando", "sem settings → 'organizando'");
  assertEq(r.renda, { valor: 2500, origem: "mes" }, "sem settings → 'baseado no que entrou' (mês corrente)");
  assertEq(alvos(r), [1250, 750, 500], "alvos sobre as entradas do mês");
  assert(r.bolsos.every((b) => !Number.isNaN(b.alvo) && !Number.isNaN(b.gasto) && !Number.isNaN(b.sobra)), "sem NaN em alvo/gasto/sobra");
  assertEq(sugerirFaseVirada(antigo), true, "dívida antiga em aberto → sugere Fase de virada");
  assertEq(dividasVencendoNoMes(antigo, MES), { total: 450, quantidade: 1 }, "dívida antiga sem paidValue: vence a parcela (450)");
}

// ═════════════════════════════════════════════════════════════════════════════
section("sugerirFaseVirada · fase manual, só sugestão");
{
  assertEq(sugerirFaseVirada(vazio), false, "sem dívida → não sugere");
  assertEq(sugerirFaseVirada({ ...vazio, debts: [debt()] }), true, "dívida aberta + organizando → sugere");
  assertEq(sugerirFaseVirada({ ...vazio, debts: [debt({ status: "negociando" })] }), true, "dívida negociando conta como em aberto → sugere");
  assertEq(sugerirFaseVirada({ ...vazio, debts: [debt({ status: "quitada" })] }), false, "dívida quitada → não sugere");
  assertEq(sugerirFaseVirada({ ...vazio, debts: [debt({ totalValue: 0 })] }), false, "dívida com total 0 → não sugere");
  assertEq(sugerirFaseVirada({ ...vazio, debts: [debt()], settings: { budgetPhase: "virada" } }), false, "já em Fase de virada → não sugere");
  assertEq(sugerirFaseVirada({ ...vazio, debts: [debt()], settings: { expectedIncome: 2500 } }), true, "settings sem budgetPhase = organizando → sugere");
  // a fase NUNCA muda sozinha: getPockets com dívida continua na fase gravada
  assertEq(getPockets({ ...vazio, debts: [debt()], settings: { expectedIncome: 2500 } }, MES, HOJE).fase, "organizando", "getPockets não troca a fase por causa da dívida");
}

// ═════════════════════════════════════════════════════════════════════════════
section("dividasVencendoNoMes · em aberto, por mês, virada de ano");
{
  const data: ViradaData = {
    ...vazio,
    debts: [
      debt({ name: "A", dueDate: "2026-12-31", installmentValue: 450 }),
      debt({ name: "B", dueDate: "2027-01-01", installmentValue: 200, status: "negociando" }),
      debt({ name: "C", dueDate: "2027-01-31", installmentValue: 300, status: "quitada" }),
      debt({ name: "D", dueDate: "2027-01-15", installmentValue: 0, totalValue: 120 }),       // sem parcela: vence o restante
      debt({ name: "E", dueDate: "2027-01-20", installmentValue: 450, totalValue: 3200, paidValue: 3000 }), // última parcela: só faltam 200
    ],
  };
  assertEq(dividasVencendoNoMes(data, "2026-12"), { total: 450, quantidade: 1 }, "dez/2026: só A (450)");
  assertEq(dividasVencendoNoMes(data, "2027-01"), { total: 520, quantidade: 3 }, "jan/2027: B (200) + D (restante 120) + E (faltam 200); C quitada fora");
  assertEq(dividasVencendoNoMes(data, "2027-02"), { total: 0, quantidade: 0 }, "fev/2027: nada");
  assertEq(dividasVencendoNoMes(vazio, "2027-01"), { total: 0, quantidade: 0 }, "sem dívidas → 0 / 0");
  // Depósitos em meta NÃO entram aqui nem nos bolsos: meta não tem data (só currentValue).
}

// ═════════════════════════════════════════════════════════════════════════════
section("diasAte · 'vence em N dias' / 'venceu há N dias' por texto de data");
{
  assertEq(diasAte("2026-09-20", "2026-09-15"), 5, "vence em 5 dias");
  assertEq(diasAte("2026-09-15", "2026-09-15"), 0, "vence hoje");
  assertEq(diasAte("2026-09-10", "2026-09-15"), -5, "venceu há 5 dias");
  assertEq(diasAte("2027-01-01", "2026-12-31"), 1, "virada de ano: 1 dia");
  assertEq(diasAte("2026-03-01", "2026-02-28"), 1, "fev → mar (2026 não é bissexto)");
  assertEq(diasAte("2024-03-01", "2024-02-28"), 2, "fev → mar em bissexto (29/02 existe)");
  assertEq(diasAte("2026-10-01", "2026-09-30"), 1, "1º do mês não some por fuso (calendário local, por texto)");
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
