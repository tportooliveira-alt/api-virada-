/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Teste estrutural offline da planilha:
 * mocka a API do Google Sheets, captura todos os requests gerados pelo
 * google-sheets.ts e valida o conteúdo (banner, KPIs, gráficos, formatos,
 * proteção, abas, formatos BRL/data/percent, etc.).
 *
 * Roda com: npx tsx scripts/test-sheets-build.ts
 */

import Module from "node:module";

const captured: { method: string; arg: any }[] = [];
let nextSheetId = 100;

function fakeSheetsApi() {
  return {
    spreadsheets: {
      create: async (arg: any) => {
        captured.push({ method: "spreadsheets.create", arg });
        const tabs = arg.requestBody?.sheets ?? [];
        return {
          data: {
            spreadsheetId: "fake-id",
            sheets: tabs.map((t: any) => ({ properties: { ...t.properties, sheetId: nextSheetId++ } })),
          },
        };
      },
      get: async (arg: any) => {
        captured.push({ method: "spreadsheets.get", arg });
        return {
          data: {
            sheets: [
              { properties: { title: "Dashboard", sheetId: 100 } },
              { properties: { title: "Lançamentos", sheetId: 101 } },
              { properties: { title: "Receitas", sheetId: 102 } },
              { properties: { title: "Despesas", sheetId: 103 } },
              { properties: { title: "Dívidas", sheetId: 104 } },
              { properties: { title: "Metas", sheetId: 105 } },
              { properties: { title: "Fluxo de Caixa", sheetId: 106 } },
              { properties: { title: "Resumo Mensal", sheetId: 107 } },
              { properties: { title: "Como usar", sheetId: 108 } },
            ],
          },
        };
      },
      batchUpdate: async (arg: any) => {
        captured.push({ method: "spreadsheets.batchUpdate", arg });
        return { data: {} };
      },
      values: {
        batchUpdate: async (arg: any) => {
          captured.push({ method: "values.batchUpdate", arg });
          return { data: {} };
        },
        batchClear: async (arg: any) => {
          captured.push({ method: "values.batchClear", arg });
          return { data: {} };
        },
        update: async (arg: any) => {
          captured.push({ method: "values.update", arg });
          return { data: {} };
        },
        clear: async (arg: any) => {
          captured.push({ method: "values.clear", arg });
          return { data: {} };
        },
        append: async (arg: any) => {
          captured.push({ method: "values.append", arg });
          return { data: {} };
        },
      },
    },
  };
}

// Monkey-patch googleapis ANTES do import do módulo testado
const origResolve = (Module as any)._resolveFilename;
(Module as any)._resolveFilename = function (request: string, ...rest: any[]) {
  if (request === "googleapis") return require.resolve("./fake-googleapis.cjs");
  return origResolve.call(this, request, ...rest);
};

// Cria fake module em memória
require.cache[require.resolve("./fake-googleapis.cjs")] = {
  id: require.resolve("./fake-googleapis.cjs"),
  filename: require.resolve("./fake-googleapis.cjs"),
  loaded: true,
  exports: {
    google: {
      auth: { GoogleAuth: class { constructor(_: any) {} } },
      sheets: () => fakeSheetsApi(),
    },
  },
} as any;

process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
  type: "service_account",
  client_email: "fake@fake.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----\n",
});

// ─── Asserts ─────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, hint?: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}${hint ? ` — ${hint}` : ""}`);
  }
}

