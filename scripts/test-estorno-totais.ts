/**
 * test-estorno-totais.ts — contrato de ESTORNO (lib/types.ts + providers/virada-provider.tsx)
 *
 * Reproduz o achado do auditor: gasto por impulso de R$ 1.000 estornado deixava
 * o saldo em zero, mas "Entradas" subia R$ 1.000, "Gastos" não caía, "Por impulso"
 * seguia em 100% e "Lazer" (categoria de despesa) aparecia em "Receitas por categoria".
 *
 * Regra: estornar marca o original com `estornadoEm` (fica no histórico) e todo
 * total usa `semEstornados(lista)` antes de somar. Nenhum contra-lançamento é criado.
 *
 * Seção G: quem estornou ANTES do contrato tem pares "ESTORNO — X" no IndexedDB
 * (contra-lançamento de tipo oposto). `migrarEstornosAntigos` converte cada par
 * pro contrato novo, uma vez, na carga — sem apagar nada que não tenha par.
 *
 * Roda com: npx tsx scripts/test-estorno-totais.ts
 */
import { applyEstorno, migrarEstornosAntigos } from "../providers/virada-provider";
import { isEstornado, semEstornados } from "../lib/types";
import type { ViradaData, Expense, Income } from "../lib/types";
import { expenseCategories, incomeCategories } from "../lib/constants";
import { buildSyncBatch } from "../lib/sheets/builder";

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

// ─── Agregação de referência — é EXATAMENTE isto que app, planilha e prévia
//     devem fazer: filtrar com semEstornados() e só então somar/agrupar. ──────
const sum = (items: { value: number }[]) => items.reduce((s, i) => s + i.value, 0);

function totais(data: ViradaData) {
  const receitas = semEstornados(data.incomes);
  const gastos = semEstornados(data.expenses);
  const porCategoria = (items: { category: string; value: number }[]) => {
    const map = new Map<string, number>();
    items.forEach((i) => map.set(i.category, (map.get(i.category) ?? 0) + i.value));
    return map;
  };
  const entradas = sum(receitas);
  const saidas = sum(gastos);
  const impulso = sum(gastos.filter((e) => e.nature === "impulso"));
  return {
    entradas,
    saidas,
    saldo: entradas - saidas,
    impulso,
    impulsoPct: saidas > 0 ? Math.round((impulso / saidas) * 100) : 0,
    receitasPorCategoria: porCategoria(receitas),
    gastosPorCategoria: porCategoria(gastos),
  };
}

// ─── Cenário do auditor ──────────────────────────────────────────────────────
const salario: Income = { id: "inc-1", description: "Salário", value: 3000, category: "Salário", date: "2026-09-05", scope: "casa", source: "app" };
const mercado: Expense = { id: "exp-1", description: "Mercado", value: 500, category: "Mercado", date: "2026-09-06", paymentMethod: "Pix", nature: "essencial", scope: "casa", source: "app" };
const impulsoLazer: Expense = { id: "exp-2", description: "Gasto por impulso", value: 1000, category: "Lazer", date: "2026-09-08", paymentMethod: "Crédito", nature: "impulso", scope: "casa", source: "app" };

const base: ViradaData = {
  incomes: [salario],
  expenses: [mercado, impulsoLazer],
  debts: [],
  goals: [],
  missionStatus: {},
};

section("A) Estado base (sem estorno)");
{
  const t = totais(base);
  assertEq(t.entradas, 3000, "entradas = 3000");
  assertEq(t.saidas, 1500, "gastos = 1500");
  assertEq(t.impulso, 1000, "por impulso = 1000");
  assertEq(t.impulsoPct, 67, "por impulso = 67% dos gastos");
  assertEq(t.saldo, 1500, "saldo = 1500");
}

