/**
 * Paleta e estilos da planilha.
 * Cores em RGB float (0-1), formato exigido pela Google Sheets API.
 */

type RGB = { red: number; green: number; blue: number };
type CellFormat = Record<string, unknown>;

const rgb = (red: number, green: number, blue: number): RGB => ({
  red: red / 255,
  green: green / 255,
  blue: blue / 255,
});

export const COLOR: Record<string, RGB> = {
  navy: rgb(20, 44, 67),
  navySoft: rgb(232, 240, 248),
  navyMed: rgb(229, 242, 255),
  navyCard: rgb(242, 247, 252),
  navyLine: rgb(170, 194, 218),

  brand: rgb(0, 153, 102),
  brandDeep: rgb(0, 115, 78),
  brandSoft: rgb(224, 250, 241),
  brandLine: rgb(134, 223, 190),

  sky: rgb(0, 135, 190),
  skySoft: rgb(225, 246, 255),
  violet: rgb(111, 86, 213),
  violetSoft: rgb(239, 235, 255),

  gold: rgb(250, 184, 31),
  goldSoft: rgb(255, 246, 214),
  goldLine: rgb(231, 164, 0),

  green: rgb(34, 197, 94),
  greenSoft: rgb(220, 252, 231),
  red: rgb(239, 68, 68),
  redSoft: rgb(254, 226, 226),
  orange: rgb(249, 115, 22),
  orangeSoft: rgb(255, 237, 213),

  white: rgb(255, 255, 255),
  offWhite: rgb(250, 252, 249),
  paper: rgb(246, 250, 245),
  gray50: rgb(249, 250, 251),
  gray100: rgb(243, 246, 242),
  gray200: rgb(224, 232, 221),
  gray300: rgb(203, 213, 199),
  gray400: rgb(148, 163, 143),
  gray500: rgb(100, 116, 96),
  text: rgb(28, 41, 36),
  textMuted: rgb(88, 105, 94),
};

export const FONT = "Inter";

export const FORMAT = {
  brl: '"R$ "#,##0.00;[Color3]"-R$ "#,##0.00',
  brlPlain: '"R$ "#,##0.00',
  date: "dd/mm/yyyy",
  monthYear: "mmm/yyyy",
  intCount: "#,##0",
  percent: "0.0%",
} as const;

const border = (color = COLOR.gray200, style = "SOLID") => ({ style, color });
const allBorders = (color = COLOR.gray200) => ({
  top: border(color),
  bottom: border(color),
  left: border(color),
  right: border(color),
});

const text = (
  fontSize: number,
  foregroundColor = COLOR.text,
  bold = false,
  extra: Record<string, unknown> = {},
) => ({ fontFamily: FONT, fontSize, foregroundColor, bold, ...extra });

