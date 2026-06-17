/**
 * Paleta e estilos da planilha — PALETA C "Verde suave & Creme".
 * Dinheiro clássico e calmo: verde #5F9E6E sobre creme, valores em alto
 * contraste (grafite escuro / verde / vermelho terroso) para SALTAREM.
 * Cores em RGB float (0-1) como exigido pela Google Sheets API.
 */

type RGB = { red: number; green: number; blue: number };
export const COLOR: Record<string, RGB> = {
  // Fundos claros (creme) — base calma, deixa os valores em evidência.
  cream:      { red: 0.965, green: 0.945, blue: 0.898 }, // #F6F1E5 — fundo principal
  creamCard:  { red: 1.000, green: 1.000, blue: 1.000 }, // #FFFFFF — card de destaque (valor salta)
  creamAlt:   { red: 0.937, green: 0.910, blue: 0.839 }, // #EFE8D6 — zebra / painel
  line:       { red: 0.871, green: 0.835, blue: 0.749 }, // #DED5BF — bordas suaves

  // Verdes — acento "dinheiro" calmo.
  green:      { red: 0.373, green: 0.620, blue: 0.431 }, // #5F9E6E — verde suave (positivo/acento)
  greenDeep:  { red: 0.180, green: 0.325, blue: 0.224 }, // #2E5339 — verde escuro (banner/headers)
  greenSoft:  { red: 0.867, green: 0.922, blue: 0.882 }, // #DDEBE1 — chip positivo

  // Texto/valores — verde-grafite escuro: máximo contraste no creme.
  ink:        { red: 0.118, green: 0.165, blue: 0.125 }, // #1E2A20
  inkMuted:   { red: 0.416, green: 0.431, blue: 0.388 }, // #6A6E63
  text:       { red: 0.118, green: 0.165, blue: 0.125 }, // = ink (compat builder)
  textMuted:  { red: 0.416, green: 0.431, blue: 0.388 }, // = inkMuted

  // Semânticos.
  red:        { red: 0.690, green: 0.278, blue: 0.227 }, // #B0473A — negativo (vermelho terroso, calmo)
  redSoft:    { red: 0.945, green: 0.851, blue: 0.827 }, // #F1D9D3
  gold:       { red: 0.725, green: 0.545, blue: 0.180 }, // #B98B2E — bronze sóbrio (acento mínimo)
  goldSoft:   { red: 0.937, green: 0.890, blue: 0.780 }, // #EFE3C7
  white:      { red: 1, green: 1, blue: 1 },
};

export const FONT = "Inter";

export const FORMAT = {
  brl:       '"R$ "#,##0.00;[Color3]"-R$ "#,##0.00',
  brlPlain:  '"R$ "#,##0.00',
  date:      "dd/mm/yyyy",
  monthYear: "mmm/yyyy",
  intCount:  "#,##0",
  percent:   "0.0%",
} as const;

type CellFormat = Record<string, unknown>;

const border = (rgb = COLOR.line) => ({
  style: "SOLID",
  color: rgb,
});

