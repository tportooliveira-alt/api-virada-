/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * test-planilha-upgrade.ts — a planilha de quem JÁ comprou, quando o app novo
 * alcança ela.
 *
 * Todas as planilhas vivas hoje no Drive do dono estão no layout ANTIGO (9 abas,
 * `LAYOUT_VERSION = "2026-09-04.1"`, painel lateral em J:K, sem `Bolsos` e sem
 * `Filtros`). O layout deste branch tem 11 abas e reescreve o Dashboard inteiro.
 * Ou seja: no dia em que este código subir, o primeiro "Atualizar agora" de cada
 * cliente vai rodar o `upgradeLayout` EM CIMA de uma planilha que ele usa.
 *
 * Isso não tem ensaio: se o upgrade errar, ele erra na planilha de alguém que
 * pagou, com os lançamentos dentro. Este teste é o ensaio possível sem
 * credencial — ele:
 *
 *   1. reconstrói a planilha antiga a partir do builder REAL de `origin/main`
 *      (`git show`, transpilado na hora — não é uma cópia à mão que envelhece),
 *      inclusive com a grade de Lançamentos já crescida pra 3.000 linhas;
 *   2. monta a resposta que o GET do Google devolveria pra essa planilha;
 *   3. roda o caminho de upgrade de HOJE (`missingTabsCall` → `upgradeLayoutCall`
 *      → `staticValuesCall` → `chartsCall` → `pushDataCalls`);
 *   4. cobra, célula a célula, que nada do layout velho sobreviva e que nada do
 *      que é do usuário seja tocado.
 *
 * Roda com: npx tsx scripts/test-planilha-upgrade.ts
 * (para ensaiar contra outra versão antiga: REF_ANTIGO=<ref git> npx tsx …)
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { GRADE_INICIAL, TAB, TAB_ORDER, type SyncInput } from "../lib/sheets/builder";
import { chartsCall, missingTabsCall, pushDataCalls, readSheetIds, staticValuesCall, upgradeLayoutCall, type SpreadsheetInfo } from "../lib/sheets/sync-requests";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
    failures.push(label);
  }
}

function assertEq(actual: unknown, expected: unknown, label: string) {
  const ok = actual === expected;
  assert(ok, label, ok ? undefined : `esperado=${JSON.stringify(expected)}, obtido=${JSON.stringify(actual)}`);
}

// ─── A planilha antiga, do builder de verdade ────────────────────────────────

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const REF_ANTIGO = process.env.REF_ANTIGO ?? "origin/main";
const VERSAO_ANTIGA = "2026-09-04.1"; // LAYOUT_VERSION de origin/main
/** Lançamentos desta planilha imaginária já cresceu além da grade inicial. */
const LINHAS_CRESCIDAS = 3000;

interface BuilderAntigo {
  TAB: Record<string, string>;
  buildSheetSpecs(): any[];
  buildLayoutRequests(ids: Record<string, number>): any[];
  buildChartRequests(ids: Record<string, number>): any[];
  buildStaticValues(): { range: string; values: any[][] }[];
}

async function carregarBuilderAntigo(): Promise<BuilderAntigo> {
  const dir = mkdtempSync(join(tmpdir(), "virada-planilha-antiga-"));
  for (const arquivo of ["styles.ts", "builder.ts"]) {
    let fonte: string;
    try {
      fonte = execFileSync("git", ["show", `${REF_ANTIGO}:lib/sheets/${arquivo}`], { cwd: RAIZ, encoding: "utf8" });
    } catch {
      throw new Error(
        `não consegui ler ${REF_ANTIGO}:lib/sheets/${arquivo}. Este teste precisa do layout antigo pra ensaiar o upgrade — rode "git fetch origin main" (ou aponte REF_ANTIGO pra outro ref).`,
      );
    }
    writeFileSync(join(dir, arquivo), fonte);
  }
  return (await import(pathToFileURL(join(dir, "builder.ts")).href)) as BuilderAntigo;
}

