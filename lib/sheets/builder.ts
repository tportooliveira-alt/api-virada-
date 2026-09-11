/**
 * Construtor isomorfico da planilha — v2 (layout alinhado ao redesign do app).
 * Substitui lib/sheets/builder.ts. Depende do styles.ts v2 (STYLE.sparkCell / sparkHeader, COLOR.greenDeep, slate*).
 */

import {
  COLOR,
  FONT,
  FORMAT,
  STYLE,
  addBanding,
  condFormatProgressBands,
  condFormatPositiveNegative,
  condFormatTextEquals,
  freezeRows,
  hideColumns,
  hideGridlines,
  mergeCells,
  protectSheet,
  protectSheetExcept,
  repeatCell,
  setColumnWidth,
  setRowHeight,
} from "./styles";
import { isOpenDebt, semEstornados, type DebtStatus } from "../types";
import { savingsRate } from "../utils";

export type Row = Record<string, string | number | null | undefined>;

type TabKey = keyof typeof TAB;
export type DataTabKey = Exclude<TabKey, "dashboard" | "ajuda">;
type ValueRange = { range: string; values: unknown[][] };

type PanelMeta = {
  title: string;
  hint: string;
  labels: [string, string, string, string];
  notes: [string, string, string, string];
};

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

export const TAB_ORDER: TabKey[] = [
  "dashboard",
  "lancamentos",
  "receitas",
  "despesas",
  "dividas",
  "metas",
  "fluxo",
  "resumo",
  "ajuda",
];

export const HEADERS: Partial<Record<TabKey, string[]>> = {
  lancamentos: ["Data", "Tipo", "Descrição", "Categoria", "Valor", "Pagamento", "Natureza", "Escopo", "Origem"],
  receitas: ["Data", "Descrição", "Categoria", "Valor", "Escopo", "Origem"],
  despesas: ["Data", "Descrição", "Categoria", "Valor", "Pagamento", "Natureza", "Escopo"],
  dividas: ["Nome", "Vencimento", "Prioridade", "Status", "Parcela", "Valor total", "Em aberto"],
  metas: ["Meta", "Tipo", "Valor alvo", "Valor atual", "Faltando", "Progresso"],
  fluxo: ["Data", "Entradas", "Saídas", "Resultado do dia", "Saldo acumulado"],
  resumo: ["Mês", "Entradas", "Saídas", "Resultado", "Saldo acumulado", "Economia", "Lançamentos"],
};

/**
 * Versão do LAYOUT da planilha (visual: cores, fontes, alturas, gráficos,
 * fórmulas dos blocos fixos). Toda vez que o layout mudar, suba esta data —
 * o app compara com a versão gravada na planilha do usuário e, se estiver
 * atrasada, reaplica o visual sozinho no próximo "Atualizar agora".
 * Só valores mudam sem bump.
 */
export const LAYOUT_VERSION = "2026-09-11.1";

// Cores das barras de participação do Dashboard — mesma sequência da legenda
// da pizza no design (Planilha Virada - Redesign).
const SPARK_COLORS = ["#22C55E", "#F5C542", "#3B82F6", "#EF4444", "#A855F7", "#F97316", "#06B6D4", "#EC4899", "#84CC16", "#14B8A6"];

export const MAX_DATA_ROWS = 1000;

const DATA_TABS: DataTabKey[] = ["lancamentos", "receitas", "despesas", "dividas", "metas", "fluxo", "resumo"];

const MAIN_RANGE_END: Record<DataTabKey, string> = {
  lancamentos: "I",
  receitas: "F",
  despesas: "G",
  dividas: "G",
  metas: "F",
  fluxo: "E",
  resumo: "G",
};

const PANEL_META: Record<DataTabKey, PanelMeta> = {
  lancamentos: {
    title: "Leitura rápida",
    hint: "Visão consolidada dos lançamentos que alimentam todas as outras abas.",
    labels: ["Total lançado", "Entradas", "Saídas", "Período"],
    notes: [
      "Esta aba é a linha do tempo geral do app.",
      "Use filtros por categoria, tipo e escopo para investigar vazamentos.",
      "A planilha é gerada automaticamente para preservar a estrutura.",
      "Se algo estiver faltando, ajuste no app e sincronize de novo.",
    ],
  },
  receitas: {
    title: "Resumo de receitas",
    hint: "Entradas isoladas para acompanhar fôlego, frequência e maior fonte.",
    labels: ["Qtde de entradas", "Total recebido", "Maior entrada", "Última entrada"],
    notes: [
      "Receitas mostram só o que entrou, sem misturar despesas.",
      "Use para enxergar sazonalidade e renda extra.",
      "Quando precisar conferir um mês, filtre por data.",
      "O valor total desta aba alimenta o Dashboard.",
    ],
  },
  despesas: {
    title: "Resumo de despesas",
    hint: "Saídas com foco em controle, ticket médio e identificação de excesso.",
    labels: ["Qtde de saídas", "Total gasto", "Maior despesa", "Última saída"],
    notes: [
      "Aqui ficam só as saídas financeiras do período.",
      "Use pagamento e natureza para separar essencial de impulso.",
      "A categoria ajuda a enxergar para onde o dinheiro está indo.",
      "Toda atualização vem do app, não da planilha manual.",
    ],
  },
  dividas: {
    title: "Painel de dívidas",
    hint: "Dívidas em uma visão de prioridade, aberto e ritmo de negociação.",
    labels: ["Qtde de dívidas", "Total em aberto", "Quitadas", "Prioridade mais crítica"],
    notes: [
      "Comece pelas dívidas mais urgentes ou caras.",
      "Status ajuda a enxergar o que ainda pressiona o caixa.",
      "Quitadas continuam registradas para manter histórico.",
      "O gráfico do Dashboard usa esta base.",
    ],
  },
  metas: {
    title: "Painel de metas",
    hint: "Metas mostram direção financeira e progresso real acumulado.",
    labels: ["Qtde de metas", "Valor alvo", "Valor atual", "Melhor progresso"],
    notes: [
      "Metas ajudam a sair do modo só reação.",
      "Use para reserva, quitação, compras planejadas ou objetivo anual.",
      "O progresso é exibido em percentual para facilitar leitura.",
      "Quanto mais perto de 100%, mais verde a célula fica.",
    ],
  },
  fluxo: {
    title: "Pulso do caixa",
    hint: "Mostra o comportamento diário do resultado e do saldo acumulado.",
    labels: ["Dias com movimento", "Melhor dia", "Pior dia", "Saldo final"],
    notes: [
      "O fluxo evidencia quando o caixa respirou e quando apertou.",
      "Resultado do dia é entrada menos saída naquela data.",
      "Saldo acumulado mostra tendência, não só evento isolado.",
      "É uma das abas mais úteis para tomada de decisão.",
    ],
  },
  resumo: {
    title: "Fechamento mensal",
    hint: "Consolidação mês a mês para comparar evolução e disciplina financeira.",
    labels: ["Meses no histórico", "Melhor mês", "Pior mês", "Economia média"],
    notes: [
      "Use esta aba para comparar meses, não só dias.",
      "Resultado positivo indica sobra; negativo indica aperto.",
      "Economia mede quanto sobrou em relação ao que entrou.",
      "Ela sustenta o comparativo mensal do Dashboard.",
    ],
  },
};

