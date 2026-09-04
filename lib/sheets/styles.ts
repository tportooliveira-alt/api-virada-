/**
 * Paleta e estilos da planilha — v2 (alinhada ao redesign do app).
 * Cores em RGB float (0-1), formato exigido pela Google Sheets API.
 *
 * Substitui lib/sheets/styles.ts. Todas as chaves antigas de COLOR e STYLE
 * foram mantidas, então builder.ts continua compilando sem alteração.
 */

type RGB = { red: number; green: number; blue: number };
type CellFormat = Record<string, unknown>;

const rgb = (red: number, green: number, blue: number): RGB => ({
  red: red / 255,
  green: green / 255,
  blue: blue / 255,
});

// Tokens do app (v2)
const ink = rgb(15, 23, 42);        // #0F172A — fundo do hero / títulos
const green = rgb(34, 197, 94);     // #22C55E — marca
const greenDeep = rgb(21, 128, 61); // #15803D — texto positivo
const greenSoft = rgb(220, 252, 231);
const greenLine = rgb(134, 239, 172);
const amber = rgb(245, 197, 66);    // #F5C542 — acento
const amberDeep = rgb(180, 83, 9);
const amberSoft = rgb(255, 251, 235);
const amberLine = rgb(252, 211, 77);
const red = rgb(239, 68, 68);
const redSoft = rgb(254, 242, 242);
const blue = rgb(29, 78, 216);
const blueSoft = rgb(239, 246, 255);
const slate50 = rgb(248, 250, 252);
const slate100 = rgb(241, 245, 249);
const slate200 = rgb(229, 233, 240);
const slate300 = rgb(203, 213, 225);
const slate400 = rgb(148, 163, 184);
const slate500 = rgb(100, 116, 139);
const slate600 = rgb(71, 85, 105);
const slate700 = rgb(51, 65, 85);
const white = rgb(255, 255, 255);

export const COLOR: Record<string, RGB> = {
  // novos nomes
  ink, green, greenDeep, greenSoft, greenLine,
  amber, amberDeep, amberSoft, amberLine,
  red, redSoft, blue, blueSoft,
  slate50, slate100, slate200, slate300, slate400, slate500, slate600, slate700, white,

  // aliases legados (mantêm o builder.ts funcionando)
  navy: ink,
  navySoft: slate100,
  navyMed: slate50,
  navyCard: slate50,
  navyLine: slate200,
  brand: green,
  brandDeep: greenDeep,
  brandSoft: greenSoft,
  brandLine: greenLine,
  sky: blue,
  skySoft: blueSoft,
  violet: slate700,
  violetSoft: slate100,
  gold: amber,
  goldSoft: amberSoft,
  goldLine: amberLine,
  orange: amberDeep,
  orangeSoft: amberSoft,
  offWhite: white,
  paper: slate50,
  gray50: slate50,
  gray100: slate100,
  gray200: slate200,
  gray300: slate300,
  gray400: slate400,
  gray500: slate500,
  text: ink,
  textMuted: slate500,
};

// Onest está no catálogo do Google Fonts (disponível em "Mais fontes" no Sheets).
// Se preferir uma fonte nativa do Sheets, troque por "Roboto".
export const FONT = "Onest";

export const FORMAT = {
  brl: '"R$ "#,##0.00;[Color3]"-R$ "#,##0.00',
  brlPlain: '"R$ "#,##0.00',
  date: "dd/mm/yyyy",
  monthYear: "mmm/yyyy",
  intCount: "#,##0",
  percent: "0.0%",
} as const;

const border = (color = slate200, style = "SOLID") => ({ style, color });
const allBorders = (color = slate200) => ({
  top: border(color),
  bottom: border(color),
  left: border(color),
  right: border(color),
});

const text = (
  fontSize: number,
  foregroundColor = ink,
  bold = false,
  extra: Record<string, unknown> = {},
) => ({ fontFamily: FONT, fontSize, foregroundColor, bold, ...extra });