section("B) Estorno do gasto por impulso (R$ 1.000, Lazer)");
const depois = applyEstorno(base, { id: "exp-2", type: "expense" });
{
  const t = totais(depois);

  // histórico preservado, sem contra-lançamento
  assertEq(depois.expenses.length, 2, "histórico: as 2 despesas continuam na lista");
  assertEq(depois.incomes.length, 1, "nenhuma receita nova foi criada (só o salário)");
  assert(!depois.incomes.some((i) => i.description.startsWith("ESTORNO")), "não existe linha 'ESTORNO —' em receitas");

  // o original fica marcado
  const original = depois.expenses.find((e) => e.id === "exp-2");
  assert(original !== undefined && isEstornado(original), "despesa original marcada com estornadoEm");
  assert(/^\d{4}-\d{2}-\d{2}$/.test(original?.estornadoEm ?? ""), "estornadoEm é data AAAA-MM-DD", original?.estornadoEm);
  assert(!isEstornado(depois.expenses.find((e) => e.id === "exp-1")!), "a outra despesa NÃO foi marcada");
  assertEq(base.expenses.find((e) => e.id === "exp-2")?.estornadoEm, undefined, "applyEstorno não muta o estado anterior");

  // totais: o achado do auditor
  assertEq(t.saldo, 2500, "saldo = 2500 (3000 - 500)");
  assertEq(t.entradas, 3000, "Entradas NÃO infladas: continuam 3000");
  assertEq(t.saidas, 500, "Gastos abatidos: 1500 → 500");
  assertEq(t.impulso, 0, "Por impulso abatido: 1000 → 0");
  assertEq(t.impulsoPct, 0, "Por impulso = 0% dos gastos (não 100%)");
  assert(!t.receitasPorCategoria.has("Lazer"), "'Lazer' NÃO aparece em receitas por categoria");
  assert(!t.gastosPorCategoria.has("Lazer"), "'Lazer' sai de gastos por categoria (única despesa da categoria foi estornada)");

  // nenhuma categoria inválida em lugar nenhum
  const incomeCats = new Set<string>(incomeCategories);
  const expenseCats = new Set<string>(expenseCategories);
  assert(depois.incomes.every((i) => incomeCats.has(i.category)), "toda receita tem categoria de receita válida");
  assert(depois.expenses.every((e) => expenseCats.has(e.category)), "toda despesa tem categoria de despesa válida");
}

section("C) Estorno de receita (Salário R$ 3.000)");
{
  const d = applyEstorno(base, { id: "inc-1", type: "income" });
  const t = totais(d);
  assertEq(d.incomes.length, 1, "receita continua no histórico");
  assertEq(d.expenses.length, 2, "nenhuma despesa nova criada");
  assert(isEstornado(d.incomes[0]), "receita marcada com estornadoEm");
  assertEq(t.entradas, 0, "entradas = 0");
  assertEq(t.saidas, 1500, "gastos não mudam = 1500");
  assertEq(t.saldo, -1500, "saldo = -1500");
}

section("D) Idempotência e id desconhecido");
{
  const duas = applyEstorno(depois, { id: "exp-2", type: "expense" });
  assertEq(duas.expenses.find((e) => e.id === "exp-2")?.estornadoEm, depois.expenses.find((e) => e.id === "exp-2")?.estornadoEm, "estornar 2x mantém a mesma data (não re-marca)");
  assertEq(totais(duas).saidas, 500, "estornar 2x não muda os totais");
  const nada = applyEstorno(base, { id: "nao-existe", type: "expense" });
  assertEq(nada, base, "id desconhecido devolve o mesmo estado");
  const tipoErrado = applyEstorno(base, { id: "exp-2", type: "income" });
  assertEq(tipoErrado, base, "id de despesa com type=income não marca nada");
}

section("E) Helpers do contrato");
{
  const lista = [{ v: 1 }, { v: 2, estornadoEm: "2026-09-10" }, { v: 3, estornadoEm: "" }];
  assertEq(semEstornados(lista).map((i) => i.v).join(","), "1,3", "semEstornados remove só quem tem estornadoEm preenchido");
  assertEq(isEstornado({}), false, "isEstornado({}) = false");
  assertEq(isEstornado({ estornadoEm: "2026-09-10" }), true, "isEstornado(marcado) = true");
}

section("F) Planilha: histórico preservado (linhas) — totais são do cluster B");
{
  const batch = buildSyncBatch({ incomes: depois.incomes, expenses: depois.expenses, debts: [], goals: [] });
  const des = batch.valueRanges.find((v) => v.range.startsWith("Despesas"))?.values ?? [];
  const rec = batch.valueRanges.find((v) => v.range.startsWith("Receitas"))?.values ?? [];
  assertEq(des.length, 2, "aba Despesas mantém as 2 linhas (a estornada continua no histórico)");
  assertEq(rec.length, 1, "aba Receitas tem só o salário (nenhuma linha 'ESTORNO —')");
  assert(!rec.some((r) => String(r[1]).startsWith("ESTORNO")), "nenhuma linha 'ESTORNO —' na aba Receitas");
}