export interface SyncInput {
  expenses: Array<{ id: string; description: string; value: number; category: string; date: string; paymentMethod?: string; nature?: string; scope?: string; source?: string; estornadoEm?: string }>;
  incomes: Array<{ id: string; description: string; value: number; category: string; date: string; scope?: string; source?: string; estornadoEm?: string }>;
  debts: Array<{ id: string; name: string; totalValue: number; installmentValue: number; dueDate: string; priority: string; status: string }>;
  goals: Array<{ id: string; name: string; targetValue: number; currentValue: number; type: string }>;
}

export function buildSheetSpecs() {
  return TAB_ORDER.map((key, index) => ({
    properties: {
      title: TAB[key],
      index,
      gridProperties: {
        rowCount: key === "dashboard" ? 70 : key === "ajuda" ? 40 : MAX_DATA_ROWS + 10,
        columnCount: 12,
      },
    },
  }));
}

export function buildLayoutRequests(ids: Record<string, number>): unknown[] {
  const requests: unknown[] = [];

  buildDashboardLayout(requests, ids[TAB.dashboard]);
  DATA_TABS.forEach((key) => buildDataSheetLayout(requests, key, ids[TAB[key]]));
  buildHelpLayout(requests, ids[TAB.ajuda]);
  applyNumberFormats(requests, ids);
  applyConditionals(requests, ids);

  return requests;
}

function buildDashboardLayout(requests: unknown[], sheetId: number) {
  requests.push(hideGridlines(sheetId));
  [132, 96, 96, 132, 96, 96, 132, 96, 96, 132, 96, 96].forEach((width, index) => {
    requests.push(setColumnWidth(sheetId, index, index + 1, width));
  });

  requests.push(setRowHeight(sheetId, 0, 1, 52));
  requests.push(setRowHeight(sheetId, 1, 2, 24));
  requests.push(mergeCells(sheetId, 0, 1, 0, 12));
  requests.push(mergeCells(sheetId, 1, 2, 0, 12));
  requests.push(repeatCell(sheetId, range(0, 1, 0, 12), STYLE.banner));
  requests.push(repeatCell(sheetId, range(1, 2, 0, 12), STYLE.bannerSub));

  requests.push(setRowHeight(sheetId, 4, 5, 22));
  requests.push(setRowHeight(sheetId, 5, 6, 52));
  // Linhas 7–8 (eram separador) carregam o bloco "Desde o início" dentro do mesmo
  // cartão: o KPI grande é o mês corrente (igual ao Início do app) e o acumulado
  // do histórico fica logo abaixo, menor e rotulado — nenhum se passa pelo outro.
  requests.push(setRowHeight(sheetId, 6, 7, 18));
  requests.push(setRowHeight(sheetId, 7, 8, 30));
  [0, 3, 6, 9].forEach((startCol) => {
    const gold = startCol === 6;
    requests.push(mergeCells(sheetId, 4, 5, startCol, startCol + 3));
    requests.push(mergeCells(sheetId, 5, 6, startCol, startCol + 3));
    requests.push(mergeCells(sheetId, 6, 7, startCol, startCol + 3));
    requests.push(mergeCells(sheetId, 7, 8, startCol, startCol + 3));
    requests.push(repeatCell(sheetId, range(4, 5, startCol, startCol + 3), STYLE.kpiLabel));
    requests.push(repeatCell(sheetId, range(6, 7, startCol, startCol + 3), gold ? STYLE.kpiLabelSubGold : STYLE.kpiLabelSub));
    requests.push(repeatCell(sheetId, range(7, 8, startCol, startCol + 3), gold ? STYLE.kpiValueSubGold : STYLE.kpiValueSub));
  });
  requests.push(repeatCell(sheetId, range(5, 6, 0, 3), STYLE.kpiValue));
  requests.push(repeatCell(sheetId, range(5, 6, 3, 6), STYLE.kpiValue));
  requests.push(repeatCell(sheetId, range(5, 6, 6, 9), STYLE.kpiValueGold));
  requests.push(repeatCell(sheetId, range(5, 6, 9, 12), STYLE.kpiValueCount));

  // design: títulos 28/24px, cabeçalho da tabela 26px e linhas de dados 22px
  requests.push(setRowHeight(sheetId, 8, 9, 28));
  requests.push(setRowHeight(sheetId, 9, 10, 24));
  requests.push(setRowHeight(sheetId, 10, 11, 26));
  requests.push(setRowHeight(sheetId, 11, 21, 22));
  requests.push(setRowHeight(sheetId, 32, 33, 28));
  requests.push(setRowHeight(sheetId, 33, 34, 24));

  // v2: linhas separadoras finas (3–4, 22)
  requests.push(setRowHeight(sheetId, 2, 4, 12));
  requests.push(setRowHeight(sheetId, 21, 22, 12));
  // v2: colunas C:E e K:L viram barras de participação (SPARKLINE) ao lado das tabelas
  for (let r = 11; r < 21; r++) {
    requests.push(mergeCells(sheetId, r, r + 1, 2, 5));
    requests.push(mergeCells(sheetId, r, r + 1, 10, 12));
    requests.push(repeatCell(sheetId, range(r, r + 1, 2, 5), STYLE.sparkCell));
    requests.push(repeatCell(sheetId, range(r, r + 1, 10, 12), STYLE.sparkCell));
  }
  requests.push(repeatCell(sheetId, range(10, 11, 2, 5), STYLE.sparkHeader));
  requests.push(repeatCell(sheetId, range(10, 11, 10, 12), STYLE.sparkHeader));

  addDashboardSummaryBlock(requests, sheetId, 8, 0, 5);
  addDashboardSummaryBlock(requests, sheetId, 8, 6, 12);
  requests.push(repeatCell(sheetId, range(10, 11, 0, 2), STYLE.tableHeader));
  requests.push(repeatCell(sheetId, range(10, 11, 6, 10), STYLE.tableHeader));
  requests.push(repeatCell(sheetId, range(10, 21, 0, 2), STYLE.dataCellBorder, "userEnteredFormat.borders"));
  requests.push(repeatCell(sheetId, range(10, 21, 6, 10), STYLE.dataCellBorder, "userEnteredFormat.borders"));
  requests.push(addBanding(sheetId, 10, 21, 0, 2));
  requests.push(addBanding(sheetId, 10, 21, 6, 10));

  requests.push(mergeCells(sheetId, 32, 33, 0, 12));
  requests.push(mergeCells(sheetId, 33, 34, 0, 12));
  requests.push(repeatCell(sheetId, range(32, 33, 0, 12), STYLE.sectionTitle));
  requests.push(repeatCell(sheetId, range(33, 34, 0, 12), STYLE.sectionHint));
  requests.push(protectSheet(sheetId, "Dashboard — gerado pelo app"));
}

function addDashboardSummaryBlock(requests: unknown[], sheetId: number, row: number, startCol: number, endCol: number) {
  requests.push(mergeCells(sheetId, row, row + 1, startCol, endCol));
  requests.push(mergeCells(sheetId, row + 1, row + 2, startCol, endCol));
  requests.push(repeatCell(sheetId, range(row, row + 1, startCol, endCol), STYLE.sectionTitle));
  requests.push(repeatCell(sheetId, range(row + 1, row + 2, startCol, endCol), STYLE.sectionHint));
}

