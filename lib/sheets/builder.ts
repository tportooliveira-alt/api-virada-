/**
 * Construtor isomórfico da planilha — gera requests/values puros
 * (JSON), sem chamar nenhuma API. Usado tanto no servidor (googleapis)
 * quanto no cliente (fetch direto na REST API com token OAuth do usuário).
 *
 * Toda a "inteligência" da planilha profissional vive aqui:
 *  • Banner navy/dourado
 *  • 4 KPI cards
 *  • 4 gráficos (pizza, coluna, linha, barra)
 *  • Formatos BRL/data/percent
 *  • Banding (zebra), auto-filter, freeze
 *  • Travamento read-only
 *  • Aba "Como usar"
 */

import {
  COLOR,
  FORMAT,
  STYLE,
  addBanding,
  condFormatGradient,
  condFormatPositiveNegative,
  condFormatTextEquals,
  freezeRows,
  hideGridlines,
  mergeCells,
  protectSheet,
  protectSheetExcept,
  repeatCell,
  setColumnWidth,
  setRowHeight,
} from "./styles";

export type Row = Record<string, string | number | null | undefined>;

export const TAB = {
  dashboard: "Dashboard",
  lancamentos: "Lançamentos",
  receitas: "Receitas",
  despesas: "Despesas",
  dividas: "Dívidas",
  metas: "Metas",
  fluxo: "Fluxo de Caixa",
  resumo: "Resumo Mensal",
  ajuda: "Como usar",
} as const;

export const TAB_ORDER: Array<keyof typeof TAB> = [
  "dashboard", "lancamentos", "receitas", "despesas",
  "dividas", "metas", "fluxo", "resumo", "ajuda",
];

export const HEADERS: Partial<Record<keyof typeof TAB, string[]>> = {
  lancamentos: ["Data", "Tipo", "Descrição", "Categoria", "Valor", "Pagamento", "Natureza", "Escopo", "Origem"],
  receitas:    ["Data", "Descrição", "Categoria", "Valor", "Escopo", "Origem"],
  despesas:    ["Data", "Descrição", "Categoria", "Valor", "Pagamento", "Natureza", "Escopo"],
  dividas:     ["Nome", "Vencimento", "Prioridade", "Status", "Parcela", "Valor total", "Em aberto"],
  metas:       ["Meta", "Tipo", "Valor alvo", "Valor atual", "Faltando", "Progresso"],
  fluxo:       ["Data", "Entradas", "Saídas", "Resultado do dia", "Saldo acumulado"],
  resumo:      ["Mês", "Entradas", "Saídas", "Resultado", "Saldo acumulado", "Economia", "Lançamentos"],
};

export const MAX_DATA_ROWS = 1000;

// ─── Spec inicial das abas (passa direto pro create) ─────────────────────────

export function buildSheetSpecs() {
  return TAB_ORDER.map((key, i) => ({
    properties: {
      title: TAB[key],
      index: i,
      gridProperties: {
        rowCount: key === "dashboard" || key === "ajuda" ? 60 : MAX_DATA_ROWS + 1,
        columnCount: 12,
      },
    },
  }));
}

// ─── Layout (banner, kpis, headers, larguras, formatos, proteção) ───────────

