/**
 * Google Sheets — sincronização bidirecional.
 * Roda somente no servidor (API routes) com service account.
 *
 * Estrutura da planilha (15 abas):
 * 1. Dashboard        — resumo visual (gerado automaticamente)
 * 2. Lançamentos      — todas as receitas e despesas
 * 3. Receitas         — só entradas (view filtrada)
 * 4. Despesas         — só saídas (view filtrada)
 * 5. Dívidas          — dívidas em aberto, negociando, quitadas
 * 6. Metas            — objetivos financeiros
 * 7. Fluxo de Caixa   — saldo por dia
 * 8. Resumo Mensal    — balanço por mês
 * 9. Vendas           — para quem tem negócio
 * 10. Compras/Custos  — custos de empresa
 * 11. Contas a Pagar  — próximos vencimentos
 * 12. Contas a Receber— valores a receber
 * 13. Missões         — plano de 7 dias + progresso
 * 14. Pontos/Medalhas — gamificação
 * 15. Log de Sync     — histórico de sincronizações
 */

import { google } from "googleapis";

// ─── Auth ─────────────────────────────────────────────────────────────────────

function getAuth() {
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!credentials) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON não configurado.");
  const parsed = JSON.parse(credentials);
  return new google.auth.GoogleAuth({
    credentials: parsed,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function sheets() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

// ─── Estrutura das abas ────────────────────────────────────────────────────────

export const SHEET_TABS = {
  dashboard:        "Dashboard",
  lancamentos:      "Lançamentos",
  receitas:         "Receitas",
  despesas:         "Despesas",
  dividas:          "Dívidas",
  metas:            "Metas",
  fluxo:            "Fluxo de Caixa",
  resumo:           "Resumo Mensal",
  vendas:           "Vendas",
  compras:          "Compras e Custos",
  contasPagar:      "Contas a Pagar",
  contasReceber:    "Contas a Receber",
  missoes:          "Missões",
  pontos:           "Pontos e Medalhas",
  syncLog:          "Log de Sync",
} as const;

export const HEADERS: Record<string, string[]> = {
  lancamentos:   ["ID", "Tipo", "Descrição", "Valor (R$)", "Categoria", "Data", "Pagamento", "Natureza", "Escopo", "Origem", "Criado em"],
  receitas:      ["ID", "Descrição", "Valor (R$)", "Categoria", "Data", "Origem"],
  despesas:      ["ID", "Descrição", "Valor (R$)", "Categoria", "Data", "Pagamento", "Natureza", "Escopo"],
  dividas:       ["ID", "Nome da Dívida", "Valor Total (R$)", "Parcela (R$)", "Vencimento", "Prioridade", "Status"],
  metas:         ["ID", "Meta", "Valor Alvo (R$)", "Valor Atual (R$)", "Tipo", "Progresso (%)"],
  fluxo:         ["Data", "Entradas (R$)", "Saídas (R$)", "Saldo do Dia (R$)", "Saldo Acumulado (R$)"],
  resumo:        ["Mês/Ano", "Total Entradas (R$)", "Total Saídas (R$)", "Resultado (R$)", "Qtd Lançamentos", "Economia (%)"],
  vendas:        ["ID", "Produto/Serviço", "Valor (R$)", "Data", "Forma de Recebimento", "Status"],
  compras:       ["ID", "Descrição", "Fornecedor", "Valor (R$)", "Data", "Categoria", "Escopo"],
  contasPagar:   ["ID", "Descrição", "Valor (R$)", "Vencimento", "Credor", "Status"],
  contasReceber: ["ID", "Descrição", "Valor (R$)", "Vencimento", "Devedor", "Status"],
  missoes:       ["Dia", "Missão", "Descrição", "Concluída?", "Data de Conclusão"],
  pontos:        ["ID", "Pontos", "Motivo", "Data"],
  syncLog:       ["ID", "Ação", "Tabela", "Registro", "Data/Hora", "Sincronizado"],
};

// ─── Criar planilha nova ───────────────────────────────────────────────────────

export async function createSpreadsheet(title: string): Promise<string> {
  const api = sheets();
  const tabs = Object.values(SHEET_TABS).map((name) => ({
    properties: { title: name },
  }));

  const res = await api.spreadsheets.create({
    requestBody: {
      properties: { title, locale: "pt_BR", timeZone: "America/Sao_Paulo" },
      sheets: tabs,
    },
  });

  const spreadsheetId = res.data.spreadsheetId!;

  // Popula cabeçalhos
  await populateHeaders(spreadsheetId);
  // Formata Dashboard
  await formatDashboard(spreadsheetId);

  return spreadsheetId;
}

// ─── Cabeçalhos ───────────────────────────────────────────────────────────────

async function populateHeaders(spreadsheetId: string): Promise<void> {
  const api = sheets();
  const data = Object.entries(HEADERS).map(([key, headers]) => ({
    range: `${SHEET_TABS[key as keyof typeof SHEET_TABS]}!A1`,
    values: [headers],
  }));

  await api.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: "USER_ENTERED", data },
  });

  // Aplica estilo de cabeçalho (bold + fundo escuro)
  const sheetIds = await getSheetIds(spreadsheetId);
  const requests = Object.values(sheetIds)
    .filter(Boolean)
    .map((sheetId) => ({
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.027, green: 0.067, blue: 0.122 },
            textFormat: {
              bold: true,
              foregroundColor: { red: 1, green: 1, blue: 1 },
              fontSize: 10,
            },
            horizontalAlignment: "CENTER",
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
      },
    }));

  if (requests.length) {
    await api.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }
}