function buildDataSheetLayout(requests: unknown[], key: DataTabKey, sheetId: number) {
  const headers = HEADERS[key] ?? [];
  const mainCols = headers.length;

  requests.push(setRowHeight(sheetId, 0, 1, 38));
  requests.push(setRowHeight(sheetId, 1, MAX_DATA_ROWS + 1, 24)); // design: linhas de dados 24px
  requests.push(repeatCell(sheetId, range(0, 1, 0, mainCols), STYLE.tableHeader));
  requests.push(freezeRows(sheetId, 1));
  requests.push(addBanding(sheetId, 0, MAX_DATA_ROWS + 1, 0, mainCols));
  requests.push(repeatCell(sheetId, range(0, MAX_DATA_ROWS + 1, 0, mainCols), STYLE.dataCellBorder, "userEnteredFormat.borders"));

  getColumnWidths(key).forEach((width, index) => requests.push(setColumnWidth(sheetId, index, index + 1, width)));
  if (mainCols < 9) requests.push(hideColumns(sheetId, mainCols, 9));

  requests.push(setColumnWidth(sheetId, 9, 10, 124));
  requests.push(setColumnWidth(sheetId, 10, 12, 146));
  requests.push(mergeCells(sheetId, 0, 1, 9, 12));
  requests.push(mergeCells(sheetId, 1, 2, 9, 12));
  requests.push(repeatCell(sheetId, range(0, 1, 9, 12), STYLE.subHeader));
  requests.push(repeatCell(sheetId, range(1, 2, 9, 12), STYLE.sectionHint));

  requests.push(repeatCell(sheetId, range(3, 7, 9, 10), STYLE.noteLabel));
  for (let rowIndex = 3; rowIndex < 7; rowIndex++) requests.push(mergeCells(sheetId, rowIndex, rowIndex + 1, 10, 12));
  requests.push(repeatCell(sheetId, range(3, 7, 10, 12), STYLE.noteBody));

  requests.push(mergeCells(sheetId, 9, 10, 9, 12));
  requests.push(repeatCell(sheetId, range(9, 10, 9, 12), STYLE.subHeader));
  for (let rowIndex = 10; rowIndex < 14; rowIndex++) requests.push(mergeCells(sheetId, rowIndex, rowIndex + 1, 9, 12));
  requests.push(repeatCell(sheetId, range(10, 14, 9, 12), STYLE.noteBody));

  requests.push({
    setBasicFilter: {
      filter: { range: { sheetId, startRowIndex: 0, endRowIndex: MAX_DATA_ROWS + 1, startColumnIndex: 0, endColumnIndex: mainCols } },
    },
  });
  requests.push(protectSheetExcept(
    sheetId,
    [{ startRow: 1, endRow: MAX_DATA_ROWS + 1, startCol: 0, endCol: mainCols }],
    `${TAB[key]} — gerada pelo app`,
  ));
}

function buildHelpLayout(requests: unknown[], sheetId: number) {
  requests.push(hideGridlines(sheetId));
  requests.push(setColumnWidth(sheetId, 0, 1, 56));
  requests.push(setColumnWidth(sheetId, 1, 2, 640));
  requests.push(hideColumns(sheetId, 2, 12));
  requests.push(setRowHeight(sheetId, 0, 1, 80));
  requests.push(mergeCells(sheetId, 0, 1, 0, 2));
  requests.push(repeatCell(sheetId, range(0, 1, 0, 2), STYLE.helpHero));

  for (let index = 0; index < 5; index++) {
    const rowIndex = 2 + index * 2;
    requests.push(setRowHeight(sheetId, rowIndex, rowIndex + 1, 28));
    requests.push(setRowHeight(sheetId, rowIndex + 1, rowIndex + 2, 62));
    requests.push(mergeCells(sheetId, rowIndex, rowIndex + 2, 0, 1));
    requests.push(repeatCell(sheetId, range(rowIndex, rowIndex + 2, 0, 1), STYLE.helpStepNum));
    requests.push(repeatCell(sheetId, range(rowIndex, rowIndex + 1, 1, 2), STYLE.helpStepTitle));
    requests.push(repeatCell(sheetId, range(rowIndex + 1, rowIndex + 2, 1, 2), STYLE.helpStepBody));
  }

  requests.push(protectSheet(sheetId, "Como usar — gerada pelo app"));
}

function getColumnWidths(key: DataTabKey): number[] {
  const widths: Record<DataTabKey, number[]> = {
    lancamentos: [96, 88, 198, 132, 108, 108, 108, 98, 92],
    receitas: [96, 198, 132, 108, 98, 92],
    despesas: [96, 198, 132, 108, 108, 108, 98],
    dividas: [194, 98, 98, 98, 98, 108, 108],
    metas: [194, 108, 108, 108, 108, 98],
    fluxo: [96, 108, 108, 116, 116],
    resumo: [96, 108, 108, 116, 116, 92, 98],
  };
  return widths[key];
}

