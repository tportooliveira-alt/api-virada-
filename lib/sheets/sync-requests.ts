/**
 * Montagem PURA dos requests que o navegador manda à API do Google Sheets
 * (components/GoogleSyncButton.tsx: criar planilha, atualizar layout, mandar
 * dados). Sem fetch, sem token — só corpos de request, para o caminho real do
 * app poder ser testado offline (scripts/test-planilha-bordas.ts). O botão só
 * faz o HTTP com o que sai daqui.
 */

import {
  TAB,
  TAB_ORDER,
  buildChartRequests,
  buildLayoutRequests,
  buildSheetSpecs,
  buildStaticValues,
  buildSyncBatch,
  type SyncInput,
} from "./builder";

/** Resposta de POST /spreadsheets ou GET /spreadsheets/{id}?fields=... */
export interface SpreadsheetInfo {
  spreadsheetId?: string;
  sheets?: {
    properties?: { title?: string; sheetId?: number };
    charts?: { chartId?: number }[];
    bandedRanges?: { bandedRangeId?: number }[];
    protectedRanges?: { protectedRangeId?: number }[];
    conditionalFormats?: unknown[];
  }[];
}

export function createWorkbookBody(email: string) {
  return {
    properties: { title: `Virada Financeira — ${email}`, locale: "pt_BR", timeZone: "America/Sao_Paulo" },
    sheets: buildSheetSpecs(),
  };
}

export function readSheetIds(info: SpreadsheetInfo): Record<string, number> {
  const map: Record<string, number> = {};
  for (const sheet of info.sheets ?? []) {
    const { title, sheetId } = sheet.properties ?? {};
    if (title && typeof sheetId === "number") map[title] = sheetId;
  }
  return map;
}

/** Corpo de POST :batchUpdate — banner, kpi, formatos, proteção, ajuda. */
export function layoutCall(ids: Record<string, number>) {
  return { requests: buildLayoutRequests(ids) };
}

/** Corpo de POST values:batchUpdate — cabeçalhos, banner, rótulos, ajuda. */
export function staticValuesCall() {
  return { valueInputOption: "USER_ENTERED" as const, data: buildStaticValues() };
}

/** Corpo de POST :batchUpdate — os 4 gráficos. */
export function chartsCall(ids: Record<string, number>) {
  return { requests: buildChartRequests(ids) };
}

/** Planilha de uma versão antiga pode não ter todas as abas de hoje. null = nada a criar. */
export function missingTabsCall(ids: Record<string, number>) {
  const faltando = TAB_ORDER.filter((key) => ids[TAB[key]] === undefined);
  if (!faltando.length) return null;
  return { requests: faltando.map((key) => ({ addSheet: { properties: { title: TAB[key] } } })) };
}

/**
 * Reaplica o visual numa planilha que já existe. O layout re-adiciona gráficos,
 * zebra, proteções e regras de cor — sem limpar os antigos, cada atualização
 * duplicaria tudo (e "addBanding" daria erro de sobreposição). Os DADOS do
 * usuário não são tocados aqui.
 */
export function upgradeLayoutCall(info: SpreadsheetInfo, ids: Record<string, number>) {
  const limpeza: unknown[] = [];
  for (const sheet of info.sheets ?? []) {
    const sheetId = sheet.properties?.sheetId;
    for (const chart of sheet.charts ?? []) {
      if (typeof chart.chartId === "number") limpeza.push({ deleteEmbeddedObject: { objectId: chart.chartId } });
    }
    for (const banda of sheet.bandedRanges ?? []) {
      if (typeof banda.bandedRangeId === "number") limpeza.push({ deleteBanding: { bandedRangeId: banda.bandedRangeId } });
    }
    for (const protegido of sheet.protectedRanges ?? []) {
      if (typeof protegido.protectedRangeId === "number") {
        limpeza.push({ deleteProtectedRange: { protectedRangeId: protegido.protectedRangeId } });
      }
    }
    // regras condicionais se deletam por índice — de trás para frente
    if (typeof sheetId === "number") {
      for (let i = (sheet.conditionalFormats ?? []).length - 1; i >= 0; i--) {
        limpeza.push({ deleteConditionalFormatRule: { sheetId, index: i } });
      }
    }
  }
  return { requests: [...limpeza, ...buildLayoutRequests(ids)] };
}

/** Corpos de values:batchClear e values:batchUpdate do sync de dados (null = pular a chamada). */
export function pushDataCalls(input: SyncInput) {
  const batch = buildSyncBatch(input);
  return {
    clear: batch.clearRanges.length ? { ranges: batch.clearRanges } : null,
    update: batch.valueRanges.length ? { valueInputOption: "USER_ENTERED" as const, data: batch.valueRanges } : null,
  };
}