/**
 * Traduz o que o builder antigo mandou criar para o que o GET do Google
 * devolveria hoje: cada `addChart`/`addBanding`/`addProtectedRange`/
 * `addConditionalFormatRule` virou um objeto com id dentro da aba.
 */
function planilhaAntigaComoOGoogleDevolve(antigo: BuilderAntigo): { info: SpreadsheetInfo; idsAntigos: Record<string, number> } {
  const specs = antigo.buildSheetSpecs();
  const idsAntigos: Record<string, number> = {};
  specs.forEach((s, i) => (idsAntigos[s.properties.title] = 100 + i));

  const reqs = [...antigo.buildLayoutRequests(idsAntigos), ...antigo.buildChartRequests(idsAntigos)];
  const porAba = new Map<number, { charts: number[]; banding: number[]; protegido: number[]; cond: number }>();
  const vazio = () => ({ charts: [] as number[], banding: [] as number[], protegido: [] as number[], cond: 0 });
  const de = (sheetId: number) => {
    if (!porAba.has(sheetId)) porAba.set(sheetId, vazio());
    return porAba.get(sheetId)!;
  };
  let seq = 0;
  for (const r of reqs as any[]) {
    if (r.addBanding) de(r.addBanding.bandedRange.range.sheetId).banding.push(++seq);
    if (r.addProtectedRange) de(r.addProtectedRange.protectedRange.range.sheetId).protegido.push(++seq);
    if (r.addConditionalFormatRule) de(r.addConditionalFormatRule.rule.ranges[0].sheetId).cond += 1;
    const ancora = r.addChart?.chart?.position?.overlayPosition?.anchorCell?.sheetId;
    if (ancora !== undefined) de(ancora).charts.push(++seq);
  }

  const info: SpreadsheetInfo = {
    spreadsheetId: "planilha-de-quem-comprou",
    sheets: specs.map((s) => {
      const sheetId = idsAntigos[s.properties.title];
      const extras = porAba.get(sheetId) ?? vazio();
      const crescida = s.properties.title === antigo.TAB.lancamentos;
      return {
        properties: {
          title: s.properties.title,
          sheetId,
          gridProperties: {
            // A aba de lançamentos desta pessoa já passou da grade inicial: o
            // sync cresceu a grade em algum "Atualizar agora" anterior.
            rowCount: crescida ? LINHAS_CRESCIDAS : s.properties.gridProperties.rowCount,
            columnCount: s.properties.gridProperties.columnCount,
          },
        },
        charts: extras.charts.map((chartId) => ({ chartId })),
        bandedRanges: extras.banding.map((bandedRangeId) => ({ bandedRangeId })),
        protectedRanges: extras.protegido.map((protectedRangeId) => ({ protectedRangeId })),
        conditionalFormats: Array.from({ length: extras.cond }, (_, i) => ({ i })),
      };
    }),
  };
  return { info, idsAntigos };
}

// ─── Cobertura de células (quem apaga o texto velho) ─────────────────────────

const COL = (letra: string) => letra.split("").reduce((acc, c) => acc * 26 + (c.charCodeAt(0) - 64), 0) - 1;

interface Faixa { aba: string; r0: number; r1: number; c0: number; c1: number }

/** "Dívidas!J4:K7", "Dashboard!A6", "Receitas!A2:F" → faixa em índices 0-based. */
function parseFaixa(ref: string, linhasMax = 100000): Faixa {
  const [aba, a1] = ref.includes("!") ? [ref.slice(0, ref.lastIndexOf("!")), ref.slice(ref.lastIndexOf("!") + 1)] : ["", ref];
  const nome = aba.replace(/^'|'$/g, "");
  const [ini, fim] = a1.split(":");
  const m = (cel: string) => {
    const mm = /^([A-Z]+)?(\d+)?$/.exec(cel);
    return { col: mm?.[1] ? COL(mm[1]) : null, row: mm?.[2] ? Number(mm[2]) - 1 : null };
  };
  const i = m(ini);
  const f = fim ? m(fim) : i;
  return {
    aba: nome,
    r0: i.row ?? 0,
    r1: (f.row ?? (fim ? linhasMax : i.row ?? 0)) + 1,
    c0: i.col ?? 0,
    c1: (f.col ?? (fim ? 1000 : i.col ?? 0)) + 1,
  };
}