function applyNumberFormats(requests: unknown[], ids: Record<string, number>) {
  const moneyCol = (sheetId: number, col: number) => repeatCell(sheetId, dataCol(col), {
    numberFormat: { type: "CURRENCY", pattern: FORMAT.brlPlain },
    horizontalAlignment: "CENTER",
    verticalAlignment: "MIDDLE",
    textFormat: { fontFamily: FONT, fontSize: 11, bold: true, foregroundColor: COLOR.brandDeep },
  }, "userEnteredFormat(numberFormat,horizontalAlignment,verticalAlignment,textFormat)");

  const dateCol = (sheetId: number, col: number) => repeatCell(sheetId, dataCol(col), {
    numberFormat: { type: "DATE", pattern: FORMAT.date },
    horizontalAlignment: "CENTER",
    verticalAlignment: "MIDDLE",
    textFormat: { fontFamily: FONT, fontSize: 10, foregroundColor: COLOR.text },
  }, "userEnteredFormat(numberFormat,horizontalAlignment,verticalAlignment,textFormat)");

  const monthCol = (sheetId: number, col: number) => repeatCell(sheetId, dataCol(col), {
    numberFormat: { type: "DATE", pattern: FORMAT.monthYear },
    horizontalAlignment: "CENTER",
    verticalAlignment: "MIDDLE",
    textFormat: { fontFamily: FONT, fontSize: 10, bold: true, foregroundColor: COLOR.brandDeep },
  }, "userEnteredFormat(numberFormat,horizontalAlignment,verticalAlignment,textFormat)");

  const pctCol = (sheetId: number, col: number) => repeatCell(sheetId, dataCol(col), {
    numberFormat: { type: "PERCENT", pattern: FORMAT.percent },
    horizontalAlignment: "CENTER",
    verticalAlignment: "MIDDLE",
    textFormat: { fontFamily: FONT, fontSize: 11, bold: true, foregroundColor: COLOR.brandDeep },
  }, "userEnteredFormat(numberFormat,horizontalAlignment,verticalAlignment,textFormat)");

  const countCol = (sheetId: number, col: number) => repeatCell(sheetId, dataCol(col), {
    numberFormat: { type: "NUMBER", pattern: FORMAT.intCount },
    horizontalAlignment: "CENTER",
    verticalAlignment: "MIDDLE",
    textFormat: { fontFamily: FONT, fontSize: 10, foregroundColor: COLOR.slate700 },
  }, "userEnteredFormat(numberFormat,horizontalAlignment,verticalAlignment,textFormat)");

  const dashboardNumber = (
    rowStart: number,
    rowEnd: number,
    colStart: number,
    colEnd: number,
    format: { type: string; pattern: string },
    // design: valor dos KPIs colado no rótulo (esquerda); nas tabelas, à direita
    align: "LEFT" | "RIGHT" = "RIGHT",
  ) => repeatCell(
    ids[TAB.dashboard],
    range(rowStart, rowEnd, colStart, colEnd),
    { numberFormat: format, horizontalAlignment: align },
    "userEnteredFormat(numberFormat,horizontalAlignment)",
  );

  // Dashboard: aplica apenas numberFormat nos blocos com valores para nao apagar o contraste dos cards.
  requests.push(dashboardNumber(5, 6, 0, 1, { type: "CURRENCY", pattern: FORMAT.brlPlain }, "LEFT"));
  requests.push(dashboardNumber(5, 6, 3, 4, { type: "CURRENCY", pattern: FORMAT.brlPlain }, "LEFT"));
  requests.push(dashboardNumber(5, 6, 6, 7, { type: "CURRENCY", pattern: FORMAT.brlPlain }, "LEFT"));
  requests.push(dashboardNumber(5, 6, 9, 10, { type: "NUMBER", pattern: FORMAT.intCount }, "LEFT"));
  requests.push(dashboardNumber(7, 8, 0, 1, { type: "CURRENCY", pattern: FORMAT.brlPlain }, "LEFT"));
  requests.push(dashboardNumber(7, 8, 3, 4, { type: "CURRENCY", pattern: FORMAT.brlPlain }, "LEFT"));
  requests.push(dashboardNumber(7, 8, 6, 7, { type: "CURRENCY", pattern: FORMAT.brlPlain }, "LEFT"));
  requests.push(dashboardNumber(7, 8, 9, 10, { type: "NUMBER", pattern: FORMAT.intCount }, "LEFT"));

  // Mês do comparativo entra como data (AAAA-MM-01), igual à aba Resumo: texto
  // "08/2026" o Sheets pode ler como 01/08/2026 e mostrar diferente em cada aba.
  requests.push(dashboardNumber(11, 21, 6, 7, { type: "DATE", pattern: FORMAT.monthYear }, "LEFT"));
  requests.push(dashboardNumber(11, 21, 1, 2, { type: "CURRENCY", pattern: FORMAT.brlPlain }));
  requests.push(dashboardNumber(11, 21, 7, 8, { type: "CURRENCY", pattern: FORMAT.brlPlain }));
  requests.push(dashboardNumber(11, 21, 8, 9, { type: "CURRENCY", pattern: FORMAT.brlPlain }));
  requests.push(dashboardNumber(11, 21, 9, 10, { type: "CURRENCY", pattern: FORMAT.brlPlain }));

  requests.push(dateCol(ids[TAB.lancamentos], 0), moneyCol(ids[TAB.lancamentos], 4));
  requests.push(dateCol(ids[TAB.receitas], 0), moneyCol(ids[TAB.receitas], 3));
  requests.push(dateCol(ids[TAB.despesas], 0), moneyCol(ids[TAB.despesas], 3));
  requests.push(dateCol(ids[TAB.dividas], 1), moneyCol(ids[TAB.dividas], 4), moneyCol(ids[TAB.dividas], 5), moneyCol(ids[TAB.dividas], 6));
  requests.push(moneyCol(ids[TAB.metas], 2), moneyCol(ids[TAB.metas], 3), moneyCol(ids[TAB.metas], 4), pctCol(ids[TAB.metas], 5));
  requests.push(dateCol(ids[TAB.fluxo], 0), moneyCol(ids[TAB.fluxo], 1), moneyCol(ids[TAB.fluxo], 2), moneyCol(ids[TAB.fluxo], 3), moneyCol(ids[TAB.fluxo], 4));
  requests.push(monthCol(ids[TAB.resumo], 0), moneyCol(ids[TAB.resumo], 1), moneyCol(ids[TAB.resumo], 2), moneyCol(ids[TAB.resumo], 3), moneyCol(ids[TAB.resumo], 4), pctCol(ids[TAB.resumo], 5), countCol(ids[TAB.resumo], 6));
}

function applyConditionals(requests: unknown[], ids: Record<string, number>) {
  requests.push(...condFormatPositiveNegative(ids[TAB.dashboard], 5, 6, 6, 7));
  requests.push(...condFormatPositiveNegative(ids[TAB.dashboard], 7, 8, 6, 7));
  requests.push(...condFormatPositiveNegative(ids[TAB.fluxo], 1, MAX_DATA_ROWS + 1, 3, 5));
  requests.push(...condFormatPositiveNegative(ids[TAB.resumo], 1, MAX_DATA_ROWS + 1, 3, 5));
  requests.push(...condFormatProgressBands(ids[TAB.metas], 1, MAX_DATA_ROWS + 1, 5, 6));
  requests.push(condFormatTextEquals(ids[TAB.dividas], 1, MAX_DATA_ROWS + 1, 3, 4, "aberta", COLOR.redSoft, COLOR.red, 0));
  requests.push(condFormatTextEquals(ids[TAB.dividas], 1, MAX_DATA_ROWS + 1, 3, 4, "negociando", COLOR.goldSoft, COLOR.orange, 1));
  requests.push(condFormatTextEquals(ids[TAB.dividas], 1, MAX_DATA_ROWS + 1, 3, 4, "quitada", COLOR.greenSoft, COLOR.brandDeep, 2));
  requests.push(condFormatTextEquals(ids[TAB.lancamentos], 1, MAX_DATA_ROWS + 1, 1, 2, "Entrada", COLOR.greenSoft, COLOR.greenDeep, 0));
  requests.push(condFormatTextEquals(ids[TAB.lancamentos], 1, MAX_DATA_ROWS + 1, 1, 2, "Saída", COLOR.slate100, COLOR.slate700, 1));
}

