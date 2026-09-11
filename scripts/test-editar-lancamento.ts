/**
 * test-editar-lancamento.ts — editar (CA-04), excluir + Desfazer (CA-05) e as
 * preferências (renda esperada / fase) com as funções puras do provider — sem React.
 *
 * Cobre: patch mantém o id e não duplica; recusa item estornado; id inexistente é
 * no-op; Desfazer de Excluir restaura com o MESMO id (e não duplica se já voltou);
 * setSettings mescla; dados antigos sem os campos novos passam sem NaN.
 *
 * Roda com: npx tsx scripts/test-editar-lancamento.ts   (e com TZ=UTC)
 */

import { deepStrictEqual } from "node:assert";
import { isEstornado } from "../lib/types";
import type { Expense, Income, ViradaData } from "../lib/types";
import { getPockets, roundMoney } from "../lib/utils";
import { semEstornados } from "../lib/types";
import {
  applyEstorno,
  applyRestoreExpense,
  applyRestoreIncome,
  applySetSettings,
  applyUpdateExpense,
  applyUpdateIncome,
} from "../providers/virada-provider";

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

function assertDeep(actual: unknown, expected: unknown, label: string) {
  try {
    deepStrictEqual(actual, expected);
    assert(true, label);
  } catch (error) {
    assert(false, label, String((error as Error).message).split("\n").slice(0, 6).join(" "));
  }
}