/** Faixa do valueRange levando em conta o tamanho do bloco gravado (âncora A2 + N linhas). */
function faixaDoValueRange(vr: { range: string; values: any[][] }): Faixa {
  const f = parseFaixa(vr.range);
  const linhas = vr.values.length;
  const colunas = Math.max(...vr.values.map((l) => l.length), 1);
  return { ...f, r1: Math.max(f.r1, f.r0 + linhas), c1: Math.max(f.c1, f.c0 + colunas) };
}

function cobre(faixas: Faixa[], aba: string, linha: number, coluna: number) {
  return faixas.some((f) => f.aba === aba && linha >= f.r0 && linha < f.r1 && coluna >= f.c0 && coluna < f.c1);
}

/** Toda célula NÃO vazia que o layout antigo escreveu, como lista. */
function celulasEscritas(valores: { range: string; values: any[][] }[]) {
  const out: { aba: string; linha: number; coluna: number; texto: string }[] = [];
  for (const vr of valores) {
    const f = parseFaixa(vr.range);
    vr.values.forEach((linha, dl) => {
      linha.forEach((valor, dc) => {
        if (valor === "" || valor === null || valor === undefined) return;
        out.push({ aba: f.aba, linha: f.r0 + dl, coluna: f.c0 + dc, texto: String(valor) });
      });
    });
  }
  return out;
}

// ─── O teste ─────────────────────────────────────────────────────────────────

const DADOS_SEM_DIVIDAS: SyncInput = {
  expenses: [{ id: "e1", description: "Mercado", value: 120, category: "Mercado", date: "2026-09-10", paymentMethod: "pix", nature: "essencial" }],
  incomes: [{ id: "i1", description: "Salário", value: 3000, category: "Salário", date: "2026-09-05" }],
  debts: [],
  goals: [],
} as unknown as SyncInput;

