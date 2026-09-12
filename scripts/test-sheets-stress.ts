/**
 * Massa de dados na planilha: 360 lançamentos (smoke) e o limite de linhas.
 *
 * B5 (auditoria): os dados começam em A2, então o 1000º lançamento cai na linha
 * 1001 — a limpeza antiga ia só até a 1000 e essa linha virava fantasma
 * permanente. A limpeza agora é aberta ("A2:I", até o fim da coluna) e tem que
 * cobrir a última linha escrita com 1.000 E com 1.001 lançamentos.
 *
 * Roda com: npx tsx scripts/test-sheets-stress.ts
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { GRADE_INICIAL, HEADERS, TAB, buildLayoutRequests, buildStaticValues, buildSyncBatch, MAX_DATA_ROWS, type SyncInput } from "../lib/sheets/builder";
import { growGridCall, precisaCrescer, upgradeLayoutCall, type SpreadsheetInfo } from "../lib/sheets/sync-requests";
import { montarPasta } from "./planilha-avaliador";

function dateByIndex(i: number) {
  const day = (i % 28) + 1;
  return `2026-04-${String(day).padStart(2, "0")}`;
}

function makeInput(total: number): SyncInput {
  const half = Math.floor(total / 2);

  const incomes: SyncInput["incomes"] = Array.from({ length: half }, (_, i) => ({
    id: `inc-${i + 1}`,
    description: `Receita ${i + 1}`,
    value: 100 + (i % 23) * 7,
    category: i % 2 === 0 ? "Venda" : "Renda extra",
    date: dateByIndex(i),
    scope: i % 3 === 0 ? "empresa" : "casa",
    source: "app",
  }));

  const expenses: SyncInput["expenses"] = Array.from({ length: total - half }, (_, i) => ({
    id: `exp-${i + 1}`,
    description: `Despesa ${i + 1}`,
    value: 50 + (i % 19) * 5,
    category: i % 2 === 0 ? "Mercado" : "Marketing",
    date: dateByIndex(i),
    paymentMethod: i % 2 === 0 ? "Pix" : "Crédito",
    nature: i % 4 === 0 ? "impulso" : "essencial",
    scope: i % 3 === 0 ? "empresa" : "casa",
    source: "app",
  }));

  const debts: SyncInput["debts"] = Array.from({ length: 24 }, (_, i) => ({
    id: `debt-${i + 1}`,
    name: `Divida ${i + 1}`,
    totalValue: 1000 + i * 120,
    installmentValue: 120 + i * 10,
    dueDate: `2026-05-${String((i % 28) + 1).padStart(2, "0")}`,
    priority: i % 3 === 0 ? "alta" : i % 3 === 1 ? "média" : "baixa",
    status: i % 5 === 0 ? "quitada" : i % 2 === 0 ? "aberta" : "negociando",
  }));

  const goals: SyncInput["goals"] = Array.from({ length: 12 }, (_, i) => ({
    id: `goal-${i + 1}`,
    name: `Meta ${i + 1}`,
    targetValue: 5000 + i * 800,
    currentValue: 800 + i * 420,
    type: i % 2 === 0 ? "reserva" : "economia",
  }));

  return { incomes, expenses, debts, goals };
}

function must(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

// Última linha que uma limpeza "Aba!A2:I" ou "Aba!A2:I1000" alcança (Infinity = até o fim).
function clearEndRow(range: string) {
  const end = range.split("!")[1].split(":")[1] ?? "";
  const digits = end.replace(/[A-Z]+/, "");
  return digits ? Number(digits) : Infinity;
}

function smoke() {
  const TOTAL_LANCAMENTOS = 360;
  const input = makeInput(TOTAL_LANCAMENTOS);
  const batch = buildSyncBatch(input);

  const ranges = new Map(batch.valueRanges.map((r) => [r.range, r.values]));

  const lancamentos = ranges.get("Lançamentos!A2") ?? [];
  const receitas = ranges.get("Receitas!A2") ?? [];
  const despesas = ranges.get("Despesas!A2") ?? [];
  const fluxo = ranges.get("Fluxo de Caixa!A2") ?? [];
  const resumo = ranges.get("Resumo Mensal!A2") ?? [];

  must(lancamentos.length === TOTAL_LANCAMENTOS, `Lançamentos esperado ${TOTAL_LANCAMENTOS}, veio ${lancamentos.length}`);
  must(receitas.length === input.incomes.length, `Receitas esperado ${input.incomes.length}, veio ${receitas.length}`);
  must(despesas.length === input.expenses.length, `Despesas esperado ${input.expenses.length}, veio ${despesas.length}`);
  must(fluxo.length > 0, "Fluxo vazio");
  must(resumo.length > 0, "Resumo vazio");

  // J6 é o mês corrente (igual ao Início do app); o histórico inteiro fica em J8
  // — fórmula CONT.SE sobre a aba Lançamentos, avaliada aqui.
  const dashboardTotal = montarPasta(buildStaticValues(), batch.valueRanges).ler("Dashboard!J8");
  must(Number(dashboardTotal) === TOTAL_LANCAMENTOS, `Dashboard J8 esperado ${TOTAL_LANCAMENTOS}, veio ${String(dashboardTotal)}`);
  must(!precisaCrescer(batch.linhas), "360 lançamentos cabem na grade inicial");

  console.log("STRESS OK");
  console.log(`Lançamentos: ${lancamentos.length}`);
  console.log(`Receitas: ${receitas.length}`);
  console.log(`Despesas: ${despesas.length}`);
  console.log(`Fluxo (dias): ${fluxo.length}`);
  console.log(`Resumo (meses): ${resumo.length}`);
}

function limiteDeLinhas() {
  for (const total of [MAX_DATA_ROWS, MAX_DATA_ROWS + 1]) {
    const batch = buildSyncBatch(makeInput(total));
    const escritas = batch.valueRanges.find((r) => r.range === "Lançamentos!A2")?.values.length ?? 0;
    const ultimaLinha = 2 + escritas - 1;
    const clear = batch.clearRanges.find((r) => r.startsWith("Lançamentos!A2:L"));
    must(escritas === total, `${total}: esperava ${total} linhas escritas, veio ${escritas}`);
    must(!!clear, `${total}: falta limpeza de Lançamentos`);
    must(clearEndRow(clear!) >= ultimaLinha, `${total}: limpeza (${clear}) não alcança a linha ${ultimaLinha} — viraria linha fantasma`);
    for (const r of batch.clearRanges.filter((x) => !x.startsWith("Dashboard!"))) {
      must(clearEndRow(r) === Infinity, `${total}: limpeza de aba de dados deve ser aberta (até o fim da coluna): ${r}`);
    }
    console.log(`LIMITE OK — ${total} lançamentos: escreve A2..A${ultimaLinha}, limpeza ${clear}`);
  }
  // Com 1.000 lançamentos a última linha (1001) ainda está dentro da faixa de
  // formato/filtro/zebra (MAX_DATA_ROWS + 1). Acima disso a linha continua sendo
  // limpa (limpeza aberta), mas fica sem formatação. A grade nasce com +10 e
  // cresce por appendDimension quando os dados passam dela (growGridCall).
  must(!precisaCrescer(buildSyncBatch(makeInput(MAX_DATA_ROWS + 9)).linhas), `${MAX_DATA_ROWS + 9} lançamentos ainda cabem na grade inicial`);
  must(precisaCrescer(buildSyncBatch(makeInput(MAX_DATA_ROWS + 10)).linhas), `${MAX_DATA_ROWS + 10} lançamentos: precisa crescer a grade antes do batchUpdate`);
  console.log("GRADE OK — cresce a partir de 1.010 lançamentos");
}

// Juiz (rodada 1): com 1.050 lançamentos o appendDimension passava, mas as linhas
// 1002..1051 ficavam sem R$ na coluna Valor, sem zebra, fora do filtro básico e
// com Anotações BLOQUEADA. Crescer a grade tem que levar junto proteção, filtro,
// zebra, altura e formatos da faixa nova — e o upgrade de layout numa planilha
// já crescida não pode encolher nada de volta pra 1.001.
function gradeCresce() {
  const TOTAL = MAX_DATA_ROWS + 50; // 1.050 → última linha 1.051
  const batch = buildSyncBatch(makeInput(TOTAL));
  const titulos = Object.values(TAB);
  const ids = Object.fromEntries(titulos.map((t, i) => [t, 100 + i]));
  const info: SpreadsheetInfo = {
    sheets: titulos.map((title, i) => ({
      properties: { title, sheetId: 100 + i, gridProperties: { rowCount: MAX_DATA_ROWS + 10, columnCount: 16 } },
      protectedRanges: [{ protectedRangeId: 900 + i }],
      bandedRanges: [{ bandedRangeId: 800 + i }],
    })),
  };
  const grow = growGridCall(info, batch.linhas);
  must(!!grow, "1.050 lançamentos: growGridCall devolve requests");
  const reqs = grow!.requests as any[];
  const sid = ids[TAB.lancamentos];
  const deLanc = (r: any) => JSON.stringify(r).includes(`"sheetId":${sid}`);
  const lanc = reqs.filter(deLanc);
  const ULTIMA = TOTAL + 1; // linha 1.051 (índice 1.051 = endRowIndex mínimo)

  const append = lanc.find((r) => r.appendDimension);
  must(!!append && append.appendDimension.dimension === "ROWS", "Lançamentos: appendDimension ROWS");
  const novoRowCount = MAX_DATA_ROWS + 10 + append!.appendDimension.length;
  must(novoRowCount >= ULTIMA, `grade nova (${novoRowCount}) alcança a linha ${ULTIMA}`);

  const prot = lanc.find((r) => r.updateProtectedRange);
  const livre = prot?.updateProtectedRange?.protectedRange?.unprotectedRanges?.[0];
  must(!!prot && prot.updateProtectedRange.protectedRange.protectedRangeId === 900 + titulos.indexOf(TAB.lancamentos), "Lançamentos: updateProtectedRange usa o protectedRangeId da aba");
  must(String(prot?.updateProtectedRange?.fields ?? "").includes("unprotectedRanges"), "updateProtectedRange: fields = unprotectedRanges");
  must(!!livre && livre.endRowIndex >= ULTIMA, `Anotações continua livre até a linha ${ULTIMA} (endRowIndex=${livre?.endRowIndex})`);
  must(livre.startColumnIndex === (HEADERS.lancamentos ?? []).length && livre.startRowIndex === 1, "faixa livre = só a coluna Anotações, linhas 2+");

  const filtro = lanc.find((r) => r.setBasicFilter);
  must(!!filtro && filtro.setBasicFilter.filter.range.endRowIndex >= ULTIMA, `filtro básico alcança a linha ${ULTIMA} (${filtro?.setBasicFilter?.filter?.range?.endRowIndex})`);
  must(filtro.setBasicFilter.filter.range.endColumnIndex === (HEADERS.lancamentos ?? []).length, "filtro básico cobre só as colunas geradas");

  const zebra = lanc.find((r) => r.updateBanding);
  must(!!zebra && zebra.updateBanding.bandedRange.range.endRowIndex >= ULTIMA && zebra.updateBanding.bandedRange.bandedRangeId === 800 + titulos.indexOf(TAB.lancamentos), "zebra (updateBanding) alcança a faixa nova");

  const cobre = (r: any) => r.repeatCell.range.startRowIndex <= GRADE_INICIAL && r.repeatCell.range.endRowIndex >= ULTIMA;
  const fmts = lanc.filter((r) => r.repeatCell && cobre(r));
  const moeda = fmts.find((r) => r.repeatCell.range.startColumnIndex === 4 && r.repeatCell.cell.userEnteredFormat.numberFormat?.type === "CURRENCY");
  const data = fmts.find((r) => r.repeatCell.range.startColumnIndex === 0 && r.repeatCell.cell.userEnteredFormat.numberFormat?.type === "DATE");
  must(!!moeda, "coluna Valor (E) ganha R$ nas linhas novas");
  must(!!data, "coluna Data (A) ganha formato de data nas linhas novas");
  must(fmts.some((r) => r.repeatCell.range.startColumnIndex === 0 && r.repeatCell.range.endColumnIndex === (HEADERS.lancamentos ?? []).length && String(r.repeatCell.fields).includes("borders")), "bordas nas linhas novas");
  must(fmts.some((r) => r.repeatCell.range.startColumnIndex === (HEADERS.lancamentos ?? []).length), "estilo da coluna Anotações nas linhas novas");
  must(lanc.some((r) => r.updateDimensionProperties?.range?.dimension === "ROWS" && r.updateDimensionProperties.range.endIndex >= ULTIMA), "altura das linhas novas");

  // Receitas tem 525 linhas: cabe — nenhum request pra ela
  must(!reqs.some((r) => JSON.stringify(r).includes(`"sheetId":${ids[TAB.receitas]}`)), "Receitas (525 linhas) não é tocada");

  // GET antigo, sem ids de proteção/zebra: cresce e formata mesmo assim, sem quebrar
  const semIds: SpreadsheetInfo = { sheets: info.sheets!.map((s) => ({ properties: s.properties })) };
  const grow2 = growGridCall(semIds, batch.linhas)!.requests as any[];
  must(grow2.some((r) => r.appendDimension) && grow2.some((r) => r.setBasicFilter) && !grow2.some((r) => r.updateProtectedRange) && !grow2.some((r) => r.updateBanding), "sem ids: appendDimension + filtro + formatos, sem updateProtectedRange/updateBanding");

  // upgrade numa planilha já crescida (rowCount 1.060): o layout não encolhe filtro/proteção de volta
  const crescida: SpreadsheetInfo = { sheets: info.sheets!.map((s) => ({ ...s, properties: { ...s.properties, gridProperties: { rowCount: s.properties!.title === TAB.lancamentos ? 1060 : MAX_DATA_ROWS + 10, columnCount: 16 } } })) };
  const up = upgradeLayoutCall(crescida, ids).requests as any[];
  const upFiltro = up.find((r) => r.setBasicFilter?.filter?.range?.sheetId === sid);
  const upProt = up.find((r) => r.addProtectedRange?.protectedRange?.range?.sheetId === sid);
  must(upFiltro?.setBasicFilter.filter.range.endRowIndex === 1060, `upgrade: filtro de Lançamentos vai até o rowCount real (1.060), veio ${upFiltro?.setBasicFilter.filter.range.endRowIndex}`);
  must(upProt?.addProtectedRange.protectedRange.unprotectedRanges[0].endRowIndex === 1060, "upgrade: Anotações livre até o rowCount real (1.060)");
  const upReceitas = up.find((r) => r.setBasicFilter?.filter?.range?.sheetId === ids[TAB.receitas]);
  must(upReceitas?.setBasicFilter.filter.range.endRowIndex === GRADE_INICIAL, `upgrade: aba não crescida continua na grade inicial (${GRADE_INICIAL})`);
  // sem info de grade (criação), o layout formata a grade inicial inteira
  const padrao = buildLayoutRequests(ids) as any[];
  must(padrao.find((r) => r.setBasicFilter?.filter?.range?.sheetId === sid)?.setBasicFilter.filter.range.endRowIndex === GRADE_INICIAL, `criação: filtro até ${GRADE_INICIAL} (grade inteira)`);
  must(padrao.find((r) => r.addProtectedRange?.protectedRange?.range?.sheetId === sid)?.addProtectedRange.protectedRange.unprotectedRanges[0].endRowIndex === GRADE_INICIAL, "criação: Anotações livre até o fim da grade");
  // regras de cor das abas de dados não têm fim de linha: valem pra faixa que crescer
  const regrasLanc = padrao.filter((r) => r.addConditionalFormatRule?.rule?.ranges?.[0]?.sheetId === sid);
  must(regrasLanc.length > 0 && regrasLanc.every((r) => r.addConditionalFormatRule.rule.ranges[0].endRowIndex === undefined && r.addConditionalFormatRule.rule.ranges[0].startRowIndex === 1), "regras condicionais de Lançamentos: da linha 2 até o fim da coluna");
  must(padrao.filter((r) => r.addConditionalFormatRule?.rule?.ranges?.[0]?.sheetId === ids[TAB.dashboard]).every((r) => typeof r.addConditionalFormatRule.rule.ranges[0].endRowIndex === "number"), "regras do Dashboard continuam com fim de linha");

  console.log(`CRESCIMENTO OK — ${TOTAL} lançamentos: grade ${novoRowCount}, proteção/filtro/zebra/formatos até ≥ ${ULTIMA}`);
}

smoke();
limiteDeLinhas();
gradeCresce();
