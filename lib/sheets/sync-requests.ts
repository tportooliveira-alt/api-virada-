/**
 * Montagem PURA dos requests que o navegador manda à API do Google Sheets
 * (components/GoogleSyncButton.tsx: criar planilha, atualizar layout, mandar
 * dados). Sem fetch, sem token — só corpos de request, para o caminho real do
 * app poder ser testado offline (scripts/test-planilha-bordas.ts). O botão só
 * faz o HTTP com o que sai daqui.
 */

import {
  GRADE_INICIAL,
  TAB,
  TAB_ORDER,
  buildChartRequests,
  buildLayoutRequests,
  buildSheetSpecs,
  buildStaticValues,
  buildSyncBatch,
  growDataSheetRequests,
  type DataTabKey,
  type SyncInput,
} from "./builder";
import { unmergeAll } from "./styles";

/** Resposta de POST /spreadsheets ou GET /spreadsheets/{id}?fields=... */
export interface SpreadsheetInfo {
  spreadsheetId?: string;
  sheets?: {
    properties?: { title?: string; sheetId?: number; gridProperties?: { rowCount?: number; columnCount?: number } };
    charts?: { chartId?: number }[];
    bandedRanges?: { bandedRangeId?: number }[];
    protectedRanges?: { protectedRangeId?: number }[];
    conditionalFormats?: unknown[];
  }[];
}

/** Campos do GET que o upgrade e o crescimento da grade precisam. */
export const SPREADSHEET_FIELDS = "sheets.properties(sheetId,title,gridProperties(rowCount,columnCount)),sheets.charts(chartId),sheets.bandedRanges(bandedRangeId),sheets.protectedRanges(protectedRangeId),sheets.conditionalFormats";

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

/** Corpo de POST values:batchUpdate — cabeçalhos, banner, rótulos, fórmulas fixas, ajuda. */
export function staticValuesCall() {
  return { valueInputOption: "USER_ENTERED" as const, data: buildStaticValues() };
}

/** Corpo de POST :batchUpdate — os 4 gráficos. */
export function chartsCall(ids: Record<string, number>) {
  return { requests: buildChartRequests(ids) };
}

/**
 * Planilha de uma versão antiga pode não ter todas as abas de hoje. null = nada
 * a criar.
 *
 * A aba nova nasce com a MESMA grade que teria numa planilha criada do zero
 * (`buildSheetSpecs`). Sem isso o Google usa o padrão dele — 1.000 linhas por 26
 * colunas —, e a planilha de quem já era cliente ficava diferente da de quem
 * comprou depois: Bolsos e Filtros com um descampado de colunas à direita e
 * (nas abas de dados) uma grade que não bate com a faixa formatada do layout.
 */
export function missingTabsCall(ids: Record<string, number>) {
  const faltando = TAB_ORDER.filter((key) => ids[TAB[key]] === undefined);
  if (!faltando.length) return null;
  const specs = buildSheetSpecs();
  // index = posição de hoje, pra Bolsos/Filtros não caírem depois de "Como usar"
  return {
    requests: faltando.map((key) => {
      const spec = specs.find((s) => s.properties.title === TAB[key]);
      return { addSheet: { properties: { ...spec?.properties, title: TAB[key], index: TAB_ORDER.indexOf(key) } } };
    }),
  };
}

// Até o layout 2026-09-11.1 o painel lateral das abas de dados ficava em J:L
// (título J1:L1, dica J2, rótulos J4:J7, valores K4:L7, notas J10:J14). No v3
// ele foi pra N:P, e como o clear do sync para na última coluna gerada
// (Receitas!A2:F…), o texto velho ficaria pra sempre nas colunas escondidas.
// Lançamentos fica de fora: lá J:L virou coluna de dados (cabeçalho e clear
// A2:L já cobrem). A limpeza é só do VALOR (updateCells sem rows) — formato
// velho fica escondido, e o updateCells não encosta em dado do usuário.
const PAINEL_EM_J_ATE = "2026-09-11.1";
const ABAS_COM_PAINEL_ANTIGO: DataTabKey[] = ["receitas", "despesas", "dividas", "metas", "fluxo", "resumo"];