async function main() {
  const antigo = await carregarBuilderAntigo();
  const { info, idsAntigos } = planilhaAntigaComoOGoogleDevolve(antigo);

  console.log(`\n[0] a planilha antiga (${REF_ANTIGO}) que está no Drive de quem comprou`);
  assertEq(Object.keys(idsAntigos).length, 9, "a planilha antiga tem 9 abas");
  assert(idsAntigos[TAB.bolsos] === undefined && idsAntigos[TAB.filtros] === undefined, "e NÃO tem Bolsos nem Filtros");
  assertEq(info.sheets?.find((s) => s.properties?.title === TAB.lancamentos)?.properties?.gridProperties?.rowCount, LINHAS_CRESCIDAS, "a aba Lançamentos dessa pessoa já cresceu além da grade inicial");

  console.log("\n[1] as abas que faltam nascem — e no lugar certo");
  const faltando: any = missingTabsCall(idsAntigos);
  assert(faltando !== null, "o upgrade percebe que faltam abas");
  const criadas: any[] = faltando?.requests ?? [];
  assertEq(criadas.length, 2, "cria exatamente duas abas");
  const bolsos = criadas.find((r) => r.addSheet?.properties?.title === TAB.bolsos);
  const filtros = criadas.find((r) => r.addSheet?.properties?.title === TAB.filtros);
  assert(!!bolsos, "aba Bolsos é criada");
  assert(!!filtros, "aba Filtros é criada");
  assertEq(bolsos?.addSheet?.properties?.index, TAB_ORDER.indexOf("bolsos"), "Bolsos entra na posição de hoje (não no fim, depois de 'Como usar')");
  assertEq(filtros?.addSheet?.properties?.index, TAB_ORDER.indexOf("filtros"), "Filtros entra na posição de hoje");
  // Aba nascida por addSheet sem gridProperties vem com o padrão do Google
  // (1000x26), diferente da planilha criada do zero: o layout roda igual, mas a
  // pessoa vê colunas sobrando à direita numa aba e não na outra.
  assert(typeof bolsos?.addSheet?.properties?.gridProperties?.columnCount === "number", "a aba nova nasce com a MESMA grade da planilha criada do zero (senão fica com 26 colunas)");
  assert(typeof filtros?.addSheet?.properties?.gridProperties?.rowCount === "number", "idem para as linhas");

  // Depois do addSheet o app relê os ids: agora são 11 abas.
  const idsNovos: Record<string, number> = { ...idsAntigos };
  idsNovos[TAB.bolsos] = 200;
  idsNovos[TAB.filtros] = 201;

  console.log("\n[2] nada do layout velho sobrevive");
  const upgrade: any[] = upgradeLayoutCall(info, idsNovos, VERSAO_ANTIGA).requests as any[];

  const chartsAntigos = (info.sheets ?? []).flatMap((s) => (s.charts ?? []).map((c) => c.chartId));
  const bandasAntigas = (info.sheets ?? []).flatMap((s) => (s.bandedRanges ?? []).map((b) => b.bandedRangeId));
  const protegidosAntigos = (info.sheets ?? []).flatMap((s) => (s.protectedRanges ?? []).map((p) => p.protectedRangeId));
  const apagados = (tipo: string, campo: string) => new Set(upgrade.filter((r) => r[tipo]).map((r) => r[tipo][campo]));
  const objetosApagados = new Set(upgrade.filter((r) => r.deleteEmbeddedObject).map((r) => r.deleteEmbeddedObject.objectId));

  assert(chartsAntigos.length === 4 && chartsAntigos.every((id) => objetosApagados.has(id)), "os 4 gráficos antigos são apagados (senão duplicam em cima dos novos)");
  assert(bandasAntigas.length > 0 && bandasAntigas.every((id) => apagados("deleteBanding", "bandedRangeId").has(id)), "todas as zebras antigas são apagadas (addBanding em cima de outra dá erro e o batch inteiro é recusado)");
  assert(protegidosAntigos.length > 0 && protegidosAntigos.every((id) => apagados("deleteProtectedRange", "protectedRangeId").has(id)), "todas as proteções antigas são apagadas");

  for (const sheet of info.sheets ?? []) {
    const sheetId = sheet.properties!.sheetId!;
    const quantas = (sheet.conditionalFormats ?? []).length;
    const deletes = upgrade.filter((r) => r.deleteConditionalFormatRule?.sheetId === sheetId).map((r) => r.deleteConditionalFormatRule.index);
    if (quantas > 0) {
      assertEq(deletes.length, quantas, `${sheet.properties!.title}: todas as ${quantas} regras de cor antigas são apagadas`);
      assert(deletes.every((idx, i) => idx === quantas - 1 - i), `${sheet.properties!.title}: apagadas de trás pra frente (índice muda a cada delete)`);
    }
    assert(upgrade.some((r) => r.unmergeCells?.range?.sheetId === sheetId && r.unmergeCells.range.startRowIndex === undefined), `${sheet.properties!.title}: as mesclas antigas caem (o painel mudou de coluna e a mescla velha ficaria em cima de dados)`);
  }

  console.log("\n[3] o Dashboard velho é reescrito POR INTEIRO");
  const estaticoNovo = staticValuesCall().data as { range: string; values: any[][] }[];
  const limpezasDeValor: Faixa[] = upgrade
    .filter((r) => r.updateCells && String(r.updateCells.fields).includes("userEnteredValue"))
    .map((r) => {
      const t = (info.sheets ?? []).find((s) => s.properties?.sheetId === r.updateCells.range.sheetId)?.properties?.title ?? "";
      return { aba: t, r0: r.updateCells.range.startRowIndex, r1: r.updateCells.range.endRowIndex, c0: r.updateCells.range.startColumnIndex, c1: r.updateCells.range.endColumnIndex };
    });
  const escritasNovas = estaticoNovo.map(faixaDoValueRange);
  const dadosLimpos = (pushDataCalls(DADOS_SEM_DIVIDAS).clear?.ranges ?? []).map((r) => parseFaixa(r));
  const dadosEscritos = (pushDataCalls(DADOS_SEM_DIVIDAS).update?.data ?? []).map(faixaDoValueRange);
  const cobertura = [...limpezasDeValor, ...escritasNovas, ...dadosLimpos, ...dadosEscritos];

  const velhas = celulasEscritas(antigo.buildStaticValues());
  const sobrouNoDashboard = velhas.filter((c) => c.aba === TAB.dashboard && !cobre(cobertura, c.aba, c.linha, c.coluna));
  assertEq(sobrouNoDashboard.length, 0, "nenhuma célula do Dashboard antigo sobrevive ao upgrade");
  if (sobrouNoDashboard.length) console.error("    sobrou:", sobrouNoDashboard.slice(0, 8));
  // O rótulo mais visível do painel antigo: se ele ficar, a pessoa vê dois
  // painéis discordando um do outro.
  const rotulosVelhos = velhas.filter((c) => c.aba === TAB.dashboard && /PERÍODO|SALDO ATUAL|LANÇAMENTOS$/i.test(c.texto));
  assert(rotulosVelhos.length > 0, "o Dashboard antigo realmente tinha rótulos de KPI próprios (é o que temos de apagar)");
  assert(rotulosVelhos.every((c) => cobre(escritasNovas, c.aba, c.linha, c.coluna)), "os rótulos de KPI antigos são SOBRESCRITOS pelos novos, não só apagados");

  console.log("\n[4] o painel lateral velho (J:K) não fica escondido nas abas");
  const sobrouPainel = velhas.filter((c) => c.aba !== TAB.dashboard && c.aba !== TAB.ajuda && !cobre(cobertura, c.aba, c.linha, c.coluna));
  assertEq(sobrouPainel.length, 0, "nenhum texto do painel antigo sobra nas abas de dados (o painel de hoje mora em N:O)");
  if (sobrouPainel.length) console.error("    sobrou:", sobrouPainel.slice(0, 8));
  const sobrouAjuda = velhas.filter((c) => c.aba === TAB.ajuda && !cobre(cobertura, c.aba, c.linha, c.coluna));
  assertEq(sobrouAjuda.length, 0, "a aba 'Como usar' também é reescrita inteira");

  console.log("\n[5] os dados de quem pagou continuam lá");
  // O upgrade só mexe em formato, proteção, zebra, gráfico e no painel velho.
  // Nenhuma limpeza de VALOR pode encostar na faixa de dados (A2 em diante).
  for (const key of ["lancamentos", "receitas", "despesas", "dividas", "metas", "fluxo", "resumo"] as const) {
    const aba = TAB[key];
    const invasoras = limpezasDeValor.filter((f) => f.aba === aba && f.c0 < (key === "lancamentos" ? 12 : 8) && f.r1 > 1);
    assertEq(invasoras.length, 0, `${aba}: o upgrade não apaga nenhum valor da faixa de dados`);
  }
  assert(!upgrade.some((r) => r.updateCells && String(r.updateCells.fields) === "*"), "nenhum updateCells apaga formato E valor de uma vez");
  // Em Lançamentos a faixa J:L virou coluna de dados no layout novo: se o clear
  // do painel antigo rodasse ali, apagaria Mês/Estornado/Bolso do usuário.
  assertEq(limpezasDeValor.filter((f) => f.aba === TAB.lancamentos).length, 0, "Lançamentos fica FORA da limpeza do painel antigo (J:L lá virou dado)");

  console.log("\n[6] a linha fantasma 'Sem dívidas em aberto' some");
  const fantasma = antigo as unknown as { buildSyncBatch?: (i: any) => any };
  if (typeof fantasma.buildSyncBatch === "function") {
    const batchAntigo = fantasma.buildSyncBatch({ expenses: [], incomes: [], debts: [], goals: [] });
    const linhaFantasma = (batchAntigo.valueRanges as any[]).find((v) => v.range.startsWith(TAB.dividas));
    assert(String(JSON.stringify(linhaFantasma?.values)).includes("Sem dívidas em aberto"), "o layout antigo realmente grava a linha fantasma quando não há dívida");
  }
  const batch = pushDataCalls(DADOS_SEM_DIVIDAS);
  assert((batch.clear?.ranges ?? []).some((r) => r.startsWith(`${TAB.dividas}!A2`)), "o sync de hoje limpa a faixa de dados de Dívidas");
  assert(!(batch.update?.data ?? []).some((v) => v.range.startsWith(`${TAB.dividas}!A`)), "e não grava nada em Dívidas quando a pessoa não tem dívida — a linha fantasma fica apagada");

  console.log("\n[7] a faixa de Anotações continua protegida e a grade crescida não encolhe");
  const protecoesNovas = upgrade.filter((r) => r.addProtectedRange).map((r) => r.addProtectedRange.protectedRange);
  for (const key of ["lancamentos", "receitas", "despesas", "dividas", "metas", "fluxo", "resumo"] as const) {
    const p = protecoesNovas.find((pr: any) => pr.range?.sheetId === idsNovos[TAB[key]]);
    assert(!!p, `${TAB[key]}: a aba volta protegida`);
    assert((p?.unprotectedRanges ?? []).length > 0, `${TAB[key]}: com a coluna de Anotações livre pra escrever`);
  }
  const protLancamentos = protecoesNovas.find((pr: any) => pr.range?.sheetId === idsNovos[TAB.lancamentos]);
  assertEq(protLancamentos?.unprotectedRanges?.[0]?.endRowIndex, LINHAS_CRESCIDAS, "a faixa livre de Anotações acompanha a grade CRESCIDA (3.000), não volta pra 1.010");

  const zebraLancamentos = upgrade.find((r) => r.addBanding?.bandedRange?.range?.sheetId === idsNovos[TAB.lancamentos]);
  assertEq(zebraLancamentos?.addBanding?.bandedRange?.range?.endRowIndex, LINHAS_CRESCIDAS, "a zebra também vai até o fim da grade crescida");
  const encolhe = upgrade.filter((r) => {
    const rc = r.updateSheetProperties?.properties?.gridProperties?.rowCount;
    if (typeof rc !== "number") return false;
    const atual = (info.sheets ?? []).find((s) => s.properties?.sheetId === r.updateSheetProperties.properties.sheetId)?.properties?.gridProperties?.rowCount ?? 0;
    return rc < atual;
  });
  assertEq(encolhe.length, 0, "nenhuma aba tem a grade encolhida pelo upgrade (isso apagaria linhas de lançamento)");
  // As abas que não cresceram continuam formatadas até a grade inicial.
  const zebraReceitas = upgrade.find((r) => r.addBanding?.bandedRange?.range?.sheetId === idsNovos[TAB.receitas]);
  assertEq(zebraReceitas?.addBanding?.bandedRange?.range?.endRowIndex, GRADE_INICIAL, "aba que não cresceu continua formatada até a grade inicial");

  console.log("\n[8] os gráficos voltam, uma vez só");
  const graficos = chartsCall(idsNovos).requests as any[];
  assertEq(graficos.length, 4, "quatro gráficos são reinseridos");
  assert(graficos.every((g) => g.addChart), "todos são addChart (os antigos já foram apagados no passo [2])");

  console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} ok, ${failed} falha(s)`);
  if (failures.length) console.error(failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(failed === 0 ? 0 : 1);
}

void main().catch((err) => {
  console.error(`\n❌ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
