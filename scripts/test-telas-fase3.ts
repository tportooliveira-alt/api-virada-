/**
 * test-telas-fase3.ts — telas da fase 3 (cluster E): card "Seus 3 bolsos",
 * ExpenseChart controlado pelo pai, e o que cada tela precisa ter no fonte.
 *
 * Cobre a parte de tela dos CA-01..CA-09 e CA-12 que dá pra provar sem navegador:
 *   - PocketsCard renderizado DE VERDADE (react-dom/server): alvos, verde/vermelho,
 *     "passou R$ X", "baseado no que entrou até agora", convite pra informar a renda,
 *     selo de Fase de virada, "Dívidas vencendo neste mês", dados antigos sem NaN.
 *   - ExpenseChart: recebe `period` do pai ("AAAA-MM" ou "all"), sem seletor próprio,
 *     legenda clicável quando o pai quer filtrar por categoria.
 *   - Fonte das páginas: Início usa PocketsCard (não ExpenseChart) e liga cada
 *     lançamento à edição; Relatórios navega por mês (sem "30 dias"/"Ano");
 *     Lançar tem ?tipo/?editar em Suspense, "Mais detalhes" e "Salvar alteração";
 *     manifest com id + shortcuts.
 *
 * Rodada 3 (acabamento em tela estreita) acrescentou T1..T6 no fim do arquivo:
 *   T1 chip de categoria inteiro · T2 toast curto com Desfazer · T3 bolsos do mês
 *   navegado · T4 ?mes= inválido · T5 voz/abas prometidas · T6 nada cortado com "…".
 *
 * O resto (toques, toasts, URL) é o e2e Playwright da fase 3.
 * Roda com: npx tsx scripts/test-telas-fase3.ts   (e de novo com TZ=UTC).
 */

import { readFileSync } from "node:fs";

import React, { createElement } from "react";
import { renderToString } from "react-dom/server";

(globalThis as unknown as { React: typeof React }).React = React;
import { mensagemDaParcela, mesDaUrl } from "../app/app/relatorios/mes-e-toast";
import { ExpenseChart } from "../components/ExpenseChart";
import { PocketsCard } from "../components/PocketsCard";
import { TAB } from "../lib/sheets/builder";
import type { Debt, Expense, Income, ViradaData } from "../lib/types";
import { formatCurrency } from "../lib/utils";

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
    failures.push(label + (detail ? ` [${detail}]` : ""));
  }
}

function section(name: string) {
  console.log(`\n━━━ ${name} ━━━`);
}

// HTML → texto corrido com "|" entre elementos (mesmo truque do test-calculos-telas).
function textOf(html: string) {
  return html
    .replace(/<!--.*?-->/g, "")
    .replace(/<[^>]+>/g, "|")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\|+/g, "|");
}

const brl = formatCurrency;

const MES = "2026-09";
let n = 0;
const ex = (value: number, over: Partial<Expense> = {}): Expense => ({
  id: `e${++n}`,
  description: "",
  value,
  category: "Mercado",
  date: `${MES}-10`,
  paymentMethod: "Pix",
  nature: "essencial",
  ...over,
});
const inc = (value: number, over: Partial<Income> = {}): Income => ({
  id: `i${++n}`,
  description: "",
  value,
  category: "Salário",
  date: `${MES}-05`,
  ...over,
});
const debt = (over: Partial<Debt> = {}): Debt => ({
  id: `d${++n}`,
  name: "Cartão",
  totalValue: 3200,
  installmentValue: 450,
  dueDate: `${MES}-20`,
  priority: "alta",
  status: "aberta",
  ...over,
});
const base = (over: Partial<ViradaData> = {}): ViradaData => ({
  expenses: [],
  incomes: [],
  debts: [],
  goals: [],
  missionStatus: {},
  ...over,
});

function renderPockets(data: ViradaData, mes = MES, hoje = `${MES}-11`) {
  const html = renderToString(createElement(PocketsCard, { data, mes, hoje }));
  return { html, text: textOf(html) };
}

// ─── PocketsCard ─────────────────────────────────────────────────────────────

