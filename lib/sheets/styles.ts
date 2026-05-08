/**
 * Paleta e estilos da planilha — espelha o app (navy + dourado + verde).
 * Cores em RGB float (0-1) como exigido pela Google Sheets API.
 */

type RGB = { red: number; green: number; blue: number };
export const COLOR: Record<string, RGB> = {
  navy:       { red: 0.027, green: 0.067, blue: 0.122 }, // #07111F
  navySoft:   { red: 0.043, green: 0.063, blue: 0.125 }, // #0B1020
  navyMed:    { red: 0.059, green: 0.118, blue: 0.200 },
  navyCard:   { red: 0.094, green: 0.157, blue: 0.267 },
  navyLine:   { red: 0.180, green: 0.220, blue: 0.310 },
  gold:       { red: 0.961, green: 0.773, blue: 0.259 }, // #F5C542
  goldSoft:   { red: 1.000, green: 0.953, blue: 0.835 },
  goldLine:   { red: 0.800, green: 0.627, blue: 0.157 },
  green:      { red: 0.133, green: 0.773, blue: 0.369 }, // #22C55E
  greenSoft:  { red: 0.878, green: 0.965, blue: 0.910 },
  red:        { red: 0.937, green: 0.267, blue: 0.267 },
  redSoft:    { red: 0.996, green: 0.898, blue: 0.898 },
  white:      { red: 1, green: 1, blue: 1 },
  offWhite:   { red: 0.973, green: 0.976, blue: 0.984 },
  gray100:    { red: 0.949, green: 0.953, blue: 0.965 },
  gray200:    { red: 0.882, green: 0.898, blue: 0.922 },
  gray400:    { red: 0.580, green: 0.627, blue: 0.690 },
  gray500:    { red: 0.420, green: 0.475, blue: 0.541 },
  text:       { red: 0.118, green: 0.161, blue: 0.231 },
  textMuted:  { red: 0.420, green: 0.475, blue: 0.541 },
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

const border = (rgb = COLOR.gray200) => ({
  style: "SOLID",
  color: rgb,
});

export const STYLE: Record<string, CellFormat> = {
  banner: {
    backgroundColor: COLOR.navy,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 8, right: 16, bottom: 8, left: 16 },
    textFormat: { fontFamily: FONT, fontSize: 22, bold: true, foregroundColor: COLOR.gold },
    borders: { bottom: border(COLOR.goldLine) },
  },
  bannerSub: {
    backgroundColor: COLOR.navy,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 0, right: 16, bottom: 8, left: 16 },
    textFormat: { fontFamily: FONT, fontSize: 11, foregroundColor: COLOR.gray200 },
  },
  topStripe: {
    backgroundColor: COLOR.gold,
    horizontalAlignment: "LEFT",
  },
  tableHeader: {
    backgroundColor: COLOR.navy,
    horizontalAlignment: "CENTER",
    verticalAlignment: "MIDDLE",
    padding: { top: 6, right: 8, bottom: 6, left: 8 },
    textFormat: { fontFamily: FONT, fontSize: 10, bold: true, foregroundColor: COLOR.white },
    borders: { top: border(COLOR.goldLine), bottom: border(COLOR.gold) },
    wrapStrategy: "WRAP",
  },
  subHeader: {
    backgroundColor: COLOR.navyMed,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 8, right: 12, bottom: 8, left: 12 },
    textFormat: { fontFamily: FONT, fontSize: 11, bold: true, foregroundColor: COLOR.gold },
  },
  sectionTitle: {
    backgroundColor: COLOR.white,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 8, right: 12, bottom: 4, left: 12 },
    textFormat: { fontFamily: FONT, fontSize: 13, bold: true, foregroundColor: COLOR.navy },
  },
  sectionHint: {
    backgroundColor: COLOR.white,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 0, right: 12, bottom: 8, left: 12 },
    textFormat: { fontFamily: FONT, fontSize: 9, italic: true, foregroundColor: COLOR.textMuted },
    wrapStrategy: "WRAP",
  },
  sectionCard: {
    backgroundColor: COLOR.offWhite,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 8, right: 12, bottom: 8, left: 12 },
    textFormat: { fontFamily: FONT, fontSize: 10, foregroundColor: COLOR.text },
    borders: {
      top: border(COLOR.gray200),
      bottom: border(COLOR.gray200),
      left: border(COLOR.gray200),
      right: border(COLOR.gray200),
    },
  },
  kpiLabel: {
    backgroundColor: COLOR.navyMed,
    horizontalAlignment: "CENTER",
    verticalAlignment: "TOP",
    padding: { top: 10, right: 12, bottom: 0, left: 12 },
    textFormat: { fontFamily: FONT, fontSize: 10, bold: true, foregroundColor: COLOR.gold },
    wrapStrategy: "CLIP",
  },
  kpiValue: {
    backgroundColor: COLOR.navyMed,
    horizontalAlignment: "CENTER",
    verticalAlignment: "MIDDLE",
    padding: { top: 0, right: 12, bottom: 10, left: 12 },
    textFormat: { fontFamily: FONT, fontSize: 23, bold: true, foregroundColor: COLOR.white },
    numberFormat: { type: "CURRENCY", pattern: FORMAT.brlPlain },
  },
  kpiValueGold: {
    backgroundColor: COLOR.navyMed,
    horizontalAlignment: "CENTER",
    verticalAlignment: "MIDDLE",
    padding: { top: 0, right: 12, bottom: 10, left: 12 },
    textFormat: { fontFamily: FONT, fontSize: 23, bold: true, foregroundColor: COLOR.gold },
    numberFormat: { type: "CURRENCY", pattern: FORMAT.brlPlain },
  },
  kpiValueCount: {
    backgroundColor: COLOR.navyMed,
    horizontalAlignment: "CENTER",
    verticalAlignment: "MIDDLE",
    padding: { top: 0, right: 12, bottom: 10, left: 12 },
    textFormat: { fontFamily: FONT, fontSize: 23, bold: true, foregroundColor: COLOR.white },
    numberFormat: { type: "NUMBER", pattern: FORMAT.intCount },
  },
  rowEven: {
    backgroundColor: COLOR.white,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 5, right: 8, bottom: 5, left: 8 },
    textFormat: { fontFamily: FONT, fontSize: 10, foregroundColor: COLOR.text },
  },
  rowOdd: {
    backgroundColor: COLOR.gray100,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 5, right: 8, bottom: 5, left: 8 },
    textFormat: { fontFamily: FONT, fontSize: 10, foregroundColor: COLOR.text },
  },
  dataCellBorder: {
    borders: {
      top: border(COLOR.gray200),
      bottom: border(COLOR.gray200),
      left: border(COLOR.gray200),
      right: border(COLOR.gray200),
    },
  },
  totalRow: {
    backgroundColor: COLOR.gold,
    horizontalAlignment: "RIGHT",
    padding: { top: 6, right: 8, bottom: 6, left: 8 },
    textFormat: { fontFamily: FONT, fontSize: 11, bold: true, foregroundColor: COLOR.navy },
    numberFormat: { type: "CURRENCY", pattern: FORMAT.brlPlain },
  },
  totalLabel: {
    backgroundColor: COLOR.gold,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 7, right: 10, bottom: 7, left: 10 },
    textFormat: { fontFamily: FONT, fontSize: 11, bold: true, foregroundColor: COLOR.navy },
  },
  totalMoney: {
    backgroundColor: COLOR.goldSoft,
    horizontalAlignment: "RIGHT",
    verticalAlignment: "MIDDLE",
    padding: { top: 7, right: 10, bottom: 7, left: 10 },
    textFormat: { fontFamily: FONT, fontSize: 11, bold: true, foregroundColor: COLOR.navy },
    numberFormat: { type: "CURRENCY", pattern: FORMAT.brlPlain },
  },
  totalCount: {
    backgroundColor: COLOR.goldSoft,
    horizontalAlignment: "RIGHT",
    verticalAlignment: "MIDDLE",
    padding: { top: 7, right: 10, bottom: 7, left: 10 },
    textFormat: { fontFamily: FONT, fontSize: 11, bold: true, foregroundColor: COLOR.navy },
    numberFormat: { type: "NUMBER", pattern: FORMAT.intCount },
  },
  emptyState: {
    backgroundColor: COLOR.offWhite,
    horizontalAlignment: "CENTER",
    verticalAlignment: "MIDDLE",
    padding: { top: 10, right: 12, bottom: 10, left: 12 },
    textFormat: { fontFamily: FONT, fontSize: 10, italic: true, foregroundColor: COLOR.gray500 },
    wrapStrategy: "WRAP",
  },
  noteLabel: {
    backgroundColor: COLOR.navyCard,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 8, right: 12, bottom: 8, left: 12 },
    textFormat: { fontFamily: FONT, fontSize: 10, bold: true, foregroundColor: COLOR.gold },
  },
  noteBody: {
    backgroundColor: COLOR.navyCard,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 8, right: 12, bottom: 8, left: 12 },
    textFormat: { fontFamily: FONT, fontSize: 10, foregroundColor: COLOR.white },
    wrapStrategy: "WRAP",
  },
  helpHero: {
    backgroundColor: COLOR.navy,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 14, right: 18, bottom: 14, left: 18 },
    textFormat: { fontFamily: FONT, fontSize: 18, bold: true, foregroundColor: COLOR.gold },
    wrapStrategy: "WRAP",
  },
  helpStepNum: {
    backgroundColor: COLOR.gold,
    horizontalAlignment: "CENTER",
    verticalAlignment: "MIDDLE",
    textFormat: { fontFamily: FONT, fontSize: 14, bold: true, foregroundColor: COLOR.navy },
  },
  helpStepTitle: {
    backgroundColor: COLOR.white,
    horizontalAlignment: "LEFT",
    padding: { top: 8, right: 14, bottom: 0, left: 14 },
    textFormat: { fontFamily: FONT, fontSize: 12, bold: true, foregroundColor: COLOR.navy },
  },
  helpStepBody: {
    backgroundColor: COLOR.white,
    horizontalAlignment: "LEFT",
    padding: { top: 0, right: 14, bottom: 10, left: 14 },
    textFormat: { fontFamily: FONT, fontSize: 10, foregroundColor: COLOR.text },
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

/** Banding (linhas zebra) automático */
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
          headerColor: COLOR.navy,
          headerColorStyle: { rgbColor: COLOR.navy },
          firstBandColor: COLOR.white,
          firstBandColorStyle: { rgbColor: COLOR.white },
          secondBandColor: COLOR.gray100,
          secondBandColorStyle: { rgbColor: COLOR.gray100 },
        },
      },
    },
  };
}