export function buildLayoutRequests(ids: Record<string, number>): unknown[] {
  const reqs: unknown[] = [];
  const D = ids[TAB.dashboard];

  // ===== Dashboard =====
  reqs.push(hideGridlines(D));
  for (const c of [0, 1, 2, 3, 4, 5, 6, 7]) {
    reqs.push(setColumnWidth(D, c, c + 1, c % 2 === 0 ? 200 : 180));
  }
  reqs.push(mergeCells(D, 0, 1, 0, 8));
  reqs.push(mergeCells(D, 1, 2, 0, 8));
  reqs.push(setRowHeight(D, 0, 1, 56));
  reqs.push(setRowHeight(D, 1, 2, 28));
  reqs.push(repeatCell(D, { startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 8 }, STYLE.banner));
  reqs.push(repeatCell(D, { startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 8 }, STYLE.bannerSub));
  reqs.push(setRowHeight(D, 2, 3, 16));
  // KPI cards
  reqs.push(setRowHeight(D, 4, 5, 22));
  reqs.push(setRowHeight(D, 5, 6, 56));
  for (const col of [0, 2, 4, 6]) {
    reqs.push(repeatCell(D, { startRowIndex: 4, endRowIndex: 5, startColumnIndex: col, endColumnIndex: col + 2 }, STYLE.kpiLabel));
    reqs.push(mergeCells(D, 4, 5, col, col + 2));
    reqs.push(mergeCells(D, 5, 6, col, col + 2));
  }
  reqs.push(repeatCell(D, { startRowIndex: 5, endRowIndex: 6, startColumnIndex: 0, endColumnIndex: 2 }, STYLE.kpiValue));
  reqs.push(repeatCell(D, { startRowIndex: 5, endRowIndex: 6, startColumnIndex: 2, endColumnIndex: 4 }, STYLE.kpiValue));
  reqs.push(repeatCell(D, { startRowIndex: 5, endRowIndex: 6, startColumnIndex: 4, endColumnIndex: 6 }, STYLE.kpiValueGold));
  reqs.push(repeatCell(D, { startRowIndex: 5, endRowIndex: 6, startColumnIndex: 6, endColumnIndex: 8 }, STYLE.kpiValueCount));
  reqs.push(...condFormatPositiveNegative(D, 5, 6, 4, 6));
  reqs.push(setRowHeight(D, 6, 7, 16));
  // Títulos seções esquerda/direita
  reqs.push(mergeCells(D, 8, 9, 0, 4));
  reqs.push(repeatCell(D, { startRowIndex: 8, endRowIndex: 9, startColumnIndex: 0, endColumnIndex: 4 }, STYLE.sectionTitle));
  reqs.push(mergeCells(D, 9, 10, 0, 4));
  reqs.push(repeatCell(D, { startRowIndex: 9, endRowIndex: 10, startColumnIndex: 0, endColumnIndex: 4 }, STYLE.sectionHint));
  reqs.push(repeatCell(D, { startRowIndex: 10, endRowIndex: 11, startColumnIndex: 0, endColumnIndex: 2 }, STYLE.tableHeader));
  reqs.push(repeatCell(D, { startRowIndex: 11, endRowIndex: 21, startColumnIndex: 0, endColumnIndex: 1 }, STYLE.rowEven));
  reqs.push(repeatCell(D, { startRowIndex: 11, endRowIndex: 21, startColumnIndex: 1, endColumnIndex: 2 }, {
    ...STYLE.rowEven,
    horizontalAlignment: "RIGHT",
    numberFormat: { type: "CURRENCY", pattern: FORMAT.brlPlain },
  }));
  reqs.push(mergeCells(D, 8, 9, 4, 8));
  reqs.push(repeatCell(D, { startRowIndex: 8, endRowIndex: 9, startColumnIndex: 4, endColumnIndex: 8 }, STYLE.sectionTitle));
  reqs.push(mergeCells(D, 9, 10, 4, 8));
  reqs.push(repeatCell(D, { startRowIndex: 9, endRowIndex: 10, startColumnIndex: 4, endColumnIndex: 8 }, STYLE.sectionHint));
  reqs.push(protectSheet(D, "Dashboard — gerado pelo app"));

  // ===== Abas de dados =====
  for (const key of ["lancamentos", "receitas", "despesas", "dividas", "metas", "fluxo", "resumo"] as const) {
    const sid = ids[TAB[key]];
    const headers = HEADERS[key]!;
    reqs.push(setRowHeight(sid, 0, 1, 36));
    reqs.push(repeatCell(sid, { startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: headers.length }, STYLE.tableHeader));
    reqs.push(freezeRows(sid, 1));
    reqs.push(addBanding(sid, 0, MAX_DATA_ROWS + 1, 0, headers.length));
    reqs.push(setColumnWidth(sid, 0, 1, 110));
    reqs.push(setColumnWidth(sid, 1, headers.length, 140));
    if (key === "lancamentos" || key === "receitas" || key === "despesas") {
      reqs.push(setColumnWidth(sid, 1, 2, 90));
      reqs.push(setColumnWidth(sid, 2, 3, 240));
    }
    reqs.push({
      setBasicFilter: {
        filter: {
          range: { sheetId: sid, startRowIndex: 0, endRowIndex: MAX_DATA_ROWS + 1, startColumnIndex: 0, endColumnIndex: headers.length },
        },
      },
    });
    reqs.push(protectSheetExcept(
      sid,
      [{ startRow: 1, endRow: MAX_DATA_ROWS + 1, startCol: 0, endCol: headers.length }],
      `${TAB[key]} — gerada pelo app`,
    ));
  }

  applyNumberFormats(reqs, ids);
  applyConditionals(reqs, ids);

  // ===== Aba "Como usar" =====
  const A = ids[TAB.ajuda];
  reqs.push(hideGridlines(A));
  reqs.push(setColumnWidth(A, 0, 1, 56));
  reqs.push(setColumnWidth(A, 1, 2, 600));
  reqs.push(setRowHeight(A, 0, 1, 80));
  reqs.push(mergeCells(A, 0, 1, 0, 2));
  reqs.push(repeatCell(A, { startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 2 }, STYLE.helpHero));
  for (let i = 0; i < 5; i++) {
    const r = 2 + i * 2;
    reqs.push(setRowHeight(A, r, r + 1, 28));
    reqs.push(setRowHeight(A, r + 1, r + 2, 60));
    reqs.push(mergeCells(A, r, r + 2, 0, 1));
    reqs.push(repeatCell(A, { startRowIndex: r, endRowIndex: r + 2, startColumnIndex: 0, endColumnIndex: 1 }, STYLE.helpStepNum));
    reqs.push(repeatCell(A, { startRowIndex: r, endRowIndex: r + 1, startColumnIndex: 1, endColumnIndex: 2 }, STYLE.helpStepTitle));
    reqs.push(repeatCell(A, { startRowIndex: r + 1, endRowIndex: r + 2, startColumnIndex: 1, endColumnIndex: 2 }, STYLE.helpStepBody));
  }
  reqs.push(protectSheet(A, "Como usar — gerada pelo app"));

  return reqs;
}

