/**
 * test-dividas-parcela.ts — "Paguei a parcela" (CA-08) e o "Desfazer" dela, com as
 * funções puras do provider (applyDebtPayment / applyUndoDebtPayment) — sem React.
 *
 * Cobre: pagar 1x (gasto "Dívida" de hoje ligado à dívida, paidValue, parcelas que
 * faltam, vencimento +1 mês), pagar até quitar (status vira "quitada" e sai de
 * openDebtsTotal), 31/01 → 28/02 (e 29/02 em bissexto), desfazer devolvendo o estado
 * EXATO (deep-equal), desfazer 2x é no-op, dados antigos sem paidValue → "R$ 0 pagos".
 *
 * Nada depende do relógio: "hoje" é string fixa. Roda com:
 *   npx tsx scripts/test-dividas-parcela.ts   (e com TZ=UTC)
 */

import { deepStrictEqual } from "node:assert";
import { debtInstallmentsLeft, debtPaid, debtRemaining, isOpenDebt } from "../lib/types";
import type { Debt, Expense, ViradaData } from "../lib/types";
import { addMonths, getDashboardMetrics } from "../lib/utils";
import { applyDebtPayment, applyUndoDebtPayment } from "../providers/virada-provider";

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

// deep-equal ESTRITO (chave ausente ≠ chave undefined) — é o que "estado exato" quer dizer
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
const vazio: ViradaData = { expenses: [], incomes: [], debts: [], goals: [], missionStatus: {} };
const cartao: Debt = { id: "d1", name: "Cartão", totalValue: 3200, installmentValue: 450, dueDate: "2026-09-20", priority: "alta", status: "aberta" };
const gastoAntigo: Expense = { id: "e0", description: "Mercado", value: 100, category: "Mercado", date: "2026-09-10", paymentMethod: "Débito", nature: "essencial", scope: "casa" };
const base: ViradaData = { ...vazio, debts: [cartao], expenses: [gastoAntigo] };

// ═════════════════════════════════════════════════════════════════════════════
section("Helpers de dívida (lib/types)");
{
  assertEq(debtPaid(cartao), 0, "debtPaid sem paidValue = 0 (dívida antiga → 'R$ 0 pagos')");
  assertEq(debtRemaining(cartao), 3200, "debtRemaining = total − 0");
  assertEq(debtInstallmentsLeft(cartao), 8, "3.200 / 450 = 7,1 → faltam 8 parcelas");
  assertEq(debtInstallmentsLeft({ ...cartao, paidValue: 450 }), 7, "após 1 parcela: 2.750 / 450 → 7 (CA-08: 'faltam 7 parcelas')");
  assertEq(debtRemaining({ ...cartao, paidValue: 3500 }), 0, "pagou a mais: restante trava em 0");
  assertEq(debtInstallmentsLeft({ ...cartao, paidValue: 3200 }), 0, "quitada: 0 parcelas");
  assertEq(debtInstallmentsLeft({ ...cartao, installmentValue: 0 }), 0, "parcela 0 → 0 (não divide por zero, não Infinity)");
  assertEq(debtInstallmentsLeft({ ...cartao, totalValue: 0.3, installmentValue: 0.1 }), 3, "0,30 / 0,10 = 3 exato (conta em centavos, não 4)");
  assertEq(debtPaid({ ...cartao, paidValue: NaN }), 0, "paidValue corrompido (NaN) vira 0");
  assert(!Number.isNaN(debtRemaining({ ...cartao, paidValue: undefined })), "sem NaN em debtRemaining");
}

// ═════════════════════════════════════════════════════════════════════════════
section("addMonths · vencimento avança 1 mês, último dia quando o mês é curto");
{
  assertEq(addMonths("2026-01-31", 1), "2026-02-28", "31/01 → 28/02 (2026)");
  assertEq(addMonths("2024-01-31", 1), "2024-02-29", "31/01 → 29/02 (bissexto)");
  assertEq(addMonths("2026-01-30", 1), "2026-02-28", "30/01 → 28/02");
  assertEq(addMonths("2026-03-31", 1), "2026-04-30", "31/03 → 30/04");
  assertEq(addMonths("2026-09-20", 1), "2026-10-20", "20/09 → 20/10 (mesmo dia)");
  assertEq(addMonths("2026-12-15", 1), "2027-01-15", "dez → jan do ano seguinte");
  assertEq(addMonths("2026-02-28", 1), "2026-03-28", "28/02 → 28/03 (não 'último dia' de março)");
  assertEq(addMonths("2026-03-31", -1), "2026-02-28", "volta 1 mês: 31/03 → 28/02");
  assertEq(addMonths("2026-01-01", 1), "2026-02-01", "dia 1º não escorrega por fuso");
}

