/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Teste estrutural offline da planilha — pelo CAMINHO VIVO.
 *
 * Até 12/09/2026 este teste importava `lib/sheets/google-sheets.ts` (wrapper de
 * servidor com a `googleapis` mockada). Aquele arquivo era a ÚNICA coisa que
 * sobrava dele: nenhuma tela, rota ou componente o usava, e ele repetia, em
 * outra ordem, a mesma sequência de chamadas do `lib/sheets/sync-runner.ts`.
 * Duas cópias da mesma lógica divergem, e a próxima pessoa conserta a errada —
 * então o wrapper foi apagado e o teste passou a montar EXATAMENTE os corpos que
 * o navegador do comprador manda ao Google, via `lib/sheets/sync-requests.ts`:
 *
 *   criarPlanilha : createWorkbookBody → layoutCall → staticValuesCall → chartsCall
 *   mandarDados   : pushDataCalls (batchClear + batchUpdate)
 *
 * Continua sem rede e sem credencial: só corpos de request e os valores gerados.
 *
 * Roda com: npx tsx scripts/test-sheets-build.ts
 */

import { buildStaticValues, dataClearRange, type SyncInput } from "../lib/sheets/builder";
import { chartsCall, createWorkbookBody, layoutCall, pushDataCalls, readSheetIds, staticValuesCall, type SpreadsheetInfo } from "../lib/sheets/sync-requests";
// Dashboard, "Em aberto", Faltando/Progresso e Resultado são FÓRMULAS (v3):
// o número vem do mini-avaliador rodando a fórmula sobre o que o sync gravou.
import { montarPasta } from "./planilha-avaliador";

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

/** O que o Google devolve no POST /spreadsheets: as mesmas abas, já com id. */
function respostaDoGoogle(body: ReturnType<typeof createWorkbookBody>): SpreadsheetInfo {
  return { spreadsheetId: "fake-id", sheets: body.sheets.map((s: any, i: number) => ({ properties: { ...s.properties, sheetId: 100 + i } })) };
}

