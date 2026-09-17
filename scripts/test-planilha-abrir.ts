/**
 * test-planilha-abrir.ts — "eu não consigo abrir no Planilhas".
 *
 * É a queixa do dono depois de comprar o próprio app (17/09/2026), com o Drive
 * dele cheio de arquivos "Virada Financeira — <email>": mais de dez. Dez
 * planilhas e nenhum caminho pra chegar numa.
 *
 * O que estava acontecendo, e que este teste tranca:
 *
 *  1. O POST /spreadsheets JÁ CRIA o arquivo no Drive. As três chamadas
 *     seguintes (layout, conteúdo, gráficos) só o enfeitam. Se qualquer uma
 *     delas falhasse — rede de celular oscilando, cota do Google, aba fechada no
 *     meio —, o erro subia e o `meta` NUNCA era gravado: o cartão da tela Conta
 *     voltava pro estado "Conectar sua planilha", sem link e sem id. O toque
 *     seguinte criava OUTRA planilha. Dez tentativas, dez planilhas pela metade,
 *     zero links.
 *  2. A URL guardada não tinha `/edit`, então cada abertura passava por um
 *     redirecionamento do Google — o salto exato em que o celular entrega o link
 *     pro app do Google Planilhas e a pessoa cai numa tela em branco.
 *  3. Planilha apagada do Drive (ou id órfão) devolvia 404 pra sempre: o cartão
 *     dizia "Atualizada há 3 dias" e o botão "Abrir planilha" levava a "arquivo
 *     não encontrado", sem saída a não ser Desconectar — que ninguém adivinha.
 *
 * Tudo offline: transporte e relógio injetados, nenhuma credencial Google.
 *
 * Roda com: npx tsx scripts/test-planilha-abrir.ts
 */

import {
  ErroDeAutorizacao,
  ErroPlanilhaSumiu,
  SHEET_KEY,
  ehPlanilhaSumiu,
  lerMeta,
  sincronizar,
  urlDaPlanilha,
  type GoogleFetch,
  type SheetMeta,
} from "../lib/sheets/sync-runner";
import { LAYOUT_VERSION, type SyncInput } from "../lib/sheets/builder";

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

// Os avisos do motor vão pro console; aqui viram lista pra não poluir a saída.
const avisos: string[] = [];
console.warn = (...args: unknown[]) => {
  avisos.push(args.map(String).join(" "));
};

// ─── Dados e transporte falsos ───────────────────────────────────────────────

const DADOS: SyncInput = {
  expenses: [{ id: "e1", description: "Mercado", value: 120, category: "Mercado", date: "2026-09-10", paymentMethod: "pix", nature: "essencial" }],
  incomes: [{ id: "i1", description: "Salário", value: 3000, category: "Salário", date: "2026-09-05" }],
  debts: [],
  goals: [],
} as unknown as SyncInput;

interface Chamada {
  method: string;
  endpoint: string;
}

/**
 * Transporte falso. `falharEm` recebe o endpoint e devolve o erro a lançar
 * (null = deixa passar). Cada planilha criada ganha um id novo — é assim que o
 * teste conta duplicatas: dois ids = dois arquivos no Drive de quem pagou.
 */
function transporte(falharEm: (method: string, endpoint: string) => Error | null = () => null) {
  const chamadas: Chamada[] = [];
  let criadas = 0;
  const fetcher: GoogleFetch = async (method, endpoint, _token, _body) => {
    chamadas.push({ method, endpoint });
    const erro = falharEm(method, endpoint);
    if (erro) throw erro;
    if (method === "POST" && endpoint === "/spreadsheets") {
      criadas += 1;
      return {
        spreadsheetId: `planilha-${criadas}`,
        // O Google devolve as abas já com id; o app lê daqui (readSheetIds).
        sheets: [
          "Dashboard", "Bolsos", "Filtros", "Lançamentos", "Receitas", "Despesas",
          "Dívidas", "Metas", "Fluxo de Caixa", "Resumo Mensal", "Como usar",
        ].map((title, i) => ({ properties: { title, sheetId: 100 + i, gridProperties: { rowCount: 1010, columnCount: 20 } } })),
      };
    }
    if (method === "GET") {
      return {
        sheets: [
          "Dashboard", "Bolsos", "Filtros", "Lançamentos", "Receitas", "Despesas",
          "Dívidas", "Metas", "Fluxo de Caixa", "Resumo Mensal", "Como usar",
        ].map((title, i) => ({ properties: { title, sheetId: 100 + i, gridProperties: { rowCount: 1010, columnCount: 20 } } })),
      };
    }
    return {};
  };
  return {
    fetcher,
    chamadas,
    criacoes: () => chamadas.filter((c) => c.method === "POST" && c.endpoint === "/spreadsheets").length,
  };
}