export function buildStaticValues() {
  const data: ValueRange[] = [];

  DATA_TABS.forEach((key) => data.push({ range: `${TAB[key]}!A1`, values: [HEADERS[key] ?? []] }));
  data.push(
    { range: `${TAB.dashboard}!A1`, values: [["CÓDIGO DA VIRADA • BASE FINANCEIRA CLARA E ESTRUTURADA"]] },
    { range: `${TAB.dashboard}!A2`, values: [[`Atualizado em ${new Date().toLocaleString("pt-BR")}`]] },
    // Mesmos rótulos da tela Início do app — o comprador compara os dois.
    { range: `${TAB.dashboard}!A5`, values: [["Entradas neste mês", "", "", "Gastos neste mês", "", "", "Em caixa neste mês", "", "", "Lançamentos no mês", "", ""]] },
    { range: `${TAB.dashboard}!A6`, values: [[0, "", "", 0, "", "", 0, "", "", 0, "", ""]] },
    { range: `${TAB.dashboard}!A7`, values: [["Desde o início · Entradas", "", "", "Desde o início · Gastos", "", "", "Desde o início · Em caixa", "", "", "Desde o início · Lançamentos", "", ""]] },
    { range: `${TAB.dashboard}!A8`, values: [[0, "", "", 0, "", "", 0, "", "", 0, "", ""]] },
    { range: `${TAB.dashboard}!A9`, values: [["Top categorias de gasto"], ["As dez categorias com maior saída financeira no período sincronizado."]] },
    { range: `${TAB.dashboard}!G9`, values: [["Comparativo mensal"], ["Leitura mensal de entradas, saídas e resultado para enxergar tendência."]] },
    { range: `${TAB.dashboard}!A11`, values: [["Categoria", "Total"]] },
    { range: `${TAB.dashboard}!G11`, values: [["Mês", "Entradas", "Saídas", "Resultado"]] },
    { range: `${TAB.dashboard}!A12:B21`, values: padRows(10, ["", ""]) },
    { range: `${TAB.dashboard}!G12:J21`, values: padRows(10, ["", "", "", ""]) },
    { range: `${TAB.dashboard}!A33`, values: [["Dívidas em aberto e pressão de caixa"], ["Gráfico de barras para visualizar rapidamente onde está o maior peso financeiro."]] },
    { range: `${TAB.dashboard}!C11`, values: [["participação"]] },
    { range: `${TAB.dashboard}!K11`, values: [["resultado do mês"]] },
    { range: `${TAB.dashboard}!C12:C21`, values: Array.from({ length: 10 }, (_, i) => [sparkBar(`B${12 + i}`, "$B$12:$B$21", SPARK_COLORS[i])]) },
    { range: `${TAB.dashboard}!K12:K21`, values: Array.from({ length: 10 }, (_, i) => [sparkBar(`J${12 + i}`, "$J$12:$J$21")]) },
  );

  DATA_TABS.forEach((key) => {
    const panel = PANEL_META[key];
    data.push(
      { range: `${TAB[key]}!J1`, values: [[`${panel.title} • Código da Virada`]] },
      { range: `${TAB[key]}!J2`, values: [[panel.hint]] },
      { range: `${TAB[key]}!J4:J7`, values: panel.labels.map((label) => [label]) },
      { range: `${TAB[key]}!K4:K7`, values: padRows(4, ["Aguardando sync"]) },
      { range: `${TAB[key]}!J10`, values: [["Como ler esta aba"]] },
      { range: `${TAB[key]}!J11:J14`, values: panel.notes.map((line) => [line]) },
    );
  });

  data.push({ range: `${TAB.ajuda}!A1`, values: [["CÓDIGO DA VIRADA • COMO USAR ESTA PLANILHA", ""]] });
  [
    ["Sincronize pelo app sempre que lançar algo", "A planilha foi desenhada para ser reflexo fiel do aplicativo. Edite no app e sincronize para manter tudo consistente."],
    ["Comece pelo Dashboard", "Ele concentra entradas, saídas, saldo, lançamentos, categorias de gasto e uma leitura mensal do desempenho."],
    ["Use as abas especializadas para investigar", "Receitas, Despesas, Dívidas, Metas, Fluxo de Caixa e Resumo Mensal ajudam a responder perguntas específicas sem poluir a visão geral."],
    ["Não quebre a estrutura manualmente", "As áreas principais estão bloqueadas para manter fórmulas, hierarquia visual e leitura profissional. Se quiser alterar dados, faça isso pelo app."],
    ["Se a planilha antiga estiver feia ou incompleta, recrie", "Basta desconectar a planilha atual no app e sincronizar de novo para gerar uma versão nova com o layout atualizado."],
  ].forEach(([title, body], index) => {
    const row = 3 + index * 2;
    data.push({ range: `${TAB.ajuda}!A${row}`, values: [[index + 1, title]] });
    data.push({ range: `${TAB.ajuda}!B${row + 1}`, values: [[body]] });
  });

  return data;
}

export function buildChartRequests(ids: Record<string, number>): unknown[] {
  const dashboard = ids[TAB.dashboard];
  const fluxo = ids[TAB.fluxo];
  const dividas = ids[TAB.dividas];

  return [
    pieChart(dashboard, 22, 0, 552, 220),
    monthlyChart(dashboard, 22, 6, 648, 220),
    lineChart(dashboard, fluxo, 35, 0, 552, 220),
    debtChart(dashboard, dividas, 35, 6, 648, 220),
  ];
}

export function buildSyncBatch(input: SyncInput) {
  const incomes = input.incomes ?? [];
  const expenses = input.expenses ?? [];
  const debts = input.debts ?? [];
  const goals = input.goals ?? [];
  // Contrato de estorno (lib/types.ts): as listas mostram o histórico inteiro
  // (com selo), mas todo total — KPI, fluxo, resumo, categorias, painéis — só
  // enxerga os válidos. Filtra ANTES de agregar, nunca depois.
  const validIncomes = semEstornados(incomes);
  const validExpenses = semEstornados(expenses);
  const historico = buildLedgerRows(incomes, expenses);
  const validos = buildLedgerRows(validIncomes, validExpenses);

  const lancamentos = historico.map((row) => [
    formatDate(row.date),
    row.type === "income" ? "Entrada" : "Saída",
    texto(descricaoComSelo(row.description, row.estornadoEm)),
    texto(row.category),
    Number(row.amount) || 0,
    texto(row.paymentMethod ?? ""),
    texto(row.nature ?? ""),
    texto(row.scope ?? ""),
    texto(row.source ?? ""),
  ]);

  const receitas = sortByDate(incomes).map((row) => [formatDate(row.date), texto(descricaoComSelo(row.description, row.estornadoEm)), texto(row.category), row.value, texto(row.scope ?? ""), texto(row.source ?? "app")]);
  const despesas = sortByDate(expenses).map((row) => [formatDate(row.date), texto(descricaoComSelo(row.description, row.estornadoEm)), texto(row.category), row.value, texto(row.paymentMethod ?? ""), texto(row.nature ?? ""), texto(row.scope ?? "")]);
  const dividas = sortDebts(debts).map((debt) => [texto(debt.name), formatDate(debt.dueDate), texto(debt.priority), texto(debt.status), debt.installmentValue, debt.totalValue, debtIsOpen(debt) ? debt.totalValue : 0]);
  const metas = goals.map((goal) => {
    const faltando = Math.max(goal.targetValue - goal.currentValue, 0);
    return [texto(goal.name), texto(goal.type), goal.targetValue, goal.currentValue, faltando, goalProgress(goal)];
  });

  const mes = localMonthKey();
  const fluxo = buildDailyCashFlow(validos);
  const porMes = aggregateByMonth(validos);
  const resumo = buildMonthlySummary(porMes, mes);
  const totals = buildTotals(validIncomes, validExpenses, debts, goals, validos, fluxo, resumo, buildDashboardMonthRows(porMes, mes), mes);

  return {
    clearRanges: buildClearRanges(),
    valueRanges: buildValueRanges({ lancamentos, receitas, despesas, dividas, metas, fluxo, resumo, totals }),
  };
}

function buildLedgerRows(incomes: SyncInput["incomes"], expenses: SyncInput["expenses"]): Row[] {
  return [
    ...incomes.map((income) => ({
      id: income.id,
      type: "income",
      description: income.description,
      amount: income.value,
      category: income.category,
      date: income.date,
      scope: income.scope ?? null,
      source: income.source ?? "app",
      estornadoEm: income.estornadoEm ?? null,
    })),
    ...expenses.map((expense) => ({
      id: expense.id,
      type: "expense",
      description: expense.description,
      amount: expense.value,
      category: expense.category,
      date: expense.date,
      paymentMethod: expense.paymentMethod ?? null,
      nature: expense.nature ?? null,
      scope: expense.scope ?? null,
      source: expense.source ?? "app",
      estornadoEm: expense.estornadoEm ?? null,
    })),
  ].sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function buildDailyCashFlow(rows: Row[]) {
  const byDate = new Map<string, { income: number; expense: number }>();
  rows.forEach((row) => {
    const date = String(row.date).split("T")[0];
    const current = byDate.get(date) ?? { income: 0, expense: 0 };
    const value = Number(row.amount) || 0;
    if (row.type === "income") current.income = roundMoney(current.income + value);
    else current.expense = roundMoney(current.expense + value);
    byDate.set(date, current);
  });

  let running = 0;
  // Sem lançamentos a aba fica vazia — uma linha [hoje, 0, 0, 0, 0] seria dado inventado.
  return [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, values]) => {
    const result = roundMoney(values.income - values.expense);
    running = roundMoney(running + result);
    return [formatDate(date), values.income, values.expense, result, running];
  });
}

type MonthTotals = { income: number; expense: number; count: number };
const MES_VAZIO: MonthTotals = { income: 0, expense: 0, count: 0 };