function section(name: string) {
  console.log(`\n━━━ ${name} ━━━`);
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const HOJE = "2026-09-15";
const MES = "2026-09";
const delivery: Expense = { id: "e1", description: "Lanche", value: 100, category: "Delivery", date: HOJE, paymentMethod: "Pix", nature: "impulso", scope: "casa", source: "app" };
const mercado: Expense = { id: "e2", description: "Feira", value: 80, category: "Mercado", date: `${MES}-10`, paymentMethod: "Débito", nature: "essencial" };
const salario: Income = { id: "i1", description: "Salário", value: 2500, category: "Salário", date: `${MES}-01`, scope: "casa" };
const freela: Income = { id: "i2", description: "Freela", value: 300, category: "Renda extra", date: `${MES}-08` };
const base: ViradaData = { expenses: [delivery, mercado], incomes: [salario, freela], debts: [], goals: [], missionStatus: {} };

// Totais do MÊS DO FIXTURE (não "mês corrente" do relógio): o teste não pode
// depender de que dia é hoje — nem de fuso.
const gastosDoMes = (d: ViradaData) => roundMoney(semEstornados(d.expenses).filter((e) => e.date.startsWith(MES)).reduce((s, e) => s + e.value, 0));
const entradasDoMes = (d: ViradaData) => roundMoney(semEstornados(d.incomes).filter((i) => i.date.startsWith(MES)).reduce((s, i) => s + i.value, 0));

// ═════════════════════════════════════════════════════════════════════════════
section("CA-04 · editar gasto: R$ 100 Delivery → R$ 120 Mercado, mesmo id, sem duplicar");
{
  const antes = gastosDoMes(base);
  const r = applyUpdateExpense(base, "e1", { value: 120, category: "Mercado" });
  assertEq(r.expenses.length, 2, "continua com UM lançamento por item (não duplicou)");
  const e = r.expenses.find((x) => x.id === "e1")!;
  assertEq(e.id, "e1", "mesmo id");
  assertEq(e.value, 120, "valor 120");
  assertEq(e.category, "Mercado", "categoria Mercado");
  assertEq(e.description, "Lanche", "campos fora do patch ficam (descrição)");
  assertEq(e.paymentMethod, "Pix", "campos fora do patch ficam (forma de pagamento)");
  assertEq(e.nature, "impulso", "campos fora do patch ficam (natureza)");
  assertEq(r.expenses.map((x) => x.id), ["e1", "e2"], "posição na lista preservada");
  assertEq(roundMoney(gastosDoMes(r) - antes), 20, "Gastos do mês subiram R$ 20");
  assert(base.expenses[0].value === 100, "não muta o estado anterior");
  assertEq(r.incomes, base.incomes, "entradas intactas");

  const semMudanca = applyUpdateExpense(base, "e1", {});
  assertEq(semMudanca.expenses[0], delivery, "patch vazio mantém o item igual");

  const idForcado = applyUpdateExpense(base, "e1", { id: "hacker", value: 5 } as Partial<Expense>);
  assertEq(idForcado.expenses.map((x) => x.id), ["e1", "e2"], "patch com id dentro não troca o id");
  assertEq(idForcado.expenses[0].value, 5, "…mas o resto do patch aplica");

  assert(applyUpdateExpense(base, "nao-existe", { value: 1 }) === base, "id inexistente → no-op (mesma referência)");

  // bolsos acompanham a edição: Delivery (Vida) virou Mercado (Contas)
  const bolsos = getPockets({ ...r, settings: { expectedIncome: 2500 } }, MES, HOJE);
  assertEq(bolsos.bolsos.find((b) => b.key === "vida")!.gasto, 0, "Vida zerou depois da edição");
  assertEq(bolsos.bolsos.find((b) => b.key === "contas")!.gasto, 200, "Contas = 120 + 80");
}

// ═════════════════════════════════════════════════════════════════════════════
section("CA-04 · editar entrada: mesmo padrão");
{
  const r = applyUpdateIncome(base, "i2", { value: 350, description: "Freela site" });
  assertEq(r.incomes.length, 2, "não duplicou");
  assertEq(r.incomes[1], { ...freela, value: 350, description: "Freela site" }, "patch aplicado, id e resto mantidos");
  assertEq(entradasDoMes(r), 2850, "Entradas do mês = 2.500 + 350");
  assert(applyUpdateIncome(base, "x", { value: 1 }) === base, "id inexistente → no-op");
  assertEq(r.expenses, base.expenses, "gastos intactos");
}

// ═════════════════════════════════════════════════════════════════════════════
section("CA-04 · item estornado NÃO edita");
{
  const estornado = applyEstorno(base, { id: "e1", type: "expense" }, HOJE);
  assert(isEstornado(estornado.expenses[0]), "(fixture) e1 estornado");
  const r = applyUpdateExpense(estornado, "e1", { value: 999 });
  assert(r === estornado, "editar gasto estornado → recusa (mesma referência)");
  assertEq(r.expenses[0].value, 100, "valor não mudou");
  assertEq(r.expenses[0].estornadoEm, HOJE, "marca de estorno continua");

  const incEst = applyEstorno(base, { id: "i1", type: "income" }, HOJE);
  assert(applyUpdateIncome(incEst, "i1", { value: 1 }) === incEst, "editar entrada estornada → recusa");

  // o patch não pode desfazer um estorno nem criar um
  const tentaLimpar = applyUpdateExpense(estornado, "e1", { estornadoEm: undefined } as Partial<Expense>);
  assert(tentaLimpar === estornado, "patch com estornadoEm num item estornado: recusado");
  const tentaEstornar = applyUpdateExpense(base, "e2", { estornadoEm: HOJE } as Partial<Expense>);
  assert(!isEstornado(tentaEstornar.expenses[1]), "patch não estorna (estornar é o applyEstorno)");
}

// ═════════════════════════════════════════════════════════════════════════════
section("CA-05 · excluir + Desfazer: restaura com o MESMO id, sem duplicar");
{
  const semE1: ViradaData = { ...base, expenses: base.expenses.filter((e) => e.id !== "e1") };
  assertEq(semE1.expenses.length, 1, "(fixture) apagou e1");
  const volta = applyRestoreExpense(semE1, delivery);
  assertEq(volta.expenses.length, 2, "Desfazer trouxe o gasto de volta");
  assertEq(volta.expenses.find((e) => e.id === "e1"), delivery, "mesmo id e mesmo conteúdo");
  assertEq(gastosDoMes(volta), 180, "Gastos do mês voltaram a 180");

  const duasVezes = applyRestoreExpense(volta, delivery);
  assert(duasVezes === volta, "Desfazer 2x (id já existe) → no-op, não duplica");
  assertEq(duasVezes.expenses.filter((e) => e.id === "e1").length, 1, "um só e1");

  const semI1: ViradaData = { ...base, incomes: base.incomes.filter((i) => i.id !== "i1") };
  const voltaInc = applyRestoreIncome(semI1, salario);
  assertEq(voltaInc.incomes.find((i) => i.id === "i1"), salario, "entrada restaurada com o mesmo id");
  assert(applyRestoreIncome(voltaInc, salario) === voltaInc, "entrada: restaurar 2x → no-op");
  assertEq(voltaInc.incomes.length, 2, "2 entradas");

  // o objeto restaurado é o que foi excluído, inclusive estornado (histórico volta como era)
  const estornado = { ...delivery, estornadoEm: HOJE };
  const voltaEst = applyRestoreExpense(semE1, estornado);
  assert(isEstornado(voltaEst.expenses.find((e) => e.id === "e1")!), "gasto estornado excluído volta estornado");
}

// ═════════════════════════════════════════════════════════════════════════════
section("setSettings · renda esperada e fase (mescla, não apaga o resto)");
{
  const r1 = applySetSettings(base, { expectedIncome: 2500 });
  assertEq(r1.settings, { expectedIncome: 2500 }, "grava a renda");
  const r2 = applySetSettings(r1, { budgetPhase: "virada" });
  assertEq(r2.settings, { expectedIncome: 2500, budgetPhase: "virada" }, "fase entra sem apagar a renda");
  const r3 = applySetSettings(r2, { budgetPhase: "organizando" });
  assertEq(r3.settings?.budgetPhase, "organizando", "volta pra organizando");
  assertEq(getPockets(r2, MES, HOJE).fase, "virada", "getPockets lê a fase gravada");
  assertEq(getPockets(r2, MES, HOJE).renda.origem, "informada", "getPockets lê a renda gravada");
  const limpa = applySetSettings(r2, { expectedIncome: undefined });
  assertEq(getPockets(limpa, MES, HOJE).renda.origem, "mes", "apagar a renda volta pra 'baseado no que entrou'");
  assertEq(limpa.settings?.budgetPhase, "virada", "…sem perder a fase");
  assert(base.settings === undefined, "não muta o estado anterior");
  assertEq(applySetSettings(base, {}).settings, {}, "patch vazio cria settings vazio (inofensivo)");
}

// ═════════════════════════════════════════════════════════════════════════════
section("CA-12 · dados antigos (JSON sem settings/debtId/scope) passam por tudo sem NaN");
{
  const antigo = JSON.parse(JSON.stringify({
    expenses: [{ id: "e1", description: "Mercado", value: 650, category: "Mercado", date: `${MES}-05`, paymentMethod: "Pix", nature: "essencial" }],
    incomes: [{ id: "i1", description: "Salário", value: 2500, category: "Salário", date: `${MES}-01` }],
    debts: [{ id: "d1", name: "Cartão", totalValue: 3200, installmentValue: 450, dueDate: `${MES}-20`, priority: "alta", status: "aberta" }],
    goals: [],
    missionStatus: {},
  })) as ViradaData;
  const editado = applyUpdateExpense(antigo, "e1", { value: 700 });
  assertEq(editado.expenses[0].value, 700, "edita gasto antigo");
  assert(!("debtId" in editado.expenses[0]) && !("scope" in editado.expenses[0]), "não inventa campos novos no item antigo");
  const restaurado = applyRestoreExpense({ ...antigo, expenses: [] }, antigo.expenses[0]);
  assertDeep(restaurado, antigo, "excluir + restaurar devolve o JSON antigo exato");
  const comFase = applySetSettings(editado, { budgetPhase: "virada" });
  const p = getPockets(comFase, MES, HOJE);
  assert(p.bolsos.every((b) => Number.isFinite(b.alvo) && Number.isFinite(b.gasto) && Number.isFinite(b.sobra)), "bolsos sem NaN");
  assertEq(gastosDoMes(comFase), 700, "Gastos do mês = 700");
  assertEq(p.bolsos.find((b) => b.key === "contas")!.gasto, 700, "Contas = 700 (Mercado editado)");
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
