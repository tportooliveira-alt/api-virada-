/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * test-planilha-bordas.ts — casos de borda da planilha Google (auditoria):
 *
 *  B3  Texto do usuário começando com = + - @ ' (ou tab/CR) vai com apóstrofo,
 *      senão o USER_ENTERED transforma em fórmula/número (#NOME?, #ERROR!).
 *  B4  Planilha vazia NÃO inventa dados: nenhuma linha [hoje,0,0,0,0], nenhuma
 *      dívida "Sem dívidas em aberto"; painéis com 0 / R$ 0,00 / "—".
 *  B7  SPARKLINE do comparativo mensal mostra barra também no mês negativo.
 *  B8  Meses sem movimento entre o primeiro e o último entram zerados na aba
 *      Resumo; o comparativo do Dashboard é os 10 últimos meses do CALENDÁRIO
 *      (R-B1c) e os painéis do Resumo só contam meses com movimento (R-B2).
 *  R-B1 Ano digitado errado ("1026-09-05") não estoura a grade da aba Resumo
 *      nem derruba o values.batchUpdate inteiro; janela de preenchimento = 24 meses.
 *  R-B3 Progresso de meta na planilha tem teto 1 e piso 0, como no app.
 *  B9  Dashboard!G12:G21 grava o mês igual à aba Resumo (data + formato mmm/yyyy).
 *  B10 O caminho REAL do navegador (GoogleSyncButton: criar / atualizar layout /
 *      mandar dados) monta os requests sem apagar os rótulos da coluna J.
 *  B12 "Melhor dia"/"Pior dia" com um só dia vêm rotulados.
 *
 * Roda com: npx tsx scripts/test-planilha-bordas.ts
 */

import { buildStaticValues, buildSyncBatch, buildLayoutRequests, MAX_DATA_ROWS, TAB } from "../lib/sheets/builder";
import {
  createWorkbookBody,
  layoutCall,
  staticValuesCall,
  chartsCall,
  missingTabsCall,
  readSheetIds,
  upgradeLayoutCall,
  pushDataCalls,
  type SpreadsheetInfo,
} from "../lib/sheets/sync-requests";

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

type Batch = ReturnType<typeof buildSyncBatch>;
const rows = (batch: Batch, range: string) => (batch.valueRanges.find((v) => v.range === range)?.values ?? []) as unknown[][];
const has = (batch: Batch, range: string) => batch.valueRanges.some((v) => v.range === range);
// Intl separa "R$" do número com espaço duro (U+00A0); normaliza pra comparar.
const txt = (v: unknown) => String(v ?? "").replace(/\u00a0/g, " ");
const gasto = (id: string, description: string, value: number, date: string, category = "Mercado") =>
  ({ id, description, value, category, date, paymentMethod: "Pix", nature: "essencial" });
const entrada = (id: string, description: string, value: number, date: string, category = "Venda") =>
  ({ id, description, value, category, date });

// ─────────────────────────────────────────────────────────────────────────────
section("B3) Injeção via USER_ENTERED — texto do usuário vira texto, não fórmula");
// ─────────────────────────────────────────────────────────────────────────────
{
  const b = buildSyncBatch({
    incomes: [
      entrada("i1", "=almoço do cliente", 50, "2026-09-01"),
      entrada("i2", "- 50 do mercado", 60, "2026-09-02"),
      entrada("i3", "+2 dias de diária", 70, "2026-09-03"),
      entrada("i4", "@fulano pagou", 80, "2026-09-04"),
      entrada("i5", "'sem aspa", 90, "2026-09-05"),
      entrada("i6", "\tcom tab", 91, "2026-09-06"),
      entrada("i7", "Venda normal", 92, "2026-09-07"),
    ],
    expenses: [gasto("e1", "b", 20, "2026-09-02", "=SOMA(A1:A9)"), gasto("e2", "c", 30, "2026-09-03", "-Cartão")],
    debts: [{ id: "d", name: "=Dívida()", totalValue: 100, installmentValue: 10, dueDate: "2026-10-01", priority: "alta", status: "aberta" }],
    goals: [{ id: "g", name: "+Meta", targetValue: 100, currentValue: 10, type: "reserva" }],
  });
  const desc = rows(b, "Receitas!A2").map((r) => r[1]);
  assertEq(desc[0], "'=almoço do cliente", "'=almoço' vai com apóstrofo (senão #NOME?)");
  assertEq(desc[1], "'- 50 do mercado", "'- 50 do mercado' vai com apóstrofo (senão #ERROR!)");
  assertEq(desc[2], "'+2 dias de diária", "'+2 dias' vai com apóstrofo");
  assertEq(desc[3], "'@fulano pagou", "'@fulano' vai com apóstrofo");
  assertEq(desc[4], "''sem aspa", "''sem aspa' dobra o apóstrofo (senão o primeiro some)");
  assertEq(desc[5], "'\tcom tab", "tab inicial vai com apóstrofo");
  assertEq(desc[6], "Venda normal", "texto comum passa intacto");
  const lanc = rows(b, "Lançamentos!A2");
  assert(lanc.every((r) => !/^[=+\-@'\t\r]/.test(String(r[2])) || String(r[2]).startsWith("'")), "Lançamentos: toda descrição perigosa começa com apóstrofo");
  assert(lanc.every((r) => !/^[=+\-@'\t\r]/.test(String(r[3])) || String(r[3]).startsWith("'")), "Lançamentos: toda categoria perigosa começa com apóstrofo");
  const cats = rows(b, "Despesas!A2").map((r) => r[2]);
  assertEq(cats[0], "'=SOMA(A1:A9)", "categoria '=SOMA(...)' vai com apóstrofo");
  assertEq(cats[1], "'-Cartão", "categoria '-Cartão' vai com apóstrofo");
  const top = rows(b, "Dashboard!A12:B21").map((r) => r[0]);
  assert(top.includes("'=SOMA(A1:A9)") && top.includes("'-Cartão"), "top categorias do Dashboard também sanitizadas", JSON.stringify(top.slice(0, 2)));
  assertEq(rows(b, "Dívidas!A2")[0]?.[0], "'=Dívida()", "nome de dívida sanitizado");
  assertEq(rows(b, "Metas!A2")[0]?.[0], "'+Meta", "nome de meta sanitizado");
  assert(String(rows(b, "Metas!K4:K7")[3]?.[0]).startsWith("'+Meta"), "painel 'Melhor progresso' (começa com o nome) sanitizado");
  assertEq(typeof rows(b, "Receitas!A2")[0]?.[3], "number", "valor continua número");
  assertEq(rows(b, "Receitas!A2")[0]?.[0], "01/09/2026", "data continua dd/mm/aaaa");
}

// ─────────────────────────────────────────────────────────────────────────────
section("B4) Planilha vazia — nada inventado");
// ─────────────────────────────────────────────────────────────────────────────
{
  const b = buildSyncBatch({ incomes: [], expenses: [], debts: [], goals: [] });
  assert(!has(b, "Fluxo de Caixa!A2"), "sem lançamentos: aba Fluxo não recebe linha [hoje,0,0,0,0]");
  assert(!has(b, "Dívidas!A2"), "sem dívidas: aba Dívidas não recebe 'Sem dívidas em aberto'");
  assert(!has(b, "Resumo Mensal!A2") && !has(b, "Metas!A2") && !has(b, "Lançamentos!A2"), "demais abas de dados vazias");
  assertEq(txt(JSON.stringify(rows(b, "Fluxo de Caixa!K4:K7"))), JSON.stringify([["0"], ["—"], ["—"], ["R$ 0,00"]]), "painel Fluxo: 0 dias, '—', '—', R$ 0,00");
  assertEq(JSON.stringify(rows(b, "Resumo Mensal!K4:K7")), JSON.stringify([["0"], ["—"], ["—"], ["—"]]), "painel Resumo: 0 meses e '—' nos demais (não 'Sem meses'/'0,0%')");
  assertEq(txt(JSON.stringify(rows(b, "Dívidas!K4:K7"))), JSON.stringify([["0"], ["R$ 0,00"], ["0"], ["—"]]), "painel Dívidas zerado");
  assertEq(rows(b, "Dashboard!A6")[0]?.[0], 0, "KPI mês = 0");
  assertEq(rows(b, "Dashboard!A8")[0]?.[0], 0, "KPI desde o início = 0");
  assert(b.clearRanges.some((r) => r.startsWith(`${TAB.fluxo}!A2`)) && b.clearRanges.some((r) => r.startsWith(`${TAB.dividas}!A2`)), "abas vazias ainda são limpas (dados antigos somem)");
}

// ─────────────────────────────────────────────────────────────────────────────
section("B12) Um só dia — Melhor/Pior dia rotulados");
// ─────────────────────────────────────────────────────────────────────────────
{
  const b = buildSyncBatch({ incomes: [], expenses: [gasto("e", "Gás", 110, "2026-09-10")], debts: [], goals: [] });
  const painel = rows(b, "Fluxo de Caixa!K4:K7");
  assertEq(painel[0]?.[0], "1", "1 dia com movimento");
  assert(txt(painel[1]?.[0]).includes("-R$ 110,00") && txt(painel[1]?.[0]).includes("dia único"), "Melhor dia rotulado 'dia único'", String(painel[1]?.[0]));
  assert(String(painel[2]?.[0]).includes("dia único"), "Pior dia rotulado 'dia único'");
  const b2 = buildSyncBatch({ incomes: [entrada("i", "x", 500, "2026-09-11")], expenses: [gasto("e", "Gás", 110, "2026-09-10")], debts: [], goals: [] });
  assert(!String(rows(b2, "Fluxo de Caixa!K4:K7")[1]?.[0]).includes("único"), "com dois dias não há rótulo");
}

// ─────────────────────────────────────────────────────────────────────────────
section("B7) SPARKLINE — mês negativo aparece (e sintaxe pt-BR)");
// ─────────────────────────────────────────────────────────────────────────────
{
  const sparks = (buildStaticValues().find((v) => v.range === "Dashboard!K12:K21")?.values ?? []) as string[][];
  const f = String(sparks[0]?.[0] ?? "");
  assert(f.startsWith("=SE("), "K12 é fórmula SE(...)");
  assert(!f.includes(")>0;"), "não esconde a barra quando o valor é negativo (sem 'N(J12)>0')", f);
  assert(f.includes("ABS(J12)"), "barra usa o valor absoluto (ABS) para o mês negativo", f);
  assert(f.includes("#EF4444") && f.includes("#22C55E"), "cor diferente para negativo (vermelho) e positivo (verde)");
  assert(f.includes("MÁXIMO(") && f.includes("MÍNIMO("), "escala usa MÁXIMO/MÍNIMO pt-BR");
  assert(!/\bMAX\(|\bMIN\(|\bIF\(/.test(f), "nada de MAX/MIN/IF em inglês (daria #NOME?)");
  assert(!f.includes(","), "separador de argumentos é ';' (nenhuma vírgula)");
  assert(f.includes('\\"bar"'), "literal de matriz usa '\\' como separador de coluna");
  const cat = String((buildStaticValues().find((v) => v.range === "Dashboard!C12:C21")?.values ?? [])[0]?.[0] ?? "");
  assert(cat.includes("MÁXIMO(") && !cat.includes(","), "barras de categoria também em pt-BR");
}

// ─── Meses relativos ao mês corrente LOCAL (o comparativo do Dashboard é
// calendário: os 10 últimos meses até hoje). Fixture fixa em 2026 quebraria
// sozinha quando o calendário andasse.
const hoje = new Date();
const mesRel = (n: number) => {
  const d = new Date(hoje.getFullYear(), hoje.getMonth() + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const dia = (n: number, d = 10) => `${mesRel(n)}-${String(d).padStart(2, "0")}`;
const ultimos10 = Array.from({ length: 10 }, (_, i) => `${mesRel(i - 9)}-01`);
const dashMes = (batch: Batch, n: number) => rows(batch, "Dashboard!G12:J21").find((r) => r[0] === `${mesRel(n)}-01`);

// ─────────────────────────────────────────────────────────────────────────────
section("B8) Buraco na série mensal — meses sem movimento entram zerados");
// ─────────────────────────────────────────────────────────────────────────────
{
  // "jan, mar, mai": −4, −2 e 0 meses a partir de hoje
  const b = buildSyncBatch({
    incomes: [entrada("a", "x", 1000, dia(-4), "Salário"), entrada("b", "x", 1000, dia(-2), "Salário"), entrada("c", "x", 1000, dia(0), "Salário")],
    expenses: [gasto("d", "y", 400, dia(-2, 11))],
    debts: [], goals: [],
  });
  const resumo = rows(b, "Resumo Mensal!A2");
  assertEq(resumo.length, 5, "5 meses no Resumo (os dois buracos preenchidos)");
  assertEq(JSON.stringify(resumo.map((r) => r[0])), JSON.stringify([-4, -3, -2, -1, 0].map((n) => `${mesRel(n)}-01`)), "meses contíguos");
  assertEq(JSON.stringify(resumo[1]?.slice(1)), JSON.stringify([0, 0, 0, 1000, "—", 0]), "mês parado: zeros, saldo acumulado 1000 mantido, economia '—', 0 lançamentos");
  assertEq(resumo[4]?.[4], 2600, "saldo acumulado no mês corrente = 2600");
  // R-B1c: comparativo do Dashboard = 10 últimos meses do CALENDÁRIO até hoje
  const dash = rows(b, "Dashboard!G12:J21");
  assertEq(JSON.stringify(dash.map((r) => r[0])), JSON.stringify(ultimos10), "Dashboard G12:G21 = 10 últimos meses do calendário, terminando no mês corrente");
  assertEq(JSON.stringify(dashMes(b, -3)), JSON.stringify([`${mesRel(-3)}-01`, 0, 0, 0]), "Dashboard: mês parado entre dois com movimento vem zerado");
  assertEq(JSON.stringify(dashMes(b, -2)), JSON.stringify([`${mesRel(-2)}-01`, 1000, 400, 600]), "Dashboard: mês com movimento traz entradas/saídas/resultado");
  assertEq(JSON.stringify(dashMes(b, -8)), JSON.stringify([`${mesRel(-8)}-01`, 0, 0, 0]), "Dashboard: mês antes do primeiro lançamento também zerado (não em branco)");

  // R-B2: painéis do Resumo só enxergam meses COM movimento
  const b2 = buildSyncBatch({ incomes: [entrada("a", "x", 500, dia(-2), "Salário"), entrada("b", "x", 300, dia(0), "Salário")], expenses: [], debts: [], goals: [] });
  assertEq(rows(b2, "Resumo Mensal!A2").length, 3, "aba Resumo mantém o mês parado (série do gráfico)");
  const painel = rows(b2, "Resumo Mensal!K4:K7");
  assertEq(painel[0]?.[0], "2", "painel 'Meses no histórico' = 2 (o mês parado não conta)");
  assert(txt(painel[1]?.[0]).includes("R$ 500,00") && txt(painel[1]?.[0]).startsWith(`${mesRel(-2).slice(5)}/${mesRel(-2).slice(0, 4)}`), "Melhor mês = o de +500", txt(painel[1]?.[0]));
  assert(txt(painel[2]?.[0]).includes("R$ 300,00") && !txt(painel[2]?.[0]).includes("R$ 0,00"), "Pior mês = o de +300 (não o mês parado com R$ 0,00)", txt(painel[2]?.[0]));
  assertEq(painel[3]?.[0], "100,0%", "Economia média só entre meses com entrada");

  // 10 últimos: série mais longa que a janela do Dashboard
  const longo = buildSyncBatch({ incomes: [entrada("a", "x", 1, dia(-13, 5)), entrada("b", "x", 1, dia(-1, 5))], expenses: [], debts: [], goals: [] });
  assertEq(rows(longo, "Resumo Mensal!A2").length, 13, "13 meses na aba Resumo (−13 até −1)");
  assertEq(JSON.stringify(rows(longo, "Dashboard!G12:J21").map((r) => r[0])), JSON.stringify(ultimos10), "Dashboard mostra os 10 últimos do calendário mesmo com série mais longa");
  assertEq(dashMes(longo, -1)?.[1], 1, "Dashboard: o mês com movimento dentro da janela aparece");
}

// ─────────────────────────────────────────────────────────────────────────────
section("R-B1) Ano digitado errado — não pode derrubar o sync inteiro");
// ─────────────────────────────────────────────────────────────────────────────
{
  const dataTabs = ["Lançamentos", "Receitas", "Despesas", "Dívidas", "Metas", "Fluxo de Caixa", "Resumo Mensal"];
  const cabeNaGrade = (batch: Batch, label: string) => {
    const estouro = batch.valueRanges.filter((v) => dataTabs.some((t) => v.range === `${t}!A2`) && v.values.length > MAX_DATA_ROWS).map((v) => v.range);
    assert(estouro.length === 0, `${label}: nenhuma aba de dados passa de ${MAX_DATA_ROWS} linhas`, estouro.join(", "));
  };
  for (const typo of ["1026-09-05", "2206-01-05", "2062-01-05"]) {
    const b = buildSyncBatch({
      incomes: [entrada("ok1", "Salário", 3000, dia(-1, 5)), entrada("ok2", "Salário", 3000, dia(0, 5))],
      expenses: [gasto("typo", "Ano errado", 50, typo)],
      debts: [], goals: [],
    });
    const resumo = rows(b, "Resumo Mensal!A2");
    cabeNaGrade(b, typo);
    assertEq(resumo.length, 3, `${typo}: Resumo = 2 meses reais + o suspeito (sem preencher até ele)`);
    assert(resumo.some((r) => r[0] === `${typo.slice(0, 7)}-01`), `${typo}: o mês suspeito continua na aba, como está`);
    const dash = rows(b, "Dashboard!G12:J21");
    assertEq(JSON.stringify(dash.map((r) => r[0])), JSON.stringify(ultimos10), `${typo}: comparativo mostra os 10 meses reais do calendário`);
    assertEq(dashMes(b, 0)?.[1], 3000, `${typo}: mês corrente com as entradas reais no comparativo`);
    assert(!dash.some((r) => String(r[0]).startsWith(typo.slice(0, 4))), `${typo}: ano errado não entra no comparativo`);
  }
  // janela de preenchimento: no máximo 24 meses até o corrente; antes disso, só o que tem movimento
  const antigo = buildSyncBatch({ incomes: [entrada("a", "x", 1, dia(-40)), entrada("b", "x", 1, dia(0))], expenses: [], debts: [], goals: [] });
  const meses = rows(antigo, "Resumo Mensal!A2").map((r) => r[0]);
  assertEq(meses.length, 25, "−40 meses + hoje: 1 mês solto + 24 da janela (não 41)");
  assertEq(meses[0], `${mesRel(-40)}-01`, "o mês antigo fica na aba");
  assertEq(meses[1], `${mesRel(-23)}-01`, "o preenchimento começa 24 meses atrás");
  // mês futuro dentro do ano que vem é sadio: entra sem preencher além do corrente
  const futuro = buildSyncBatch({ incomes: [entrada("a", "x", 1, dia(0)), entrada("b", "x", 1, dia(4))], expenses: [], debts: [], goals: [] });
  assertEq(rows(futuro, "Resumo Mensal!A2").length, 2, "mês futuro: entra como está, sem meses zerados até ele");
  assertEq(JSON.stringify(rows(futuro, "Dashboard!G12:J21").map((r) => r[0])), JSON.stringify(ultimos10), "comparativo não anda pro futuro");
  // só dado suspeito: nada explode
  const so = buildSyncBatch({ incomes: [entrada("a", "x", 1, "1026-01-05")], expenses: [], debts: [], goals: [] });
  assertEq(rows(so, "Resumo Mensal!A2").length, 1, "só um mês suspeito: 1 linha");
  assertEq(rows(so, "Dashboard!G12:J21").length, 10, "comparativo continua com 10 linhas (todas zeradas)");
}

// ─────────────────────────────────────────────────────────────────────────────
section("R-B3) Progresso de meta na planilha — teto 1 E piso 0, como no app");
// ─────────────────────────────────────────────────────────────────────────────
{
  const b = buildSyncBatch({ incomes: [], expenses: [], debts: [], goals: [
    { id: "neg", name: "Negativa", targetValue: 1000, currentValue: -100, type: "reserva" },
    { id: "zero", name: "Alvo zero", targetValue: 0, currentValue: 50, type: "reserva" },
  ] });
  const metas = rows(b, "Metas!A2");
  assertEq(metas[0]?.[5], 0, "atual −100 de 1.000: progresso = 0 (não −0,10)");
  assertEq(metas[0]?.[4], 1100, "atual −100: faltando = 1.100 (mesma conta do Relatórios do app: alvo − atual)");
  assertEq(metas[1]?.[5], 0, "alvo 0: progresso = 0");
  assert(String(rows(b, "Metas!K4:K7")[3]?.[0]).includes("0,0%"), "painel 'Melhor progresso' = 0,0%");
}

// ─────────────────────────────────────────────────────────────────────────────
section("B9) Mês no Dashboard = mesma representação da aba Resumo");
// ─────────────────────────────────────────────────────────────────────────────
{
  const b = buildSyncBatch({ incomes: [entrada("a", "x", 10, dia(-1, 5))], expenses: [], debts: [], goals: [] });
  const mesResumo = rows(b, "Resumo Mensal!A2")[0]?.[0];
  assertEq(dashMes(b, -1)?.[0], mesResumo, "Dashboard grava o mês igual ao Resumo!A2 (data AAAA-MM-01, não texto 'MM/AAAA')");
  assertEq(dashMes(b, -1)?.[1], 10, "…na linha certa do comparativo");
  const ids = { Dashboard: 1, "Lançamentos": 2, Receitas: 3, Despesas: 4, "Dívidas": 5, Metas: 6, "Fluxo de Caixa": 7, "Resumo Mensal": 8, "Como usar": 9 };
  const reqs = buildLayoutRequests(ids) as any[];
  const monthFmt = reqs.find((r) =>
    r.repeatCell?.range?.sheetId === 1 &&
    r.repeatCell?.range?.startRowIndex === 11 && r.repeatCell?.range?.endRowIndex === 21 &&
    r.repeatCell?.range?.startColumnIndex === 6 && r.repeatCell?.range?.endColumnIndex === 7 &&
    r.repeatCell?.cell?.userEnteredFormat?.numberFormat?.type === "DATE",
  );
  assert(!!monthFmt, "Dashboard G12:G21 tem numberFormat DATE");
  assertEq(monthFmt?.repeatCell?.cell?.userEnteredFormat?.numberFormat?.pattern, "mmm/yyyy", "…no padrão mmm/yyyy (igual à aba Resumo)");
}

// ─────────────────────────────────────────────────────────────────────────────
section("B10) Caminho real do navegador (GoogleSyncButton) — requests puros");
// ─────────────────────────────────────────────────────────────────────────────
{
  const body = createWorkbookBody("fulano@gmail.com") as any;
  assertEq(body.properties.locale, "pt_BR", "criar: locale pt_BR");
  assertEq(body.properties.timeZone, "America/Sao_Paulo", "criar: fuso São Paulo");
  assert(String(body.properties.title).includes("fulano@gmail.com"), "criar: título leva o e-mail");
  assertEq(body.sheets.length, 9, "criar: 9 abas");

  const created: SpreadsheetInfo = { sheets: body.sheets.map((s: any, i: number) => ({ properties: { title: s.properties.title, sheetId: 100 + i } })) };
  const ids = readSheetIds(created);
  assertEq(ids["Dashboard"], 100, "readSheetIds mapeia título → sheetId");
  assertEq(Object.keys(ids).length, 9, "readSheetIds: 9 abas");
  assert((layoutCall(ids) as any).requests.length > 50, "layout: muitos requests");
  const sv = staticValuesCall() as any;
  assertEq(sv.valueInputOption, "USER_ENTERED", "conteúdo estático: USER_ENTERED (fórmulas pt-BR precisam)");
  assert(sv.data.some((d: any) => d.range === "Dívidas!J4:J7"), "conteúdo estático escreve os rótulos da coluna J");
  assertEq((chartsCall(ids) as any).requests.length, 4, "gráficos: 4 addChart");

  // upgrade: planilha antiga sem a aba "Como usar", com gráfico/zebra/proteção/regras velhas
  const antiga: SpreadsheetInfo = {
    sheets: [
      { properties: { title: "Dashboard", sheetId: 1 }, charts: [{ chartId: 11 }, { chartId: 12 }], bandedRanges: [{ bandedRangeId: 21 }], protectedRanges: [{ protectedRangeId: 31 }], conditionalFormats: [{}, {}, {}] },
      { properties: { title: "Lançamentos", sheetId: 2 }, bandedRanges: [{ bandedRangeId: 22 }] },
    ],
  };
  const faltando = missingTabsCall(readSheetIds(antiga)) as any;
  assert(faltando && faltando.requests.length === 7 && faltando.requests.every((r: any) => r.addSheet), "upgrade: cria as 7 abas que faltam");
  assertEq(missingTabsCall(ids), null, "upgrade: nada a criar quando todas existem");

  const idsAntiga = { ...ids, Dashboard: 1, "Lançamentos": 2 };
  const up = upgradeLayoutCall(antiga, idsAntiga) as any;
  const kinds = up.requests.map((r: any) => Object.keys(r)[0]);
  assertEq(kinds.filter((k: string) => k === "deleteEmbeddedObject").length, 2, "upgrade: apaga os 2 gráficos antigos");
  assertEq(kinds.filter((k: string) => k === "deleteBanding").length, 2, "upgrade: apaga as 2 zebras antigas");
  assertEq(kinds.filter((k: string) => k === "deleteProtectedRange").length, 1, "upgrade: apaga a proteção antiga");
  const condIdx = up.requests.filter((r: any) => r.deleteConditionalFormatRule).map((r: any) => r.deleteConditionalFormatRule.index);
  assertEq(JSON.stringify(condIdx), JSON.stringify([2, 1, 0]), "upgrade: regras condicionais apagadas de trás pra frente");
  const primeiroLayout = kinds.findIndex((k: string) => !k.startsWith("delete"));
  assert(primeiroLayout === 8, "upgrade: toda limpeza (2+2+1+3 = 8) vem ANTES do layout novo", `primeiro request de layout na posição ${primeiroLayout}`);
  assert(!up.requests.some((r: any) => r.updateCells || r.appendCells), "upgrade: não toca nos DADOS do usuário (sem updateCells)");

  // pushData: limpa e escreve — sem passar da última coluna de dados
  const push = pushDataCalls({ incomes: [entrada("a", "x", 10, "2026-08-05")], expenses: [], debts: [], goals: [] }) as any;
  assertEq(push.update.valueInputOption, "USER_ENTERED", "pushData: USER_ENTERED");
  assert(push.clear.ranges.length > 0, "pushData: limpa antes de escrever");
  const colunaFinal = (r: string) => (r.split("!")[1].split(":")[1] ?? "").replace(/\d+$/, "");
  const limites: Record<string, string> = { "Lançamentos": "I", Receitas: "F", Despesas: "G", "Dívidas": "G", Metas: "F", "Fluxo de Caixa": "E", "Resumo Mensal": "G" };
  for (const [aba, ultima] of Object.entries(limites)) {
    const r = push.clear.ranges.find((x: string) => x.startsWith(`${aba}!A2`));
    assertEq(r ? colunaFinal(r) : undefined, ultima, `pushData: limpeza de ${aba} para na coluna ${ultima} (não apaga J:L)`);
  }
  const nasAbasDeDados = (r: string) => !r.startsWith("Dashboard!");
  assert(!push.clear.ranges.filter(nasAbasDeDados).some((r: string) => /:[J-Z]\d*$/.test(r)), "pushData: nenhuma limpeza de aba de dados alcança J..Z");
  assert(!push.update.data.map((d: any) => d.range).filter(nasAbasDeDados).some((r: string) => /![J-L]\d+$/.test(r) && !/K4:K7$/.test(r)), "pushData: só K4:K7 é escrito no painel (rótulos J ficam)");
  const vazio = pushDataCalls({ incomes: [], expenses: [], debts: [], goals: [] }) as any;
  assert(vazio.clear && vazio.update, "pushData vazio: ainda limpa e escreve painéis/KPIs");
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