function aggregateByMonth(rows: Row[]) {
  const byMonth = new Map<string, MonthTotals>();
  rows.forEach((row) => {
    const month = String(row.date).slice(0, 7);
    const current = byMonth.get(month) ?? { ...MES_VAZIO };
    const value = Number(row.amount) || 0;
    if (row.type === "income") current.income = roundMoney(current.income + value);
    else current.expense = roundMoney(current.expense + value);
    current.count += 1;
    byMonth.set(month, current);
  });
  return byMonth;
}

function buildMonthlySummary(byMonth: Map<string, MonthTotals>, mesCorrente: string) {
  let running = 0;
  return fillMonthGaps([...byMonth.keys()], mesCorrente).map((month) => {
    const values = byMonth.get(month) ?? MES_VAZIO;
    const result = roundMoney(values.income - values.expense);
    running = roundMoney(running + result);
    return [`${month}-01`, values.income, values.expense, result, running, economia(values), values.count];
  });
}

// Coluna Economia = savingsRate do app (lib/utils.ts, % inteiro) em fração, porque
// a coluna tem formato PERCENT. Sem entradas não existe taxa: "—" (0,0% mentiria
// num mês só com gasto). Negativo é informação real — não trava em zero.
function economia(values: MonthTotals) {
  const taxa = savingsRate(values.income, values.expense);
  return taxa === null ? "—" : taxa / 100;
}

// Quantos meses, contando o corrente, o Resumo preenche com zeros entre o
// primeiro e o último mês com movimento.
const JANELA_PREENCHIMENTO = 24;