function applyNumberFormats(reqs: unknown[], ids: Record<string, number>) {
  const moneyCol = (sid: number, col: number) =>
    repeatCell(sid, { startRowIndex: 1, endRowIndex: MAX_DATA_ROWS + 1, startColumnIndex: col, endColumnIndex: col + 1 },
      { numberFormat: { type: "CURRENCY", pattern: FORMAT.brlPlain }, horizontalAlignment: "RIGHT" },
      "userEnteredFormat(numberFormat,horizontalAlignment)");
  const dateCol = (sid: number, col: number) =>
    repeatCell(sid, { startRowIndex: 1, endRowIndex: MAX_DATA_ROWS + 1, startColumnIndex: col, endColumnIndex: col + 1 },
      { numberFormat: { type: "DATE", pattern: FORMAT.date }, horizontalAlignment: "CENTER" },
      "userEnteredFormat(numberFormat,horizontalAlignment)");
  const monthCol = (sid: number, col: number) =>
    repeatCell(sid, { startRowIndex: 1, endRowIndex: MAX_DATA_ROWS + 1, startColumnIndex: col, endColumnIndex: col + 1 },
      { numberFormat: { type: "DATE", pattern: FORMAT.monthYear }, horizontalAlignment: "CENTER" },
      "userEnteredFormat(numberFormat,horizontalAlignment)");
  const pctCol = (sid: number, col: number) =>
    repeatCell(sid, { startRowIndex: 1, endRowIndex: MAX_DATA_ROWS + 1, startColumnIndex: col, endColumnIndex: col + 1 },
      { numberFormat: { type: "PERCENT", pattern: FORMAT.percent }, horizontalAlignment: "RIGHT" },
      "userEnteredFormat(numberFormat,horizontalAlignment)");

  reqs.push(dateCol(ids[TAB.lancamentos], 0));
  reqs.push(moneyCol(ids[TAB.lancamentos], 4));
  reqs.push(dateCol(ids[TAB.receitas], 0));
  reqs.push(moneyCol(ids[TAB.receitas], 3));
  reqs.push(dateCol(ids[TAB.despesas], 0));
  reqs.push(moneyCol(ids[TAB.despesas], 3));
  reqs.push(dateCol(ids[TAB.dividas], 1));
  reqs.push(moneyCol(ids[TAB.dividas], 4));
  reqs.push(moneyCol(ids[TAB.dividas], 5));
  reqs.push(moneyCol(ids[TAB.dividas], 6));
  reqs.push(moneyCol(ids[TAB.metas], 2));
  reqs.push(moneyCol(ids[TAB.metas], 3));
  reqs.push(moneyCol(ids[TAB.metas], 4));
  reqs.push(pctCol(ids[TAB.metas], 5));
  reqs.push(dateCol(ids[TAB.fluxo], 0));
  for (const c of [1, 2, 3, 4]) reqs.push(moneyCol(ids[TAB.fluxo], c));
  reqs.push(monthCol(ids[TAB.resumo], 0));
  for (const c of [1, 2, 3, 4]) reqs.push(moneyCol(ids[TAB.resumo], c));
  reqs.push(pctCol(ids[TAB.resumo], 5));
}

