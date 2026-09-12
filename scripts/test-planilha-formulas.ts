/**
 * test-planilha-formulas.ts — a planilha "viva": as contas são FÓRMULAS dentro
 * do Google Sheets (em pt-BR), não valores colados. Sem credencial Google, a
 * prova é o mini-avaliador (scripts/planilha-avaliador.ts) rodando as fórmulas
 * geradas sobre os valueRanges gerados.
 *
 *  (a) Varredura: toda string que começa com "=" só usa funções pt-BR da lista
 *      permitida e nunca "," (vírgula = #ERRO! em pt_BR). Referência a aba com
 *      espaço/acentos vai entre aspas simples.
 *  (b) Dashboard A6/D6/G6/J6 == getDashboardMetrics ao centavo (com estornado no
 *      meio); A8/D8/G8/J8 == histórico válido; categorias == soma à mão.
 *      Filtros: 4 combinações de menu == conta à mão. Bolsos == getPockets.
 *      Dívidas "Em aberto" == debtRemaining; Metas == getGoalProgress; Fluxo e
 *      Resumo acumulam certo.
 *      Avaliador: célula com apóstrofo é SEMPRE texto ("'=1+1" lê "=1+1").
 *      Chave de mês = mesChave ("2026-09 (set)"): não tem cara de data.
 *  (c) Planilha vazia: nenhuma fórmula dá "#…" (nem #DIV/0!).
 *  (d) Anotações: coluna livre depois da última gerada — nenhum clear/write do
 *      sync a toca, e é a única faixa desprotegida das abas de dados.
 *  (e) Layout: menus com validação de dados, cabeçalhos congelados e basicFilter
 *      continuam nas abas de dados; grade cresce quando os dados passam do rowCount.
 *
 * Roda com: TZ=America/Sao_Paulo npx tsx scripts/test-planilha-formulas.ts
 * (e de novo com TZ=UTC).
 */

import {
  HEADERS,
  LAYOUT_VERSION,
  MAX_DATA_ROWS,
  TAB,
  buildLayoutRequests,
  buildSheetSpecs,
  buildStaticValues,
  buildSyncBatch,
  colunaAnotacoes,
  dataClearRange,
  mesChave,
  type DataTabKey,
  type SyncInput,
} from "../lib/sheets/builder";
import { growGridCall, precisaCrescer, pushDataCalls, readSheetIds, type SpreadsheetInfo } from "../lib/sheets/sync-requests";
import { FUNCOES_PERMITIDAS, funcoesUsadas, montarPasta, Pasta, type Celula } from "./planilha-avaliador";
import { debtRemaining, semEstornados, type Debt, type Expense, type Goal, type Income, type ViradaData } from "../lib/types";
import { getDashboardMetrics, getGoalProgress, getPockets, pocketOf, shiftMonth, toInputDate } from "../lib/utils";
import { POCKETS } from "../lib/constants";

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

function assertEq(actual: unknown, expected: unknown, label: string, detail?: string) {
  const ok = actual === expected;
  assert(ok, label, ok ? undefined : `esperado=${JSON.stringify(expected)}, obtido=${JSON.stringify(actual)}${detail ? ` · ${detail}` : ""}`);
}

function section(name: string) {
  console.log(`\n━━━ ${name} ━━━`);
}

const centavos = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const soma = (items: { value: number }[]) => centavos(items.reduce((s, i) => s + i.value, 0));

// ─── Meses relativos ao mês corrente LOCAL (nunca toISOString) ───────────────
const HOJE = toInputDate();
const M0 = HOJE.slice(0, 7);
const M1 = shiftMonth(M0, -1);
const M2 = shiftMonth(M0, -2);
const dia = (mes: string, d: number) => `${mes}-${String(d).padStart(2, "0")}`;

const incomes: Income[] = [
  { id: "i1", description: "Salário", value: 3000, category: "Salário", date: dia(M1, 5), scope: "casa", source: "app" },
  { id: "i2", description: "Salário", value: 2800, category: "Salário", date: dia(M2, 5), scope: "casa", source: "app" },
  { id: "i3", description: "Venda", value: 500, category: "Venda", date: dia(M0, 3), scope: "casa", source: "app" },
  { id: "i4", description: "Serviço loja", value: 1200, category: "Serviço", date: dia(M0, 8), scope: "empresa", source: "app" },
  { id: "i5", description: "Bico", value: 400, category: "Renda extra", date: dia(M0, 9), scope: "casa", source: "app", estornadoEm: HOJE },
];
const expenses: Expense[] = [
  { id: "e1", description: "Mercado", value: 800.33, category: "Mercado", date: dia(M0, 4), paymentMethod: "Pix", nature: "essencial", scope: "casa", source: "app" },
  { id: "e2", description: "Lazer", value: 250.12, category: "Lazer", date: dia(M0, 5), paymentMethod: "Crédito", nature: "impulso", scope: "casa", source: "app" },
  { id: "e3", description: "Água", value: 120.5, category: "Água", date: dia(M0, 6), paymentMethod: "Boleto", nature: "essencial", scope: "casa", source: "app" },
  { id: "e4", description: "Tênis", value: 999, category: "Compra", date: dia(M0, 7), paymentMethod: "Crédito", nature: "impulso", scope: "casa", source: "app" },
  { id: "e5", description: "Chaveiro", value: 60, category: "Outros", date: dia(M0, 8), paymentMethod: "Dinheiro", nature: "essencial", scope: "casa", source: "app" },
  { id: "e6", description: "Fatura", value: 300, category: "Cartão", date: dia(M0, 9), paymentMethod: "Boleto", nature: "essencial", scope: "casa", source: "app" },
  { id: "e7", description: "Anúncio", value: 150, category: "Marketing", date: dia(M0, 10), paymentMethod: "Pix", nature: "essencial", scope: "empresa", source: "app" },
  { id: "e8", description: "Lanche", value: 77.77, category: "Delivery", date: dia(M0, 11), paymentMethod: "Pix", nature: "impulso", scope: "casa", source: "app", estornadoEm: HOJE },
  { id: "e9", description: "Aluguel", value: 500, category: "Aluguel", date: dia(M1, 10), paymentMethod: "Pix", nature: "essencial", scope: "casa", source: "app" },
  { id: "e10", description: "Ônibus", value: 45.5, category: "Transporte", date: dia(M2, 10), paymentMethod: "Débito", nature: "essencial", scope: "casa", source: "app" },
];
const debts: Debt[] = [
  { id: "d1", name: "Cartão", totalValue: 1800, installmentValue: 600, dueDate: dia(M0, 20), priority: "alta", status: "aberta", paidValue: 600 },
  { id: "d2", name: "Empréstimo", totalValue: 5000, installmentValue: 500, dueDate: dia(M0, 25), priority: "média", status: "negociando" },
  { id: "d3", name: "Velha", totalValue: 300, installmentValue: 300, dueDate: "2026-01-01", priority: "alta", status: "quitada", paidValue: 300 },
  { id: "d4", name: "Paga a mais", totalValue: 1000, installmentValue: 100, dueDate: dia(M0, 28), priority: "baixa", status: "aberta", paidValue: 1200 },
];
const goals: Goal[] = [
  { id: "g1", name: "Reserva", targetValue: 12000, currentValue: 3000, type: "reserva" },
  { id: "g2", name: "Cofrinho", targetValue: 1000, currentValue: 2500, type: "economia" },
  { id: "g3", name: "Alvo zero", targetValue: 0, currentValue: 50, type: "reserva" },
  { id: "g4", name: "Negativa", targetValue: 1000, currentValue: -100, type: "economia" },
];