const AGORA = () => 1_700_000_000_000;

async function main() {
  console.log("\n[1] o link que a pessoa toca");

  assertEq(
    urlDaPlanilha("abc123"),
    "https://docs.google.com/spreadsheets/d/abc123/edit",
    "a URL termina em /edit (sem ela o celular passa por um redirecionamento e o app do Google engole o link)",
  );

  // lerMeta conserta na leitura o que já está gravado nos aparelhos: o meta
  // antigo guardava a URL sem /edit, e são quatro telas lendo esse mesmo campo.
  const store = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  store.set(SHEET_KEY, JSON.stringify({ spreadsheetId: "velha", spreadsheetUrl: "https://docs.google.com/spreadsheets/d/velha", lastSync: "2026-09-01T10:00:00.000Z" }));
  assertEq(lerMeta()?.spreadsheetUrl, "https://docs.google.com/spreadsheets/d/velha/edit", "meta antigo (URL sem /edit) é normalizado na leitura");
  store.clear();
  assertEq(lerMeta(), null, "sem meta gravado, lerMeta devolve null");

  console.log("\n[2] a planilha falha DEPOIS de nascer — o bug das dez duplicatas");

  // Falha no layout: o arquivo já existe no Drive, o enfeite não.
  const t1 = transporte((method, endpoint) => (endpoint.includes(":batchUpdate") ? new Error("HTTP 500 — deu ruim no meio") : null));
  const carimbos: SheetMeta[] = [];
  let erro1: unknown = null;
  try {
    await sincronizar({ token: "tok", meta: null, dados: DADOS, email: "quem@pagou.com", fetcher: t1.fetcher, agora: AGORA, aoCriar: (m) => carimbos.push(m) });
  } catch (err) {
    erro1 = err;
  }
  assert(erro1 !== null, "o envio realmente falhou (é o cenário que queremos)");
  assertEq(carimbos.length, 1, "o aparelho foi avisado do endereço ASSIM QUE a planilha nasceu");
  assertEq(carimbos[0]?.spreadsheetId, "planilha-1", "o carimbo traz o id da planilha que existe no Drive");
  assertEq(carimbos[0]?.spreadsheetUrl, urlDaPlanilha("planilha-1"), "o carimbo traz o link pronto pra abrir");
  assertEq(carimbos[0]?.layoutVersion, undefined, "o carimbo NÃO diz que o layout está aplicado (ele não está)");

  // A 2ª tentativa parte do carimbo. Sem ele, criaria a segunda planilha.
  const metaParcial = carimbos[0]!;
  const t2 = transporte();
  const meta2 = await sincronizar({ token: "tok", meta: metaParcial, dados: DADOS, email: "quem@pagou.com", fetcher: t2.fetcher, agora: AGORA });
  assertEq(t2.criacoes(), 0, "a tentativa seguinte NÃO cria outra planilha (era isso que enchia o Drive)");
  assertEq(meta2.spreadsheetId, "planilha-1", "ela continua a MESMA planilha");
  assert(
    t2.chamadas.some((c) => c.endpoint.includes("planilha-1:batchUpdate")),
    "e termina o serviço: reaplica o layout que faltou",
  );
  assertEq(meta2.layoutVersion, LAYOUT_VERSION, "só aí o meta diz que o layout está em dia");

  // O contraste: sem o carimbo (o comportamento de antes) nasce a duplicata.
  const t3 = transporte();
  await sincronizar({ token: "tok", meta: null, dados: DADOS, email: "quem@pagou.com", fetcher: t3.fetcher, agora: AGORA });
  assertEq(t3.criacoes(), 1, "sem meta na mão o app cria planilha — é o único caminho que cria");

  console.log("\n[3] a planilha sumiu do Drive (404)");

  const notFound = () => Object.assign(new ErroPlanilhaSumiu("HTTP 404 NOT_FOUND — Requested entity was not found."), {});
  assert(ehPlanilhaSumiu(notFound()), "o 404 do Google vira um erro reconhecível (ErroPlanilhaSumiu)");
  assert(!ehPlanilhaSumiu(new ErroDeAutorizacao("HTTP 401")), "erro de autorização NÃO é confundido com planilha sumida");

  const metaOrfa: SheetMeta = { spreadsheetId: "apagada", spreadsheetUrl: urlDaPlanilha("apagada"), lastSync: "2026-09-14T12:00:00.000Z", layoutVersion: LAYOUT_VERSION };

  // (a) o BOTÃO pode recriar: é gesto explícito de quem está olhando a tela.
  const t4 = transporte((_m, endpoint) => (endpoint.includes("apagada") ? notFound() : null));
  const carimbos4: SheetMeta[] = [];
  const meta4 = await sincronizar({
    token: "tok", meta: metaOrfa, dados: DADOS, email: "quem@pagou.com",
    fetcher: t4.fetcher, agora: AGORA, permitirRecriar: true, aoCriar: (m) => carimbos4.push(m),
  });
  assertEq(t4.criacoes(), 1, "o botão substitui a planilha que sumiu por uma nova");
  assert(meta4.spreadsheetId !== "apagada", "o meta passa a apontar pra planilha nova");
  assertEq(meta4.spreadsheetUrl, urlDaPlanilha(meta4.spreadsheetId), "e o link novo já vem com /edit");
  assertEq(carimbos4.length, 1, "o aparelho é avisado do endereço novo na hora");
  assertEq(meta4.layoutVersion, LAYOUT_VERSION, "a planilha nova sai com o layout de hoje");

  // (b) o AUTOMÁTICO não pode: 404 pode ser passageiro (lixeira, id propagando)
  // e criar arquivo no Drive de quem não tocou em nada é o que a decisão #4(a)
  // proíbe — e é como nascem duplicatas.
  const t5 = transporte((_m, endpoint) => (endpoint.includes("apagada") ? notFound() : null));
  let erro5: unknown = null;
  try {
    await sincronizar({ token: "tok", meta: metaOrfa, dados: DADOS, email: "quem@pagou.com", fetcher: t5.fetcher, agora: AGORA });
  } catch (err) {
    erro5 = err;
  }
  assert(ehPlanilhaSumiu(erro5), "sem permissão explícita, o 404 sobe em vez de virar planilha nova");
  assertEq(t5.criacoes(), 0, "o automático NÃO cria planilha sozinho (decisão #4a)");

  // (c) erro que não é 404 nunca vira planilha nova — perder a planilha porque a
  // internet caiu seria o mesmo estrago que este conserto veio evitar.
  const t6 = transporte((_m, endpoint) => (endpoint.includes("apagada") ? new Error("HTTP 503 — Google fora do ar") : null));
  let erro6: unknown = null;
  try {
    await sincronizar({ token: "tok", meta: metaOrfa, dados: DADOS, email: "quem@pagou.com", fetcher: t6.fetcher, agora: AGORA, permitirRecriar: true });
  } catch (err) {
    erro6 = err;
  }
  assert(erro6 !== null && !ehPlanilhaSumiu(erro6), "erro de rede/servidor sobe como erro");
  assertEq(t6.criacoes(), 0, "queda de rede NÃO cria planilha nova");

  // (d) erro de autorização idem: quem trata é o botão, pedindo pra religar.
  const t7 = transporte((_m, endpoint) => (endpoint.includes("apagada") ? new ErroDeAutorizacao("HTTP 401") : null));
  let erro7: unknown = null;
  try {
    await sincronizar({ token: "tok", meta: metaOrfa, dados: DADOS, email: "quem@pagou.com", fetcher: t7.fetcher, agora: AGORA, permitirRecriar: true });
  } catch (err) {
    erro7 = err;
  }
  assert(erro7 instanceof ErroDeAutorizacao, "token vencido continua sendo erro de autorização");
  assertEq(t7.criacoes(), 0, "token vencido NÃO cria planilha nova");

  console.log("\n[4] a tela Conta tem por onde abrir e o que dizer");

  const botao = await import("node:fs").then((fs) => fs.readFileSync(new URL("../components/GoogleSyncButton.tsx", import.meta.url), "utf8"));
  assert(botao.includes('href={meta.spreadsheetUrl}'), "o cartão mostra um link clicável pra planilha");
  assert(botao.includes('target="_blank"') && botao.includes('rel="noopener noreferrer"'), "o link sai do app (PWA em tela cheia) com rel seguro");
  assert(botao.includes("Copiar link da planilha"), "existe 'copiar link' pra quando o celular abrir na conta errada");
  assert(botao.includes("permitirRecriar: true"), "o botão (e só ele) pode substituir planilha sumida");
  assert(botao.includes("aoCriar:"), "o botão grava o endereço assim que a planilha nasce");
  assert(botao.includes("Religar e atualizar"), "com a autorização vencida o botão diz o que fazer, em português");
  assert(botao.includes("Conexão pausada"), "e o selo para de dizer 'Atualizada há…' como se estivesse tudo bem");

  console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} ok, ${failed} falha(s)`);
  if (failures.length) console.error(failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(failed === 0 ? 0 : 1);
}

void main();