function applyConditionals(reqs: unknown[], ids: Record<string, number>) {
  reqs.push(...condFormatPositiveNegative(ids[TAB.fluxo], 1, MAX_DATA_ROWS + 1, 3, 5));
  reqs.push(...condFormatPositiveNegative(ids[TAB.resumo], 1, MAX_DATA_ROWS + 1, 3, 5));
  reqs.push(condFormatGradient(ids[TAB.metas], 1, MAX_DATA_ROWS + 1, 5, 6));
  const D = ids[TAB.dividas];
  reqs.push(condFormatTextEquals(D, 1, MAX_DATA_ROWS + 1, 3, 4, "aberta", COLOR.redSoft, COLOR.red, 0));
  reqs.push(condFormatTextEquals(D, 1, MAX_DATA_ROWS + 1, 3, 4, "negociando", COLOR.goldSoft, { red: 0.55, green: 0.40, blue: 0.05 }, 1));
  reqs.push(condFormatTextEquals(D, 1, MAX_DATA_ROWS + 1, 3, 4, "quitada", COLOR.greenSoft, { red: 0.07, green: 0.45, blue: 0.20 }, 2));
  reqs.push(...condFormatPositiveNegative(ids[TAB.dashboard], 5, 6, 4, 6));
}

// ─── Conteúdo estático (cabeçalhos + dashboard inicial + ajuda) ─────────────

export function buildStaticValues() {
  const data: { range: string; values: unknown[][] }[] = [];

  for (const key of Object.keys(HEADERS) as Array<keyof typeof HEADERS>) {
    data.push({
      range: `${TAB[key as keyof typeof TAB]}!A1`,
      values: [HEADERS[key]!],
    });
  }

  data.push({
    range: `${TAB.dashboard}!A1`,
    values: [
      ["CÓDIGO DA VIRADA — RELATÓRIO FINANCEIRO"],
      ["Aguardando primeira sincronização…"],
      [""],
      [""],
      ["ENTRADAS DO PERÍODO", "", "SAÍDAS DO PERÍODO", "", "SALDO", "", "LANÇAMENTOS", ""],
      [0, "", 0, "", 0, "", 0, ""],
    ],
  });
  data.push({
    range: `${TAB.dashboard}!A9`,
    values: [
      ["Gastos por categoria", "", "", "", "Mês a mês — entradas vs saídas", "", "", ""],
      ["Top 10 categorias com maior gasto no período.", "", "", "", "Comparativo dos últimos meses sincronizados.", "", "", ""],
      ["Categoria", "Total"],
    ],
  });

  const steps: Array<[string, string]> = [
    ["Sincronize sempre que lançar algo no app", "Cada vez que você adiciona uma receita, despesa, dívida ou meta no app, basta tocar em \"Sincronizar planilhas\" para ver os números atualizados aqui."],
    ["O Dashboard é o seu painel principal", "Comece por ele: traz entradas, saídas, saldo e os 10 maiores gastos por categoria, com gráficos para você enxergar tudo de uma vez."],
    ["Use as abas de detalhe para investigar", "Receitas, Despesas, Dívidas e Metas mostram cada item separado. Clique no ícone de funil no cabeçalho para filtrar por categoria, mês ou status."],
    ["Fluxo de Caixa e Resumo Mensal contam sua história", "O Fluxo mostra o saldo dia a dia. O Resumo Mensal mostra mês a mês: quanto entrou, quanto saiu, quanto sobrou e qual o seu percentual de economia."],
    ["A planilha é só leitura — e isso é proposital", "Esta planilha é gerada pelo app: as fórmulas e cabeçalhos ficam travados para não quebrar. Para mudar dados, edite no app e sincronize de novo."],
  ];
  data.push({ range: `${TAB.ajuda}!A1`, values: [["COMO USAR ESTA PLANILHA", ""]] });
  steps.forEach(([title, body], i) => {
    const r = 3 + i * 2;
    data.push({ range: `${TAB.ajuda}!A${r}`, values: [[i + 1, title]] });
    data.push({ range: `${TAB.ajuda}!B${r + 1}`, values: [[body]] });
  });

  return data;
}