export const STYLE: Record<string, CellFormat> = {
  banner: {
    backgroundColor: COLOR.greenDeep,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 10, right: 16, bottom: 10, left: 16 },
    textFormat: { fontFamily: FONT, fontSize: 22, bold: true, foregroundColor: COLOR.cream },
    borders: { bottom: border(COLOR.gold) },
  },
  bannerSub: {
    backgroundColor: COLOR.greenDeep,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 2, right: 16, bottom: 10, left: 16 },
    textFormat: { fontFamily: FONT, fontSize: 11, foregroundColor: { red: 0.82, green: 0.88, blue: 0.84 } },
  },
  topStripe: {
    backgroundColor: COLOR.green,
    horizontalAlignment: "LEFT",
  },
  tableHeader: {
    backgroundColor: COLOR.greenDeep,
    horizontalAlignment: "CENTER",
    verticalAlignment: "MIDDLE",
    padding: { top: 6, right: 8, bottom: 6, left: 8 },
    textFormat: { fontFamily: FONT, fontSize: 10, bold: true, foregroundColor: COLOR.cream },
    borders: { bottom: border(COLOR.green) },
    wrapStrategy: "WRAP",
  },
  subHeader: {
    backgroundColor: COLOR.green,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 8, right: 12, bottom: 8, left: 12 },
    textFormat: { fontFamily: FONT, fontSize: 11, bold: true, foregroundColor: COLOR.white },
  },
  sectionTitle: {
    backgroundColor: COLOR.cream,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 8, right: 12, bottom: 4, left: 12 },
    textFormat: { fontFamily: FONT, fontSize: 13, bold: true, foregroundColor: COLOR.greenDeep },
  },
  sectionHint: {
    backgroundColor: COLOR.cream,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 0, right: 12, bottom: 8, left: 12 },
    textFormat: { fontFamily: FONT, fontSize: 9, italic: true, foregroundColor: COLOR.inkMuted },
    wrapStrategy: "WRAP",
  },
  sectionCard: {
    backgroundColor: COLOR.creamCard,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 8, right: 12, bottom: 8, left: 12 },
    textFormat: { fontFamily: FONT, fontSize: 10, foregroundColor: COLOR.ink },
    borders: {
      top: border(COLOR.line),
      bottom: border(COLOR.line),
      left: border(COLOR.line),
      right: border(COLOR.line),
    },
  },
  // KPI: label discreto + VALOR grande escuro sobre card BRANCO = salta.
  kpiLabel: {
    backgroundColor: COLOR.creamCard,
    horizontalAlignment: "CENTER",
    verticalAlignment: "MIDDLE",
    padding: { top: 10, right: 12, bottom: 4, left: 12 },
    textFormat: { fontFamily: FONT, fontSize: 12, bold: true, foregroundColor: COLOR.green },
    borders: { top: border(COLOR.green) },
    wrapStrategy: "CLIP",
  },
  kpiValue: {
    backgroundColor: COLOR.creamCard,
    horizontalAlignment: "CENTER",
    verticalAlignment: "MIDDLE",
    padding: { top: 4, right: 12, bottom: 12, left: 12 },
    textFormat: { fontFamily: FONT, fontSize: 24, bold: true, foregroundColor: COLOR.ink },
    numberFormat: { type: "CURRENCY", pattern: FORMAT.brlPlain },
    borders: { bottom: border(COLOR.line) },
  },
  kpiValueGold: {
    backgroundColor: COLOR.creamCard,
    horizontalAlignment: "CENTER",
    verticalAlignment: "MIDDLE",
    padding: { top: 4, right: 12, bottom: 12, left: 12 },
    textFormat: { fontFamily: FONT, fontSize: 24, bold: true, foregroundColor: COLOR.green },
    numberFormat: { type: "CURRENCY", pattern: FORMAT.brlPlain },
    borders: { bottom: border(COLOR.green) },
  },
  kpiValueCount: {
    backgroundColor: COLOR.creamCard,
    horizontalAlignment: "CENTER",
    verticalAlignment: "MIDDLE",
    padding: { top: 4, right: 12, bottom: 12, left: 12 },
    textFormat: { fontFamily: FONT, fontSize: 24, bold: true, foregroundColor: COLOR.ink },
    numberFormat: { type: "NUMBER", pattern: FORMAT.intCount },
    borders: { bottom: border(COLOR.line) },
  },
  rowEven: {
    backgroundColor: COLOR.creamCard,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 5, right: 8, bottom: 5, left: 8 },
    textFormat: { fontFamily: FONT, fontSize: 10, foregroundColor: COLOR.ink },
  },
  rowOdd: {
    backgroundColor: COLOR.cream,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 5, right: 8, bottom: 5, left: 8 },
    textFormat: { fontFamily: FONT, fontSize: 10, foregroundColor: COLOR.ink },
  },
  dataCellBorder: {
    borders: {
      top: border(COLOR.line),
      bottom: border(COLOR.line),
      left: border(COLOR.line),
      right: border(COLOR.line),
    },
  },
  // Totais: faixa verde com número branco — fecha a tabela com destaque.
  totalRow: {
    backgroundColor: COLOR.green,
    horizontalAlignment: "RIGHT",
    padding: { top: 6, right: 8, bottom: 6, left: 8 },
    textFormat: { fontFamily: FONT, fontSize: 11, bold: true, foregroundColor: COLOR.white },
    numberFormat: { type: "CURRENCY", pattern: FORMAT.brlPlain },
  },
  totalLabel: {
    backgroundColor: COLOR.green,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 7, right: 10, bottom: 7, left: 10 },
    textFormat: { fontFamily: FONT, fontSize: 11, bold: true, foregroundColor: COLOR.white },
  },
  totalMoney: {
    backgroundColor: COLOR.greenSoft,
    horizontalAlignment: "RIGHT",
    verticalAlignment: "MIDDLE",
    padding: { top: 7, right: 10, bottom: 7, left: 10 },
    textFormat: { fontFamily: FONT, fontSize: 11, bold: true, foregroundColor: COLOR.greenDeep },
    numberFormat: { type: "CURRENCY", pattern: FORMAT.brlPlain },
  },
  totalCount: {
    backgroundColor: COLOR.greenSoft,
    horizontalAlignment: "RIGHT",
    verticalAlignment: "MIDDLE",
    padding: { top: 7, right: 10, bottom: 7, left: 10 },
    textFormat: { fontFamily: FONT, fontSize: 11, bold: true, foregroundColor: COLOR.greenDeep },
    numberFormat: { type: "NUMBER", pattern: FORMAT.intCount },
  },
  emptyState: {
    backgroundColor: COLOR.cream,
    horizontalAlignment: "CENTER",
    verticalAlignment: "MIDDLE",
    padding: { top: 10, right: 12, bottom: 10, left: 12 },
    textFormat: { fontFamily: FONT, fontSize: 10, italic: true, foregroundColor: COLOR.inkMuted },
    wrapStrategy: "WRAP",
  },
  noteLabel: {
    backgroundColor: COLOR.creamAlt,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 8, right: 12, bottom: 8, left: 12 },
    textFormat: { fontFamily: FONT, fontSize: 10, bold: true, foregroundColor: COLOR.greenDeep },
  },
  noteBody: {
    backgroundColor: COLOR.creamAlt,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 8, right: 12, bottom: 8, left: 12 },
    textFormat: { fontFamily: FONT, fontSize: 10, foregroundColor: COLOR.ink },
    wrapStrategy: "WRAP",
  },
  helpHero: {
    backgroundColor: COLOR.greenDeep,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 14, right: 18, bottom: 14, left: 18 },
    textFormat: { fontFamily: FONT, fontSize: 18, bold: true, foregroundColor: COLOR.cream },
    wrapStrategy: "WRAP",
  },
  helpStepNum: {
    backgroundColor: COLOR.green,
    horizontalAlignment: "CENTER",
    verticalAlignment: "MIDDLE",
    textFormat: { fontFamily: FONT, fontSize: 14, bold: true, foregroundColor: COLOR.white },
  },
  helpStepTitle: {
    backgroundColor: COLOR.creamCard,
    horizontalAlignment: "LEFT",
    padding: { top: 8, right: 14, bottom: 0, left: 14 },
    textFormat: { fontFamily: FONT, fontSize: 12, bold: true, foregroundColor: COLOR.greenDeep },
  },
  helpStepBody: {
    backgroundColor: COLOR.creamCard,
    horizontalAlignment: "LEFT",
    padding: { top: 0, right: 14, bottom: 10, left: 14 },
    textFormat: { fontFamily: FONT, fontSize: 10, foregroundColor: COLOR.ink },
    wrapStrategy: "WRAP",
  },
};