export const STYLE: Record<string, CellFormat> = {
  banner: {
    backgroundColor: COLOR.brand,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 8, right: 16, bottom: 8, left: 16 },
    textFormat: text(22, COLOR.white, true),
    borders: { bottom: border(COLOR.goldLine, "SOLID_THICK") },
  },
  bannerSub: {
    backgroundColor: COLOR.brandSoft,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 0, right: 16, bottom: 8, left: 16 },
    textFormat: text(11, COLOR.textMuted),
    borders: { bottom: border(COLOR.brandLine) },
  },
  topStripe: {
    backgroundColor: COLOR.gold,
    horizontalAlignment: "LEFT",
  },
  tableHeader: {
    backgroundColor: COLOR.brandDeep,
    horizontalAlignment: "CENTER",
    verticalAlignment: "MIDDLE",
    padding: { top: 7, right: 8, bottom: 7, left: 8 },
    textFormat: text(10, COLOR.white, true),
    borders: { top: border(COLOR.goldLine), bottom: border(COLOR.goldLine, "SOLID_THICK") },
    wrapStrategy: "WRAP",
  },
  subHeader: {
    backgroundColor: COLOR.sky,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 8, right: 12, bottom: 8, left: 12 },
    textFormat: text(11, COLOR.white, true),
  },
  sectionTitle: {
    backgroundColor: COLOR.white,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 8, right: 12, bottom: 4, left: 12 },
    textFormat: text(13, COLOR.brandDeep, true),
    borders: { bottom: border(COLOR.brandLine) },
  },
  sectionHint: {
    backgroundColor: COLOR.white,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 0, right: 12, bottom: 8, left: 12 },
    textFormat: text(9, COLOR.textMuted, false, { italic: true }),
    wrapStrategy: "WRAP",
  },
  sectionCard: {
    backgroundColor: COLOR.paper,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 8, right: 12, bottom: 8, left: 12 },
    textFormat: text(10),
    borders: allBorders(COLOR.gray200),
  },
  kpiLabel: {
    backgroundColor: COLOR.brandSoft,
    horizontalAlignment: "CENTER",
    verticalAlignment: "TOP",
    padding: { top: 10, right: 12, bottom: 0, left: 12 },
    textFormat: text(10, COLOR.brandDeep, true),
    borders: { top: border(COLOR.brandLine), left: border(COLOR.brandLine), right: border(COLOR.brandLine) },
    wrapStrategy: "CLIP",
  },
  kpiValue: {
    backgroundColor: COLOR.white,
    horizontalAlignment: "CENTER",
    verticalAlignment: "MIDDLE",
    padding: { top: 0, right: 12, bottom: 10, left: 12 },
    textFormat: text(23, COLOR.brandDeep, true),
    borders: { bottom: border(COLOR.brandLine), left: border(COLOR.brandLine), right: border(COLOR.brandLine) },
    numberFormat: { type: "CURRENCY", pattern: FORMAT.brlPlain },
  },
  kpiValueGold: {
    backgroundColor: COLOR.goldSoft,
    horizontalAlignment: "CENTER",
    verticalAlignment: "MIDDLE",
    padding: { top: 0, right: 12, bottom: 10, left: 12 },
    textFormat: text(23, COLOR.navy, true),
    borders: { bottom: border(COLOR.goldLine), left: border(COLOR.goldLine), right: border(COLOR.goldLine) },
    numberFormat: { type: "CURRENCY", pattern: FORMAT.brlPlain },
  },
  kpiValueCount: {
    backgroundColor: COLOR.skySoft,
    horizontalAlignment: "CENTER",
    verticalAlignment: "MIDDLE",
    padding: { top: 0, right: 12, bottom: 10, left: 12 },
    textFormat: text(23, COLOR.sky, true),
    borders: { bottom: border(COLOR.navyLine), left: border(COLOR.navyLine), right: border(COLOR.navyLine) },
    numberFormat: { type: "NUMBER", pattern: FORMAT.intCount },
  },
  rowEven: {
    backgroundColor: COLOR.white,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 5, right: 8, bottom: 5, left: 8 },
    textFormat: text(10),
  },
  rowOdd: {
    backgroundColor: COLOR.gray100,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 5, right: 8, bottom: 5, left: 8 },
    textFormat: text(10),
  },
  dataCellBorder: {
    borders: allBorders(COLOR.gray200),
  },
  totalRow: {
    backgroundColor: COLOR.gold,
    horizontalAlignment: "RIGHT",
    padding: { top: 6, right: 8, bottom: 6, left: 8 },
    textFormat: text(11, COLOR.navy, true),
    numberFormat: { type: "CURRENCY", pattern: FORMAT.brlPlain },
  },
  totalLabel: {
    backgroundColor: COLOR.brandDeep,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 7, right: 10, bottom: 7, left: 10 },
    textFormat: text(11, COLOR.white, true),
  },
  totalMoney: {
    backgroundColor: COLOR.brandSoft,
    horizontalAlignment: "RIGHT",
    verticalAlignment: "MIDDLE",
    padding: { top: 7, right: 10, bottom: 7, left: 10 },
    textFormat: text(11, COLOR.brandDeep, true),
    numberFormat: { type: "CURRENCY", pattern: FORMAT.brlPlain },
  },
  totalCount: {
    backgroundColor: COLOR.skySoft,
    horizontalAlignment: "RIGHT",
    verticalAlignment: "MIDDLE",
    padding: { top: 7, right: 10, bottom: 7, left: 10 },
    textFormat: text(11, COLOR.sky, true),
    numberFormat: { type: "NUMBER", pattern: FORMAT.intCount },
  },
  emptyState: {
    backgroundColor: COLOR.gray50,
    horizontalAlignment: "CENTER",
    verticalAlignment: "MIDDLE",
    padding: { top: 10, right: 12, bottom: 10, left: 12 },
    textFormat: text(10, COLOR.gray500, false, { italic: true }),
    wrapStrategy: "WRAP",
  },
  noteLabel: {
    backgroundColor: COLOR.violetSoft,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 8, right: 12, bottom: 8, left: 12 },
    textFormat: text(10, COLOR.violet, true),
    borders: { left: border(COLOR.violet), top: border(COLOR.violetSoft), bottom: border(COLOR.violetSoft) },
  },
  noteBody: {
    backgroundColor: COLOR.white,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 8, right: 12, bottom: 8, left: 12 },
    textFormat: text(10, COLOR.text),
    borders: { right: border(COLOR.violetSoft), top: border(COLOR.violetSoft), bottom: border(COLOR.violetSoft) },
    wrapStrategy: "WRAP",
  },
  helpHero: {
    backgroundColor: COLOR.brand,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 14, right: 18, bottom: 14, left: 18 },
    textFormat: text(18, COLOR.white, true),
    wrapStrategy: "WRAP",
  },
  helpStepNum: {
    backgroundColor: COLOR.gold,
    horizontalAlignment: "CENTER",
    verticalAlignment: "MIDDLE",
    textFormat: text(14, COLOR.navy, true),
  },
  helpStepTitle: {
    backgroundColor: COLOR.white,
    horizontalAlignment: "LEFT",
    padding: { top: 8, right: 14, bottom: 0, left: 14 },
    textFormat: text(12, COLOR.brandDeep, true),
    borders: { top: border(COLOR.gray200), right: border(COLOR.gray200) },
  },
  helpStepBody: {
    backgroundColor: COLOR.white,
    horizontalAlignment: "LEFT",
    padding: { top: 0, right: 14, bottom: 10, left: 14 },
    textFormat: text(10, COLOR.text),
    borders: { bottom: border(COLOR.gray200), right: border(COLOR.gray200) },
    wrapStrategy: "WRAP",
  },
};

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