// ─── Gráficos ────────────────────────────────────────────────────────────────

export function buildChartRequests(ids: Record<string, number>): unknown[] {
  const D = ids[TAB.dashboard];
  const R = ids[TAB.resumo];
  const F = ids[TAB.fluxo];
  const Dv = ids[TAB.dividas];
  const reqs: unknown[] = [];

  reqs.push({
    addChart: {
      chart: {
        spec: {
          title: "", fontName: "Inter", backgroundColorStyle: { rgbColor: COLOR.white },
          pieChart: {
            legendPosition: "RIGHT_LEGEND", threeDimensional: false,
            domain: { sourceRange: { sources: [{ sheetId: D, startRowIndex: 10, endRowIndex: 21, startColumnIndex: 0, endColumnIndex: 1 }] } },
            series: { sourceRange: { sources: [{ sheetId: D, startRowIndex: 10, endRowIndex: 21, startColumnIndex: 1, endColumnIndex: 2 }] } },
          },
        },
        position: { overlayPosition: { anchorCell: { sheetId: D, rowIndex: 22, columnIndex: 0 }, widthPixels: 460, heightPixels: 280 } },
      },
    },
  });

  reqs.push({
    addChart: {
      chart: {
        spec: {
          title: "", fontName: "Inter", backgroundColorStyle: { rgbColor: COLOR.white },
          basicChart: {
            chartType: "COLUMN", legendPosition: "BOTTOM_LEGEND", headerCount: 1, stackedType: "NOT_STACKED",
            domains: [{ domain: { sourceRange: { sources: [{ sheetId: R, startRowIndex: 0, endRowIndex: MAX_DATA_ROWS + 1, startColumnIndex: 0, endColumnIndex: 1 }] } } }],
            series: [
              { series: { sourceRange: { sources: [{ sheetId: R, startRowIndex: 0, endRowIndex: MAX_DATA_ROWS + 1, startColumnIndex: 1, endColumnIndex: 2 }] } }, targetAxis: "LEFT_AXIS", colorStyle: { rgbColor: COLOR.green } },
              { series: { sourceRange: { sources: [{ sheetId: R, startRowIndex: 0, endRowIndex: MAX_DATA_ROWS + 1, startColumnIndex: 2, endColumnIndex: 3 }] } }, targetAxis: "LEFT_AXIS", colorStyle: { rgbColor: COLOR.red } },
            ],
          },
        },
        position: { overlayPosition: { anchorCell: { sheetId: D, rowIndex: 10, columnIndex: 4 }, widthPixels: 720, heightPixels: 280 } },
      },
    },
  });

  reqs.push({
    addChart: {
      chart: {
        spec: {
          title: "", fontName: "Inter", backgroundColorStyle: { rgbColor: COLOR.white },
          basicChart: {
            chartType: "LINE", legendPosition: "NO_LEGEND", headerCount: 1,
            domains: [{ domain: { sourceRange: { sources: [{ sheetId: F, startRowIndex: 0, endRowIndex: MAX_DATA_ROWS + 1, startColumnIndex: 0, endColumnIndex: 1 }] } } }],
            series: [
              { series: { sourceRange: { sources: [{ sheetId: F, startRowIndex: 0, endRowIndex: MAX_DATA_ROWS + 1, startColumnIndex: 4, endColumnIndex: 5 }] } }, targetAxis: "LEFT_AXIS", colorStyle: { rgbColor: COLOR.gold } },
            ],
          },
        },
        position: { overlayPosition: { anchorCell: { sheetId: D, rowIndex: 22, columnIndex: 4 }, widthPixels: 720, heightPixels: 280 } },
      },
    },
  });

  reqs.push({
    addChart: {
      chart: {
        spec: {
          title: "", fontName: "Inter", backgroundColorStyle: { rgbColor: COLOR.white },
          basicChart: {
            chartType: "BAR", legendPosition: "NO_LEGEND", headerCount: 1,
            domains: [{ domain: { sourceRange: { sources: [{ sheetId: Dv, startRowIndex: 0, endRowIndex: MAX_DATA_ROWS + 1, startColumnIndex: 0, endColumnIndex: 1 }] } } }],
            series: [
              { series: { sourceRange: { sources: [{ sheetId: Dv, startRowIndex: 0, endRowIndex: MAX_DATA_ROWS + 1, startColumnIndex: 6, endColumnIndex: 7 }] } }, targetAxis: "BOTTOM_AXIS", colorStyle: { rgbColor: COLOR.red } },
            ],
          },
        },
        position: { overlayPosition: { anchorCell: { sheetId: D, rowIndex: 38, columnIndex: 0 }, widthPixels: 1180, heightPixels: 280 } },
      },
    },
  });

  reqs.push(mergeCells(D, 36, 37, 0, 8));
  reqs.push(repeatCell(D, { startRowIndex: 36, endRowIndex: 37, startColumnIndex: 0, endColumnIndex: 8 }, STYLE.sectionTitle));
  reqs.push(mergeCells(D, 37, 38, 0, 8));
  reqs.push(repeatCell(D, { startRowIndex: 37, endRowIndex: 38, startColumnIndex: 0, endColumnIndex: 8 }, STYLE.sectionHint));

  return reqs;
}