// ─── Dashboard inicial ────────────────────────────────────────────────────────

async function formatDashboard(spreadsheetId: string): Promise<void> {
  const api = sheets();
  const now = new Date().toLocaleDateString("pt-BR");

  const dashboardValues = [
    ["📊 CÓDIGO DA VIRADA FINANCEIRA — DASHBOARD"],
    [""],
    ["Última sincronização:", now],
    [""],
    ["📥 ENTRADAS DO MÊS", "=SUMIF(Lançamentos!B:B,\"income\",Lançamentos!D:D)"],
    ["📤 SAÍDAS DO MÊS",   "=SUMIF(Lançamentos!B:B,\"expense\",Lançamentos!D:D)"],
    ["💰 SALDO DO MÊS",    "=B5-B6"],
    [""],
    ["🔴 DÍVIDAS ABERTAS", "=COUNTIF(Dívidas!G:G,\"aberta\")"],
    ["💸 TOTAL EM DÍVIDAS", "=SUMIF(Dívidas!G:G,\"aberta\",Dívidas!C:C)"],
    [""],
    ["🎯 METAS ATIVAS",    "=COUNTA(Metas!A:A)-1"],
    [""],
    ["⚡ Acesse cada aba para detalhar as informações"],
    ["📱 App: Código da Virada Financeira (PWA)"],
  ];

  await api.spreadsheets.values.update({
    spreadsheetId,
    range: "Dashboard!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: dashboardValues },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getSheetIds(spreadsheetId: string): Promise<Record<string, number>> {
  const api = sheets();
  const res = await api.spreadsheets.get({ spreadsheetId });
  const map: Record<string, number> = {};
  for (const sheet of res.data.sheets ?? []) {
    const title = sheet.properties?.title ?? "";
    const id = sheet.properties?.sheetId ?? 0;
    map[title] = id;
  }
  return map;
}

// ─── Sync: enviar dados para a planilha ───────────────────────────────────────

export async function syncTransactions(
  spreadsheetId: string,
  rows: Record<string, string | number | null>[],
): Promise<void> {
  if (!rows.length) return;
  const api = sheets();
  const values = rows.map((r) => [
    r.id, r.type, r.description, r.amount, r.category,
    r.date, r.paymentMethod, r.nature ?? "", r.scope ?? "", r.source ?? "",
    new Date().toISOString(),
  ]);

  // Limpa e reescreve (mais simples que patch incremental)
  await api.spreadsheets.values.clear({
    spreadsheetId,
    range: "Lançamentos!A2:Z",
  });
  if (values.length) {
    await api.spreadsheets.values.append({
      spreadsheetId,
      range: "Lançamentos!A2",
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
  }
  // Atualiza subabas filtradas
  await syncReceitas(spreadsheetId, rows);
  await syncDespesas(spreadsheetId, rows);
  await syncFluxo(spreadsheetId, rows);
  await syncResumoMensal(spreadsheetId, rows);
}

async function syncReceitas(spreadsheetId: string, rows: Record<string, unknown>[]): Promise<void> {
  const api = sheets();
  const incomes = rows.filter((r) => r["type"] === "income");
  await api.spreadsheets.values.clear({ spreadsheetId, range: "Receitas!A2:Z" });
  if (incomes.length) {
    await api.spreadsheets.values.append({
      spreadsheetId,
      range: "Receitas!A2",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: incomes.map((r) => [r["id"], r["description"], r["amount"], r["category"], r["date"], r["source"] ?? ""]),
      },
    });
  }
}

async function syncDespesas(spreadsheetId: string, rows: Record<string, unknown>[]): Promise<void> {
  const api = sheets();
  const expenses = rows.filter((r) => r["type"] === "expense");
  await api.spreadsheets.values.clear({ spreadsheetId, range: "Despesas!A2:Z" });
  if (expenses.length) {
    await api.spreadsheets.values.append({
      spreadsheetId,
      range: "Despesas!A2",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: expenses.map((r) => [
          r["id"], r["description"], r["amount"], r["category"],
          r["date"], r["paymentMethod"], r["nature"] ?? "", r["scope"] ?? "",
        ]),
      },
    });
  }
}

async function syncFluxo(spreadsheetId: string, rows: Record<string, unknown>[]): Promise<void> {
  const api = sheets();
  // Agrupa por data
  const byDate = new Map<string, { in: number; out: number }>();
  for (const r of rows) {
    const d = String(r["date"]).split("T")[0];
    const v = Number(r["amount"]) || 0;
    const prev = byDate.get(d) ?? { in: 0, out: 0 };
    if (r["type"] === "income") prev.in += v;
    else prev.out += v;
    byDate.set(d, prev);
  }
  const sorted = [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  let acc = 0;
  const values = sorted.map(([date, { in: inn, out }]) => {
    const result = inn - out;
    acc += result;
    return [date, inn.toFixed(2), out.toFixed(2), result.toFixed(2), acc.toFixed(2)];
  });
  await api.spreadsheets.values.clear({ spreadsheetId, range: "Fluxo de Caixa!A2:Z" });
  if (values.length) {
    await api.spreadsheets.values.append({
      spreadsheetId, range: "Fluxo de Caixa!A2",
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
  }
}

async function syncResumoMensal(spreadsheetId: string, rows: Record<string, unknown>[]): Promise<void> {
  const api = sheets();
  const byMonth = new Map<string, { in: number; out: number; count: number }>();
  for (const r of rows) {
    const d = String(r["date"]).slice(0, 7); // YYYY-MM
    const v = Number(r["amount"]) || 0;
    const prev = byMonth.get(d) ?? { in: 0, out: 0, count: 0 };
    if (r["type"] === "income") prev.in += v; else prev.out += v;
    prev.count += 1;
    byMonth.set(d, prev);
  }
  const sorted = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const values = sorted.map(([month, { in: inn, out, count }]) => {
    const result = inn - out;
    const pct = inn > 0 ? ((inn - out) / inn * 100).toFixed(1) : "0.0";
    return [month, inn.toFixed(2), out.toFixed(2), result.toFixed(2), count, `${pct}%`];
  });
  await api.spreadsheets.values.clear({ spreadsheetId, range: "Resumo Mensal!A2:Z" });
  if (values.length) {
    await api.spreadsheets.values.append({
      spreadsheetId, range: "Resumo Mensal!A2",
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
  }
}

export async function syncDebts(spreadsheetId: string, rows: Record<string, unknown>[]): Promise<void> {
  const api = sheets();
  await api.spreadsheets.values.clear({ spreadsheetId, range: "Dívidas!A2:Z" });
  if (rows.length) {
    await api.spreadsheets.values.append({
      spreadsheetId, range: "Dívidas!A2",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: rows.map((r) => [r["id"], r["name"], r["totalValue"], r["installmentValue"], r["dueDate"], r["priority"], r["status"]]),
      },
    });
  }
}

export async function syncGoals(spreadsheetId: string, rows: Record<string, unknown>[]): Promise<void> {
  const api = sheets();
  await api.spreadsheets.values.clear({ spreadsheetId, range: "Metas!A2:Z" });
  if (rows.length) {
    await api.spreadsheets.values.append({
      spreadsheetId, range: "Metas!A2",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: rows.map((r) => {
          const pct = Number(r["targetValue"]) > 0
            ? ((Number(r["currentValue"]) / Number(r["targetValue"])) * 100).toFixed(1)
            : "0.0";
          return [r["id"], r["name"], r["targetValue"], r["currentValue"], r["type"], `${pct}%`];
        }),
      },
    });
  }
}

export async function logSync(spreadsheetId: string, action: string, table: string, recordId: string): Promise<void> {
  const api = sheets();
  await api.spreadsheets.values.append({
    spreadsheetId, range: "Log de Sync!A2",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        `log-${Date.now()}`, action, table, recordId,
        new Date().toISOString(), "Sim",
      ]],
    },
  });
}