export function mergeCells(sheetId: number, startRow: number, endRow: number, startCol: number, endCol: number) {
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
        unprotectedRanges: unprotected.map((range) => ({
          sheetId,
          startRowIndex: range.startRow,
          endRowIndex: range.endRow,
          startColumnIndex: range.startCol,
          endColumnIndex: range.endCol,
        })),
      },
    },
  };
}

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
            format: { backgroundColor: COLOR.redSoft, textFormat: { foregroundColor: COLOR.red, bold: true } },
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
            format: { backgroundColor: COLOR.greenSoft, textFormat: { foregroundColor: COLOR.brandDeep, bold: true } },
          },
        },
        index: 1,
      },
    },
  ];
}

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

export function condFormatTextEquals(
  sheetId: number,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
  value: string,
  bg: RGB,
  fg: RGB,
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

export function addBanding(sheetId: number, startRow: number, endRow: number, startCol: number, endCol: number) {
  return {
    addBanding: {
      bandedRange: {
        range: { sheetId, startRowIndex: startRow, endRowIndex: endRow, startColumnIndex: startCol, endColumnIndex: endCol },
        rowProperties: {
          headerColor: COLOR.brandDeep,
          headerColorStyle: { rgbColor: COLOR.brandDeep },
          firstBandColor: COLOR.white,
          firstBandColorStyle: { rgbColor: COLOR.white },
          secondBandColor: COLOR.gray100,
          secondBandColorStyle: { rgbColor: COLOR.gray100 },
        },
      },
    },
  };
}