/* Helper p/ montar request "repeatCell" */
export function repeatCell(
  sheetId: number,
  range: { startRowIndex: number; endRowIndex: number; startColumnIndex: number; endColumnIndex: number },
  format: CellFormat,
  fields = "userEnteredFormat",
) {
  return {
    repeatCell: {
      range: { sheetId, ...range },
      cell: { userEnteredFormat: format },
      fields,
    },
  };
}

export function mergeCells(
  sheetId: number,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
) {
  return {
    mergeCells: {
      range: { sheetId, startRowIndex: startRow, endRowIndex: endRow, startColumnIndex: startCol, endColumnIndex: endCol },
      mergeType: "MERGE_ALL",
    },
  };
}

export function setColumnWidth(sheetId: number, startCol: number, endCol: number, pixels: number) {
  return {
    updateDimensionProperties: {
      range: { sheetId, dimension: "COLUMNS", startIndex: startCol, endIndex: endCol },
      properties: { pixelSize: pixels },
      fields: "pixelSize",
    },
  };
}

export function hideColumns(sheetId: number, startCol: number, endCol: number) {
  return {
    updateDimensionProperties: {
      range: { sheetId, dimension: "COLUMNS", startIndex: startCol, endIndex: endCol },
      properties: { hiddenByUser: true },
      fields: "hiddenByUser",
    },
  };
}

export function setRowHeight(sheetId: number, startRow: number, endRow: number, pixels: number) {
  return {
    updateDimensionProperties: {
      range: { sheetId, dimension: "ROWS", startIndex: startRow, endIndex: endRow },
      properties: { pixelSize: pixels },
      fields: "pixelSize",
    },
  };
}