// Meses sem movimento entre o primeiro e o último entram zerados: jan, mar, mai
// viravam três barras contíguas no comparativo, escondendo os dois meses parados.
//
// A janela é limitada por construção — a tela aceita qualquer data válida, e um
// ano digitado errado ("1026-09-05", "2206-01-05") preenchia mais de mil meses:
// a aba tem MAX_DATA_ROWS linhas, e como o values.batchUpdate é um só, a API
// recusava TUDO e nada sincronizava. Regra:
//  - só preenche entre o primeiro e o último mês com movimento, e só dentro dos
//    últimos JANELA_PREENCHIMENTO meses até o mês corrente (nunca pro futuro);
//  - mês fora de [ano corrente − 10, ano corrente + 1] é dado suspeito: fica na
//    lista como está (o usuário precisa vê-lo pra corrigir), mas não puxa a
//    janela até ele.
// Assim o Resumo tem no máximo (meses com movimento + 24) linhas; o corte final
// em MAX_DATA_ROWS é só cinto de segurança.
function fillMonthGaps(months: string[], mesCorrente: string): string[] {
  const all = new Set(months);
  const anoCorrente = Number(mesCorrente.slice(0, 4));
  const sadios = months
    .filter((month) => /^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    .filter((month) => Number(month.slice(0, 4)) >= anoCorrente - 10 && Number(month.slice(0, 4)) <= anoCorrente + 1)
    .sort();
  if (sadios.length) {
    const inicioJanela = shiftMonth(mesCorrente, -(JANELA_PREENCHIMENTO - 1));
    const de = sadios[0] > inicioJanela ? sadios[0] : inicioJanela;
    const ate = sadios[sadios.length - 1] < mesCorrente ? sadios[sadios.length - 1] : mesCorrente;
    for (let key = de; key <= ate; key = shiftMonth(key, 1)) all.add(key);
  }
  return [...all].sort().slice(-MAX_DATA_ROWS);
}

// "AAAA-MM" deslocado n meses (n negativo volta no tempo).
function shiftMonth(key: string, n: number) {
  const [year, month] = key.split("-").map(Number);
  return localMonthKey(new Date(year, month - 1 + n, 1));
}

// Mesma regra do app (getGoalProgress): entre 0 e 100%. Sem teto, 2.500 numa
// meta de 1.000 virava 250% na planilha; sem piso, valor atual negativo dava −10%
// enquanto o app mostrava 0%.
function goalProgress(goal: { targetValue: number; currentValue: number }) {
  return goal.targetValue > 0 ? Math.min(1, Math.max(0, goal.currentValue / goal.targetValue)) : 0;
}

function goalReached(goal: { targetValue: number; currentValue: number }) {
  return goal.targetValue > 0 && roundMoney(goal.currentValue) >= roundMoney(goal.targetValue);
}

// Mês corrente em data LOCAL: toISOString() é UTC e, à noite no Brasil, já
// está no dia (ou mês) seguinte — o KPI mudaria de mês antes do app.
function localMonthKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function buildTotals(
  incomes: SyncInput["incomes"],
  expenses: SyncInput["expenses"],
  debts: SyncInput["debts"],
  goals: SyncInput["goals"],
  allRows: Row[],
  fluxo: unknown[][],
  resumo: unknown[][],
  resumoDashboardRows: unknown[][],
  mes: string,
) {
  const totalEntradas = roundMoney(incomes.reduce((sum, item) => sum + item.value, 0));
  const totalSaidas = roundMoney(expenses.reduce((sum, item) => sum + item.value, 0));
  const saldo = roundMoney(totalEntradas - totalSaidas);

  // KPIs principais = o que a tela Início mostra (getDashboardMetrics: mês corrente)
  const doMes = <T extends { date: string }>(items: T[]) => items.filter((item) => String(item.date).slice(0, 7) === mes);
  const entradasMes = roundMoney(doMes(incomes).reduce((sum, item) => sum + item.value, 0));
  const gastosMes = roundMoney(doMes(expenses).reduce((sum, item) => sum + item.value, 0));
  const caixaMes = roundMoney(entradasMes - gastosMes);
  const lancamentosMes = doMes(incomes).length + doMes(expenses).length;

  const orderedIncomes = sortByDate(incomes);
  const orderedExpenses = sortByDate(expenses);
  const openDebts = debts.filter(debtIsOpen);
  const debtOpenTotal = roundMoney(openDebts.reduce((sum, item) => sum + item.totalValue, 0));
  const quitadas = debts.filter((item) => item.status === "quitada").length;
  const bestMeta = goals
    .map((goal) => ({ name: goal.name, progress: goalProgress(goal), reached: goalReached(goal) }))
    .sort((a, b) => b.progress - a.progress)[0];
  // Painel do Resumo só enxerga meses COM movimento: as linhas zeradas ficam na
  // aba (série do gráfico), mas jan +500 e mar +300 não podem dar "Pior mês:
  // fev (R$ 0,00)" nem "3 meses no histórico".
  const mesesComMovimento = resumo.filter((row) => Number(row[6]) > 0);
  const bestMonth = mesesComMovimento.length ? mesesComMovimento.reduce((best, row) => (Number(row[3]) > Number(best[3]) ? row : best), mesesComMovimento[0]) : null;
  const worstMonth = mesesComMovimento.length ? mesesComMovimento.reduce((best, row) => (Number(row[3]) < Number(best[3]) ? row : best), mesesComMovimento[0]) : null;
  const taxas = mesesComMovimento.map((row) => row[5]).filter((value): value is number => typeof value === "number");
  const economiaMedia = taxas.length ? formatPercent(taxas.reduce((sum, value) => sum + value, 0) / taxas.length) : "—";
  // Com um dia só, melhor e pior dia são o mesmo — rotula em vez de parecer bug.
  const diaUnico = fluxo.length === 1 ? " (dia único)" : "";

  const panel = {
    lancamentos: [[String(allRows.length)], [formatMoney(totalEntradas)], [formatMoney(totalSaidas)], [formatPeriodText(allRows)]],
    receitas: [[String(incomes.length)], [formatMoney(totalEntradas)], [formatMoney(maxValue(incomes))], [orderedIncomes.length ? formatDate(orderedIncomes[orderedIncomes.length - 1].date) : "—"]],
    despesas: [[String(expenses.length)], [formatMoney(totalSaidas)], [formatMoney(maxValue(expenses))], [orderedExpenses.length ? formatDate(orderedExpenses[orderedExpenses.length - 1].date) : "—"]],
    dividas: [[String(debts.length)], [formatMoney(debtOpenTotal)], [String(quitadas)], [highestPriority(openDebts)]],
    metas: [[String(goals.length)], [formatMoney(goals.reduce((sum, item) => sum + item.targetValue, 0))], [formatMoney(goals.reduce((sum, item) => sum + item.currentValue, 0))], [bestMeta ? `${bestMeta.name} (${formatPercent(bestMeta.progress)})${bestMeta.reached ? " · meta batida" : ""}` : "—"]],
    fluxo: [[String(fluxo.length)], [fluxo.length ? formatMoney(maxColumn(fluxo, 3)) + diaUnico : "—"], [fluxo.length ? formatMoney(minColumn(fluxo, 3)) + diaUnico : "—"], [formatMoney(Number(fluxo[fluxo.length - 1]?.[4]) || 0)]],
    resumo: [[String(mesesComMovimento.length)], [bestMonth ? `${formatMonth(bestMonth[0])} (${formatMoney(Number(bestMonth[3]) || 0)})` : "—"], [worstMonth ? `${formatMonth(worstMonth[0])} (${formatMoney(Number(worstMonth[3]) || 0)})` : "—"], [economiaMedia]],
  };

  return {
    entradasMes,
    gastosMes,
    caixaMes,
    lancamentosMes,
    totalEntradas,
    totalSaidas,
    saldo,
    totalLancamentos: allRows.length,
    topCategoriasRows: buildTopCategoryRows(expenses),
    resumoDashboardRows,
    // Painel é sempre texto (moeda formatada, "—", nome de meta): passa pelo mesmo
    // apóstrofo das listas — "-R$ 800,33" e um nome de meta com "=" iriam pro parser.
    panel: Object.fromEntries(Object.entries(panel).map(([key, rows]) => [key, rows.map((row) => [texto(row[0])])])) as Record<keyof typeof panel, string[][]>,
  };
}

// Aberto em A1 sem linha final ("A2:I") limpa até o fim da coluna: com "A2:I1000"
// a linha 1001 (o 1000º lançamento) nunca era apagada e virava fantasma.
export function dataClearRange(key: DataTabKey) {
  return `${TAB[key]}!A2:${MAIN_RANGE_END[key]}`;
}

function buildClearRanges() {
  return [
    ...DATA_TABS.map(dataClearRange),
    `${TAB.dashboard}!A12:B21`,
    `${TAB.dashboard}!G12:J21`,
  ];
}

function buildValueRanges(input: {
  lancamentos: unknown[][];
  receitas: unknown[][];
  despesas: unknown[][];
  dividas: unknown[][];
  metas: unknown[][];
  fluxo: unknown[][];
  resumo: unknown[][];
  totals: ReturnType<typeof buildTotals>;
}): ValueRange[] {
  const { lancamentos, receitas, despesas, dividas, metas, fluxo, resumo, totals } = input;
  return [
    ...(lancamentos.length ? [{ range: `${TAB.lancamentos}!A2`, values: lancamentos }] : []),
    ...(receitas.length ? [{ range: `${TAB.receitas}!A2`, values: receitas }] : []),
    ...(despesas.length ? [{ range: `${TAB.despesas}!A2`, values: despesas }] : []),
    ...(dividas.length ? [{ range: `${TAB.dividas}!A2`, values: dividas }] : []),
    ...(metas.length ? [{ range: `${TAB.metas}!A2`, values: metas }] : []),
    ...(fluxo.length ? [{ range: `${TAB.fluxo}!A2`, values: fluxo }] : []),
    ...(resumo.length ? [{ range: `${TAB.resumo}!A2`, values: resumo }] : []),
    { range: `${TAB.dashboard}!A2`, values: [[`Atualizado em ${new Date().toLocaleString("pt-BR")}`]] },
    { range: `${TAB.dashboard}!A6`, values: [[totals.entradasMes]] },
    { range: `${TAB.dashboard}!D6`, values: [[totals.gastosMes]] },
    { range: `${TAB.dashboard}!G6`, values: [[totals.caixaMes]] },
    { range: `${TAB.dashboard}!J6`, values: [[totals.lancamentosMes]] },
    { range: `${TAB.dashboard}!A8`, values: [[totals.totalEntradas]] },
    { range: `${TAB.dashboard}!D8`, values: [[totals.totalSaidas]] },
    { range: `${TAB.dashboard}!G8`, values: [[totals.saldo]] },
    { range: `${TAB.dashboard}!J8`, values: [[totals.totalLancamentos]] },
    { range: `${TAB.dashboard}!A12:B21`, values: totals.topCategoriasRows },
    { range: `${TAB.dashboard}!G12:J21`, values: totals.resumoDashboardRows },
    { range: `${TAB.lancamentos}!K4:K7`, values: totals.panel.lancamentos },
    { range: `${TAB.receitas}!K4:K7`, values: totals.panel.receitas },
    { range: `${TAB.despesas}!K4:K7`, values: totals.panel.despesas },
    { range: `${TAB.dividas}!K4:K7`, values: totals.panel.dividas },
    { range: `${TAB.metas}!K4:K7`, values: totals.panel.metas },
    { range: `${TAB.fluxo}!K4:K7`, values: totals.panel.fluxo },
    { range: `${TAB.resumo}!K4:K7`, values: totals.panel.resumo },
  ];
}

function buildTopCategoryRows(expenses: SyncInput["expenses"]) {
  const byCategory = new Map<string, number>();
  expenses.forEach((expense) => byCategory.set(expense.category, roundMoney((byCategory.get(expense.category) || 0) + expense.value)));
  const rows = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([category, total]) => [texto(category), total]);
  // Sem categoria nenhuma, a grade fica em branco: escrever "Sem dados" numa
  // linha com barra colorida parece produto inacabado, não planilha vazia.
  return padRows(10, ["", ""], rows);
}

// Comparativo do Dashboard = os 10 últimos meses do CALENDÁRIO até o corrente,
// zerando os sem movimento. Eram "as 10 últimas linhas do Resumo": com um ano
// digitado errado ("2062-01") o comparativo mostrava 2061-04..2062-01 zerados e
// os meses reais sumiam.
function buildDashboardMonthRows(byMonth: Map<string, MonthTotals>, mesCorrente: string) {
  return Array.from({ length: 10 }, (_, i) => {
    const month = shiftMonth(mesCorrente, i - 9);
    const values = byMonth.get(month) ?? MES_VAZIO;
    return [`${month}-01`, values.income, values.expense, roundMoney(values.income - values.expense)];
  });
}

function pieChart(dashboard: number, rowIndex: number, columnIndex: number, widthPixels: number, heightPixels: number) {
  return {
    addChart: {
      chart: {
        spec: {
          title: "",
          fontName: FONT,
          backgroundColorStyle: { rgbColor: COLOR.white },
          pieChart: {
            legendPosition: "RIGHT_LEGEND",
            threeDimensional: false,
            domain: { sourceRange: { sources: [source(dashboard, 11, 21, 0, 1)] } },
            series: { sourceRange: { sources: [source(dashboard, 11, 21, 1, 2)] } },
          },
        },
        position: { overlayPosition: { anchorCell: { sheetId: dashboard, rowIndex, columnIndex }, widthPixels, heightPixels } },
      },
    },
  };
}