section("G) Migração de estornos antigos ('ESTORNO — X' como contra-lançamento)");
{
  // Formato exato do provider antigo (git show HEAD:providers/virada-provider.tsx):
  // despesa estornada → receita `ESTORNO — ${description}`, mesmo valor, mesma data,
  // categoria copiada (inválida pra receita) — e vice-versa.
  const contraLazer: Income = { id: "inc-old-1", description: "ESTORNO — Gasto por impulso", value: 1000, category: "Lazer" as Income["category"], date: "2026-09-08", scope: "casa", source: "app" };

  // G1 — par simples
  const antigo: ViradaData = { ...base, incomes: [contraLazer, salario] };
  const { data: mig, migrados } = migrarEstornosAntigos(antigo);
  assertEq(migrados, 1, "par simples: 1 migrado");
  assertEq(mig.incomes.length, 1, "contra-lançamento removido (só o salário fica)");
  assert(!mig.incomes.some((i) => i.description.startsWith("ESTORNO — ")), "nenhuma linha 'ESTORNO — ' sobrou");
  assertEq(mig.expenses.length, 2, "as 2 despesas continuam no histórico");
  assertEq(mig.expenses.find((e) => e.id === "exp-2")?.estornadoEm, "2026-09-08", "original marcado com estornadoEm = data do contra-lançamento");
  assertEq(mig.expenses.find((e) => e.id === "exp-1")?.estornadoEm, undefined, "a outra despesa NÃO foi marcada");
  assertEq(antigo.incomes.length, 2, "não muta a entrada (incomes)");
  assertEq(antigo.expenses.find((e) => e.id === "exp-2")?.estornadoEm, undefined, "não muta a entrada (expenses)");
  {
    const t = totais(mig);
    assertEq(t.entradas, 3000, "após migrar: Entradas = 3000 (à mão: só o salário)");
    assertEq(t.saidas, 500, "após migrar: Gastos = 500 (à mão: 1500 − 1000 estornado)");
    assertEq(t.saldo, 2500, "após migrar: saldo = 2500");
    assertEq(t.impulso, 0, "após migrar: por impulso = 0");
    assert(!t.receitasPorCategoria.has("Lazer"), "após migrar: 'Lazer' some de receitas por categoria");
    const incomeCats = new Set<string>(incomeCategories);
    assert(mig.incomes.every((i) => incomeCats.has(i.category)), "após migrar: toda receita tem categoria válida");
  }

  // G2 — idempotente: rodar de novo não muda nada
  const denovo = migrarEstornosAntigos(mig);
  assertEq(denovo.migrados, 0, "2ª rodada: 0 migrados");
  assertEq(JSON.stringify(denovo.data), JSON.stringify(mig), "2ª rodada: dados idênticos");
  const semNada = migrarEstornosAntigos(base);
  assertEq(semNada.migrados, 0, "base sem estorno antigo: 0 migrados");
  assertEq(semNada.data, base, "base sem estorno antigo: devolve o mesmo objeto");

  // G3 — dois originais iguais (mesma descrição/valor): pega o mais recente sem estornadoEm
  const cafe1: Expense = { ...mercado, id: "exp-c1", description: "Café", value: 12.5, date: "2026-09-01" };
  const cafe2: Expense = { ...mercado, id: "exp-c2", description: "Café", value: 12.5, date: "2026-09-03" };
  const contraCafe: Income = { ...contraLazer, id: "inc-old-2", description: "ESTORNO — Café", value: 12.5, category: "Mercado" as Income["category"], date: "2026-09-03" };
  const dois = migrarEstornosAntigos({ ...base, expenses: [cafe1, cafe2], incomes: [salario, contraCafe] });
  assertEq(dois.migrados, 1, "dois originais iguais: 1 migrado");
  assertEq(dois.data.expenses.find((e) => e.id === "exp-c2")?.estornadoEm, "2026-09-03", "marca o MAIS RECENTE (03/09)");
  assertEq(dois.data.expenses.find((e) => e.id === "exp-c1")?.estornadoEm, undefined, "o mais antigo (01/09) fica intacto");
  assertEq(dois.data.incomes.length, 1, "contra-lançamento do café removido");
  assertEq(totais(dois.data).saidas, 12.5, "gastos = 12,50 (um café conta, o outro foi estornado)");

  // G3b — dois contra-lançamentos pra dois originais iguais: cada um marca um
  const contraCafeB: Income = { ...contraCafe, id: "inc-old-3", date: "2026-09-04" };
  const ambos = migrarEstornosAntigos({ ...base, expenses: [cafe1, cafe2], incomes: [contraCafeB, contraCafe, salario] });
  assertEq(ambos.migrados, 2, "dois contra-lançamentos: 2 migrados");
  assert(ambos.data.expenses.every((e) => isEstornado(e)), "os dois cafés ficam estornados");
  assertEq(ambos.data.incomes.length, 1, "os dois contra-lançamentos saem");

  // G3c — o mais recente já está marcado pelo contrato novo: pega o próximo sem estornadoEm
  const jaMarcado = migrarEstornosAntigos({ ...base, expenses: [cafe1, { ...cafe2, estornadoEm: "2026-09-05" }], incomes: [contraCafe] });
  assertEq(jaMarcado.data.expenses.find((e) => e.id === "exp-c1")?.estornadoEm, "2026-09-03", "candidato já marcado é pulado; marca o outro");
  assertEq(jaMarcado.data.expenses.find((e) => e.id === "exp-c2")?.estornadoEm, "2026-09-05", "quem já estava marcado mantém a data");

  // G4 — estorno órfão (sem original): fica tudo como está
  const orfao: Income = { ...contraLazer, id: "inc-orf", description: "ESTORNO — Não existe", value: 77 };
  const semPar = migrarEstornosAntigos({ ...base, incomes: [orfao, salario] });
  assertEq(semPar.migrados, 0, "órfão: 0 migrados");
  assertEq(semPar.data.incomes.length, 2, "órfão: nada apagado");
  assert(semPar.data.incomes.some((i) => i.id === "inc-orf"), "órfão: a linha 'ESTORNO — ' continua lá");
  assert(semPar.data.expenses.every((e) => !isEstornado(e)), "órfão: nenhuma despesa marcada");

  // G4b — candidato só bate se: mesmo valor, descrição igual ao sufixo, data ≤ data do estorno
  const valorDiferente = migrarEstornosAntigos({ ...base, incomes: [{ ...contraLazer, value: 999.99 }] });
  assertEq(valorDiferente.migrados, 0, "valor diferente não casa");
  const dataDepois = migrarEstornosAntigos({ ...base, incomes: [{ ...contraLazer, date: "2026-09-07" }] });
  assertEq(dataDepois.migrados, 0, "original com data DEPOIS do estorno não casa");
  const mesmoTipo = migrarEstornosAntigos({ ...base, expenses: [...base.expenses, { ...mercado, id: "exp-old", description: "ESTORNO — Mercado", date: "2026-09-06" }] , incomes: [salario] });
  assertEq(mesmoTipo.migrados, 0, "contra-lançamento precisa ser de tipo OPOSTO (despesa não casa despesa)");
  assertEq(mesmoTipo.data.expenses.length, 3, "sem par: despesa 'ESTORNO — Mercado' não é apagada");

  // G5 — sentido inverso: receita estornada virou despesa "ESTORNO — Salário"
  const contraSalario: Expense = { id: "exp-old-1", description: "ESTORNO — Salário", value: 3000, category: "Salário" as Expense["category"], date: "2026-09-05", paymentMethod: "Outro", nature: "essencial", scope: "casa", source: "app" };
  const inverso = migrarEstornosAntigos({ ...base, expenses: [contraSalario, ...base.expenses] });
  assertEq(inverso.migrados, 1, "receita estornada no formato antigo: 1 migrado");
  assertEq(inverso.data.incomes[0].estornadoEm, "2026-09-05", "salário marcado com a data do contra-lançamento");
  assertEq(inverso.data.expenses.length, 2, "despesa 'ESTORNO — Salário' removida");
  assertEq(totais(inverso.data).entradas, 0, "após migrar: Entradas = 0");
  assertEq(totais(inverso.data).saidas, 1500, "após migrar: Gastos = 1500 (à mão)");

  // G6 — centavos: 0,30 estornado casa com 0,30 (comparação em centavos)
  const trinta: Expense = { ...mercado, id: "exp-30", description: "Bala", value: 0.1 + 0.2 };
  const contraTrinta: Income = { ...contraLazer, id: "inc-30", description: "ESTORNO — Bala", value: 0.3 };
  const cent = migrarEstornosAntigos({ ...base, expenses: [trinta], incomes: [contraTrinta] });
  assertEq(cent.migrados, 1, "0.1+0.2 casa com 0.3 (centavos)");
}

console.log("\n" + "═".repeat(60));
console.log(`RESULTADO: ${passed} passaram, ${failed} falharam`);
if (failures.length > 0) {
  console.log("\nFALHAS:");
  failures.forEach((f) => console.log(`  • ${f}`));
}
console.log("═".repeat(60));
if (failed > 0) process.exit(1);