section("CA-02 · renda informada R$ 2.500, fase Organizando → alvos 1.250 / 750 / 500");
{
  const { text, html } = renderPockets(base({ settings: { expectedIncome: 2500 } }));
  assert(text.includes("Seus 3 bolsos"), "título 'Seus 3 bolsos'");
  for (const alvo of [1250, 750, 500]) assert(text.includes(brl(alvo)), `alvo ${brl(alvo)} aparece`);
  assert(text.includes("Contas") && text.includes("Dívidas e reserva") && text.includes("Vida"), "os três rótulos");
  assert(!text.includes("baseado no que entrou"), "renda informada NÃO diz 'baseado no que entrou'");
  assert(/sobra/.test(text), "sem gasto: mostra 'sobra'");
  assert(!/passou/.test(text), "sem gasto: nada 'passou'");
  assert(!/NaN/.test(html), "sem NaN");
}

section("CA-02 · Fase de virada com Mercado 300 / Cartão 200 / Delivery 260 → Vida passou R$ 10");
{
  const data = base({
    settings: { expectedIncome: 2500, budgetPhase: "virada" },
    expenses: [
      ex(300, { category: "Mercado" }),
      ex(200, { category: "Cartão" }),
      ex(260, { category: "Delivery", nature: "impulso" }),
      ex(999, { category: "Fornecedor", scope: "empresa" }), // Empresa: fora dos bolsos
    ],
  });
  const { text, html } = renderPockets(data);
  assert(text.includes(`${brl(300)} de ${brl(1250)}`), "Contas · R$ 300,00 de R$ 1.250,00");
  assert(text.includes(`sobra ${brl(950)}`), "Contas · sobra R$ 950,00");
  assert(text.includes(`${brl(200)} de ${brl(1000)}`), "Dívidas · R$ 200,00 de R$ 1.000,00");
  assert(text.includes(`${brl(260)} de ${brl(250)}`), "Vida · R$ 260,00 de R$ 250,00");
  assert(text.includes(`passou ${brl(10)}`), "Vida · 'passou R$ 10,00'");
  assert(!text.includes(brl(1299)) && !text.includes(brl(999)), "gasto de Empresa não entra em bolso nenhum");
  assert(/data-estado="vermelho"/.test(html), "algum bolso marcado vermelho");
  assert((html.match(/data-estado="verde"/g) ?? []).length === 2, "dois bolsos verdes");
  assert(!/culpa|errado|vergonha/i.test(text), "sem culpa no texto");
}

section("CA-02 · sem renda informada → média dos 3 meses anteriores + 'baseado no que entrou até agora'");
{
  const data = base({
    incomes: [inc(2000, { date: "2026-08-05" }), inc(3000, { date: "2026-07-05" })], // junho sem entrada não conta
  });
  const { text, html } = renderPockets(data);
  assert(text.includes("baseado no que entrou até agora"), "texto 'baseado no que entrou até agora'");
  assert(text.includes(brl(2500)), "renda = média R$ 2.500,00 (2.000 e 3.000; mês sem entrada não conta)");
  assert(text.includes(brl(1250)), "alvo Contas R$ 1.250,00 da média");
  assert(/href="\/app\/conta"/.test(html), "link pra Conta pra informar a renda");
}

section("CA-02 · só entradas do próprio mês → usa o mês");
{
  const { text } = renderPockets(base({ incomes: [inc(1000)] }));
  assert(text.includes("baseado no que entrou até agora"), "texto 'baseado no que entrou'");
  assert(text.includes(brl(500)), "alvo Contas R$ 500,00 (50% de 1.000)");
}

section("CA-02 / CA-12 · nada entrou nunca → convite pra informar a renda, sem R$ 0 silencioso");
{
  const { text, html } = renderPockets(base({ expenses: [ex(80)] }));
  assert(/quanto entra/i.test(text), "convite: pergunta quanto entra por mês");
  assert(/href="\/app\/conta"/.test(html), "convite leva pra Conta");
  assert(!text.includes(`de ${brl(0)}`), "não mostra 'de R$ 0,00' como alvo");
  assert(text.includes(brl(80)), "o gasto do bolso aparece mesmo sem alvo");
  assert(!/NaN/.test(html), "sem NaN");
}