export function freezeRows(sheetId: number, rows: number) {
  return {
    updateSheetProperties: {
      properties: { sheetId, gridProperties: { frozenRowCount: rows } },
      fields: "gridProperties.frozenRowCount",
    },
  };
}

export function hideGridlines(sheetId: number) {
  return {
    updateSheetProperties: {
      properties: { sheetId, gridProperties: { hideGridlines: true } },
      fields: "gridProperties.hideGridlines",
    },
  };
}

/** Protege a aba inteira mas deixa o range editável (para abas de dados) */
export function protectSheetExcept(
  sheetId: number,
  unprotected: Array<{ startRow: number; endRow: number; startCol: number; endCol: number }>,
  description: string,
) {
  return {
    addProtectedRange: {
      protectedRange: {
        range: { sheetId },
        description,
        warningOnly: false,
        requestingUserCanEdit: true,
        unprotectedRanges: unprotected.map((r) => ({
          sheetId,
          startRowIndex: r.startRow,
          endRowIndex: r.endRow,
          startColumnIndex: r.startCol,
          endColumnIndex: r.endCol,
        })),
      },
    },
  };
}

/** Protege a aba inteira (read-only para o cliente) */
export function protectSheet(sheetId: number, description: string) {
  return {
    addProtectedRange: {
      protectedRange: {
        range: { sheetId },
        description,
        warningOnly: false,
        requestingUserCanEdit: true,
      },
    },
  };
}

/** Formatação condicional: saldo negativo vermelho, positivo verde */
export function condFormatPositiveNegative(
  sheetId: number,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
) {
  return [
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId, startRowIndex: startRow, endRowIndex: endRow, startColumnIndex: startCol, endColumnIndex: endCol }],
          booleanRule: {
            condition: { type: "NUMBER_LESS", values: [{ userEnteredValue: "0" }] },
            format: { textFormat: { foregroundColor: COLOR.red, bold: true } },
          },
        },
        index: 0,
      },
    },
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId, startRowIndex: startRow, endRowIndex: endRow, startColumnIndex: startCol, endColumnIndex: endCol }],
          booleanRule: {
            condition: { type: "NUMBER_GREATER", values: [{ userEnteredValue: "0" }] },
            format: { textFormat: { foregroundColor: COLOR.green, bold: true } },
          },
        },
        index: 1,
      },
    },
  ];
}

/** Gradiente em coluna de progresso (% metas) */
export function condFormatGradient(
  sheetId: number,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
) {
  return {
    addConditionalFormatRule: {
      rule: {
        ranges: [{ sheetId, startRowIndex: startRow, endRowIndex: endRow, startColumnIndex: startCol, endColumnIndex: endCol }],
        gradientRule: {
          minpoint: { color: COLOR.redSoft, type: "MIN" },
          midpoint: { color: COLOR.goldSoft, type: "PERCENT", value: "50" },
          maxpoint: { color: COLOR.greenSoft, type: "MAX" },
        },
      },
      index: 0,
    },
  };
}

/** Realça status de dívida (texto) */
export function condFormatTextEquals(
  sheetId: number,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
  value: string,
  bg: { red: number; green: number; blue: number },
  fg: { red: number; green: number; blue: number },
  index: number,
) {
  return {
    addConditionalFormatRule: {
      rule: {
        ranges: [{ sheetId, startRowIndex: startRow, endRowIndex: endRow, startColumnIndex: startCol, endColumnIndex: endCol }],
        booleanRule: {
          condition: { type: "TEXT_EQ", values: [{ userEnteredValue: value }] },
          format: { backgroundColor: bg, textFormat: { foregroundColor: fg, bold: true } },
        },
      },
      index,
    },
  };
}

/** Banding (linhas zebra) automático — creme alternado, header verde escuro */
export function addBanding(
  sheetId: number,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
) {
  return {
    addBanding: {
      bandedRange: {
        range: { sheetId, startRowIndex: startRow, endRowIndex: endRow, startColumnIndex: startCol, endColumnIndex: endCol },
        rowProperties: {
          headerColor: COLOR.greenDeep,
          headerColorStyle: { rgbColor: COLOR.greenDeep },
          firstBandColor: COLOR.creamCard,
          firstBandColorStyle: { rgbColor: COLOR.creamCard },
          secondBandColor: COLOR.cream,
          secondBandColorStyle: { rgbColor: COLOR.cream },
        },
      },
    },
  };
}