// ═════════════════════════════════════════════════════════════════════════════
section("CA-08 · pagar 1x: gasto 'Dívida' de hoje, paidValue, vencimento +1 mês");
{
  const r = applyDebtPayment(base, "d1", { hoje: HOJE });
  assert(r !== null, "applyDebtPayment devolve resultado");
  if (r) {
    assert(typeof r.paymentId === "string" && r.paymentId.length > 0, "devolve paymentId");
    assert(typeof r.expenseId === "string" && r.expenseId.length > 0, "devolve expenseId");
    const d = r.data.debts[0];
    assertEq(debtPaid(d), 450, "paidValue = 450 (valor padrão = parcela)");
    assertEq(debtRemaining(d), 2750, "restante 2.750");
    assertEq(debtInstallmentsLeft(d), 7, "'faltam 7 parcelas'");
    assertEq(d.dueDate, "2026-10-20", "vencimento avançou 1 mês");
    assertEq(d.status, "aberta", "continua aberta");
    assertEq(d.payments?.length, 1, "1 pagamento registrado");
    assertEq(d.payments?.[0].id, r.paymentId, "payment.id = paymentId devolvido");
    assertEq(d.payments?.[0].expenseId, r.expenseId, "payment.expenseId = expenseId devolvido");
    assertEq(d.payments?.[0].value, 450, "payment.value = 450");
    assertEq(d.payments?.[0].date, HOJE, "payment.date = hoje");

    assertEq(r.data.expenses.length, 2, "apareceu um gasto novo (o antigo continua)");
    const g = r.data.expenses.find((e) => e.id === r.expenseId)!;
    assertEq(g.category, "Dívida", "gasto na categoria 'Dívida'");
    assertEq(g.description, "Cartão", "descrição = nome da dívida");
    assertEq(g.value, 450, "valor = parcela");
    assertEq(g.date, HOJE, "data = hoje (local, passada explicitamente)");
    assertEq(g.scope, "casa", "escopo casa");
    assertEq(g.nature, "essencial", "natureza essencial");
    assertEq(g.debtId, "d1", "gasto ligado à dívida (debtId)");
    assertEq(g.paymentMethod, "Débito", "forma de pagamento = a do gasto mais recente");
    assertEq(r.data.expenses[0].id, r.expenseId, "gasto novo entra no topo da lista (mais novo primeiro)");
    assert(r.data !== base && base.debts[0].paidValue === undefined && base.expenses.length === 1, "não muta o estado anterior");
  }

  const semGasto = applyDebtPayment({ ...vazio, debts: [cartao] }, "d1", { hoje: HOJE });
  assertEq(semGasto?.data.expenses[0].paymentMethod, "Pix", "sem gasto anterior: forma de pagamento 'Pix'");

  const maisRecente: ViradaData = {
    ...vazio, debts: [cartao],
    expenses: [
      { ...gastoAntigo, id: "a", date: "2026-09-01", paymentMethod: "Boleto" },
      { ...gastoAntigo, id: "b", date: "2026-09-12", paymentMethod: "Crédito" },
    ],
  };
  assertEq(applyDebtPayment(maisRecente, "d1", { hoje: HOJE })?.data.expenses[0].paymentMethod, "Crédito", "'mais recente' é por data, não pela posição na lista");

  const valorLivre = applyDebtPayment(base, "d1", { hoje: HOJE, value: 100 });
  assertEq(debtPaid(valorLivre!.data.debts[0]), 100, "value explícito (100) em vez da parcela");
  assertEq(valorLivre!.data.expenses[0].value, 100, "gasto com o valor explícito");

  assertEq(applyDebtPayment(base, "nao-existe", { hoje: HOJE }), null, "dívida inexistente → null");
  assertEq(applyDebtPayment({ ...vazio, debts: [{ ...cartao, status: "quitada" }] }, "d1", { hoje: HOJE }), null, "dívida quitada → null (nada a pagar)");
  assertEq(applyDebtPayment(base, "d1", { hoje: HOJE, value: 0 }), null, "value 0 → null");
  assertEq(applyDebtPayment(base, "d1", { hoje: HOJE, value: -5 }), null, "value negativo → null");
  assertEq(applyDebtPayment({ ...vazio, debts: [{ ...cartao, installmentValue: 0 }] }, "d1", { hoje: HOJE }), null, "sem parcela e sem value → null (não cria gasto de R$ 0)");
}