export const STYLE: Record<string, CellFormat> = {
  // Cabeçalho escuro (mesmo hero do app)
  banner: {
    backgroundColor: ink,
    horizontalAlignment: "LEFT",
    verticalAlignment: "BOTTOM",
    padding: { top: 10, right: 18, bottom: 2, left: 18 },
    textFormat: text(18, white, true),
  },
  bannerSub: {
    backgroundColor: ink,
    horizontalAlignment: "LEFT",
    verticalAlignment: "TOP",
    padding: { top: 0, right: 18, bottom: 8, left: 18 },
    textFormat: text(9, slate400),
    borders: { bottom: border(green, "SOLID_MEDIUM") },
  },
  topStripe: { backgroundColor: green, horizontalAlignment: "LEFT" },

  // Tabelas: cabeçalho claro, texto discreto em caixa alta
  tableHeader: {
    backgroundColor: slate100,
    horizontalAlignment: "CENTER",
    verticalAlignment: "MIDDLE",
    padding: { top: 7, right: 8, bottom: 7, left: 8 },
    textFormat: text(9, slate600, true),
    borders: { bottom: border(slate300) },
    wrapStrategy: "WRAP",
  },
  subHeader: {
    backgroundColor: ink,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 8, right: 12, bottom: 8, left: 12 },
    textFormat: text(11, white, true),
  },
  sectionTitle: {
    backgroundColor: white,
    horizontalAlignment: "LEFT",
    verticalAlignment: "BOTTOM",
    padding: { top: 8, right: 12, bottom: 2, left: 12 },
    textFormat: text(12, ink, true),
  },
  sectionHint: {
    backgroundColor: white,
    horizontalAlignment: "LEFT",
    verticalAlignment: "TOP",
    padding: { top: 0, right: 12, bottom: 8, left: 12 },
    textFormat: text(10, slate500),
    borders: { bottom: border(slate200) },
    wrapStrategy: "WRAP",
  },
  sectionCard: {
    backgroundColor: slate50,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 8, right: 12, bottom: 8, left: 12 },
    textFormat: text(10),
    borders: allBorders(slate200),
  },

  // KPIs: cartão branco com borda fina, rótulo pequeno e número grande
  kpiLabel: {
    backgroundColor: white,
    horizontalAlignment: "LEFT",
    verticalAlignment: "BOTTOM",
    padding: { top: 10, right: 14, bottom: 0, left: 14 },
    textFormat: text(9, slate500, true),
    borders: { top: border(slate200), left: border(slate200), right: border(slate200) },
    wrapStrategy: "CLIP",
  },
  kpiValue: {
    backgroundColor: white,
    horizontalAlignment: "LEFT",
    verticalAlignment: "TOP",
    padding: { top: 0, right: 14, bottom: 10, left: 14 },
    textFormat: text(22, ink, true),
    borders: { bottom: border(slate200), left: border(slate200), right: border(slate200) },
    numberFormat: { type: "CURRENCY", pattern: FORMAT.brlPlain },
  },
  // usado no SALDO ATUAL (o condicional positivo/negativo continua por cima)
  kpiValueGold: {
    backgroundColor: greenSoft,
    horizontalAlignment: "LEFT",
    verticalAlignment: "TOP",
    padding: { top: 0, right: 14, bottom: 10, left: 14 },
    textFormat: text(22, greenDeep, true),
    borders: { bottom: border(greenLine), left: border(greenLine), right: border(greenLine) },
    numberFormat: { type: "CURRENCY", pattern: FORMAT.brlPlain },
  },
  kpiValueCount: {
    backgroundColor: white,
    horizontalAlignment: "LEFT",
    verticalAlignment: "TOP",
    padding: { top: 0, right: 14, bottom: 10, left: 14 },
    textFormat: text(22, slate700, true),
    borders: { bottom: border(slate200), left: border(slate200), right: border(slate200) },
    numberFormat: { type: "NUMBER", pattern: FORMAT.intCount },
  },

  // Dashboard: células com SPARKLINE ao lado das tabelas
  sparkCell: {
    backgroundColor: white,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 6, right: 10, bottom: 6, left: 10 },
    borders: { top: border(white), bottom: border(white) },
  },
  sparkHeader: {
    backgroundColor: white,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 0, right: 10, bottom: 0, left: 10 },
    textFormat: text(9, slate400),
  },
  rowEven: {
    backgroundColor: white,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 5, right: 8, bottom: 5, left: 8 },
    textFormat: text(10),
  },
  rowOdd: {
    backgroundColor: slate50,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 5, right: 8, bottom: 5, left: 8 },
    textFormat: text(10),
  },
  dataCellBorder: { borders: allBorders(slate200) },

  totalRow: {
    backgroundColor: amberSoft,
    horizontalAlignment: "RIGHT",
    padding: { top: 6, right: 8, bottom: 6, left: 8 },
    textFormat: text(11, ink, true),
    numberFormat: { type: "CURRENCY", pattern: FORMAT.brlPlain },
  },
  totalLabel: {
    backgroundColor: ink,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 7, right: 10, bottom: 7, left: 10 },
    textFormat: text(11, white, true),
  },
  totalMoney: {
    backgroundColor: greenSoft,
    horizontalAlignment: "RIGHT",
    verticalAlignment: "MIDDLE",
    padding: { top: 7, right: 10, bottom: 7, left: 10 },
    textFormat: text(11, greenDeep, true),
    numberFormat: { type: "CURRENCY", pattern: FORMAT.brlPlain },
  },
  totalCount: {
    backgroundColor: slate100,
    horizontalAlignment: "RIGHT",
    verticalAlignment: "MIDDLE",
    padding: { top: 7, right: 10, bottom: 7, left: 10 },
    textFormat: text(11, slate700, true),
    numberFormat: { type: "NUMBER", pattern: FORMAT.intCount },
  },
  emptyState: {
    backgroundColor: slate50,
    horizontalAlignment: "CENTER",
    verticalAlignment: "MIDDLE",
    padding: { top: 10, right: 12, bottom: 10, left: 12 },
    textFormat: text(10, slate500),
    wrapStrategy: "WRAP",
  },

  // Painel lateral (Leitura rápida / Como ler esta aba)
  noteLabel: {
    backgroundColor: slate50,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 8, right: 12, bottom: 8, left: 12 },
    textFormat: text(9, slate600, true),
    borders: { left: border(green, "SOLID_MEDIUM"), top: border(slate200), bottom: border(slate200) },
  },
  noteBody: {
    backgroundColor: white,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 8, right: 12, bottom: 8, left: 12 },
    textFormat: text(10, ink, true),
    borders: { right: border(slate200), top: border(slate200), bottom: border(slate200) },
    wrapStrategy: "WRAP",
  },

  // Aba "Como usar"
  helpHero: {
    backgroundColor: ink,
    horizontalAlignment: "LEFT",
    verticalAlignment: "MIDDLE",
    padding: { top: 14, right: 18, bottom: 14, left: 18 },
    textFormat: text(18, white, true),
    borders: { bottom: border(green, "SOLID_MEDIUM") },
    wrapStrategy: "WRAP",
  },
  helpStepNum: {
    backgroundColor: green,
    horizontalAlignment: "CENTER",
    verticalAlignment: "MIDDLE",
    textFormat: text(15, ink, true),
  },
  helpStepTitle: {
    backgroundColor: white,
    horizontalAlignment: "LEFT",
    verticalAlignment: "BOTTOM",
    padding: { top: 8, right: 14, bottom: 0, left: 14 },
    textFormat: text(12, ink, true),
    borders: { top: border(slate200), right: border(slate200) },
  },
  helpStepBody: {
    backgroundColor: white,
    horizontalAlignment: "LEFT",
    verticalAlignment: "TOP",
    padding: { top: 0, right: 14, bottom: 10, left: 14 },
    textFormat: text(10, slate600),
    borders: { bottom: border(slate200), right: border(slate200) },
    wrapStrategy: "WRAP",
  },
};