// ─── Sync (dados) ────────────────────────────────────────────────────────────

export interface SyncInput {
  expenses: Array<{ id: string; description: string; value: number; category: string; date: string; paymentMethod?: string; nature?: string; scope?: string; source?: string }>;
  incomes:  Array<{ id: string; description: string; value: number; category: string; date: string; scope?: string; source?: string }>;
  debts:    Array<{ id: string; name: string; totalValue: number; installmentValue: number; dueDate: string; priority: string; status: string }>;
  goals:    Array<{ id: string; name: string; targetValue: number; currentValue: number; type: string }>;
}

export function buildSyncBatch(input: SyncInput) {
  const { expenses, incomes, debts, goals } = input;

  const allRows: Row[] = [
    ...incomes.map((i) => ({ id: i.id, type: "income",  description: i.description, amount: i.value, category: i.category, date: i.date, scope: i.scope ?? null, source: i.source ?? "app" })),
    ...expenses.map((e) => ({ id: e.id, type: "expense", description: e.description, amount: e.value, category: e.category, date: e.date, paymentMethod: e.paymentMethod ?? null, nature: e.nature ?? null, scope: e.scope ?? null, source: e.source ?? "app" })),
  ];

  // Lançamentos
  const lanc = [...allRows]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map((r) => [
      formatDate(r.date),
      r.type === "income" ? "Entrada" : "Saída",
      r.description,
      r.category,
      Number(r.amount) || 0,
      r.paymentMethod ?? "",
      r.nature ?? "",
      r.scope ?? "",
      r.source ?? "",
    ]);

  // Receitas
  const rec = [...incomes]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map((r) => [formatDate(r.date), r.description, r.category, r.value, r.scope ?? "", r.source ?? "app"]);

  // Despesas
  const des = [...expenses]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map((r) => [formatDate(r.date), r.description, r.category, r.value, r.paymentMethod ?? "", r.nature ?? "", r.scope ?? ""]);

  // Dívidas
  const div = [...debts]
    .sort(priorityOrder)
    .map((d) => [d.name, formatDate(d.dueDate), d.priority, d.status, d.installmentValue, d.totalValue, d.status === "quitada" ? 0 : d.totalValue]);

  // Metas
  const met = goals.map((g) => {
    const missing = Math.max(g.targetValue - g.currentValue, 0);
    const progress = g.targetValue > 0 ? g.currentValue / g.targetValue : 0;
    return [g.name, g.type, g.targetValue, g.currentValue, missing, progress];
  });

  // Fluxo
  const byDate = new Map<string, { in: number; out: number }>();
  for (const r of allRows) {
    const d = String(r.date).split("T")[0];
    const prev = byDate.get(d) ?? { in: 0, out: 0 };
    if (r.type === "income") prev.in += Number(r.amount) || 0;
    else prev.out += Number(r.amount) || 0;
    byDate.set(d, prev);
  }
  let acc = 0;
  const flu = [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([d, { in: inn, out }]) => {
    const diff = inn - out;
    acc += diff;
    return [formatDate(d), inn, out, diff, acc];
  });

  // Resumo mensal
  const byMonth = new Map<string, { in: number; out: number; count: number }>();
  for (const r of allRows) {
    const m = String(r.date).slice(0, 7);
    const prev = byMonth.get(m) ?? { in: 0, out: 0, count: 0 };
    const v = Number(r.amount) || 0;
    if (r.type === "income") prev.in += v;
    else prev.out += v;
    prev.count += 1;
    byMonth.set(m, prev);
  }
  let accM = 0;
  const res = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([m, { in: inn, out, count }]) => {
    const r = inn - out;
    accM += r;
    return [`${m}-01`, inn, out, r, accM, inn > 0 ? r / inn : 0, count];
  });

  // Dashboard agregados — arredondamento BRL evita erros de ponto flutuante
  const brl = (n: number) => Math.round(n * 100) / 100;
  const totalIn  = brl(incomes.reduce((s, i) => s + i.value, 0));
  const totalOut = brl(expenses.reduce((s, e) => s + e.value, 0));
  const balance  = brl(totalIn - totalOut);
  const txCount  = allRows.length;

  const byCat = new Map<string, number>();
  for (const e of expenses) byCat.set(e.category, brl((byCat.get(e.category) || 0) + e.value));
  const topCats = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const padCats: (string | number)[][] = [];
  for (let i = 0; i < 10; i++) padCats.push(topCats[i] ? [topCats[i][0], topCats[i][1]] : ["", ""]);

  return {
    clearRanges: [
      `${TAB.lancamentos}!A2:Z${MAX_DATA_ROWS}`,
      `${TAB.receitas}!A2:Z${MAX_DATA_ROWS}`,
      `${TAB.despesas}!A2:Z${MAX_DATA_ROWS}`,
      `${TAB.dividas}!A2:Z${MAX_DATA_ROWS}`,
      `${TAB.metas}!A2:Z${MAX_DATA_ROWS}`,
      `${TAB.fluxo}!A2:Z${MAX_DATA_ROWS}`,
      `${TAB.resumo}!A2:Z${MAX_DATA_ROWS}`,
    ],
    valueRanges: [
      ...(lanc.length ? [{ range: `${TAB.lancamentos}!A2`, values: lanc }] : []),
      ...(rec.length ? [{ range: `${TAB.receitas}!A2`, values: rec }] : []),
      ...(des.length ? [{ range: `${TAB.despesas}!A2`, values: des }] : []),
      ...(div.length ? [{ range: `${TAB.dividas}!A2`, values: div }] : []),
      ...(met.length ? [{ range: `${TAB.metas}!A2`, values: met }] : []),
      ...(flu.length ? [{ range: `${TAB.fluxo}!A2`, values: flu }] : []),
      ...(res.length ? [{ range: `${TAB.resumo}!A2`, values: res }] : []),
      { range: `${TAB.dashboard}!B2`, values: [[`Atualizado em ${new Date().toLocaleString("pt-BR")}`]] },
      { range: `${TAB.dashboard}!B6`, values: [[totalIn]] },
      { range: `${TAB.dashboard}!D6`, values: [[totalOut]] },
      { range: `${TAB.dashboard}!F6`, values: [[balance]] },
      { range: `${TAB.dashboard}!H6`, values: [[txCount]] },
      { range: `${TAB.dashboard}!A11:B20`, values: padCats },
    ],
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: unknown): string {
  if (!d) return "";
  const s = String(d).split("T")[0];
  const [y, m, day] = s.split("-");
  if (!y || !m || !day) return s;
  return `${day}/${m}/${y}`;
}

function priorityOrder(a: { priority: string }, b: { priority: string }) {
  const w = (p: string) => (p === "alta" ? 0 : p === "média" ? 1 : 2);
  return w(a.priority) - w(b.priority);
}