function monthlyChart(dashboard: number, rowIndex: number, columnIndex: number, widthPixels: number, heightPixels: number) {
  return basicChart(dashboard, dashboard, rowIndex, columnIndex, widthPixels, heightPixels, "COLUMN", "BOTTOM_LEGEND", source(dashboard, 10, 21, 6, 7), [
    { range: source(dashboard, 10, 21, 7, 8), color: COLOR.green },
    { range: source(dashboard, 10, 21, 8, 9), color: COLOR.red },
  ]);
}

function lineChart(dashboard: number, fluxo: number, rowIndex: number, columnIndex: number, widthPixels: number, heightPixels: number) {
  return basicChart(dashboard, fluxo, rowIndex, columnIndex, widthPixels, heightPixels, "LINE", "NO_LEGEND", source(fluxo, 0, MAX_DATA_ROWS + 1, 0, 1), [
    { range: source(fluxo, 0, MAX_DATA_ROWS + 1, 4, 5), color: COLOR.blue },
  ]);
}

function debtChart(dashboard: number, dividas: number, rowIndex: number, columnIndex: number, widthPixels: number, heightPixels: number) {
  return basicChart(dashboard, dividas, rowIndex, columnIndex, widthPixels, heightPixels, "BAR", "NO_LEGEND", source(dividas, 0, MAX_DATA_ROWS + 1, 0, 1), [
    { range: source(dividas, 0, MAX_DATA_ROWS + 1, 6, 7), color: COLOR.red },
  ]);
}

function basicChart(
  dashboard: number,
  dataSheet: number,
  rowIndex: number,
  columnIndex: number,
  widthPixels: number,
  heightPixels: number,
  chartType: string,
  legendPosition: string,
  domain: ReturnType<typeof source>,
  series: Array<{ range: ReturnType<typeof source>; color: { red: number; green: number; blue: number } }>,
) {
  return {
    addChart: {
      chart: {
        spec: {
          title: "",
          fontName: FONT,
          backgroundColorStyle: { rgbColor: COLOR.white },
          basicChart: {
            chartType,
            legendPosition,
            headerCount: 1,
            domains: [{ domain: { sourceRange: { sources: [domain] } } }],
            series: series.map((item) => ({
              series: { sourceRange: { sources: [item.range] } },
              targetAxis: chartType === "BAR" ? "BOTTOM_AXIS" : "LEFT_AXIS",
              colorStyle: { rgbColor: item.color },
            })),
          },
        },
        position: { overlayPosition: { anchorCell: { sheetId: dashboard, rowIndex, columnIndex }, widthPixels, heightPixels } },
      },
    },
  };
}

function range(startRowIndex: number, endRowIndex: number, startColumnIndex: number, endColumnIndex: number) {
  return { startRowIndex, endRowIndex, startColumnIndex, endColumnIndex };
}

function dataCol(col: number) {
  return range(1, MAX_DATA_ROWS + 1, col, col + 1);
}

function source(sheetId: number, startRowIndex: number, endRowIndex: number, startColumnIndex: number, endColumnIndex: number) {
  return { sheetId, startRowIndex, endRowIndex, startColumnIndex, endColumnIndex };
}

// Barra horizontal proporcional ao maior módulo da coluna. Sintaxe pt_BR (locale
// definido em createSpreadsheet): SE/MÁXIMO/MÍNIMO, ";" entre argumentos e "\"
// entre colunas do literal de matriz. Mês negativo entra em vermelho com a barra
// do valor absoluto — com "N(x)>0" o mês de −2.000 (o que mais importa) sumia.
// A escala é MÁXIMO(MÁXIMO;-MÍNIMO) porque MÁXIMO(ABS(intervalo)) exigiria ARRAYFORMULA.
function sparkBar(cell: string, maxRange: string, color = "#22C55E") {
  const escala = `MÁXIMO(MÁXIMO(${maxRange});-MÍNIMO(${maxRange}))`;
  return `=SE(N(${cell})=0;"";SPARKLINE(ABS(${cell});{"charttype"\\"bar";"max"\\${escala};"color1"\\SE(N(${cell})<0;"#EF4444";"${color}")}))`;
}

// Com USER_ENTERED a célula é lida como se digitada: "=almoço" vira fórmula
// (#NOME?), "- 50 do mercado" tenta virar número (#ERROR!), "@x" vira menção e o
// apóstrofo inicial some. Apóstrofo na frente é o jeito do Sheets de dizer "isto é
// texto" — e ele não aparece na célula. Números e datas não passam por aqui.
function texto(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /^[=+\-@'\t\r]/.test(s) ? `'${s}` : s;
}

// Selo do estorno na lista: o lançamento continua no histórico, mas quem lê a
// aba precisa ver por que ele não entra nos totais.
function descricaoComSelo(description: unknown, estornadoEm: unknown) {
  const base = description == null ? "" : String(description);
  return estornadoEm ? `${base} (ESTORNADO em ${formatDate(estornadoEm)})` : base;
}

// SyncInput carrega status como string (vem do wrapper server-side também);
// o contrato é o mesmo isOpenDebt de lib/types.ts.
function debtIsOpen(debt: { status: string }) {
  return isOpenDebt({ status: debt.status as DebtStatus });
}

function padRows(length: number, filler: unknown[], rows: unknown[][] = []) {
  const padded = [...rows];
  while (padded.length < length) padded.push([...filler]);
  return padded.slice(0, length);
}

function sortByDate<T extends { date: string }>(rows: T[]) {
  return [...rows].sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

// Abertas primeiro (prioridade, depois maior valor); quitadas por último — uma
// quitada de R$ 0 não pode aparecer entre abertas de R$ 5.000.
function sortDebts(debts: SyncInput["debts"]) {
  return [...debts].sort((a, b) =>
    Number(!debtIsOpen(a)) - Number(!debtIsOpen(b)) || priorityOrder(a, b) || b.totalValue - a.totalValue,
  );
}

function maxValue(rows: Array<{ value: number }>) {
  return rows.length ? Math.max(...rows.map((item) => item.value)) : 0;
}

function maxColumn(rows: unknown[][], column: number) {
  return rows.length ? Math.max(...rows.map((row) => Number(row[column]) || 0)) : 0;
}

function minColumn(rows: unknown[][], column: number) {
  return rows.length ? Math.min(...rows.map((row) => Number(row[column]) || 0)) : 0;
}

function formatDate(date: unknown): string {
  if (!date) return "";
  const raw = String(date).split("T")[0];
  const [year, month, day] = raw.split("-");
  if (!year || !month || !day) return raw;
  return `${day}/${month}/${year}`;
}

function formatMonth(date: unknown): string {
  const raw = String(date).slice(0, 10);
  const [year, month] = raw.split("-");
  if (!year || !month) return String(date);
  return `${month}/${year}`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value || 0);
}

function formatPeriodText(rows: Row[]) {
  if (!rows.length) return "—";
  return `${formatDate(rows[0].date)} até ${formatDate(rows[rows.length - 1].date)}`;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// Recebe só as dívidas EM ABERTO: com tudo quitado dizia "Prioridade mais crítica: Alta".
function highestPriority(openDebts: SyncInput["debts"]) {
  if (!openDebts.length) return "—";
  const priority = sortDebts(openDebts)[0].priority;
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function priorityOrder(a: { priority: string }, b: { priority: string }) {
  const weight = (priority: string) => (priority === "alta" ? 0 : priority === "média" ? 1 : 2);
  return weight(a.priority) - weight(b.priority);
}