// ═════════════════════════════════════════════════════════════════════════════
section("CA-08 · pagar até quitar: status vira 'quitada' e sai de openDebtsTotal");
{
  let data: ViradaData = base;
  let vezes = 0;
  while (isOpenDebt(data.debts[0]) && vezes < 20) {
    const r = applyDebtPayment(data, "d1", { hoje: HOJE });
    if (!r) break;
    data = r.data;
    vezes++;
  }
  assertEq(vezes, 8, "8 parcelas de 450 quitam 3.200 (a última passa do total)");
  const d = data.debts[0];
  assertEq(d.status, "quitada", "status → 'quitada' sozinho");
  assertEq(debtPaid(d), 3600, "paidValue = 8 × 450 = 3.600");
  assertEq(debtRemaining(d), 0, "restante 0");
  assertEq(debtInstallmentsLeft(d), 0, "0 parcelas");
  assertEq(d.dueDate, "2027-05-20", "vencimento avançou 8 meses (set → mai)");
  assertEq(d.payments?.length, 8, "8 pagamentos registrados");
  assertEq(data.expenses.filter((e) => e.debtId === "d1").length, 8, "8 gastos 'Dívida' ligados");
  assertEq(getDashboardMetrics(data).openDebtsTotal, 0, "quitada sai de openDebtsTotal");
  assertEq(applyDebtPayment(data, "d1", { hoje: HOJE }), null, "quitada: pagar de novo → null");

  // pagamento exato: 2 parcelas de 1.600 quitam sem passar
  const exato: ViradaData = { ...vazio, debts: [{ ...cartao, installmentValue: 1600 }] };
  const p1 = applyDebtPayment(exato, "d1", { hoje: HOJE })!;
  assertEq(p1.data.debts[0].status, "aberta", "1.600 de 3.200: ainda aberta");
  const p2 = applyDebtPayment(p1.data, "d1", { hoje: HOJE })!;
  assertEq(p2.data.debts[0].status, "quitada", "3.200 de 3.200 (>=) → quitada");

  // centavos: 0,10 + 0,20 = 0,30 quita 0,30 (sem ruído de float)
  const cent: ViradaData = { ...vazio, debts: [{ ...cartao, totalValue: 0.3, installmentValue: 0.1 }] };
  let c = cent;
  for (let i = 0; i < 3; i++) c = applyDebtPayment(c, "d1", { hoje: HOJE })!.data;
  assertEq(c.debts[0].status, "quitada", "3 × 0,10 quita 0,30");
  assertEq(debtPaid(c.debts[0]), 0.3, "paidValue = 0,30 exato");

  // negociando também é em aberto: paga e pode quitar
  const neg = applyDebtPayment({ ...vazio, debts: [{ ...cartao, status: "negociando", installmentValue: 3200 }] }, "d1", { hoje: HOJE })!;
  assertEq(neg.data.debts[0].status, "quitada", "negociando + pagamento total → quitada");
}

// ═════════════════════════════════════════════════════════════════════════════
section("CA-08 · 31/01 → 28/02 e 29/02 em bissexto, no fluxo de pagamento");
{
  const jan: ViradaData = { ...vazio, debts: [{ ...cartao, dueDate: "2026-01-31" }] };
  const r1 = applyDebtPayment(jan, "d1", { hoje: "2026-01-25" })!;
  assertEq(r1.data.debts[0].dueDate, "2026-02-28", "31/01/2026 → 28/02/2026");
  const r2 = applyDebtPayment(r1.data, "d1", { hoje: "2026-02-25" })!;
  assertEq(r2.data.debts[0].dueDate, "2026-03-28", "28/02 → 28/03 (o dia 31 não volta — sem 'memória' do dia original)");

  const bissexto: ViradaData = { ...vazio, debts: [{ ...cartao, dueDate: "2024-01-31" }] };
  assertEq(applyDebtPayment(bissexto, "d1", { hoje: "2024-01-25" })!.data.debts[0].dueDate, "2024-02-29", "31/01/2024 → 29/02/2024");
}