async function main() {
  const mod = await import("../lib/sheets/google-sheets");

  console.log("\n[1] createSpreadsheet — monta a estrutura inicial");
  await mod.createSpreadsheet("Teste Virada");

  // Captura
  const create = captured.find((c) => c.method === "spreadsheets.create");
  const batches = captured.filter((c) => c.method === "spreadsheets.batchUpdate");
  const values = captured.filter((c) => c.method === "values.batchUpdate");

  // 9 abas criadas
  const tabs = create?.arg?.requestBody?.sheets ?? [];
  check("9 abas criadas", tabs.length === 9, `recebeu ${tabs.length}`);
  const expectedTabs = ["Dashboard", "Lançamentos", "Receitas", "Despesas", "Dívidas", "Metas", "Fluxo de Caixa", "Resumo Mensal", "Como usar"];
  for (const name of expectedTabs) {
    check(`aba "${name}" existe`, tabs.some((t: any) => t.properties.title === name));
  }
  check("locale pt_BR", create?.arg?.requestBody?.properties?.locale === "pt_BR");
  check("timezone São Paulo", create?.arg?.requestBody?.properties?.timeZone === "America/Sao_Paulo");

  // Layout requests
  const layoutReqs = batches.flatMap((b) => b.arg.requestBody.requests ?? []);
  check("requests de layout > 50", layoutReqs.length > 50, `recebeu ${layoutReqs.length}`);

  // Banner — repeatCell com fontSize 22 e bold
  const banner = layoutReqs.find((r: any) =>
    r.repeatCell?.cell?.userEnteredFormat?.textFormat?.fontSize === 22 &&
    r.repeatCell?.cell?.userEnteredFormat?.textFormat?.bold === true,
  );
  check("banner tem fonte 22 bold", !!banner);
  check("banner é dourado", banner?.repeatCell?.cell?.userEnteredFormat?.textFormat?.foregroundColor?.red > 0.9);
  check("banner fundo navy", banner?.repeatCell?.cell?.userEnteredFormat?.backgroundColor?.red < 0.1);

  // KPI cards — 4 merges 1x2 na linha 5-6
  const kpiMerges = layoutReqs.filter((r: any) =>
    r.mergeCells?.range?.startRowIndex === 5 && r.mergeCells?.range?.endRowIndex === 6,
  );
  check("4 KPI cards merged na linha 6", kpiMerges.length === 4, `recebeu ${kpiMerges.length}`);

  // Gráficos — 4 addChart
  const charts = layoutReqs.filter((r: any) => r.addChart);
  check("4 gráficos adicionados", charts.length === 4, `recebeu ${charts.length}`);
  const chartTypes = charts.map((c: any) => c.addChart.chart.spec.pieChart ? "PIE" : c.addChart.chart.spec.basicChart?.chartType);
  check("gráfico pizza", chartTypes.includes("PIE"));
  check("gráfico coluna", chartTypes.includes("COLUMN"));
  check("gráfico linha", chartTypes.includes("LINE"));
  check("gráfico barra", chartTypes.includes("BAR"));

  // Proteção — 9 protectedRanges (1 por aba)
  const protects = layoutReqs.filter((r: any) => r.addProtectedRange);
  check("9 abas protegidas (read-only)", protects.length === 9, `recebeu ${protects.length}`);
  for (const p of protects) {
    check(`aba ${p.addProtectedRange.protectedRange.description.substring(0, 30)} não é warningOnly`,
      p.addProtectedRange.protectedRange.warningOnly === false);
  }

  // Formato BRL — pelo menos 10 colunas com pattern de moeda
  const moneyFormats = layoutReqs.filter((r: any) =>
    r.repeatCell?.cell?.userEnteredFormat?.numberFormat?.type === "CURRENCY" &&
    r.repeatCell?.cell?.userEnteredFormat?.numberFormat?.pattern?.includes("R$"),
  );
  check("muitas colunas em BRL", moneyFormats.length >= 10, `recebeu ${moneyFormats.length}`);

  // Formato data
  const dateFormats = layoutReqs.filter((r: any) =>
    r.repeatCell?.cell?.userEnteredFormat?.numberFormat?.pattern === "dd/mm/yyyy",
  );
  check("colunas de data dd/mm/yyyy", dateFormats.length >= 4, `recebeu ${dateFormats.length}`);

  // Formato percent
  const pctFormats = layoutReqs.filter((r: any) =>
    r.repeatCell?.cell?.userEnteredFormat?.numberFormat?.type === "PERCENT",
  );
  check("colunas em percentual", pctFormats.length >= 2, `recebeu ${pctFormats.length}`);

  // Formatação condicional: positivo verde / negativo vermelho
  const condRules = layoutReqs.filter((r: any) => r.addConditionalFormatRule);
  check("formatações condicionais aplicadas (>=8)", condRules.length >= 8, `recebeu ${condRules.length}`);

  // Banding (zebra) em 7 abas de dados
  const bandings = layoutReqs.filter((r: any) => r.addBanding);
  check("banding (zebra) em 7 abas", bandings.length === 7, `recebeu ${bandings.length}`);

  // Auto-filter em 7 abas
  const filters = layoutReqs.filter((r: any) => r.setBasicFilter);
  check("auto-filter em 7 abas", filters.length === 7, `recebeu ${filters.length}`);

  // Hide gridlines (Dashboard + Como usar)
  const hideGrid = layoutReqs.filter((r: any) =>
    r.updateSheetProperties?.properties?.gridProperties?.hideGridlines === true,
  );
  check("gridlines escondidas em Dashboard + Como usar", hideGrid.length === 2);

  // Cabeçalhos das tabelas
  const valData = values.flatMap((v) => v.arg.requestBody.data ?? []);
  const headerLanc = valData.find((v: any) => v.range === "Lançamentos!A1");
  check("cabeçalho Lançamentos", headerLanc?.values[0]?.[0] === "Data");
  const headerReceitas = valData.find((v: any) => v.range === "Receitas!A1");
  check("cabeçalho Receitas", headerReceitas?.values[0]?.[3] === "Valor");
  const headerDividas = valData.find((v: any) => v.range === "Dívidas!A1");
  check("cabeçalho Dívidas", headerDividas?.values[0]?.[6] === "Em aberto");

  // Banner do Dashboard
  const dashBanner = valData.find((v: any) => v.range === "Dashboard!A1");
  check("banner Dashboard", dashBanner?.values[0]?.[0]?.includes("CÓDIGO DA VIRADA"));

  // Aba Como usar com 5 passos
  const helpHeader = valData.find((v: any) => v.range === "Como usar!A1");
  check("aba Como usar tem hero", !!helpHeader);
  const helpStepRanges = valData.filter((v: any) => /^Como usar!A\d+$/.test(v.range || ""));
  check("Como usar tem 5+ passos", helpStepRanges.length >= 5);

  // ─── Sync de dados ─────────────────────────────────────────────────────────
  console.log("\n[2] syncTransactions — limpa e popula dados");
  captured.length = 0;

  const transactions = [
    { id: "t1", type: "income",  description: "Salário",     amount: 3000, category: "Salário", date: "2026-04-15", paymentMethod: null, nature: null, scope: "casa", source: "app" },
    { id: "t2", type: "income",  description: "Venda extra", amount: 500,  category: "Renda extra", date: "2026-04-20", paymentMethod: null, nature: null, scope: "casa", source: "app" },
    { id: "t3", type: "expense", description: "Mercado",     amount: 800,  category: "Mercado", date: "2026-04-05", paymentMethod: "Pix", nature: "essencial", scope: "casa", source: "app" },
    { id: "t4", type: "expense", description: "Lazer",       amount: 250,  category: "Lazer", date: "2026-04-10", paymentMethod: "Crédito", nature: "impulso", scope: "casa", source: "app" },
    { id: "t5", type: "expense", description: "Cartão",      amount: 1200, category: "Cartão", date: "2026-04-22", paymentMethod: "Boleto", nature: "essencial", scope: "casa", source: "app" },
  ];
  await mod.syncTransactions("fake-id", transactions);

  const batchClears = captured.filter((c) => c.method === "values.batchClear");
  const batchUpds = captured.filter((c) => c.method === "values.batchUpdate");
  check("limpou abas (1 batchClear, 7 ranges)", batchClears.length === 1 && batchClears[0].arg.requestBody.ranges.length === 7);
  check("populou tudo num batch", batchUpds.length === 1);

  const valueRanges: any[] = batchUpds[0]?.arg.requestBody.data ?? [];
  const find = (prefix: string) => valueRanges.find((v) => v.range?.startsWith(prefix));

  const lanc = find("Lançamentos");
  check("Lançamentos com 5 linhas", lanc?.values.length === 5);
  check("data formatada dd/mm/yyyy", lanc?.values[0][0] === "05/04/2026");
  check("tipo legível em pt-BR", ["Entrada", "Saída"].includes(lanc?.values[0][1]));

  check("Receitas com 2 linhas", find("Receitas")?.values.length === 2);
  check("Despesas com 3 linhas", find("Despesas")?.values.length === 3);
  check("Fluxo com 5 dias", find("Fluxo de Caixa")?.values.length === 5);

  const res = find("Resumo Mensal");
  check("Resumo com 1 mês", res?.values.length === 1);
  check("Resumo entrada total = 3500", res?.values[0][1] === 3500);
  check("Resumo saída total = 2250", res?.values[0][2] === 2250);
  check("Resumo resultado = 1250", res?.values[0][3] === 1250);

  const ranges = valueRanges.map((v) => v.range);
  check("Dashboard B6 (entradas) atualizado", ranges.includes("Dashboard!B6"));
  check("Dashboard D6 (saídas) atualizado", ranges.includes("Dashboard!D6"));
  check("Dashboard F6 (saldo) atualizado", ranges.includes("Dashboard!F6"));
  check("Dashboard categorias atualizadas", ranges.includes("Dashboard!A11:B20"));

  // ─── Dívidas ───────────────────────────────────────────────────────────────
  console.log("\n[3] syncDebts — ordena e calcula valor em aberto");
  captured.length = 0;
  await mod.syncDebts("fake-id", [
    { id: "d1", name: "Boleto luz",     totalValue: 200,  installmentValue: 200,  dueDate: "2026-05-10", priority: "baixa",  status: "aberta" },
    { id: "d2", name: "Cartão Nubank",  totalValue: 1800, installmentValue: 600,  dueDate: "2026-05-05", priority: "alta",   status: "aberta" },
    { id: "d3", name: "Empréstimo BB",  totalValue: 5000, installmentValue: 500,  dueDate: "2026-05-15", priority: "média",  status: "negociando" },
    { id: "d4", name: "Antiga",         totalValue: 300,  installmentValue: 300,  dueDate: "2026-01-01", priority: "alta",   status: "quitada" },
  ]);
  const divBatch = captured.find((c) => c.method === "values.batchUpdate");
  const divRange = (divBatch?.arg.requestBody.data ?? []).find((d: any) => d.range?.startsWith("Dívidas"));
  const divRows = divRange?.values;
  check("Dívidas: 4 linhas", divRows?.length === 4);
  check("ordenado por prioridade (alta primeiro)", divRows?.[0][2] === "alta");
  check("quitada com 'em aberto' = 0", divRows?.find((r: any) => r[3] === "quitada")?.[6] === 0);
  check("aberta com 'em aberto' = totalValue", divRows?.find((r: any) => r[0] === "Cartão Nubank")?.[6] === 1800);

  // ─── Metas ─────────────────────────────────────────────────────────────────
  console.log("\n[4] syncGoals — calcula faltando e progresso");
  captured.length = 0;
  await mod.syncGoals("fake-id", [
    { id: "g1", name: "Reserva 6 meses", targetValue: 12000, currentValue: 3000, type: "reserva" },
    { id: "g2", name: "Quitar cartão",   targetValue: 1800,  currentValue: 1800, type: "dívida" },
  ]);
  const metasBatch = captured.find((c) => c.method === "values.batchUpdate");
  const metasRange = (metasBatch?.arg.requestBody.data ?? []).find((d: any) => d.range?.startsWith("Metas"));
  const metasRows = metasRange?.values;
  check("Metas: 2 linhas", metasRows?.length === 2);
  check("faltando calculado", metasRows?.[0][4] === 9000);
  check("progresso em decimal (0-1)", Math.abs(metasRows?.[0][5] - 0.25) < 0.001);
  check("meta cumprida = 1.0", metasRows?.[1][5] === 1);

  // ─── Resultado ─────────────────────────────────────────────────────────────
  console.log(`\nTotal: ${passed} passou, ${failed} falhou`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Erro inesperado:", err);
  process.exit(1);
});