section("CA-03 · dívida em aberto + fase Organizando → selo sugerindo Fase de virada (nunca troca sozinho)");
{
  const comDivida = renderPockets(base({ settings: { expectedIncome: 2500 }, debts: [debt()] }));
  assert(/Fase de virada/.test(comDivida.text), "selo fala em 'Fase de virada'");
  assert(comDivida.text.includes(brl(750)), "fase segue Organizando (alvo Dívidas 750, não 1.000)");
  const jaVirada = renderPockets(base({ settings: { expectedIncome: 2500, budgetPhase: "virada" }, debts: [debt()] }));
  assert(!/ativar|sugest/i.test(jaVirada.text), "já na Fase de virada: sem sugestão");
  const semDivida = renderPockets(base({ settings: { expectedIncome: 2500 } }));
  assert(!/sugest/i.test(semDivida.text), "sem dívida: sem sugestão");
}

section("CA-08 · 'Dívidas vencendo neste mês: R$ X (N)'");
{
  const data = base({
    settings: { expectedIncome: 2500 },
    debts: [debt(), debt({ name: "Empréstimo", totalValue: 1000, installmentValue: 100, dueDate: `${MES}-28` }), debt({ dueDate: "2026-10-05" })],
  });
  const { text } = renderPockets(data);
  assert(text.includes(`Dívidas vencendo neste mês`) && text.includes(`${brl(550)} (2)`), "R$ 550,00 (2) — só as do mês");
  const semVenc = renderPockets(base({ settings: { expectedIncome: 2500 } }));
  assert(!/vencendo/.test(semVenc.text), "sem dívida vencendo: linha não aparece");
}