// ═════════════════════════════════════════════════════════════════════════════
section("Desfazer · devolve o estado EXATO (deep-equal estrito) e 2x é no-op");
{
  // dívida antiga: sem paidValue nem payments — depois do desfazer as chaves NÃO podem sobrar
  const pago = applyDebtPayment(base, "d1", { hoje: HOJE })!;
  const desfeito = applyUndoDebtPayment(pago.data, pago.paymentId);
  assertDeep(desfeito, base, "pagar + desfazer = estado original (dívida antiga sem paidValue/payments)");
  assert(!("paidValue" in desfeito.debts[0]) && !("payments" in desfeito.debts[0]), "chaves paidValue/payments não sobram na dívida antiga");
  assertEq(desfeito.expenses.map((e) => e.id), ["e0"], "o gasto 'Dívida' sumiu; o antigo ficou");
  assertEq(desfeito.debts[0].dueDate, "2026-09-20", "vencimento voltou");
  assertEq(desfeito.debts[0].status, "aberta", "status voltou");

  const denovo = applyUndoDebtPayment(desfeito, pago.paymentId);
  assert(denovo === desfeito, "desfazer 2x é no-op (mesma referência)");
  assertDeep(denovo, base, "desfazer 2x: estado continua o original");
  assert(applyUndoDebtPayment(base, "payment-que-nao-existe") === base, "paymentId desconhecido → no-op");

  // dívida que JÁ tinha paidValue explícito (0): a chave volta como estava
  const comHistorico: ViradaData = { ...vazio, debts: [{ ...cartao, paidValue: 0 }] };
  const pago2 = applyDebtPayment(comHistorico, "d1", { hoje: HOJE })!;
  assertDeep(applyUndoDebtPayment(pago2.data, pago2.paymentId), comHistorico, "paidValue: 0 explícito volta exatamente (chave fica)");
  assert(!("payments" in applyUndoDebtPayment(pago2.data, pago2.paymentId).debts[0]), "`payments` só existe enquanto há pelo menos um pagamento");

  // 31/01 → 28/02 → desfazer volta pra 31/01 (não 28/01): o desfazer guarda a data anterior
  const jan: ViradaData = { ...vazio, debts: [{ ...cartao, dueDate: "2026-01-31" }] };
  const pj = applyDebtPayment(jan, "d1", { hoje: "2026-01-25" })!;
  assertDeep(applyUndoDebtPayment(pj.data, pj.paymentId), jan, "31/01 → 28/02 → desfazer → 31/01 exato");

  // quitou na última parcela → desfazer volta pra 'aberta' com o total pago anterior
  const quase: ViradaData = { ...vazio, debts: [{ ...cartao, paidValue: 3000, status: "negociando" }] };
  const q = applyDebtPayment(quase, "d1", { hoje: HOJE })!;
  assertEq(q.data.debts[0].status, "quitada", "3.000 + 450 ≥ 3.200 → quitada");
  const qd = applyUndoDebtPayment(q.data, q.paymentId);
  assertDeep(qd, quase, "desfazer a parcela que quitou devolve 'negociando' com 3.000 pagos");
  assertEq(getDashboardMetrics(qd).openDebtsTotal, 3200, "voltou a contar em openDebtsTotal");

  // desfazer o penúltimo de dois pagamentos: subtrai o valor certo e tira só o gasto dele
  const p1 = applyDebtPayment(base, "d1", { hoje: "2026-09-15" })!;
  const p2 = applyDebtPayment(p1.data, "d1", { hoje: "2026-10-15", value: 100 })!;
  const u1 = applyUndoDebtPayment(p2.data, p1.paymentId);
  assertEq(debtPaid(u1.debts[0]), 100, "desfez o 1º (450): paidValue = 100");
  assertEq(u1.expenses.filter((e) => e.debtId === "d1").map((e) => e.value), [100], "só o gasto do 1º pagamento saiu");
  assertEq(u1.debts[0].payments?.map((p) => p.id), [p2.paymentId], "sobrou só o 2º payment");
}

// ═════════════════════════════════════════════════════════════════════════════
section("CA-12 · dívida antiga (JSON sem os campos novos) passa por tudo sem NaN");
{
  const antigo = JSON.parse(JSON.stringify(base)) as ViradaData;
  const r = applyDebtPayment(antigo, "d1", { hoje: HOJE })!;
  const d = r.data.debts[0];
  assert(Number.isFinite(debtPaid(d)) && Number.isFinite(debtRemaining(d)) && Number.isFinite(debtInstallmentsLeft(d)), "helpers sem NaN/Infinity");
  assertEq(debtPaid(d), 450, "paidValue undefined + 450 = 450 (não NaN)");
  assertDeep(applyUndoDebtPayment(r.data, r.paymentId), antigo, "desfazer sobre dado antigo devolve o JSON original");
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