function main() {
  console.log("\n[1] criar planilha — a estrutura inicial (createWorkbookBody + layout + estático + gráficos)");

  const create = createWorkbookBody("comprador@exemplo.com");
  const ids = readSheetIds(respostaDoGoogle(create));
  // As duas chamadas :batchUpdate do criarPlanilha, na ordem em que o app manda.
  const layoutReqs: any[] = [...(layoutCall(ids).requests as any[]), ...(chartsCall(ids).requests as any[])];
  const valData: any[] = staticValuesCall().data as any[];

  const tabs = create.sheets ?? [];
  check("11 abas criadas", tabs.length === 11, `recebeu ${tabs.length}`);
  const expectedTabs = ["Dashboard", "Bolsos", "Filtros", "Lançamentos", "Receitas", "Despesas", "Dívidas", "Metas", "Fluxo de Caixa", "Resumo Mensal", "Como usar"];
  for (const name of expectedTabs) {
    check(`aba "${name}" existe`, tabs.some((t: any) => t.properties.title === name));
  }
  check("locale pt_BR", create.properties?.locale === "pt_BR");
  check("timezone São Paulo", create.properties?.timeZone === "America/Sao_Paulo");
  check("título leva o e-mail do comprador", String(create.properties?.title).includes("comprador@exemplo.com"));
  check("valueInputOption USER_ENTERED (fórmula vira fórmula)", staticValuesCall().valueInputOption === "USER_ENTERED");
  check("todas as abas ganharam id (readSheetIds)", expectedTabs.every((t) => typeof ids[t] === "number"));

  check("requests de layout > 50", layoutReqs.length > 50, `recebeu ${layoutReqs.length}`);

  // Banner (v2) — repeatCell com fontSize 18 bold, texto branco sobre ink (#0F172A)
  const banner = layoutReqs.find((r: any) =>
    r.repeatCell?.cell?.userEnteredFormat?.textFormat?.fontSize === 18 &&
    r.repeatCell?.cell?.userEnteredFormat?.textFormat?.bold === true,
  );
  check("banner tem fonte 18 bold", !!banner);
  check("banner é branco", banner?.repeatCell?.cell?.userEnteredFormat?.textFormat?.foregroundColor?.red > 0.99);
  check("banner fundo ink", banner?.repeatCell?.cell?.userEnteredFormat?.backgroundColor?.red < 0.1);

  // KPI cards — 4 merges do dashboard na linha 6
  const kpiMerges = layoutReqs.filter((r: any) =>
    r.mergeCells?.range?.startRowIndex === 5 &&
    r.mergeCells?.range?.endRowIndex === 6 &&
    [0, 3, 6, 9].includes(r.mergeCells?.range?.startColumnIndex),
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

  // Proteção — 11 protectedRanges (1 por aba)
  const protects = layoutReqs.filter((r: any) => r.addProtectedRange);
  check("11 abas protegidas (read-only)", protects.length === 11, `recebeu ${protects.length}`);
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

  // Banding (zebra) em 7 abas de dados + 2 áreas do dashboard + 2 tabelas dos Bolsos
  const bandings = layoutReqs.filter((r: any) => r.addBanding);
  check("banding (zebra) nas áreas esperadas", bandings.length === 11, `recebeu ${bandings.length}`);

  // Menus da aba Filtros: 5 validações de dados apontando pras listas — e
  // strict, senão o que a pessoa digitar errado zera os totais sem avisar.
  const validations = layoutReqs.filter((r: any) => r.setDataValidation);
  check("5 menus (validação de dados) na aba Filtros", validations.length === 5, `recebeu ${validations.length}`);
  check("menus recusam valor fora da lista (strict)", validations.every((v: any) => v.setDataValidation.rule.strict === true));

  // Auto-filter em 7 abas
  const filters = layoutReqs.filter((r: any) => r.setBasicFilter);
  check("auto-filter em 7 abas", filters.length === 7, `recebeu ${filters.length}`);

  // Hide gridlines (Dashboard, Bolsos, Filtros, Como usar)
  const hideGrid = layoutReqs.filter((r: any) =>
    r.updateSheetProperties?.properties?.gridProperties?.hideGridlines === true,
  );
  check("gridlines escondidas em Dashboard + Bolsos + Filtros + Como usar", hideGrid.length === 4, `recebeu ${hideGrid.length}`);

  // Cabeçalhos das tabelas
  const headerLanc = valData.find((v: any) => v.range === "Lançamentos!A1");
  check("cabeçalho Lançamentos", headerLanc?.values[0]?.[0] === "Data");
  const headerReceitas = valData.find((v: any) => v.range === "Receitas!A1");
  check("cabeçalho Receitas", headerReceitas?.values[0]?.[3] === "Valor");
  const headerDividas = valData.find((v: any) => v.range === "Dívidas!A1");
  check("cabeçalho Dívidas", headerDividas?.values[0]?.[6] === "Pago" && headerDividas?.values[0]?.[7] === "Em aberto");
  check("cabeçalho Lançamentos termina em Mês/Estornado/Bolso + Anotações", JSON.stringify(headerLanc?.values[0]?.slice(9)) === JSON.stringify(["Mês", "Estornado", "Bolso", "Anotações"]));
  const kpiA6 = valData.find((v: any) => v.range === "Dashboard!A6");
  check("Dashboard A6 é fórmula SOMASES sobre Lançamentos", String(kpiA6?.values[0]?.[0]).startsWith("=SOMASES('Lançamentos'!"));
  check("Filtros!B10 (Entradas) é fórmula", String(valData.find((v: any) => v.range === "Filtros!A10:B14")?.values[0]?.[1]).startsWith("=SOMASES("));
  // A lista dos menus nasce com "Todos": menu strict apontando pra faixa vazia
  // deixaria a planilha recém-criada sem nenhuma opção válida.
  const seed = valData.find((v: any) => v.range === "Filtros!H4:L4");
  check("listas dos menus nascem com \"Todos\"", JSON.stringify(seed?.values) === JSON.stringify([["Todos", "Todos", "Todos", "Todos", "Todos"]]));
  check("a lista vem antes do \"Todos\" gravado nos menus", valData.indexOf(seed) < valData.findIndex((v: any) => v.range === "Filtros!A4:D8"));

  // Banner do Dashboard
  const dashBanner = valData.find((v: any) => v.range === "Dashboard!A1");
  check("banner Dashboard", dashBanner?.values[0]?.[0]?.includes("CÓDIGO DA VIRADA"));

  // Aba Como usar com 5 passos
  const helpHeader = valData.find((v: any) => v.range === "Como usar!A1");
  check("aba Como usar tem hero", !!helpHeader);
  const helpStepRanges = valData.filter((v: any) => /^Como usar!A\d+$/.test(v.range || "") && v.range !== "Como usar!A1");
  check("Como usar tem 6 passos (Filtros, Bolsos e Anotações explicados)", helpStepRanges.length === 6, `recebeu ${helpStepRanges.length}`);
  const helpTexto = valData.filter((v: any) => String(v.range).startsWith("Como usar!")).map((v: any) => JSON.stringify(v.values)).join(" ");
  check("Como usar fala de Filtros, Bolsos e Anotações", helpTexto.includes("Filtros") && helpTexto.includes("Bolsos") && helpTexto.includes("Anotações"));

  // ─── Sync de dados ─────────────────────────────────────────────────────────
  // Um envio só, como no app: pushDataCalls manda tudo (lançamentos, dívidas e
  // metas) no mesmo batch. Não existe mais "sincronizar só as dívidas".
  console.log("\n[2] mandar dados — limpa e popula tudo num batch (pushDataCalls)");

  const entrada: SyncInput = {
    incomes: [
      { id: "t1", description: "Salário", value: 3000, category: "Salário", date: "2026-04-15", scope: "casa", source: "app" },
      { id: "t2", description: "Venda extra", value: 500, category: "Renda extra", date: "2026-04-20", scope: "casa", source: "app" },
    ],
    expenses: [
      { id: "t3", description: "Mercado", value: 800, category: "Mercado", date: "2026-04-05", paymentMethod: "Pix", nature: "essencial", scope: "casa", source: "app" },
      { id: "t4", description: "Lazer", value: 250, category: "Lazer", date: "2026-04-10", paymentMethod: "Crédito", nature: "impulso", scope: "casa", source: "app" },
      { id: "t5", description: "Cartão", value: 1200, category: "Cartão", date: "2026-04-22", paymentMethod: "Boleto", nature: "essencial", scope: "casa", source: "app" },
    ],
    debts: [
      { id: "d1", name: "Boleto luz", totalValue: 200, installmentValue: 200, dueDate: "2026-05-10", priority: "baixa", status: "aberta" },
      { id: "d2", name: "Cartão Nubank", totalValue: 1800, installmentValue: 600, dueDate: "2026-05-05", priority: "alta", status: "aberta" },
      { id: "d3", name: "Empréstimo BB", totalValue: 5000, installmentValue: 500, dueDate: "2026-05-15", priority: "média", status: "negociando" },
      { id: "d4", name: "Antiga", totalValue: 300, installmentValue: 300, dueDate: "2026-01-01", priority: "alta", status: "quitada", paidValue: 300 },
    ],
    goals: [
      { id: "g1", name: "Reserva 6 meses", targetValue: 12000, currentValue: 3000, type: "reserva" },
      { id: "g2", name: "Quitar cartão", targetValue: 1800, currentValue: 1800, type: "dívida" },
    ],
  };
  const { clear, update } = pushDataCalls(entrada);

  check("limpou abas, blocos do dashboard e listas dos menus", clear?.ranges.length === 10, `recebeu ${clear?.ranges.length}`);
  // B10: a limpeza ia até a coluna Z e apagava os rótulos/notas escritos só na
  // criação. Vai só até a última coluna de dados, e aberta (sem linha final) pra
  // não deixar linha fantasma depois da última.
  check("Dívidas limpa A2:H (não A2:Z1000)", !!clear?.ranges.includes(dataClearRange("dividas")) && dataClearRange("dividas") === "Dívidas!A2:H");
  check("Metas limpa A2:F (não A2:Z1000)", !!clear?.ranges.includes(dataClearRange("metas")) && dataClearRange("metas") === "Metas!A2:F");
  check("dados vão num batch só, USER_ENTERED", update?.valueInputOption === "USER_ENTERED");

  const valueRanges: any[] = update?.data ?? [];
  const find = (prefix: string) => valueRanges.find((v) => v.range?.startsWith(prefix));
  const pasta = montarPasta(buildStaticValues(), valueRanges);

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
  check("Resumo resultado é fórmula B2-C2", res?.values[0][3] === "=B2-C2");
  check("Resumo resultado avaliado = 1250", pasta.ler("Resumo Mensal!D2") === 1250);

  const ranges = valueRanges.map((v) => v.range);
  check("Dashboard B3 (mês de referência) atualizado", ranges.includes("Dashboard!B3"));
  check("Dashboard categorias (nomes) atualizadas", ranges.includes("Dashboard!A12:A21"));
  check("Dashboard A8 (fórmula) = 3500", pasta.ler("Dashboard!A8") === 3500);
  check("Dashboard D8 (fórmula) = 2250", pasta.ler("Dashboard!D8") === 2250);
  check("Dashboard G8 (fórmula) = 1250", pasta.ler("Dashboard!G8") === 1250);
  check("listas dos menus atualizadas (Filtros!H4..L4)", ["H", "I", "J", "K", "L"].every((c) => ranges.includes(`Filtros!${c}4`)));
  check("Bolsos: renda e fase atualizadas", ranges.includes("Bolsos!B4:C4") && ranges.includes("Bolsos!B5:C5"));

  // ─── Dívidas ───────────────────────────────────────────────────────────────
  console.log("\n[3] Dívidas — ordena e calcula valor em aberto");
  const divRows = find("Dívidas")?.values;
  check("Dívidas: 4 linhas", divRows?.length === 4);
  check("ordenado por prioridade (alta primeiro)", divRows?.[0][2] === "alta");
  const linhaDiv = (nome: string) => divRows.findIndex((r: any) => r[0] === nome) + 2;
  check("'em aberto' é fórmula SE(quitada;0;MÁXIMO(0;total−pago))", String(divRows?.[0][7]).startsWith("=SE(D2=\"quitada\";0;MÁXIMO(0;F2-G2))"));
  check("quitada com 'em aberto' = 0", pasta.ler(`Dívidas!H${linhaDiv("Antiga")}`) === 0);
  check("aberta sem pagamento: 'em aberto' = totalValue", pasta.ler(`Dívidas!H${linhaDiv("Cartão Nubank")}`) === 1800);
  check("'pago' = 0 quando não há paidValue", divRows?.find((r: any) => r[0] === "Cartão Nubank")?.[6] === 0);

  // ─── Metas ─────────────────────────────────────────────────────────────────
  console.log("\n[4] Metas — calcula faltando e progresso");
  const metasRows = find("Metas")?.values;
  check("Metas: 2 linhas", metasRows?.length === 2);
  check("faltando é fórmula MÁXIMO(0;C−D)", metasRows?.[0][4] === "=MÁXIMO(0;C2-D2)");
  check("faltando calculado = 9000", pasta.ler("Metas!E2") === 9000);
  check("progresso em decimal (0-1)", Math.abs(Number(pasta.ler("Metas!F2")) - 0.25) < 0.001);
  check("meta cumprida = 1.0", pasta.ler("Metas!F3") === 1);

  // ─── Locale pt_BR: nada de ponto decimal em valor digitado ─────────────────
  // A planilha nasce com locale pt_BR, então userEnteredValue é lido como o
  // usuário digitaria: decimal com VÍRGULA. Com ponto, a API recusa o batch
  // inteiro (400 INVALID_ARGUMENT) e a planilha fica sem layout nenhum.
  {
    const comPonto: string[] = [];
    JSON.stringify([layoutReqs, valData, valueRanges], (key, value) => {
      if (key === "userEnteredValue" && typeof value === "string" && /^-?\d+\.\d+$/.test(value)) {
        comPonto.push(value);
      }
      return value;
    });
    check(
      comPonto.length ? `condições sem ponto decimal (pt_BR) — achei ${comPonto.join(", ")}` : "condições sem ponto decimal (pt_BR)",
      comPonto.length === 0,
    );
  }

  // ─── SPARKLINE: sintaxe pt-BR obrigatória ──────────────────────────────────
  // A planilha nasce em pt_BR e o valor vai como USER_ENTERED: "MAX(" ou "," no
  // lugar de "MÁXIMO(" e ";" dá #NOME?/#ERROR! na célula. Este assert quebra se
  // alguém "traduzir" a fórmula de volta para o inglês.
  console.log("\n[5] sparkBar — sintaxe pt-BR (SE/MÁXIMO/MÍNIMO, ';' e '\\')");
  {
    const sparks = valData.filter((v: any) => v.range === "Dashboard!C12:C21" || v.range === "Dashboard!K12:K21")
      .flatMap((v: any) => v.values.map((row: any[]) => String(row[0])));
    check("20 fórmulas SPARKLINE no Dashboard", sparks.length === 20, `recebeu ${sparks.length}`);
    check("todas começam com =SE(", sparks.every((f: string) => f.startsWith("=SE(")));
    check("todas usam MÁXIMO( e MÍNIMO( (pt-BR)", sparks.every((f: string) => f.includes("MÁXIMO(") && f.includes("MÍNIMO(")));
    check("nenhuma usa MAX( / MIN( / IF( (inglês)", sparks.every((f: string) => !/\b(MAX|MIN|IF)\(/.test(f)));
    check("nenhuma vírgula — separador é ';'", sparks.every((f: string) => !f.includes(",")));
    check("literal de matriz com '\\' entre colunas", sparks.every((f: string) => f.includes('"charttype"\\"bar"')));
    check("mês negativo NÃO some (sem 'N(x)>0'; usa ABS)", sparks.every((f: string) => !f.includes(")>0;") && f.includes("ABS(")));
  }

  // ─── Resultado ─────────────────────────────────────────────────────────────
  console.log(`\nTotal: ${passed} passou, ${failed} falhou`);
  if (failed > 0) process.exit(1);
}

main();