export function repeatCell(
  sheetId: number,
  range: { startRowIndex: number; endRowIndex: number; startColumnIndex: number; endColumnIndex: number },
  format: CellFormat,
  fields = "userEnteredFormat",
) {
  return { repeatCell: { range: { sheetId, ...range }, cell: { userEnteredFormat: format }, fields } };
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
      protectedRange: { range: { sheetId }, description, warningOnly: false, requestingUserCanEdit: true },
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
  const ranges = [{ sheetId, startRowIndex: startRow, endRowIndex: endRow, startColumnIndex: startCol, endColumnIndex: endCol }];
  return [
    {
      addConditionalFormatRule: {
        rule: {
          ranges,
          booleanRule: {
            condition: { type: "NUMBER_LESS", values: [{ userEnteredValue: "0" }] },
            format: { backgroundColor: redSoft, textFormat: { foregroundColor: red, bold: true } },
          },
        },
        index: 0,
      },
    },
    {
      addConditionalFormatRule: {
        rule: {
          ranges,
          booleanRule: {
            condition: { type: "NUMBER_GREATER", values: [{ userEnteredValue: "0" }] },
            format: { backgroundColor: greenSoft, textFormat: { foregroundColor: greenDeep, bold: true } },
          },
        },
        index: 1,
      },
    },
  ];
}

export function condFormatProgressBands(
  sheetId: number,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
) {
  const ranges = [{ sheetId, startRowIndex: startRow, endRowIndex: endRow, startColumnIndex: startCol, endColumnIndex: endCol }];
  const band = (condition: Record<string, unknown>, bg: RGB, fg: RGB, index: number) => ({
    addConditionalFormatRule: {
      rule: { ranges, booleanRule: { condition, format: { backgroundColor: bg, textFormat: { foregroundColor: fg, bold: true } } } },
      index,
    },
  });
  // userEnteredValue é lido como o usuário digitaria NA planilha, e ela é criada
  // com locale pt_BR — decimal com vírgula. Com ponto, a API recusa o lote inteiro
  // ("Invalid ConditionValue.userEnteredValue: 0.75"). Mesma pegadinha das fórmulas.
  return [
    band({ type: "NUMBER_GREATER_THAN_EQ", values: [{ userEnteredValue: "0,75" }] }, greenSoft, greenDeep, 0),
    band({ type: "NUMBER_GREATER_THAN_EQ", values: [{ userEnteredValue: "0,35" }] }, amberSoft, amberDeep, 1),
    band({ type: "NUMBER_LESS", values: [{ userEnteredValue: "0,35" }] }, redSoft, red, 2),
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
          minpoint: { color: redSoft, type: "MIN" },
          midpoint: { color: amberSoft, type: "PERCENT", value: "50" },
          maxpoint: { color: greenSoft, type: "MAX" },
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
          headerColor: slate100,
          headerColorStyle: { rgbColor: slate100 },
          firstBandColor: white,
          firstBandColorStyle: { rgbColor: white },
          secondBandColor: slate50,
          secondBandColorStyle: { rgbColor: slate50 },
        },
      },
    },
  };
}