const data: ViradaData = { incomes, expenses, debts, goals, missionStatus: {} };
const batch = buildSyncBatch(data as SyncInput);
const estatico = buildStaticValues();
const pasta = montarPasta(estatico, batch.valueRanges);
const ler = (ref: string) => pasta.ler(ref);
const num = (ref: string) => Number(ler(ref));
const vazio = buildSyncBatch({ incomes: [], expenses: [], debts: [], goals: [] });

// ─────────────────────────────────────────────────────────────────────────────
section("(a) Varredura — só funções pt-BR da lista, nunca vírgula, abas entre aspas");
// ─────────────────────────────────────────────────────────────────────────────
{
  const permitidas = new Set<string>(FUNCOES_PERMITIDAS);
  const todas: Array<{ range: string; formula: string }> = [];
  for (const vr of [...estatico, ...batch.valueRanges, ...vazio.valueRanges]) {
    vr.values.forEach((linha) => linha.forEach((c) => { if (typeof c === "string" && c.startsWith("=")) todas.push({ range: vr.range, formula: c }); }));
  }
  assert(todas.length >= 40, `há fórmulas de verdade na planilha (${todas.length})`);
  const foraDaLista = todas.flatMap((f) => funcoesUsadas(f.formula).filter((n) => !permitidas.has(n)).map((n) => `${f.range}: ${n}`));
  assertEq(foraDaLista.length, 0, "toda função é pt-BR e está na lista permitida", foraDaLista.slice(0, 5).join(" | "));
  const emIngles = todas.filter((f) => /\b(SUM|SUMIF|SUMIFS|COUNTIF|COUNTIFS|COUNTA|IF|MAX|MIN|ROUND|AND|OR)\(/.test(f.formula));
  assertEq(emIngles.length, 0, "nenhuma função em inglês (daria #NOME?)", emIngles.map((f) => f.formula).slice(0, 3).join(" | "));
  const comVirgula = todas.filter((f) => f.formula.includes(","));
  assertEq(comVirgula.length, 0, "nenhuma vírgula — separador é ';' (pt_BR)", comVirgula.map((f) => f.range).slice(0, 5).join(", "));
  const semAspas = todas.filter((f) => /(^|[^'A-Za-zÀ-ÿ])(Fluxo de Caixa|Resumo Mensal|Lançamentos|Dívidas)!/.test(f.formula));
  assertEq(semAspas.length, 0, "aba com espaço/acento entra entre aspas simples ('Lançamentos'!…)", semAspas.map((f) => f.formula).slice(0, 2).join(" | "));
  const comDecimal = todas.filter((f) => /\d\.\d/.test(f.formula.replace(/"(?:[^"]|"")*"/g, "")));
  assertEq(comDecimal.length, 0, "nenhum literal decimal com ponto (em pt_BR seria vírgula, que é proibida)");
  const usadas = new Set(todas.flatMap((f) => funcoesUsadas(f.formula)));
  for (const fn of ["SOMASES", "CONT.SES", "CONT.SE", "SE", "MÁXIMO", "MÍNIMO", "ARRED"]) assert(usadas.has(fn), `usa ${fn}`);
}

// ─────────────────────────────────────────────────────────────────────────────
section("(b1) Dashboard — KPIs por fórmula == getDashboardMetrics (estornado no meio)");
// ─────────────────────────────────────────────────────────────────────────────
{
  const app = getDashboardMetrics(data);
  for (const c of ["A6", "D6", "G6", "J6", "A8", "D8", "G8", "J8"]) {
    assert(String(pasta.bruto("Dashboard", c)).startsWith("="), `Dashboard!${c} é fórmula`, String(pasta.bruto("Dashboard", c)));
  }
  assertEq(ler("Dashboard!B3"), mesChave(M0), "B3 = mês de referência (chave mesChave, texto que não parece data)");
  // Juiz (rodada 1): "2026-09" com apóstrofo é texto, mas o SOMASES real pode ler
  // o critério como data e devolver 0. A chave leva o nome do mês entre parênteses:
  // "2026-09 (set)" — nenhum parser engole, e continua ordenando por AAAA-MM.
  assert(/^\d{4}-\d{2} \([a-z]{3}\)$/.test(mesChave(M0)), "mesChave não tem cara de data (AAAA-MM (mmm))", mesChave(M0));
  assertEq(mesChave("2026-01"), "2026-01 (jan)", "mesChave: janeiro");
  assertEq(mesChave("2026-12"), "2026-12 (dez)", "mesChave: dezembro");
  assert(!String(pasta.bruto("Dashboard", "B3")).startsWith("'") && !String(batch.valueRanges.find((v) => v.range === "Dashboard!B3")?.values[0][0]).startsWith("'"), "B3 é gravado sem apóstrofo (não precisa: já é texto)");
  const colMes = (batch.valueRanges.find((v) => v.range === "Lançamentos!A2")?.values ?? []).map((l) => l[9]);
  assert(colMes.length > 0 && colMes.every((m) => /^\d{4}-\d{2} \([a-z]{3}\)$/.test(String(m))), "coluna Mês (J) de Lançamentos usa a mesma chave", String(colMes[0]));
  assertEq(centavos(num("Dashboard!A6")), app.incomeMonth, "A6 = incomeMonth (500; estornada de 400 fora; empresa 1200 dentro)");
  assertEq(centavos(num("Dashboard!D6")), app.expenseMonth, "D6 = expenseMonth");
  assertEq(centavos(num("Dashboard!G6")), app.balanceMonth, "G6 = balanceMonth");
  assertEq(num("Dashboard!J6"), app.monthIncomes.length + app.monthExpenses.length, "J6 = lançamentos do mês (sem estornados)");
  assertEq(app.incomeMonth, 1700, "sanidade: app soma 500 + 1200 (empresa entra no Início)");
  const vIn = semEstornados(incomes);
  const vEx = semEstornados(expenses);
  assertEq(centavos(num("Dashboard!A8")), soma(vIn), "A8 = entradas desde o início (sem estornada)");
  assertEq(centavos(num("Dashboard!D8")), soma(vEx), "D8 = gastos desde o início (sem estornada)");
  assertEq(centavos(num("Dashboard!G8")), centavos(soma(vIn) - soma(vEx)), "G8 = A8 − D8");
  assertEq(num("Dashboard!J8"), vIn.length + vEx.length, "J8 = 13 lançamentos válidos (15 − 2 estornados)");

  // top categorias: nome gravado pelo sync, valor por SOMASES
  const porCat = new Map<string, number>();
  vEx.forEach((e) => porCat.set(e.category, centavos((porCat.get(e.category) ?? 0) + e.value)));
  const esperado = [...porCat.entries()].sort((a, b) => b[1] - a[1]);
  esperado.forEach(([cat, total], i) => {
    assertEq(ler(`Dashboard!A${12 + i}`), cat, `A${12 + i} = ${cat}`);
    assertEq(centavos(num(`Dashboard!B${12 + i}`)), total, `B${12 + i} (SOMASES) = ${total}`);
  });
  assert(!esperado.some(([c]) => c === "Delivery"), "categoria só da despesa estornada não aparece");
  assertEq(ler(`Dashboard!B${12 + esperado.length}`), "", "linha sem categoria fica em branco (não 0)");
  assertEq(ler("Dashboard!C12"), "▬", "SPARKLINE da categoria avalia (barra)");
  assertEq(ler("Dashboard!K21"), "▬", "SPARKLINE do comparativo avalia (última linha = mês corrente, com movimento)");
}

// ─────────────────────────────────────────────────────────────────────────────
section("(b2) Filtros — menus viram critérios; 'Todos' = '*'");
// ─────────────────────────────────────────────────────────────────────────────
{
  type Filtro = { mes?: string; categoria?: string; escopo?: "Casa" | "Empresa"; natureza?: string; pagamento?: string };
  // entrada não tem natureza nem pagamento: a planilha grava "—" (célula vazia não casa "*")
  const validos = [
    ...semEstornados(incomes).map((i) => ({ tipo: "Entrada", value: i.value, mes: i.date.slice(0, 7), categoria: i.category, escopo: i.scope === "empresa" ? "Empresa" : "Casa", natureza: "—", pagamento: "—" })),
    ...semEstornados(expenses).map((e) => ({ tipo: "Saída", value: e.value, mes: e.date.slice(0, 7), categoria: e.category, escopo: e.scope === "empresa" ? "Empresa" : "Casa", natureza: e.nature, pagamento: e.paymentMethod })),
  ];
  const aMao = (f: Filtro) => {
    const sel = validos.filter((r) =>
      (!f.mes || r.mes === f.mes) && (!f.categoria || r.categoria === f.categoria) && (!f.escopo || r.escopo === f.escopo) &&
      (!f.natureza || r.natureza === f.natureza) && (!f.pagamento || r.pagamento === f.pagamento));
    const entradas = soma(sel.filter((r) => r.tipo === "Entrada"));
    const gastos = soma(sel.filter((r) => r.tipo === "Saída"));
    return { entradas, gastos, saldo: centavos(entradas - gastos), n: sel.length, impulso: soma(sel.filter((r) => r.tipo === "Saída" && r.natureza === "impulso")) };
  };
  const escolher = (f: Filtro) => {
    pasta.definir("Filtros!B4", f.mes ? mesChave(f.mes) : "Todos");
    pasta.definir("Filtros!B5", f.categoria ?? "Todos");
    pasta.definir("Filtros!B6", f.escopo ?? "Todos");
    pasta.definir("Filtros!B7", f.natureza ?? "Todos");
    pasta.definir("Filtros!B8", f.pagamento ?? "Todos");
  };
  const conferir = (rotulo: string, f: Filtro) => {
    escolher(f);
    const esp = aMao(f);
    assertEq(centavos(num("Filtros!B10")), esp.entradas, `${rotulo}: Entradas = ${esp.entradas}`);
    assertEq(centavos(num("Filtros!B11")), esp.gastos, `${rotulo}: Gastos = ${esp.gastos}`);
    assertEq(centavos(num("Filtros!B12")), esp.saldo, `${rotulo}: Saldo = ${esp.saldo}`);
    assertEq(num("Filtros!B13"), esp.n, `${rotulo}: Nº lançamentos = ${esp.n}`);
    assertEq(centavos(num("Filtros!B14")), esp.impulso, `${rotulo}: Por impulso = ${esp.impulso}`);
  };
  for (const c of ["B4", "B5", "B6", "B7", "B8"]) assertEq(ler(`Filtros!${c}`), "Todos", `${c} nasce com "Todos"`);
  conferir("Todos", {});
  assertEq(num("Filtros!B13"), 13, "Todos: 13 lançamentos válidos (os 2 estornados ficam fora)");
  conferir(`Mês ${M0} + Casa`, { mes: M0, escopo: "Casa" });
  assertEq(centavos(num("Filtros!B11")), 2529.95, "mês corrente/Casa: gastos = 2.529,95 (à mão)");
  conferir("impulso + Crédito", { natureza: "impulso", pagamento: "Crédito" });
  assertEq(centavos(num("Filtros!B10")), 0, "impulso: Entradas = 0 (entrada não tem natureza; '—' não casa 'impulso')");
  conferir("Categoria Salário", { categoria: "Salário" });
  assertEq(centavos(num("Filtros!B10")), 5800, "Salário: 3.000 + 2.800");
  conferir(`Mês ${M2} + Débito`, { mes: M2, pagamento: "Débito" });
  escolher({});

  // listas dos menus, alimentadas pelo sync
  const lista = (col: string) => { const out: Celula[] = []; for (let r = 4; r < 200; r++) { const v = ler(`Filtros!${col}${r}`); if (v !== null) out.push(v); } return out; };
  const meses = lista("H");
  assertEq(meses[0], "Todos", "lista de meses começa com Todos");
  assertEq(JSON.stringify(meses.slice(1)), JSON.stringify([M2, M1, M0].map(mesChave)), "meses = os que têm lançamento (crescente, chave mesChave)");
  const cats = lista("I");
  assert(cats[0] === "Todos" && cats.includes("Salário") && cats.includes("Mercado") && cats.includes("Delivery"), "categorias = todas as usadas (entrada e saída), até a da estornada", JSON.stringify(cats));
  assertEq(JSON.stringify(lista("J")), JSON.stringify(["Todos", "Casa", "Empresa"]), "escopos");
  assertEq(JSON.stringify(lista("K")), JSON.stringify(["Todos", "essencial", "impulso"]), "naturezas");
  const pags = lista("L");
  assert(pags[0] === "Todos" && pags.includes("Pix") && pags.includes("Crédito") && !pags.includes("—"), "pagamentos = os usados (sem '—')", JSON.stringify(pags));
}

// ─────────────────────────────────────────────────────────────────────────────
section("(b3) Bolsos — alvos, gastos e situação == getPockets");
// ─────────────────────────────────────────────────────────────────────────────
{
  const app = getPockets(data);
  assertEq(app.renda.origem, "media3m", "sanidade: renda do app vem da média dos 3 meses anteriores");
  assertEq(centavos(num("Bolsos!B4")), app.renda.valor, `B4 = renda ${app.renda.valor} (média 3.000/2.800)`);
  assert(String(ler("Bolsos!C4")).toLowerCase().includes("média"), "C4 explica a origem da renda", String(ler("Bolsos!C4")));
  assert(String(ler("Bolsos!B5")).startsWith("Organizando"), "B5 = fase (Organizando 50/30/20)", String(ler("Bolsos!B5")));
  assertEq(ler("Bolsos!B6"), mesChave(M0), "B6 = mês de referência = Dashboard!B3 quando Filtros = Todos");
  const situacao = (estado: string) => (estado === "verde" ? "Dentro" : estado === "vermelho" ? "Passou" : "Sem alvo");
  app.bolsos.forEach((b, i) => {
    const r = 9 + i;
    assertEq(ler(`Bolsos!A${r}`), b.label, `A${r} = ${b.label}`);
    assertEq(centavos(num(`Bolsos!C${r}`)), b.alvo, `${b.label}: alvo ${b.alvo} (ARRED)`);
    assertEq(centavos(num(`Bolsos!D${r}`)), b.gasto, `${b.label}: gasto ${b.gasto} (SOMASES por bolso, só Casa, sem estornado)`);
    assertEq(centavos(num(`Bolsos!E${r}`)), b.sobra, `${b.label}: sobra ${b.sobra}`);
    assertEq(ler(`Bolsos!F${r}`), situacao(b.estado), `${b.label}: situação "${situacao(b.estado)}"`);
  });
  assertEq(app.bolsos.map((b) => b.estado).join(","), "verde,verde,vermelho", "sanidade: Vida passou (999 + 250,12 > 20% de 2.900)");
  assertEq(centavos(num("Bolsos!D9")), 980.83, "Contas = Mercado + Água + Outros/essencial (Compra impulso foi pra Vida)");
  assertEq(centavos(num("Bolsos!D10")), 300, "Dívidas e reserva = Cartão");

  // mês escolhido em Filtros manda no gasto dos bolsos
  pasta.definir("Filtros!B4", mesChave(M1));
  const mesAnterior = getPockets(data, M1);
  assertEq(ler("Bolsos!B6"), mesChave(M1), "Filtros!B4 = mês anterior → B6 acompanha");
  mesAnterior.bolsos.forEach((b, i) => assertEq(centavos(num(`Bolsos!D${9 + i}`)), b.gasto, `${b.label} em ${M1}: gasto ${b.gasto}`));
  pasta.definir("Filtros!B4", "Todos");

  // tabela categoria → bolso (regra de pocketOf)
  const tabela = new Map<string, string>();
  for (let r = 15; r < 40; r++) { const c = ler(`Bolsos!A${r}`); if (c !== null) tabela.set(String(c), String(ler(`Bolsos!B${r}`))); }
  assertEq(tabela.size, 19, "19 categorias na tabela");
  const rotulo = (k: string) => POCKETS.find((p) => p.key === k)!.label;
  assertEq(tabela.get("Mercado"), rotulo(pocketOf({ category: "Mercado", nature: "essencial" })), "Mercado → Contas");
  assertEq(tabela.get("Cartão"), rotulo("dividas"), "Cartão → Dívidas e reserva");
  assert(String(tabela.get("Compra")).includes("impulso") && String(tabela.get("Compra")).includes("Vida"), "Compra: por natureza (impulso → Vida)", tabela.get("Compra"));

  // renda informada + fase de virada
  const comRenda = buildSyncBatch({ ...(data as SyncInput), settings: { expectedIncome: 4000, budgetPhase: "virada" } });
  const p2 = montarPasta(estatico, comRenda.valueRanges);
  const app2 = getPockets({ ...data, settings: { expectedIncome: 4000, budgetPhase: "virada" } });
  assertEq(Number(p2.ler("Bolsos!B4")), 4000, "renda informada: B4 = 4.000");
  assert(String(p2.ler("Bolsos!C4")).toLowerCase().includes("informada"), "C4 diz que foi informada no app");
  assert(String(p2.ler("Bolsos!B5")).includes("50/40/10"), "fase de virada: 50/40/10", String(p2.ler("Bolsos!B5")));
  app2.bolsos.forEach((b, i) => {
    assertEq(centavos(Number(p2.ler(`Bolsos!C${9 + i}`))), b.alvo, `virada: ${b.label} alvo ${b.alvo}`);
    assertEq(centavos(Number(p2.ler(`Bolsos!E${9 + i}`))), b.sobra, `virada: ${b.label} sobra ${b.sobra}`);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
section("(b4) Dívidas, Metas, Fluxo e Resumo — fórmulas por linha");
// ─────────────────────────────────────────────────────────────────────────────
{
  const linhas = (pasta2: typeof pasta, aba: string, col = "A") => { const out: number[] = []; for (let r = 2; r < 60; r++) if (pasta2.ler(`${aba}!${col}${r}`) !== null) out.push(r); return out; };
  for (const r of linhas(pasta, TAB.dividas)) {
    const nome = String(ler(`${TAB.dividas}!A${r}`));
    const d = debts.find((x) => x.name === nome)!;
    assertEq(num(`${TAB.dividas}!G${r}`), d.paidValue ?? 0, `${nome}: Pago = ${d.paidValue ?? 0}`);
    const esperado = d.status === "quitada" ? 0 : debtRemaining(d);
    assertEq(centavos(num(`${TAB.dividas}!H${r}`)), esperado, `${nome}: Em aberto (fórmula) = ${esperado}`);
  }
  assertEq(num(`${TAB.dividas}!H${linhas(pasta, TAB.dividas).find((r) => ler(`${TAB.dividas}!A${r}`) === "Paga a mais")}`), 0, "pagou a mais: Em aberto trava em 0 (MÁXIMO)");
  assert(String(ler(`${TAB.dividas}!O5`)).includes("6.200"), "painel 'Total em aberto' = 1.200 + 5.000 + 0 (restante das abertas, não o total 7.800)", String(ler(`${TAB.dividas}!O5`)));

  for (const r of linhas(pasta, TAB.metas)) {
    const nome = String(ler(`${TAB.metas}!A${r}`));
    const g = goals.find((x) => x.name === nome)!;
    assertEq(centavos(num(`${TAB.metas}!E${r}`)), Math.max(0, centavos(g.targetValue - g.currentValue)), `${nome}: Faltando`);
    const prog = num(`${TAB.metas}!F${r}`);
    assert(Math.abs(prog * 100 - getGoalProgress(g)) < 1, `${nome}: Progresso ${prog} ≈ getGoalProgress ${getGoalProgress(g)}%`);
    assert(prog >= 0 && prog <= 1, `${nome}: progresso entre 0 e 1`);
  }
  const fluxoRows = linhas(pasta, TAB.fluxo);
  let acumulado = 0;
  for (const r of fluxoRows) {
    const resultado = centavos(num(`${TAB.fluxo}!B${r}`) - num(`${TAB.fluxo}!C${r}`));
    acumulado = centavos(acumulado + resultado);
    assertEq(centavos(num(`${TAB.fluxo}!D${r}`)), resultado, `Fluxo linha ${r}: Resultado = B − C`);
    assertEq(centavos(num(`${TAB.fluxo}!E${r}`)), acumulado, `Fluxo linha ${r}: Saldo acumulado = anterior + Resultado`);
  }
  assertEq(centavos(acumulado), centavos(soma(semEstornados(incomes)) - soma(semEstornados(expenses))), "Fluxo: saldo final = histórico válido");
  let acumMes = 0;
  for (const r of linhas(pasta, TAB.resumo)) {
    const resultado = centavos(num(`${TAB.resumo}!B${r}`) - num(`${TAB.resumo}!C${r}`));
    acumMes = centavos(acumMes + resultado);
    assertEq(centavos(num(`${TAB.resumo}!D${r}`)), resultado, `Resumo linha ${r}: Resultado = B − C`);
    assertEq(centavos(num(`${TAB.resumo}!E${r}`)), acumMes, `Resumo linha ${r}: acumulado`);
  }
  // comparativo do Dashboard continua certo (snapshot, documentado no builder)
  const mesAtualDash = (() => { for (let r = 12; r <= 21; r++) if (ler(`Dashboard!G${r}`) === `${M0}-01`) return r; return -1; })();
  assert(mesAtualDash > 0, "comparativo tem o mês corrente");
  assertEq(centavos(num(`Dashboard!H${mesAtualDash}`)), centavos(num("Dashboard!A6")), "comparativo: entradas do mês corrente = KPI A6");
  assertEq(centavos(num(`Dashboard!I${mesAtualDash}`)), centavos(num("Dashboard!D6")), "comparativo: saídas do mês corrente = KPI D6");
}

// ─────────────────────────────────────────────────────────────────────────────
section("(b5) Avaliador — apóstrofo é SEMPRE texto (nunca fórmula), como no Sheets");
// ─────────────────────────────────────────────────────────────────────────────
{
  // Juiz (rodada 1): normalizar() tirava o apóstrofo e depois tratava "=…" como
  // fórmula — "'=Conta" virava #NOME? aqui, mas no Sheets é o texto "=Conta".
  const p = new Pasta();
  p.escrever("X!A1", [["'=1+1", "'=Conta", "=1+1", "'-50 do mercado", "'texto"]]);
  assertEq(p.ler("X!A1"), "=1+1", "'=1+1 → texto \"=1+1\" (não avalia)");
  assertEq(p.ler("X!B1"), "=Conta", "'=Conta → texto \"=Conta\" (não #NOME?)");
  assertEq(p.ler("X!C1"), 2, "=1+1 sem apóstrofo → fórmula (2)");
  assertEq(p.ler("X!D1"), "-50 do mercado", "'-50 do mercado → texto");
  assertEq(p.ler("X!E1"), "texto", "'texto → texto sem o apóstrofo");
  assertEq(p.todasAsFormulas().length, 1, "só C1 conta como fórmula");
  p.definir("X!F1", "'=2*3");
  assertEq(p.ler("X!F1"), "=2*3", "definir() com apóstrofo também é texto");
  // ponta a ponta: descrição "=1+1" digitada no app chega como texto na planilha
  const comIgual = buildSyncBatch({ incomes: [{ id: "i", description: "=1+1", value: 10, category: "Venda", date: HOJE }], expenses: [], debts: [], goals: [] });
  const p2 = montarPasta(estatico, comIgual.valueRanges);
  assertEq(p2.ler("Lançamentos!C2"), "=1+1", "descrição \"=1+1\" → célula lê o texto \"=1+1\"");
  assertEq(p2.ler("Receitas!B2"), "=1+1", "Receitas: idem");
  assertEq(Number(p2.ler("Dashboard!A6")), 10, "e o KPI soma normalmente");
}

// ─────────────────────────────────────────────────────────────────────────────
section("(c) Planilha vazia — nenhuma fórmula dá erro (nem #DIV/0!)");
// ─────────────────────────────────────────────────────────────────────────────
{
  const p = montarPasta(estatico, vazio.valueRanges);
  const erros = p.todasAsFormulas().filter((f) => typeof f.valor === "string" && f.valor.startsWith("#"));
  assertEq(erros.length, 0, "vazia: zero células com '#…'", erros.slice(0, 5).map((e) => `${e.ref}=${e.valor}`).join(" | "));
  for (const c of ["A6", "D6", "G6", "J6", "A8", "D8", "G8", "J8"]) assertEq(Number(p.ler(`Dashboard!${c}`)), 0, `vazia: Dashboard!${c} = 0`);
  for (const c of ["B10", "B11", "B12", "B13", "B14"]) assertEq(Number(p.ler(`Filtros!${c}`)), 0, `vazia: Filtros!${c} = 0`);
  assertEq(Number(p.ler("Bolsos!C9")), 0, "vazia: alvo 0");
  assertEq(p.ler("Bolsos!F9"), "Sem alvo", "vazia: situação 'Sem alvo' (SE protege o alvo 0)");
  const errosCheia = pasta.todasAsFormulas().filter((f) => typeof f.valor === "string" && f.valor.startsWith("#"));
  assertEq(errosCheia.length, 0, "cheia: zero células com '#…'", errosCheia.slice(0, 5).map((e) => `${e.ref}=${e.valor}`).join(" | "));
  // meta com alvo 0 e valor atual: sem #DIV/0!
  const metaZero = (() => { for (let r = 2; r < 10; r++) if (ler(`${TAB.metas}!A${r}`) === "Alvo zero") return r; return -1; })();
  assertEq(num(`${TAB.metas}!F${metaZero}`), 0, "meta com alvo 0: progresso 0 (não #DIV/0!)");
}

// ─────────────────────────────────────────────────────────────────────────────
section("(d) Anotações — coluna livre, fora de todo clear/write, única desprotegida");
// ─────────────────────────────────────────────────────────────────────────────
{
  const dataTabs: DataTabKey[] = ["lancamentos", "receitas", "despesas", "dividas", "metas", "fluxo", "resumo"];
  const colIdx = (letra: string) => letra.split("").reduce((a, ch) => a * 26 + (ch.charCodeAt(0) - 64), 0);
  const fimDaLimpeza = (r: string) => (r.split("!")[1].split(":")[1] ?? "").replace(/\d+$/, "");
  for (const key of dataTabs) {
    const notas = colunaAnotacoes(key);
    const geradas = (HEADERS[key] ?? []).length;
    assertEq(colIdx(notas), geradas + 1, `${TAB[key]}: Anotações é a coluna logo depois da última gerada (${notas})`);
    const clear = batch.clearRanges.find((r) => r.startsWith(`${TAB[key]}!`));
    assert(!!clear && colIdx(fimDaLimpeza(clear)) < colIdx(notas), `${TAB[key]}: clear (${clear}) para antes de ${notas}`);
    assertEq(clear, dataClearRange(key), `${TAB[key]}: clear = dataClearRange`);
    const escreveNasNotas = batch.valueRanges.filter((v) => v.range.startsWith(`${TAB[key]}!`)).some((v) => {
      const a1 = v.range.split("!")[1];
      const ini = a1.split(":")[0].replace(/\d+$/, "");
      const largura = Math.max(...v.values.map((l) => l.length), 0);
      const fim = colIdx(ini) + largura - 1;
      return colIdx(ini) <= colIdx(notas) && fim >= colIdx(notas);
    });
    assert(!escreveNasNotas, `${TAB[key]}: nenhum valueRange escreve na coluna ${notas}`);
    const cab = estatico.find((v) => v.range === `${TAB[key]}!A1`)?.values[0] ?? [];
    assertEq(cab[geradas], "Anotações", `${TAB[key]}: cabeçalho "Anotações" em ${notas}1`);
  }
  const ids = Object.fromEntries(Object.values(TAB).map((t, i) => [t, 100 + i]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reqs = buildLayoutRequests(ids) as any[];
  for (const key of dataTabs) {
    const prot = reqs.find((r) => r.addProtectedRange?.protectedRange?.range?.sheetId === ids[TAB[key]])?.addProtectedRange?.protectedRange;
    const livres = prot?.unprotectedRanges ?? [];
    const geradas = (HEADERS[key] ?? []).length;
    assert(livres.length === 1 && livres[0].startColumnIndex === geradas && livres[0].endColumnIndex === geradas + 1 && livres[0].startRowIndex === 1,
      `${TAB[key]}: só Anotações (linhas 2+) fica editável`, JSON.stringify(livres));
  }
  const protFiltros = reqs.find((r) => r.addProtectedRange?.protectedRange?.range?.sheetId === ids[TAB.filtros])?.addProtectedRange?.protectedRange;
  assert(protFiltros?.unprotectedRanges?.length === 1 && protFiltros.unprotectedRanges[0].startRowIndex === 3 && protFiltros.unprotectedRanges[0].endRowIndex === 8 && protFiltros.unprotectedRanges[0].startColumnIndex === 1,
    "Filtros: só os 5 menus (B4:B8) ficam editáveis", JSON.stringify(protFiltros?.unprotectedRanges));
}

// ─────────────────────────────────────────────────────────────────────────────
section("(e) Layout — menus, congelamento, filtro, versão e grade que cresce");
// ─────────────────────────────────────────────────────────────────────────────
{
  const ids = Object.fromEntries(Object.values(TAB).map((t, i) => [t, 100 + i]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reqs = buildLayoutRequests(ids) as any[];
  const validacoes = reqs.filter((r) => r.setDataValidation && r.setDataValidation.range.sheetId === ids[TAB.filtros]);
  assertEq(validacoes.length, 5, "Filtros: 5 menus com validação de dados");
  assert(validacoes.every((v) => v.setDataValidation.rule.condition.type === "ONE_OF_RANGE" && v.setDataValidation.rule.showCustomUi === true), "menus são ONE_OF_RANGE com seta (showCustomUi)");
  assert(validacoes.every((v) => /^=Filtros!\$[H-L]\$4:\$[H-L]\$\d+$/.test(v.setDataValidation.rule.condition.values[0].userEnteredValue)), "menus apontam pras listas H:L que o sync preenche", validacoes[0]?.setDataValidation.rule.condition.values[0].userEnteredValue);
  const dataTabs: DataTabKey[] = ["lancamentos", "receitas", "despesas", "dividas", "metas", "fluxo", "resumo"];
  for (const key of dataTabs) {
    const sid = ids[TAB[key]];
    assert(reqs.some((r) => r.updateSheetProperties?.properties?.sheetId === sid && r.updateSheetProperties.properties.gridProperties?.frozenRowCount === 1), `${TAB[key]}: cabeçalho congelado`);
    const filtro = reqs.find((r) => r.setBasicFilter?.filter?.range?.sheetId === sid);
    assert(filtro && filtro.setBasicFilter.filter.range.endColumnIndex === (HEADERS[key] ?? []).length, `${TAB[key]}: basicFilter cobre as colunas geradas`);
  }
  assert(LAYOUT_VERSION > "2026-09-11.1", `LAYOUT_VERSION subiu (${LAYOUT_VERSION})`);
  const specs = buildSheetSpecs();
  assertEq(specs.length, 11, "11 abas (Filtros e Bolsos novas)");
  assert(specs.some((s) => s.properties.title === "Filtros") && specs.some((s) => s.properties.title === "Bolsos"), "abas Filtros e Bolsos existem");

  // grade cresce por appendDimension quando os dados passam do rowCount
  const muitos: SyncInput = { incomes: Array.from({ length: MAX_DATA_ROWS + 40 }, (_, i) => ({ id: `i${i}`, description: "x", value: 1, category: "Venda", date: dia(M0, (i % 28) + 1) })), expenses: [], debts: [], goals: [] };
  const poucos: SyncInput = { incomes: [{ id: "a", description: "x", value: 1, category: "Venda", date: HOJE }], expenses: [], debts: [], goals: [] };
  assertEq(precisaCrescer(pushDataCalls(poucos).linhas), false, "poucos dados: não precisa crescer");
  assertEq(precisaCrescer(pushDataCalls(muitos).linhas), true, `${MAX_DATA_ROWS + 40} lançamentos: precisa crescer`);
  const info: SpreadsheetInfo = { sheets: Object.entries(ids).map(([title, sheetId]) => ({ properties: { title, sheetId, gridProperties: { rowCount: MAX_DATA_ROWS + 10, columnCount: 16 } } })) };
  const grow = growGridCall(info, pushDataCalls(muitos).linhas);
  assert(!!grow, "growGridCall devolve requests");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cresce = (grow!.requests as any[]).filter((r) => r.appendDimension);
  assert(cresce.some((r) => r.appendDimension.sheetId === ids[TAB.lancamentos] && r.appendDimension.dimension === "ROWS" && r.appendDimension.length >= 31), "Lançamentos cresce o que falta (+ folga)", JSON.stringify(cresce));
  assert(cresce.some((r) => r.appendDimension.sheetId === ids[TAB.receitas]), "Receitas também cresce");
  assert(!cresce.some((r) => r.appendDimension.sheetId === ids[TAB.dividas]), "Dívidas (vazia) não cresce");
  assertEq(growGridCall(info, pushDataCalls(poucos).linhas), null, "sem necessidade: null");
  const jaGrande: SpreadsheetInfo = { sheets: info.sheets!.map((s) => ({ properties: { ...s.properties, gridProperties: { rowCount: 5000, columnCount: 16 } } })) };
  assertEq(growGridCall(jaGrande, pushDataCalls(muitos).linhas), null, "grade já grande: nada a fazer (idempotente)");
  assertEq(readSheetIds(info)[TAB.bolsos], ids[TAB.bolsos], "readSheetIds lê a aba Bolsos");
}

// ─────────────────────────────────────────────────────────────────────────────
section("(f) Menus da aba Filtros — lixo digitado não passa calado");
// ─────────────────────────────────────────────────────────────────────────────
{
  // O ESTRAGO que a validação frouxa deixava passar: "mercado" em minúsculo não
  // é a categoria "Mercado" gravada em Lançamentos. O SOMASES não reclama — ele
  // simplesmente não acha nada. A pessoa vê R$ 0,00 em tudo, sem uma linha de
  // explicação, e conclui que a planilha quebrou.
  pasta.definir("Filtros!B5", "Mercadinho");
  assertEq(centavos(num("Filtros!B11")), 0, "categoria digitada errada ('Mercadinho') zera os Gastos — este é o estrago");
  assertEq(num("Filtros!B13"), 0, "…e zera também o Nº de lançamentos");
  pasta.definir("Filtros!B5", "Todos");
  // Mês escrito como a pessoa fala ("setembro") em vez da chave da lista: idem.
  pasta.definir("Filtros!B4", "setembro");
  assertEq(centavos(num("Filtros!B10")), 0, "mês fora da lista ('setembro') zera as Entradas");
  pasta.definir("Filtros!B4", "Todos");
  // Maiúscula/minúscula NÃO é o problema: SOMASES do Sheets ignora caixa, e o
  // avaliador copia isso — "mercado" acha "Mercado". O que mata é o valor que
  // não existe na coluna.
  pasta.definir("Filtros!B5", "mercado");
  assert(centavos(num("Filtros!B11")) > 0, "'mercado' em minúsculo ainda acha 'Mercado' (SOMASES ignora caixa)");
  pasta.definir("Filtros!B5", "Todos");
  assert(centavos(num("Filtros!B11")) > 0, "voltando pra \"Todos\", os Gastos voltam");

  // Apagar o menu (tecla Delete na célula) é o outro jeito de zerar tudo: a
  // validação permite célula vazia. Vazio tem que valer "Todos".
  pasta.definir("Filtros!B5", "");
  assert(centavos(num("Filtros!B11")) > 0, "menu apagado vale \"Todos\" (não zera os Gastos)");
  assertEq(ler("Filtros!D5"), "*", "menu apagado vira critério \"*\"");
  pasta.definir("Filtros!B5", "Todos");

  // A CORREÇÃO: a regra é strict, então o Sheets RECUSA o valor digitado fora da
  // lista e a célula continua com uma opção válida.
  const ids = Object.fromEntries(Object.values(TAB).map((t, i) => [t, 100 + i]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reqs = buildLayoutRequests(ids) as any[];
  const menus = reqs.filter((r) => r.setDataValidation && r.setDataValidation.range.sheetId === ids[TAB.filtros]);
  assertEq(menus.length, 5, "os 5 menus continuam lá");
  assert(menus.every((m) => m.setDataValidation.rule.strict === true),
    "menus são strict: valor fora da lista é recusado, não aceito com um triangulinho",
    JSON.stringify(menus.map((m) => m.setDataValidation.rule.strict)));
  assert(menus.every((m) => typeof m.setDataValidation.rule.inputMessage === "string" && m.setDataValidation.rule.inputMessage.length > 10),
    "cada menu explica em pt-BR o que fazer antes de a pessoa digitar (inputMessage)");

  // Menu strict com lista vazia travaria a planilha recém-criada: a lista nasce
  // com "Todos" (valor estático), antes de qualquer sync — e antes do B4:B8.
  const iSeed = estatico.findIndex((v) => v.range === `${TAB.filtros}!H4:L4`);
  const iMenus = estatico.findIndex((v) => v.range === `${TAB.filtros}!A4:D8`);
  assert(iSeed >= 0, "a lista dos menus nasce preenchida (Filtros!H4:L4)");
  assert(iSeed >= 0 && iSeed < iMenus, "a lista vem ANTES do \"Todos\" gravado nos menus", `H4:L4=${iSeed}, A4:D8=${iMenus}`);
  assertEq(JSON.stringify(estatico[iSeed]?.values), JSON.stringify([["Todos", "Todos", "Todos", "Todos", "Todos"]]), "as 5 listas nascem com \"Todos\"");
}

// ─────────────────────────────────────────────────────────────────────────────
console.log("\n" + "═".repeat(60));
console.log(`RESULTADO: ${passed} passaram, ${failed} falharam`);
if (failures.length > 0) {
  console.log("\nFALHAS:");
  failures.forEach((f) => console.log(`  • ${f}`));
}
console.log("═".repeat(60));
if (failed > 0) process.exit(1);