function painelAntigoClear(info: SpreadsheetInfo, versaoAnterior?: string): unknown[] {
  if (versaoAnterior !== undefined && versaoAnterior > PAINEL_EM_J_ATE) return [];
  const titulos = new Set<string>(ABAS_COM_PAINEL_ANTIGO.map((key) => TAB[key]));
  const out: unknown[] = [];
  for (const sheet of info.sheets ?? []) {
    const { title, sheetId } = sheet.properties ?? {};
    if (!title || !titulos.has(title) || typeof sheetId !== "number") continue;
    out.push({ updateCells: { range: { sheetId, startRowIndex: 0, endRowIndex: 20, startColumnIndex: 9, endColumnIndex: 13 }, fields: "userEnteredValue" } }); // J1:M20
  }
  return out;
}

/** Título → rowCount real de cada aba (do GET); só o que veio. */
function rowCountsDe(info: SpreadsheetInfo) {
  const out: Record<string, number> = {};
  for (const sheet of info.sheets ?? []) {
    const { title, gridProperties } = sheet.properties ?? {};
    if (title && typeof gridProperties?.rowCount === "number") out[title] = gridProperties.rowCount;
  }
  return out;
}

/**
 * Reaplica o visual numa planilha que já existe. O layout re-adiciona gráficos,
 * zebra, proteções e regras de cor — sem limpar os antigos, cada atualização
 * duplicaria tudo (e "addBanding" daria erro de sobreposição). As mesclas
 * também caem: o painel lateral mudou de coluna e a mescla velha ficaria em
 * cima de dados. Os DADOS do usuário não são tocados aqui.
 * `versaoAnterior` = LAYOUT_VERSION gravada no aparelho (ausente = planilha
 * anterior ao versionamento): decide se o painel antigo em J:L é limpo. O
 * rowCount real de cada aba entra no layout pra uma grade já crescida não
 * encolher de volta.
 */
export function upgradeLayoutCall(info: SpreadsheetInfo, ids: Record<string, number>, versaoAnterior?: string) {
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
      limpeza.push(unmergeAll(sheetId));
    }
  }
  return { requests: [...limpeza, ...painelAntigoClear(info, versaoAnterior), ...buildLayoutRequests(ids, rowCountsDe(info))] };
}

/** Corpos de values:batchClear e values:batchUpdate do sync de dados (null = pular a chamada). */
export function pushDataCalls(input: SyncInput) {
  const batch = buildSyncBatch(input);
  return {
    clear: batch.clearRanges.length ? { ranges: batch.clearRanges } : null,
    update: batch.valueRanges.length ? { valueInputOption: "USER_ENTERED" as const, data: batch.valueRanges } : null,
    linhas: batch.linhas,
  };
}

// A grade de cada aba de dados nasce com GRADE_INICIAL linhas; acima disso o
// values.batchUpdate é recusado INTEIRO. Antes de gravar, cresce só o que falta.
const FOLGA = 10;

/** Alguma aba passa da grade inicial? Só então vale buscar o tamanho real (GET). */
export function precisaCrescer(linhas: Record<DataTabKey, number>) {
  return Object.values(linhas).some((n) => n + 1 > GRADE_INICIAL);
}

/**
 * Corpo de POST :batchUpdate que cresce cada aba que precisa (null = nada):
 * appendDimension + formatos/filtro/zebra/proteção da faixa nova (ver
 * growDataSheetRequests). O GET tem que vir com SPREADSHEET_FIELDS — sem os
 * ids de proteção e zebra, essas duas não acompanham (cada aba de dados tem
 * exatamente uma de cada, criadas pelo layout).
 */
export function growGridCall(info: SpreadsheetInfo, linhas: Record<DataTabKey, number>) {
  const requests: unknown[] = [];
  for (const sheet of info.sheets ?? []) {
    const { title, sheetId, gridProperties } = sheet.properties ?? {};
    const key = (Object.keys(linhas) as DataTabKey[]).find((k) => TAB[k] === title);
    if (!key || typeof sheetId !== "number") continue;
    const atual = gridProperties?.rowCount ?? GRADE_INICIAL;
    const necessario = linhas[key] + 1; // + cabeçalho
    if (necessario <= atual) continue;
    requests.push(...growDataSheetRequests(key, sheetId, atual, necessario + FOLGA, {
      protectedRangeId: sheet.protectedRanges?.[0]?.protectedRangeId,
      bandedRangeId: sheet.bandedRanges?.[0]?.bandedRangeId,
    }));
  }
  return requests.length ? { requests } : null;
}
