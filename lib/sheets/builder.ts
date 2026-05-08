/**
 * Construtor isomórfico da planilha — gera requests/values puros
 * (JSON), sem chamar nenhuma API. Usado tanto no servidor (googleapis)
 * quanto no cliente (fetch direto na REST API com token OAuth do usuário).
 *
 * Esta versão prioriza uma experiência de planilha mais completa:
 *  • Dashboard com cards, tabelas-resumo e gráficos
 *  • Abas com painel lateral de leitura rápida
 *  • Estrutura visual consistente com o app
 *  • Áreas principais bloqueadas para preservar fidelidade do layout
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
  hideColumns,
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
  receitas: ["Data", "Descrição", "Categoria", "Valor", "Escopo", "Origem"],
  despesas: ["Data", "Descrição", "Categoria", "Valor", "Pagamento", "Natureza", "Escopo"],
  dividas: ["Nome", "Vencimento", "Prioridade", "Status", "Parcela", "Valor total", "Em aberto"],
  metas: ["Meta", "Tipo", "Valor alvo", "Valor atual", "Faltando", "Progresso"],
  fluxo: ["Data", "Entradas", "Saídas", "Resultado do dia", "Saldo acumulado"],
  resumo: ["Mês", "Entradas", "Saídas", "Resultado", "Saldo acumulado", "Economia", "Lançamentos"],
};

export const MAX_DATA_ROWS = 1000;

const MAIN_RANGE_END: Record<Exclude<keyof typeof TAB, "dashboard" | "ajuda">, string> = {
  lancamentos: "I",
  receitas: "F",
  despesas: "G",
  dividas: "G",
  metas: "F",
  fluxo: "E",
  resumo: "G",
};

const PANEL_META: Record<Exclude<keyof typeof TAB, "dashboard" | "ajuda">, {
  title: string;
  hint: string;
  labels: [string, string, string, string];
  notes: [string, string, string, string];
}> = {
  lancamentos: {
    title: "Leitura rápida",
    hint: "Visão consolidada dos lançamentos que alimentam todas as outras abas.",
    labels: ["Total lançado", "Entradas", "Saídas", "Período"],
    notes: [
      "Esta aba é a linha do tempo geral do app.",
      "Use o filtro por categoria, tipo e escopo para investigar vazamentos.",
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
      "Use pagamento e natureza para separar o que é essencial do que pesa sem retorno.",
      "A categoria ajuda a enxergar onde o dinheiro está indo.",
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
      "Quitadas continuam registradas para manter o histórico.",
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
      "Quanto mais próximo de 100%, mais verde a célula fica.",
    ],
  },
  fluxo: {
    title: "Pulso do caixa",
    hint: "Mostra o comportamento diário do resultado e do saldo acumulado.",
    labels: ["Dias com movimento", "Melhor dia", "Pior dia", "Saldo final"],
    notes: [
      "O fluxo evidencia quando o caixa respirou e quando apertou.",
      "Resultado do dia é entrada menos saída naquela data.",
      "Saldo acumulado ajuda a enxergar tendência e não só evento isolado.",
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

  for (const key of ["lancamentos", "receitas", "despesas", "dividas", "metas", "fluxo", "resumo"] as const) {
    buildDataSheetLayout(requests, key, ids[TAB[key]]);
  }

  buildHelpLayout(requests, ids[TAB.ajuda]);
  applyNumberFormats(requests, ids);
  applyConditionals(requests, ids);

  return requests;
}

function buildDashboardLayout(requests: unknown[], sheetId: number) {
  requests.push(hideGridlines(sheetId));

  // Layout mais compacto para reduzir "respiro" excessivo entre blocos.
  const widths = [132, 96, 96, 132, 96, 96, 132, 96, 96, 132, 96, 96];
  widths.forEach((width, index) => requests.push(setColumnWidth(sheetId, index, index + 1, width)));

  requests.push(setRowHeight(sheetId, 0, 1, 52));
  requests.push(setRowHeight(sheetId, 1, 2, 24));
  requests.push(mergeCells(sheetId, 0, 1, 0, 12));
  requests.push(mergeCells(sheetId, 1, 2, 0, 12));
  requests.push(repeatCell(sheetId, { startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 12 }, STYLE.banner));
  requests.push(repeatCell(sheetId, { startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 12 }, STYLE.bannerSub));

  requests.push(setRowHeight(sheetId, 4, 5, 20));
  requests.push(setRowHeight(sheetId, 5, 6, 50));
  for (const startCol of [0, 3, 6, 9]) {
    requests.push(mergeCells(sheetId, 4, 5, startCol, startCol + 3));
    requests.push(mergeCells(sheetId, 5, 6, startCol, startCol + 3));
    requests.push(repeatCell(sheetId, { startRowIndex: 4, endRowIndex: 5, startColumnIndex: startCol, endColumnIndex: startCol + 3 }, STYLE.kpiLabel));
  }
  requests.push(repeatCell(sheetId, { startRowIndex: 5, endRowIndex: 6, startColumnIndex: 0, endColumnIndex: 3 }, STYLE.kpiValue));
  requests.push(repeatCell(sheetId, { startRowIndex: 5, endRowIndex: 6, startColumnIndex: 3, endColumnIndex: 6 }, STYLE.kpiValue));
  requests.push(repeatCell(sheetId, { startRowIndex: 5, endRowIndex: 6, startColumnIndex: 6, endColumnIndex: 9 }, STYLE.kpiValueGold));
  requests.push(repeatCell(sheetId, { startRowIndex: 5, endRowIndex: 6, startColumnIndex: 9, endColumnIndex: 12 }, STYLE.kpiValueCount));

  requests.push(mergeCells(sheetId, 8, 9, 0, 5));
  requests.push(mergeCells(sheetId, 9, 10, 0, 5));
  requests.push(mergeCells(sheetId, 8, 9, 6, 12));
  requests.push(mergeCells(sheetId, 9, 10, 6, 12));
  requests.push(repeatCell(sheetId, { startRowIndex: 8, endRowIndex: 9, startColumnIndex: 0, endColumnIndex: 5 }, STYLE.sectionTitle));
  requests.push(repeatCell(sheetId, { startRowIndex: 9, endRowIndex: 10, startColumnIndex: 0, endColumnIndex: 5 }, STYLE.sectionHint));
  requests.push(repeatCell(sheetId, { startRowIndex: 8, endRowIndex: 9, startColumnIndex: 6, endColumnIndex: 12 }, STYLE.sectionTitle));
  requests.push(repeatCell(sheetId, { startRowIndex: 9, endRowIndex: 10, startColumnIndex: 6, endColumnIndex: 12 }, STYLE.sectionHint));
  requests.push(repeatCell(sheetId, { startRowIndex: 10, endRowIndex: 11, startColumnIndex: 0, endColumnIndex: 2 }, STYLE.tableHeader));
  requests.push(repeatCell(sheetId, { startRowIndex: 10, endRowIndex: 11, startColumnIndex: 6, endColumnIndex: 10 }, STYLE.tableHeader));
  requests.push(repeatCell(sheetId, { startRowIndex: 10, endRowIndex: 21, startColumnIndex: 0, endColumnIndex: 2 }, STYLE.dataCellBorder, "userEnteredFormat.borders"));
  requests.push(repeatCell(sheetId, { startRowIndex: 10, endRowIndex: 21, startColumnIndex: 6, endColumnIndex: 10 }, STYLE.dataCellBorder, "userEnteredFormat.borders"));
  requests.push(addBanding(sheetId, 10, 21, 0, 2));
  requests.push(addBanding(sheetId, 10, 21, 6, 10));

  requests.push(mergeCells(sheetId, 32, 33, 0, 12));
  requests.push(mergeCells(sheetId, 33, 34, 0, 12));
  requests.push(repeatCell(sheetId, { startRowIndex: 32, endRowIndex: 33, startColumnIndex: 0, endColumnIndex: 12 }, STYLE.sectionTitle));
  requests.push(repeatCell(sheetId, { startRowIndex: 33, endRowIndex: 34, startColumnIndex: 0, endColumnIndex: 12 }, STYLE.sectionHint));

  requests.push(protectSheet(sheetId, "Dashboard — gerado pelo app"));
}

function buildDataSheetLayout(
  requests: unknown[],
  key: Exclude<keyof typeof TAB, "dashboard" | "ajuda">,
  sheetId: number,
) {
  const headers = HEADERS[key] ?? [];
  const mainCols = headers.length;

  requests.push(setRowHeight(sheetId, 0, 1, 38));
  requests.push(repeatCell(sheetId, { startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: mainCols }, STYLE.tableHeader));
  requests.push(freezeRows(sheetId, 1));
  requests.push(addBanding(sheetId, 0, MAX_DATA_ROWS + 1, 0, mainCols));
  requests.push(repeatCell(
    sheetId,
    { startRowIndex: 0, endRowIndex: MAX_DATA_ROWS + 1, startColumnIndex: 0, endColumnIndex: mainCols },
    STYLE.dataCellBorder,
    "userEnteredFormat.borders",
  ));

  const widths = getColumnWidths(key);
  widths.forEach((width, index) => requests.push(setColumnWidth(sheetId, index, index + 1, width)));
  // Ocultar colunas "de gap" entre o fim da tabela de dados (mainCols) e o
  // início do painel lateral (col J = índice 9). Sem isso, abas com poucas
  // colunas (Fluxo, Receitas, Metas) mostram colunas vazias inúteis.
  if (mainCols < 9) {
    requests.push(hideColumns(sheetId, mainCols, 9));
  }
  // Painel lateral compacto para sobrar menos "vazio" horizontal.
  requests.push(setColumnWidth(sheetId, 9, 10, 124));
  requests.push(setColumnWidth(sheetId, 10, 12, 146));

  requests.push(mergeCells(sheetId, 0, 1, 9, 12));
  requests.push(mergeCells(sheetId, 1, 2, 9, 12));
  requests.push(repeatCell(sheetId, { startRowIndex: 0, endRowIndex: 1, startColumnIndex: 9, endColumnIndex: 12 }, STYLE.subHeader));
  requests.push(repeatCell(sheetId, { startRowIndex: 1, endRowIndex: 2, startColumnIndex: 9, endColumnIndex: 12 }, STYLE.sectionHint));

  requests.push(repeatCell(sheetId, { startRowIndex: 3, endRowIndex: 7, startColumnIndex: 9, endColumnIndex: 10 }, STYLE.noteLabel));
  for (let row = 3; row < 7; row++) {
    requests.push(mergeCells(sheetId, row, row + 1, 10, 12));
  }
  requests.push(repeatCell(sheetId, { startRowIndex: 3, endRowIndex: 7, startColumnIndex: 10, endColumnIndex: 12 }, STYLE.noteBody));

  requests.push(mergeCells(sheetId, 9, 10, 9, 12));
  requests.push(repeatCell(sheetId, { startRowIndex: 9, endRowIndex: 10, startColumnIndex: 9, endColumnIndex: 12 }, STYLE.subHeader));
  for (let row = 10; row < 14; row++) {
    requests.push(mergeCells(sheetId, row, row + 1, 9, 12));
  }
  requests.push(repeatCell(sheetId, { startRowIndex: 10, endRowIndex: 14, startColumnIndex: 9, endColumnIndex: 12 }, STYLE.noteBody));

  requests.push({
    setBasicFilter: {
      filter: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: MAX_DATA_ROWS + 1,
          startColumnIndex: 0,
          endColumnIndex: mainCols,
        },
      },
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
  // Aba de ajuda usa apenas A:B; oculta qualquer sobra de colunas.
  requests.push(hideColumns(sheetId, 2, 12));
  requests.push(setRowHeight(sheetId, 0, 1, 80));
  requests.push(mergeCells(sheetId, 0, 1, 0, 2));
  requests.push(repeatCell(sheetId, { startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 2 }, STYLE.helpHero));
  for (let i = 0; i < 5; i++) {
    const row = 2 + i * 2;
    requests.push(setRowHeight(sheetId, row, row + 1, 28));
    requests.push(setRowHeight(sheetId, row + 1, row + 2, 62));
    requests.push(mergeCells(sheetId, row, row + 2, 0, 1));
    requests.push(repeatCell(sheetId, { startRowIndex: row, endRowIndex: row + 2, startColumnIndex: 0, endColumnIndex: 1 }, STYLE.helpStepNum));
    requests.push(repeatCell(sheetId, { startRowIndex: row, endRowIndex: row + 1, startColumnIndex: 1, endColumnIndex: 2 }, STYLE.helpStepTitle));
    requests.push(repeatCell(sheetId, { startRowIndex: row + 1, endRowIndex: row + 2, startColumnIndex: 1, endColumnIndex: 2 }, STYLE.helpStepBody));
  }
  requests.push(protectSheet(sheetId, "Como usar — gerada pelo app"));
}

function getColumnWidths(key: Exclude<keyof typeof TAB, "dashboard" | "ajuda">): number[] {
  switch (key) {
    case "lancamentos":
      return [96, 88, 198, 132, 108, 108, 108, 98, 92];
    case "receitas":
      return [96, 198, 132, 108, 98, 92];
    case "despesas":
      return [96, 198, 132, 108, 108, 108, 98];
    case "dividas":
      return [194, 98, 98, 98, 98, 108, 108];
    case "metas":
      return [194, 108, 108, 108, 108, 98];
    case "fluxo":
      return [96, 108, 108, 116, 116];
    case "resumo":
      return [96, 108, 108, 116, 116, 92, 98];
  }
}

function applyNumberFormats(requests: unknown[], ids: Record<string, number>) {
  // Valor monetário em colunas de dados: centralizado, bold, cor navy do tema —
  // o valor é o "herói" da linha e precisa se destacar.
  const moneyCol = (sheetId: number, col: number) =>
    repeatCell(
      sheetId,
      { startRowIndex: 1, endRowIndex: MAX_DATA_ROWS + 1, startColumnIndex: col, endColumnIndex: col + 1 },
      {
        numberFormat: { type: "CURRENCY", pattern: FORMAT.brlPlain },
        horizontalAlignment: "CENTER",
        verticalAlignment: "MIDDLE",
        textFormat: { fontFamily: "Inter", fontSize: 11, bold: true, foregroundColor: COLOR.navy },
      },
      "userEnteredFormat(numberFormat,horizontalAlignment,verticalAlignment,textFormat)",
    );
  const dateCol = (sheetId: number, col: number) =>
    repeatCell(
      sheetId,
      { startRowIndex: 1, endRowIndex: MAX_DATA_ROWS + 1, startColumnIndex: col, endColumnIndex: col + 1 },
      {
        numberFormat: { type: "DATE", pattern: FORMAT.date },
        horizontalAlignment: "CENTER",
        verticalAlignment: "MIDDLE",
        textFormat: { fontFamily: "Inter", fontSize: 10, foregroundColor: COLOR.text },
      },
      "userEnteredFormat(numberFormat,horizontalAlignment,verticalAlignment,textFormat)",
    );
  const monthCol = (sheetId: number, col: number) =>
    repeatCell(
      sheetId,
      { startRowIndex: 1, endRowIndex: MAX_DATA_ROWS + 1, startColumnIndex: col, endColumnIndex: col + 1 },
      {
        numberFormat: { type: "DATE", pattern: FORMAT.monthYear },
        horizontalAlignment: "CENTER",
        verticalAlignment: "MIDDLE",
        textFormat: { fontFamily: "Inter", fontSize: 10, bold: true, foregroundColor: COLOR.navy },
      },
      "userEnteredFormat(numberFormat,horizontalAlignment,verticalAlignment,textFormat)",
    );
  const pctCol = (sheetId: number, col: number) =>
    repeatCell(
      sheetId,
      { startRowIndex: 1, endRowIndex: MAX_DATA_ROWS + 1, startColumnIndex: col, endColumnIndex: col + 1 },
      {
        numberFormat: { type: "PERCENT", pattern: FORMAT.percent },
        horizontalAlignment: "CENTER",
        verticalAlignment: "MIDDLE",
        textFormat: { fontFamily: "Inter", fontSize: 11, bold: true, foregroundColor: COLOR.navy },
      },
      "userEnteredFormat(numberFormat,horizontalAlignment,verticalAlignment,textFormat)",
    );

  requests.push(moneyCol(ids[TAB.dashboard], 0));
  requests.push(moneyCol(ids[TAB.dashboard], 3));
  requests.push(moneyCol(ids[TAB.dashboard], 6));
  requests.push(moneyCol(ids[TAB.dashboard], 1));
  requests.push(moneyCol(ids[TAB.dashboard], 7));
  requests.push(moneyCol(ids[TAB.dashboard], 8));
  requests.push(moneyCol(ids[TAB.dashboard], 9));

  requests.push(dateCol(ids[TAB.lancamentos], 0));
  requests.push(moneyCol(ids[TAB.lancamentos], 4));
  requests.push(dateCol(ids[TAB.receitas], 0));
  requests.push(moneyCol(ids[TAB.receitas], 3));
  requests.push(dateCol(ids[TAB.despesas], 0));
  requests.push(moneyCol(ids[TAB.despesas], 3));
  requests.push(dateCol(ids[TAB.dividas], 1));
  requests.push(moneyCol(ids[TAB.dividas], 4));
  requests.push(moneyCol(ids[TAB.dividas], 5));
  requests.push(moneyCol(ids[TAB.dividas], 6));
  requests.push(moneyCol(ids[TAB.metas], 2));
  requests.push(moneyCol(ids[TAB.metas], 3));
  requests.push(moneyCol(ids[TAB.metas], 4));
  requests.push(pctCol(ids[TAB.metas], 5));
  requests.push(dateCol(ids[TAB.fluxo], 0));
  requests.push(moneyCol(ids[TAB.fluxo], 1));
  requests.push(moneyCol(ids[TAB.fluxo], 2));
  requests.push(moneyCol(ids[TAB.fluxo], 3));
  requests.push(moneyCol(ids[TAB.fluxo], 4));
  requests.push(monthCol(ids[TAB.resumo], 0));
  requests.push(moneyCol(ids[TAB.resumo], 1));
  requests.push(moneyCol(ids[TAB.resumo], 2));
  requests.push(moneyCol(ids[TAB.resumo], 3));
  requests.push(moneyCol(ids[TAB.resumo], 4));
  requests.push(pctCol(ids[TAB.resumo], 5));
}

function applyConditionals(requests: unknown[], ids: Record<string, number>) {
  requests.push(...condFormatPositiveNegative(ids[TAB.dashboard], 5, 6, 6, 7));
  requests.push(...condFormatPositiveNegative(ids[TAB.fluxo], 1, MAX_DATA_ROWS + 1, 3, 5));
  requests.push(...condFormatPositiveNegative(ids[TAB.resumo], 1, MAX_DATA_ROWS + 1, 3, 5));
  requests.push(condFormatGradient(ids[TAB.metas], 1, MAX_DATA_ROWS + 1, 5, 6));
  const dividasSheet = ids[TAB.dividas];
  requests.push(condFormatTextEquals(dividasSheet, 1, MAX_DATA_ROWS + 1, 3, 4, "aberta", COLOR.redSoft, COLOR.red, 0));
  requests.push(condFormatTextEquals(dividasSheet, 1, MAX_DATA_ROWS + 1, 3, 4, "negociando", COLOR.goldSoft, { red: 0.55, green: 0.40, blue: 0.05 }, 1));
  requests.push(condFormatTextEquals(dividasSheet, 1, MAX_DATA_ROWS + 1, 3, 4, "quitada", COLOR.greenSoft, { red: 0.07, green: 0.45, blue: 0.20 }, 2));
}

export function buildStaticValues() {
  const data: Array<{ range: string; values: unknown[][] }> = [];

  for (const key of Object.keys(HEADERS) as Array<keyof typeof HEADERS>) {
    data.push({ range: `${TAB[key as keyof typeof TAB]}!A1`, values: [HEADERS[key] ?? []] });
  }

  data.push({
    range: `${TAB.dashboard}!A1`,
    values: [
      ["CÓDIGO DA VIRADA • MARCA OFICIAL — BASE FINANCEIRA ESTRUTURADA"],
      ["Código da Virada: dashboard oficial da marca. Sincronize pelo app para preencher dados reais com fidelidade visual."],
    ],
  });
  data.push({
    range: `${TAB.dashboard}!A5`,
    values: [[
      "ENTRADAS DO PERÍODO", "", "",
      "SAÍDAS DO PERÍODO", "", "",
      "SALDO ATUAL", "", "",
      "LANÇAMENTOS", "", "",
    ]],
  });
  data.push({
    range: `${TAB.dashboard}!A6`,
    values: [[0, "", "", 0, "", "", 0, "", "", 0, "", ""]],
  });
  data.push({
    range: `${TAB.dashboard}!A9`,
    values: [
      ["Top categorias de gasto"],
      ["As dez categorias com maior saída financeira no período sincronizado."],
    ],
  });
  data.push({
    range: `${TAB.dashboard}!G9`,
    values: [
      ["Comparativo mensal"],
      ["Leitura mensal de entradas, saídas e resultado para enxergar tendência."],
    ],
  });
  data.push({ range: `${TAB.dashboard}!A11`, values: [["Categoria", "Total"]] });
  data.push({ range: `${TAB.dashboard}!G11`, values: [["Mês", "Entradas", "Saídas", "Resultado"]] });
  data.push({ range: `${TAB.dashboard}!A12:B21`, values: padRows(10, ["Sem dados", 0]) });
  data.push({ range: `${TAB.dashboard}!G12:J21`, values: padRows(10, ["Sem mês", 0, 0, 0]) });
  data.push({
    range: `${TAB.dashboard}!A33`,
    values: [
      ["Dívidas em aberto e pressão de caixa"],
      ["Gráfico de barras para visualizar rapidamente onde está o maior peso financeiro."],
    ],
  });

  for (const key of ["lancamentos", "receitas", "despesas", "dividas", "metas", "fluxo", "resumo"] as const) {
    const panel = PANEL_META[key];
    data.push({ range: `${TAB[key]}!J1`, values: [[`${panel.title} • Código da Virada`]] });
    data.push({ range: `${TAB[key]}!J2`, values: [[panel.hint]] });
    data.push({ range: `${TAB[key]}!J4:J7`, values: panel.labels.map((label) => [label]) });
    data.push({
      range: `${TAB[key]}!K4:K7`,
      values: [["Aguardando sync"], ["Aguardando sync"], ["Aguardando sync"], ["Aguardando sync"]],
    });
    data.push({ range: `${TAB[key]}!J10`, values: [["Como ler esta aba"]] });
    data.push({ range: `${TAB[key]}!J11:J14`, values: panel.notes.map((line) => [line]) });
  }

  data.push({ range: `${TAB.ajuda}!A1`, values: [["CÓDIGO DA VIRADA • COMO USAR ESTA PLANILHA", ""]] });
  const steps: Array<[string, string]> = [
    ["Sincronize pelo app sempre que lançar algo", "A planilha foi desenhada para ser reflexo fiel do aplicativo. Edite no app e sincronize para manter tudo consistente."],
    ["Comece pelo Dashboard", "Ele concentra entradas, saídas, saldo, lançamentos, categorias de gasto e uma leitura mensal do desempenho."],
    ["Use as abas especializadas para investigar", "Receitas, Despesas, Dívidas, Metas, Fluxo de Caixa e Resumo Mensal ajudam a responder perguntas específicas sem poluir a visão geral."],
    ["Não quebre a estrutura manualmente", "As áreas principais estão bloqueadas para manter fórmulas, hierarquia visual e leitura profissional. Se quiser alterar dados, faça isso pelo app."],
    ["Se a planilha antiga estiver feia ou incompleta, recrie", "Basta desconectar a planilha atual no app e sincronizar de novo para gerar uma versão nova com o layout atualizado."],
  ];
  steps.forEach(([title, body], index) => {
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
    {
      addChart: {
        chart: {
          spec: {
            title: "",
            fontName: "Inter",
            backgroundColorStyle: { rgbColor: COLOR.white },
            pieChart: {
              legendPosition: "RIGHT_LEGEND",
              threeDimensional: false,
              domain: { sourceRange: { sources: [{ sheetId: dashboard, startRowIndex: 11, endRowIndex: 21, startColumnIndex: 0, endColumnIndex: 1 }] } },
              series: { sourceRange: { sources: [{ sheetId: dashboard, startRowIndex: 11, endRowIndex: 21, startColumnIndex: 1, endColumnIndex: 2 }] } },
            },
          },
          position: { overlayPosition: { anchorCell: { sheetId: dashboard, rowIndex: 22, columnIndex: 0 }, widthPixels: 520, heightPixels: 220 } },
        },
      },
    },
    {
      addChart: {
        chart: {
          spec: {
            title: "",
            fontName: "Inter",
            backgroundColorStyle: { rgbColor: COLOR.white },
            basicChart: {
              chartType: "COLUMN",
              legendPosition: "BOTTOM_LEGEND",
              headerCount: 1,
              domains: [{ domain: { sourceRange: { sources: [{ sheetId: dashboard, startRowIndex: 10, endRowIndex: 21, startColumnIndex: 6, endColumnIndex: 7 }] } } }],
              series: [
                { series: { sourceRange: { sources: [{ sheetId: dashboard, startRowIndex: 10, endRowIndex: 21, startColumnIndex: 7, endColumnIndex: 8 }] } }, targetAxis: "LEFT_AXIS", colorStyle: { rgbColor: COLOR.green } },
                { series: { sourceRange: { sources: [{ sheetId: dashboard, startRowIndex: 10, endRowIndex: 21, startColumnIndex: 8, endColumnIndex: 9 }] } }, targetAxis: "LEFT_AXIS", colorStyle: { rgbColor: COLOR.red } },
              ],
            },
          },
          position: { overlayPosition: { anchorCell: { sheetId: dashboard, rowIndex: 22, columnIndex: 6 }, widthPixels: 520, heightPixels: 220 } },
        },
      },
    },
    {
      addChart: {
        chart: {
          spec: {
            title: "",
            fontName: "Inter",
            backgroundColorStyle: { rgbColor: COLOR.white },
            basicChart: {
              chartType: "LINE",
              legendPosition: "NO_LEGEND",
              headerCount: 1,
              domains: [{ domain: { sourceRange: { sources: [{ sheetId: fluxo, startRowIndex: 0, endRowIndex: MAX_DATA_ROWS + 1, startColumnIndex: 0, endColumnIndex: 1 }] } } }],
              series: [
                { series: { sourceRange: { sources: [{ sheetId: fluxo, startRowIndex: 0, endRowIndex: MAX_DATA_ROWS + 1, startColumnIndex: 4, endColumnIndex: 5 }] } }, targetAxis: "LEFT_AXIS", colorStyle: { rgbColor: COLOR.gold } },
              ],
            },
          },
          position: { overlayPosition: { anchorCell: { sheetId: dashboard, rowIndex: 35, columnIndex: 0 }, widthPixels: 520, heightPixels: 220 } },
        },
      },
    },
    {
      addChart: {
        chart: {
          spec: {
            title: "",
            fontName: "Inter",
            backgroundColorStyle: { rgbColor: COLOR.white },
            basicChart: {
              chartType: "BAR",
              legendPosition: "NO_LEGEND",
              headerCount: 1,
              domains: [{ domain: { sourceRange: { sources: [{ sheetId: dividas, startRowIndex: 0, endRowIndex: MAX_DATA_ROWS + 1, startColumnIndex: 0, endColumnIndex: 1 }] } } }],
              series: [
                { series: { sourceRange: { sources: [{ sheetId: dividas, startRowIndex: 0, endRowIndex: MAX_DATA_ROWS + 1, startColumnIndex: 6, endColumnIndex: 7 }] } }, targetAxis: "BOTTOM_AXIS", colorStyle: { rgbColor: COLOR.red } },
              ],
            },
          },
          position: { overlayPosition: { anchorCell: { sheetId: dashboard, rowIndex: 35, columnIndex: 6 }, widthPixels: 520, heightPixels: 220 } },
        },
      },
    },
  ];
}

export interface SyncInput {
  expenses: Array<{ id: string; description: string; value: number; category: string; date: string; paymentMethod?: string; nature?: string; scope?: string; source?: string }>;
  incomes: Array<{ id: string; description: string; value: number; category: string; date: string; scope?: string; source?: string }>;
  debts: Array<{ id: string; name: string; totalValue: number; installmentValue: number; dueDate: string; priority: string; status: string }>;
  goals: Array<{ id: string; name: string; targetValue: number; currentValue: number; type: string }>;
}

export function buildSyncBatch(input: SyncInput) {
  const { expenses, incomes, debts, goals } = input;

  const allRows: Row[] = [
    ...incomes.map((income) => ({ id: income.id, type: "income", description: income.description, amount: income.value, category: income.category, date: income.date, scope: income.scope ?? null, source: income.source ?? "app" })),
    ...expenses.map((expense) => ({ id: expense.id, type: "expense", description: expense.description, amount: expense.value, category: expense.category, date: expense.date, paymentMethod: expense.paymentMethod ?? null, nature: expense.nature ?? null, scope: expense.scope ?? null, source: expense.source ?? "app" })),
  ];

  const lancamentos = [...allRows]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map((row) => [
      formatDate(row.date),
      row.type === "income" ? "Entrada" : "Saída",
      row.description,
      row.category,
      Number(row.amount) || 0,
      row.paymentMethod ?? "",
      row.nature ?? "",
      row.scope ?? "",
      row.source ?? "",
    ]);

  const receitas = [...incomes]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map((row) => [formatDate(row.date), row.description, row.category, row.value, row.scope ?? "", row.source ?? "app"]);

  const despesas = [...expenses]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map((row) => [formatDate(row.date), row.description, row.category, row.value, row.paymentMethod ?? "", row.nature ?? "", row.scope ?? ""]);

  const dividas = [...debts]
    .sort(priorityOrder)
    .map((debt) => [debt.name, formatDate(debt.dueDate), debt.priority, debt.status, debt.installmentValue, debt.totalValue, debt.status === "quitada" ? 0 : debt.totalValue]);

  const dividasSheetRows = dividas.length
    ? dividas
    : [["Sem dívidas em aberto", "", "baixa", "quitada", 0, 0, 0]];

  const metas = goals.map((goal) => {
    const faltando = Math.max(goal.targetValue - goal.currentValue, 0);
    const progresso = goal.targetValue > 0 ? goal.currentValue / goal.targetValue : 0;
    return [goal.name, goal.type, goal.targetValue, goal.currentValue, faltando, progresso];
  });

  const byDate = new Map<string, { income: number; expense: number }>();
  for (const row of allRows) {
    const date = String(row.date).split("T")[0];
    const prev = byDate.get(date) ?? { income: 0, expense: 0 };
    if (row.type === "income") prev.income += Number(row.amount) || 0;
    else prev.expense += Number(row.amount) || 0;
    byDate.set(date, prev);
  }

  let saldoAcumulado = 0;
  const fluxo = [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, values]) => {
    const resultado = values.income - values.expense;
    saldoAcumulado += resultado;
    return [formatDate(date), values.income, values.expense, resultado, saldoAcumulado];
  });

  const fluxoSheetRows = fluxo.length
    ? fluxo
    : [[formatDate(new Date().toISOString().slice(0, 10)), 0, 0, 0, 0]];

  const byMonth = new Map<string, { income: number; expense: number; count: number }>();
  for (const row of allRows) {
    const month = String(row.date).slice(0, 7);
    const prev = byMonth.get(month) ?? { income: 0, expense: 0, count: 0 };
    const value = Number(row.amount) || 0;
    if (row.type === "income") prev.income += value;
    else prev.expense += value;
    prev.count += 1;
    byMonth.set(month, prev);
  }

  let saldoMensalAcumulado = 0;
  const resumo = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([month, values]) => {
    const resultado = values.income - values.expense;
    saldoMensalAcumulado += resultado;
    return [`${month}-01`, values.income, values.expense, resultado, saldoMensalAcumulado, values.income > 0 ? resultado / values.income : 0, values.count];
  });

  const totalEntradas = incomes.reduce((sum, item) => sum + item.value, 0);
  const totalSaidas = expenses.reduce((sum, item) => sum + item.value, 0);
  const saldo = totalEntradas - totalSaidas;
  const totalLancamentos = allRows.length;

  const topCategoriasMap = new Map<string, number>();
  for (const expense of expenses) {
    topCategoriasMap.set(expense.category, (topCategoriasMap.get(expense.category) || 0) + expense.value);
  }
  const topCategorias = [...topCategoriasMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topCategoriasRows = topCategorias.length
    ? padRows(10, ["", ""], topCategorias.map(([categoria, total]) => [categoria, total]))
    : [["Sem dados", 0], ...padRows(9, ["", ""])];

  const resumoDashboardRows = resumo.length
    ? padRows(10, ["", "", "", ""], resumo.slice(-10).map((row) => [formatMonth(row[0]), row[1], row[2], row[3]]))
    : [["Sem mês", 0, 0, 0], ...padRows(9, ["", "", "", ""])];

  const orderedIncomes = [...incomes].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const orderedExpenses = [...expenses].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const lastIncome = orderedIncomes.length ? orderedIncomes[orderedIncomes.length - 1] : null;
  const lastExpense = orderedExpenses.length ? orderedExpenses[orderedExpenses.length - 1] : null;
  const bestIncome = incomes.length ? Math.max(...incomes.map((item) => item.value)) : 0;
  const bestExpense = expenses.length ? Math.max(...expenses.map((item) => item.value)) : 0;
  const debtOpenTotal = debts.reduce((sum, item) => sum + (item.status === "quitada" ? 0 : item.totalValue), 0);
  const quitadas = debts.filter((item) => item.status === "quitada").length;
  const bestMeta = goals
    .map((goal) => ({ name: goal.name, progress: goal.targetValue > 0 ? goal.currentValue / goal.targetValue : 0 }))
    .sort((a, b) => b.progress - a.progress)[0];
  const bestDay = fluxo.length ? Math.max(...fluxo.map((row) => Number(row[3]) || 0)) : 0;
  const worstDay = fluxo.length ? Math.min(...fluxo.map((row) => Number(row[3]) || 0)) : 0;
  const finalBalance = fluxo.length ? Number(fluxo[fluxo.length - 1][4]) || 0 : 0;
  const avgSavings = resumo.length ? resumo.reduce((sum, row) => sum + (Number(row[5]) || 0), 0) / resumo.length : 0;
  const bestMonth = resumo.length ? resumo.reduce((best, row) => (Number(row[3]) > Number(best[3]) ? row : best), resumo[0]) : null;
  const worstMonth = resumo.length ? resumo.reduce((best, row) => (Number(row[3]) < Number(best[3]) ? row : best), resumo[0]) : null;

  return {
    clearRanges: [
      `${TAB.lancamentos}!A2:${MAIN_RANGE_END.lancamentos}${MAX_DATA_ROWS}`,
      `${TAB.receitas}!A2:${MAIN_RANGE_END.receitas}${MAX_DATA_ROWS}`,
      `${TAB.despesas}!A2:${MAIN_RANGE_END.despesas}${MAX_DATA_ROWS}`,
      `${TAB.dividas}!A2:${MAIN_RANGE_END.dividas}${MAX_DATA_ROWS}`,
      `${TAB.metas}!A2:${MAIN_RANGE_END.metas}${MAX_DATA_ROWS}`,
      `${TAB.fluxo}!A2:${MAIN_RANGE_END.fluxo}${MAX_DATA_ROWS}`,
      `${TAB.resumo}!A2:${MAIN_RANGE_END.resumo}${MAX_DATA_ROWS}`,
      `${TAB.dashboard}!A12:B21`,
      `${TAB.dashboard}!G12:J21`,
    ],
    valueRanges: [
      ...(lancamentos.length ? [{ range: `${TAB.lancamentos}!A2`, values: lancamentos }] : []),
      ...(receitas.length ? [{ range: `${TAB.receitas}!A2`, values: receitas }] : []),
      ...(despesas.length ? [{ range: `${TAB.despesas}!A2`, values: despesas }] : []),
      { range: `${TAB.dividas}!A2`, values: dividasSheetRows },
      ...(metas.length ? [{ range: `${TAB.metas}!A2`, values: metas }] : []),
      { range: `${TAB.fluxo}!A2`, values: fluxoSheetRows },
      ...(resumo.length ? [{ range: `${TAB.resumo}!A2`, values: resumo }] : []),
      { range: `${TAB.dashboard}!A2`, values: [[`Atualizado em ${new Date().toLocaleString("pt-BR")}`]] },
      { range: `${TAB.dashboard}!A6`, values: [[totalEntradas]] },
      { range: `${TAB.dashboard}!D6`, values: [[totalSaidas]] },
      { range: `${TAB.dashboard}!G6`, values: [[saldo]] },
      { range: `${TAB.dashboard}!J6`, values: [[totalLancamentos]] },
      { range: `${TAB.dashboard}!A12:B21`, values: topCategoriasRows },
      { range: `${TAB.dashboard}!G12:J21`, values: resumoDashboardRows },
      { range: `${TAB.lancamentos}!K4:K7`, values: [[String(totalLancamentos)], [formatMoney(totalEntradas)], [formatMoney(totalSaidas)], [formatPeriodText(allRows)]] },
      { range: `${TAB.receitas}!K4:K7`, values: [[String(incomes.length)], [formatMoney(totalEntradas)], [formatMoney(bestIncome)], [lastIncome ? formatDate(lastIncome.date) : "Sem entradas"]] },
      { range: `${TAB.despesas}!K4:K7`, values: [[String(expenses.length)], [formatMoney(totalSaidas)], [formatMoney(bestExpense)], [lastExpense ? formatDate(lastExpense.date) : "Sem saídas"]] },
      { range: `${TAB.dividas}!K4:K7`, values: [[String(debts.length)], [formatMoney(debtOpenTotal)], [String(quitadas)], [highestPriority(debts)]] },
      { range: `${TAB.metas}!K4:K7`, values: [[String(goals.length)], [formatMoney(goals.reduce((sum, item) => sum + item.targetValue, 0))], [formatMoney(goals.reduce((sum, item) => sum + item.currentValue, 0))], [bestMeta ? `${bestMeta.name} (${formatPercent(bestMeta.progress)})` : "Sem metas"]] },
      { range: `${TAB.fluxo}!K4:K7`, values: [[String(fluxo.length)], [formatMoney(bestDay)], [formatMoney(worstDay)], [formatMoney(finalBalance)]] },
      { range: `${TAB.resumo}!K4:K7`, values: [[String(resumo.length)], [bestMonth ? `${formatMonth(bestMonth[0])} (${formatMoney(Number(bestMonth[3]) || 0)})` : "Sem meses"], [worstMonth ? `${formatMonth(worstMonth[0])} (${formatMoney(Number(worstMonth[3]) || 0)})` : "Sem meses"], [formatPercent(avgSavings)]] },
    ],
  };
}

function padRows(length: number, filler: unknown[], rows: unknown[][] = []) {
  const padded = [...rows];
  while (padded.length < length) padded.push([...filler]);
  return padded.slice(0, length);
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
  if (!rows.length) return "Sem dados";
  const ordered = [...rows].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return `${formatDate(ordered[0].date)} até ${formatDate(ordered[ordered.length - 1].date)}`;
}

function highestPriority(debts: SyncInput["debts"]) {
  if (!debts.length) return "Sem dívidas";
  const priority = [...debts].sort(priorityOrder)[0]?.priority ?? "Sem prioridade";
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function priorityOrder(a: { priority: string }, b: { priority: string }) {
  const weight = (priority: string) => (priority === "alta" ? 0 : priority === "média" ? 1 : 2);
  return weight(a.priority) - weight(b.priority);
}
