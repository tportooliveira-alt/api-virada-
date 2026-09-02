/**
 * Google Sheets — wrapper de servidor (service account).
 * Para o fluxo padrão "cliente clica e vê na planilha dele", o app usa
 * o componente GoogleSyncButton que faz tudo no navegador com OAuth do
 * próprio usuário. Este wrapper existe para integrações server-side
 * opcionais (admin, jobs) e usa o mesmo builder profissional.
 */

import { google, sheets_v4 } from "googleapis";
import {
  HEADERS,
  MAX_DATA_ROWS,
  TAB,
  buildChartRequests,
  buildLayoutRequests,
  buildSheetSpecs,
  buildStaticValues,
  buildSyncBatch,
} from "./builder";
import type { Row, SyncInput } from "./builder";

type Request = sheets_v4.Schema$Request;

function getAuth() {
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!credentials) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON não configurado.");
  const parsed = JSON.parse(credentials);
  return new google.auth.GoogleAuth({
    credentials: parsed,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function api() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

export async function createSpreadsheet(title: string): Promise<string> {
  const sheets = api();
  const res = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title, locale: "pt_BR", timeZone: "America/Sao_Paulo" },
      sheets: buildSheetSpecs() as sheets_v4.Schema$Sheet[],
    },
  });
  const spreadsheetId = res.data.spreadsheetId!;
  const ids = await getSheetIds(spreadsheetId);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: buildLayoutRequests(ids) as Request[] },
  });
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: "USER_ENTERED", data: buildStaticValues() as sheets_v4.Schema$ValueRange[] },
  });
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: buildChartRequests(ids) as Request[] },
  });

  return spreadsheetId;
}

export async function syncTransactions(spreadsheetId: string, rows: Row[]): Promise<void> {
  const input = rowsToSyncInput(rows);
  await applySync(spreadsheetId, input);
}

function rowsToSyncInput(rows: Row[]): SyncInput {
  const expenses: SyncInput["expenses"] = [];
  const incomes: SyncInput["incomes"] = [];
  for (const r of rows) {
    if (r.type === "income") {
      incomes.push({
        id: String(r.id ?? ""), description: String(r.description ?? ""),
        value: Number(r.amount) || 0, category: String(r.category ?? ""),
        date: String(r.date ?? ""), scope: r.scope ? String(r.scope) : undefined,
        source: r.source ? String(r.source) : undefined,
      });
    } else if (r.type === "expense") {
      expenses.push({
        id: String(r.id ?? ""), description: String(r.description ?? ""),
        value: Number(r.amount) || 0, category: String(r.category ?? ""),
        date: String(r.date ?? ""),
        paymentMethod: r.paymentMethod ? String(r.paymentMethod) : undefined,
        nature: r.nature ? String(r.nature) : undefined,
        scope: r.scope ? String(r.scope) : undefined,
        source: r.source ? String(r.source) : undefined,
      });
    }
  }
  return { expenses, incomes, debts: [], goals: [] };
}

export async function syncDebts(spreadsheetId: string, rows: Row[]): Promise<void> {
  const debts = rows.map((r) => ({
    id: String(r.id ?? ""), name: String(r.name ?? ""),
    totalValue: Number(r.totalValue) || 0,
    installmentValue: Number(r.installmentValue) || 0,
    dueDate: String(r.dueDate ?? ""),
    priority: String(r.priority ?? "baixa"),
    status: String(r.status ?? "aberta"),
  }));
  await applySync(spreadsheetId, { expenses: [], incomes: [], debts, goals: [] }, { onlyDebts: true });
}

export async function syncGoals(spreadsheetId: string, rows: Row[]): Promise<void> {
  const goals = rows.map((r) => ({
    id: String(r.id ?? ""), name: String(r.name ?? ""),
    targetValue: Number(r.targetValue) || 0,
    currentValue: Number(r.currentValue) || 0,
    type: String(r.type ?? ""),
  }));
  await applySync(spreadsheetId, { expenses: [], incomes: [], debts: [], goals }, { onlyGoals: true });
}

export async function logSync(...args: unknown[]): Promise<void> {
  void args;
}

async function applySync(spreadsheetId: string, input: SyncInput, opts: { onlyDebts?: boolean; onlyGoals?: boolean } = {}) {
  const sheets = api();
  const batch = buildSyncBatch(input);

  let clearRanges = batch.clearRanges;
  let valueRanges = batch.valueRanges;

  if (opts.onlyDebts) {
    clearRanges = [`${TAB.dividas}!A2:Z${MAX_DATA_ROWS}`];
    valueRanges = valueRanges.filter((v) => v.range.startsWith(TAB.dividas));
  } else if (opts.onlyGoals) {
    clearRanges = [`${TAB.metas}!A2:Z${MAX_DATA_ROWS}`];
    valueRanges = valueRanges.filter((v) => v.range.startsWith(TAB.metas));
  }

  if (clearRanges.length) {
    await sheets.spreadsheets.values.batchClear({ spreadsheetId, requestBody: { ranges: clearRanges } });
  }
  if (valueRanges.length) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: "USER_ENTERED", data: valueRanges as sheets_v4.Schema$ValueRange[] },
    });
  }
}

async function getSheetIds(spreadsheetId: string): Promise<Record<string, number>> {
  const sheets = api();
  const res = await sheets.spreadsheets.get({ spreadsheetId });
  const map: Record<string, number> = {};
  for (const s of res.data.sheets ?? []) {
    map[s.properties?.title ?? ""] = s.properties?.sheetId ?? 0;
  }
  return map;
}

export const SHEET_TABS = TAB;
export { HEADERS };