section("Juiz #7 · 'Dívidas vencidas: R$ X (N)' acima de 'vencendo', sem contar duas vezes");
{
  const data = base({
    settings: { expectedIncome: 2500 },
    debts: [
      debt({ name: "Velha", totalValue: 500, installmentValue: 100, dueDate: "2026-08-10" }), // mês passado
      debt({ name: "Cartão", dueDate: `${MES}-05` }), // este mês, mas já passou (hoje = 11)
      debt({ name: "Empréstimo", totalValue: 1000, installmentValue: 100, dueDate: `${MES}-28` }), // ainda vai vencer
      debt({ name: "Quitada", status: "quitada", dueDate: "2026-07-10" }),
    ],
  });
  const { text, html } = renderPockets(data);
  assert(text.includes(`Dívidas vencidas: ${brl(550)} (2)`), "vencidas = 100 (mês passado) + 450 (dia 5 deste mês) = R$ 550,00 (2)", text);
  assert(text.includes(`Dívidas vencendo neste mês: ${brl(100)} (1)`), "vencendo = só a que ainda vai vencer (R$ 100,00 (1)); a do dia 5 não conta duas vezes", text);
  assert(text.indexOf("Dívidas vencidas") < text.indexOf("Dívidas vencendo"), "vencidas vem acima de vencendo");
  assert((html.match(/href="\/app\/relatorios\?aba=dividas[^"]*"/g) ?? []).length >= 2, "as duas linhas levam pra ?aba=dividas");
  assert(!/culpa|atras[oa]d[oa]|errad/i.test(text), "sem culpa no texto");
  const semVencida = renderPockets(base({ settings: { expectedIncome: 2500 }, debts: [debt({ dueDate: `${MES}-28` })] }));
  assert(!/vencidas/.test(semVencida.text), "sem dívida vencida: linha não aparece");
  // Mês escolhido no passado: tudo daquele mês já venceu — só a linha de vencidas.
  const passado = renderPockets(base({ settings: { expectedIncome: 2500 }, debts: [debt({ dueDate: "2026-08-10" })] }), "2026-08");
  assert(/vencidas/.test(passado.text) && !/vencendo/.test(passado.text), "mês passado: vencida sim, 'vencendo' não");
}

section("CA-12 · dados antigos (sem settings, dívida sem paidValue) abrem sem NaN");
{
  const antigo = { expenses: [ex(100)], incomes: [inc(900)], debts: [debt()], goals: [], missionStatus: {} } as ViradaData;
  const { html, text } = renderPockets(antigo);
  assert(!/NaN|undefined/.test(html), "sem NaN/undefined");
  assert(text.includes("baseado no que entrou até agora"), "bolsos 'baseado no que entrou'");
}

// ─── ExpenseChart controlado pelo pai ────────────────────────────────────────

section("CA-06 / CA-09 · ExpenseChart recebe o período do pai e a legenda filtra");
{
  const expenses = [ex(100, { date: "2026-08-10", category: "Lazer" }), ex(200, { date: "2026-09-10", category: "Mercado" })];
  const setembro = renderToString(createElement(ExpenseChart, { expenses, incomes: [], period: "2026-09" }));
  const agosto = renderToString(createElement(ExpenseChart, { expenses, incomes: [], period: "2026-08" }));
  const tudo = renderToString(createElement(ExpenseChart, { expenses, incomes: [], period: "all" }));
  assert(textOf(setembro).includes("|Mercado|") && !textOf(setembro).includes("|Lazer|"), "period '2026-09' mostra só setembro");
  assert(textOf(agosto).includes("|Lazer|") && !textOf(agosto).includes("|Mercado|"), "period '2026-08' mostra só agosto");
  assert(textOf(tudo).includes("|Lazer|") && textOf(tudo).includes("|Mercado|"), "period 'all' mostra tudo");
  assert(!/aria-label="Período"/.test(setembro), "sem seletor de período próprio");
  assert(/Essencial/.test(setembro) && /Impulso/.test(setembro), "chip Essencial/Impulso continua");
  const clicavel = renderToString(
    createElement(ExpenseChart, { expenses, incomes: [], period: "all", selectedCategory: "Lazer", onSelectCategory: () => {} }),
  );
  // O botão marcado (aria-pressed) que contém "Lazer" — os chips Todos/Essencial/Impulso também têm aria-pressed.
  assert(/<button[^>]*aria-pressed="true"[^>]*>(?:(?!<\/button>)[\s\S])*Lazer/.test(clicavel), "legenda vira botão com a categoria escolhida marcada");
  assert(!/<button[^>]*>[\s\S]{0,200}Lazer/.test(setembro.replace(/Essencial|Impulso|Todos/g, "")), "sem onSelectCategory a legenda não é botão");
  // Juiz #4: em 360–430 px a legenda fica ABAIXO do donut e o nome não trunca ("M…").
  assert(/flex-col min-\[480px\]:flex-row/.test(tudo), "donut + legenda empilham abaixo de 480 px");
  assert(/<span class="min-w-0 flex-1 text-left">Lazer<\/span>/.test(tudo), "nome da categoria na legenda sem truncate");
}

// ─── Fonte das páginas (o que não renderiza fora do Next) ────────────────────

section("Fonte das telas");
{
  const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  const inicio = src("app/app/inicio/page.tsx");
  const lancar = src("app/app/lancar/page.tsx");
  const relatorios = src("app/app/relatorios/page.tsx");
  const conta = src("app/app/conta/page.tsx");
  const chart = src("components/ExpenseChart.tsx");
  const manifest = JSON.parse(src("public/manifest.webmanifest")) as { id?: string; shortcuts?: { url: string }[] };

  assert(/PocketsCard/.test(inicio) && !/ExpenseChart/.test(inicio), "Início: PocketsCard no lugar do ExpenseChart");
  assert(/Sem lançamentos neste mês/.test(inicio), "Início: chip neutro 'Sem lançamentos neste mês'");
  assert(/\/app\/lancar\?editar=/.test(inicio), "Início: lançamento liga pra edição");
  assert(/useSearchParams/.test(lancar) && /Suspense/.test(lancar), "Lançar: useSearchParams em Suspense");
  assert(/Salvar alteração/.test(lancar) && /Mais detalhes/.test(lancar), "Lançar: 'Salvar alteração' e 'Mais detalhes'");
  assert(/updateExpense|updateIncome/.test(lancar), "Lançar: salva por updateExpense/updateIncome");
  assert(/anoAtual - 10/.test(lancar) && /anoAtual \+ 1/.test(lancar) && /não parece certa/.test(lancar), "Lançar: ano em [atual − 10, atual + 1] com erro claro");
  assert(/tipo.*entrada/.test(lancar) && /Salário/.test(lancar), "Lançar: ?tipo=entrada e Salário pré-marcado");
  assert(!/30 dias|"ano"/.test(relatorios), "Relatórios: sem '30 dias' nem 'Ano'");
  assert(/shiftMonth/.test(relatorios) && /searchParams\.get\("mes"\)/.test(relatorios), "Relatórios: navega por mês com ?mes");
  assert(/restoreExpense|restoreIncome/.test(relatorios) && /undoDebtPayment/.test(relatorios), "Relatórios: Desfazer de Excluir e de parcela");
  assert(/payDebtInstallment/.test(relatorios) && /debtInstallmentsLeft/.test(relatorios), "Relatórios: Paguei a parcela + faltam N parcelas");
  assert(!/Desfazer lançamento|estornar\(/.test(relatorios), "Relatórios: estornar não aparece pra pessoa comum");
  assert(/setSettings/.test(conta) && /BUDGET_PHASES/.test(conta) && /Quanto entra por mês/.test(conta), "Conta: renda + fase via setSettings");
  assert(/inPeriod\(/.test(chart) && !/new Date\(e\.date\)/.test(chart), "ExpenseChart: inPeriod por string");
  assert(typeof manifest.id === "string" && (manifest.shortcuts ?? []).some((s) => /tipo=gasto/.test(s.url)) && (manifest.shortcuts ?? []).some((s) => /tipo=entrada/.test(s.url)), "manifest: id + shortcuts ?tipo=gasto/entrada");

  // Correções pedidas pelo juiz (rodada 2)
  const shell = src("components/AppShell.tsx");
  const demo = src("app/app/planilha-demo/page.tsx");
  // A regra do mês saiu do page.tsx pra mes-e-toast.ts: o Next só deixa uma página
  // exportar `default`, e sem export não dá pra testar a função sem abrir o navegador.
  const MONTH_RE = "/^\\d{4}-(0[1-9]|1[0-2])$/";
  assert(src("app/app/relatorios/mes-e-toast.ts").includes(MONTH_RE), "#2 Relatórios: ?mes só aceita 01–12 (2026-13 cai no mês corrente)", MONTH_RE);
  assert(/mesDaUrl\(searchParams\.get\("mes"\), mesAtual\)/.test(relatorios), "#2 Relatórios: a tela usa mesDaUrl (uma regra só)");
  assert(/setTab\(tipoParam === "entrada" \? "entrada" : "gasto"\)/.test(lancar) && /setDetalhes\(usaEmpresa\)/.test(lancar), "#3 Lançar: sair da edição volta a aba e o 'Mais detalhes' ao padrão");
  assert(/PenLine/.test(inicio) && /SpeechRecognition/.test(inicio) && !/<Mic className="h-\[18px\] w-\[18px\] shrink-0" \/>\s*<span className="text-center">\s*Lançar agora <span/.test(inicio), "#5 Início: CTA só promete voz quando o navegador tem SpeechRecognition");
  assert(!/pontos e logs/.test(inicio) && /Dashboard/.test(inicio), "#6 Início: card da planilha fala das abas que existem");
  assert(/Quando\?/.test(lancar) && lancar.indexOf("Quando?") > lancar.indexOf("Mais detalhes <span") && /Hoje/.test(lancar), "#1 Lançar: 'Quando?' dentro de 'Mais detalhes', padrão Hoje");
  assert(/sticky bottom-\[calc\(76px\+env\(safe-area-inset-bottom\)\)\]/.test(lancar), "#1 Lançar: Confirmar sticky acima do menu");
  assert(/\/app\/lancar/.test(shell) && /lg:hidden|hidden lg:/.test(shell), "#1 AppShell: cabeçalho compacto em /app/lancar no celular");
  assert(/period=\{/.test(demo) && /shiftMonth/.test(demo), "#8 Prévia da planilha: ExpenseChart com período + navegação ‹ mês ›");
}


// ══════════════════════════════════════════════════════════════════════════════
// RODADA 3 — acabamento em tela estreita (o que o juiz da rodada 2 mediu e reprovou).
// A medição de pixel (scrollWidth ≤ clientWidth em 360 px) está no e2e do time de
// telas; aqui ficam os contratos que dá pra provar fora do navegador.
// ══════════════════════════════════════════════════════════════════════════════

function assertEq(actual: unknown, expected: unknown, label: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  assert(ok, label, ok ? undefined : `esperado=${JSON.stringify(expected)}, obtido=${JSON.stringify(actual)}`);
}

// Comentário explicando a decisão não é promessa nem classe de CSS: sai antes de medir.
function semComentarios(codigo: string) {
  return codigo.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, "");
}

{
  const ler = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  const LANCAR = ler("app/app/lancar/page.tsx");
  const RELATORIOS = ler("app/app/relatorios/page.tsx");
  const INICIO = ler("app/app/inicio/page.tsx");

  section("T1 — chip de categoria inteiro em 360 px");
  {
    // Em 360 px o chip "Transporte" virava "Transpo…" (scrollWidth 69 > clientWidth 64).
    // `truncate` é o que põe as reticências: sem ela, nome que não coubesse viraria
    // estouro medido no e2e, em vez de um "…" que ninguém percebe ser um bug.
    const grade = semComentarios(/Categoria<\/SectionLabel>[\s\S]*?<\/div>\s*<\/div>/.exec(LANCAR)?.[0] ?? "");
    assert(grade.length > 0, "achei a grade de categorias no fonte");
    assert(!/truncate/.test(grade), "rótulo do chip não usa `truncate` (nada de reticências)");
    assert(/min-\[360px\]:grid-cols-4/.test(grade), "continuam 4 chips por linha a partir de 360 px");
    assert(/grid-cols-3 /.test(grade), "abaixo de 360 px (celular de 320) são 3 por linha, pra o nome não vazar");
    assert(/text-\[10px\][^"]*sm:text-xs/.test(grade), "rótulo é 10px no celular e 12px a partir de sm");

    // Categoria nova não pode ser mais larga que a maior que já cabe ("Recebimento").
    const cats = [...LANCAR.matchAll(/\{ key: "([^"]+)", icon:/g)].map((m) => m[1]);
    assert(cats.length === 19, `12 chips de gasto + 7 de entrada (achei ${cats.length})`);
    const maior = cats.reduce((a, b) => (b.length > a.length ? b : a), "");
    assert(maior.length <= 11, `o rótulo mais longo tem no máximo 11 caracteres (é "${maior}")`);
  }

  section("T2 — toast de Relatórios cabe em 360 px");
  {
    assertEq(mensagemDaParcela(450, "Cartão", brl), "Parcela R$ 450,00 · Cartão", 'parcela vira "Parcela R$ 450,00 · Cartão"');
    assert(!/registrada em/.test(mensagemDaParcela(450, "Cartão", brl)), 'sumiu o "registrada em" que estourava a linha');
    // Nome de dívida comprido não pode empurrar o Desfazer pra fora: o toast quebra em
    // 2 linhas (line-clamp-2) e o botão é `shrink-0`.
    const toast = semComentarios(/\{\/\* Toast com Desfazer[\s\S]*?\n      \)\}/.exec(RELATORIOS)?.[0] ?? "");
    assert(toast.length > 0, "achei o toast no fonte");
    assert(!/truncate/.test(toast), "a mensagem do toast não usa `truncate`");
    assert(/line-clamp-2/.test(toast), "a mensagem do toast cabe em até 2 linhas");
    assert(/shrink-0/.test(toast), "o botão Desfazer não encolhe");
    // Todos os toasts desta tela — não só o da parcela.
    const mensagens = [...RELATORIOS.matchAll(/showToast\(\{\s*\n?\s*message: ([^\n]+),/g)].map((m) => m[1].trim());
    assert(mensagens.length >= 2, `achei ${mensagens.length} toasts na tela`);
    assert(
      mensagens.every((m) => /^"Apagado"$/.test(m) || /mensagemDaParcela\(/.test(m)),
      "todo toast é curto: 'Apagado' ou mensagemDaParcela()",
      mensagens.join(" | "),
    );
  }

  section("T3 — bolsos no mês navegado (aba Resumo)");
  {
    assert(/import \{ PocketsCard \} from "@\/components\/PocketsCard"/.test(RELATORIOS), "Relatórios importa PocketsCard");
    assert(/!tudo && <PocketsCard data=\{data\} mes=\{mes\} \/>/.test(RELATORIOS), "Resumo mostra os bolsos do mês escolhido, e só quando não é 'Tudo'");
    assert(/<PocketsCard data=\{data\} \/>/.test(INICIO), "Início continua com os bolsos do mês corrente");
  }

  section("T4 — ?mes= inválido cai no mês corrente");
  {
    const atual = "2026-09";
    assertEq(mesDaUrl(null, atual), { mes: atual, tudo: false, invalido: false }, "sem ?mes= → mês corrente");
    assertEq(mesDaUrl("2026-08", atual), { mes: "2026-08", tudo: false, invalido: false }, "?mes=2026-08 → agosto");
    assertEq(mesDaUrl("tudo", atual), { mes: atual, tudo: true, invalido: false }, "?mes=tudo → todos os meses");
    for (const ruim of ["2026-13", "abc", "0000-00", "2026-00", "2026-1", "0000-01", "9999-12", "2026-08-01", " 2026-08", ""]) {
      assertEq(mesDaUrl(ruim, atual), { mes: atual, tudo: false, invalido: true }, `?mes=${JSON.stringify(ruim)} → mês corrente, marcado como inválido`);
    }
    assert(/mesInvalido && \(/.test(RELATORIOS), "a tela avisa quando o link tinha mês inválido");
    assert(/Esse link tinha um mês que não existe/.test(RELATORIOS), "o aviso diz o que aconteceu, sem jargão");
  }

  section("T5 — voz e abas da planilha");
  {
    // (a) só promete "por voz" quando o navegador tem reconhecimento de fala — mesma
    // regra que já esconde o botão de voz em /app/lancar.
    assert(/SpeechRecognition/.test(INICIO), "Início checa reconhecimento de fala antes de prometer voz");
    assert(/temVoz && <span[^>]*> — por voz ou texto<\/span>/.test(INICIO), 'o "por voz" do Início é condicional');
    const inicioSemVozCondicional = semComentarios(INICIO).replace(/temVoz && <span[\s\S]*?<\/span>/g, "");
    // `temVoz`/`setTemVoz` são código; o que não pode sobrar é a PROMESSA escrita pra pessoa.
    assert(!/por voz|\bfalar\b|\bditar\b|microfone/i.test(inicioSemVozCondicional), "não sobrou nenhuma outra promessa de voz no Início");

    // (b) o cartão da planilha só pode citar aba que existe em lib/sheets/builder.ts.
    const cartao = /\{\/\* Planilha Google \*\/\}[\s\S]*?<\/section>/.exec(INICIO)?.[0] ?? "";
    assert(cartao.length > 0, "achei o cartão da planilha no fonte");
    assert(!/pontos|logs/i.test(cartao), 'o cartão não fala mais em "pontos" nem "logs" (abas que não existem)');
    const reais = Object.values(TAB).map((t) => t.toLowerCase());
    ["Dashboard", "filtros", "bolsos", "lançamentos", "dívidas", "metas"].forEach((nome) => {
      assert(new RegExp(nome, "i").test(cartao), `o cartão cita "${nome}"`);
      assert(reais.some((t) => t.startsWith(nome.toLowerCase())), `"${nome}" é uma aba real da planilha`);
    });
  }

  section("T6 — texto da tela nunca é cortado com reticências");
  {
    // Regra da rodada: rótulo/dica/aviso escrito por nós tem que caber inteiro. Só o
    // texto que a PESSOA digita (descrição, nome da dívida) pode ser clampado, em 2 linhas.
    assert(/<span className="text-xs text-ink-400">\{listening/.test(LANCAR), "a dica do campo Valor não usa `truncate` (cabia só até 'entra soz…')");
    assert(/"a vírgula entra sozinha"/.test(LANCAR), "a dica ficou curta: 'a vírgula entra sozinha'");
    assert(!/— opcional/.test(LANCAR), "o placeholder encurtou: '(opcional)' no fim, sem estourar a caixa");

    const listRow = semComentarios(/function ListRow\([\s\S]*?\n}/.exec(RELATORIOS)?.[0] ?? "");
    assert(listRow.length > 0, "achei o ListRow no fonte");
    assert(!/truncate/.test(listRow), "linha de lista usa 2 linhas em vez de cortar o valor com '…'");
    assert((listRow.match(/line-clamp-2/g) ?? []).length === 2, "título e detalhe da linha cabem em até 2 linhas");
  }
}

console.log(`\n${"═".repeat(60)}`);
console.log(`RESULTADO: ${passed} passaram, ${failed} falharam`);
if (failed > 0) {
  console.log("Falhas:");
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
