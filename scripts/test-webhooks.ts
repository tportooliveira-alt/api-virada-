/**
 * Testa os 6 adapters de webhook + SQLite. Roda com:
 *   npx tsx scripts/test-webhooks.ts
 */
import { unlinkSync, existsSync, writeFileSync } from "fs";
import path from "path";

// Apaga o DB de testes pra começar limpo
const dbFile = path.join(process.cwd(), "data", "access.db");
if (existsSync(dbFile)) unlinkSync(dbFile);
const dbWal = `${dbFile}-wal`; if (existsSync(dbWal)) unlinkSync(dbWal);
const dbShm = `${dbFile}-shm`; if (existsSync(dbShm)) unlinkSync(dbShm);

import {
  checkProductFilter,
  parseWebhook,
  productTokens,
  type ParsedWebhook,
} from "../lib/access/adapters";
import {
  isMember,
  getMember,
  listMembers,
  listWebhookLog,
  upsertMember,
  type Platform,
} from "../lib/access/members";
import { POST as webhookPOST } from "../app/api/webhooks/[platform]/route";
import { POST as accessCheckPOST } from "../app/api/access/check/route";
import { GET as adminMembersGET } from "../app/api/admin/members/route";
import { GET as adminLogGET } from "../app/api/admin/webhook-log/route";
import { POST as adminManualPOST } from "../app/api/admin/members/manual/route";
import { POST as adminStatusPOST } from "../app/api/admin/members/status/route";
import { ADMIN_COOKIE, createAdminSession } from "../lib/access/admin-session";

let pass = 0, fail = 0;
const check = (label: string, ok: boolean, hint?: string) => {
  if (ok) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}${hint ? ` — ${hint}` : ""}`); }
};

// ─── 1. Hotmart ─────────────────────────────────────────────────────────────
console.log("\n[Hotmart] PURCHASE_APPROVED");
const hot = parseWebhook("hotmart", {
  event: "PURCHASE_APPROVED",
  data: {
    buyer: { email: "joao@gmail.com", name: "João" },
    product: { name: "Código da Virada" },
    purchase: { transaction: "HP-001" },
  },
});
check("classifica como approved", hot.event === "approved");
check("extrai email", hot.upsert?.email === "joao@gmail.com");
check("extrai produto", hot.upsert?.product === "Código da Virada");
upsertMember(hot.upsert!);
check("isMember(joao) === true", isMember("joao@gmail.com"));
check("getMember tem name", getMember("joao@gmail.com")?.name === "João");

console.log("\n[Hotmart] PURCHASE_REFUNDED");
const hotRef = parseWebhook("hotmart", {
  event: "PURCHASE_REFUNDED",
  data: { buyer: { email: "joao@gmail.com" } },
});
check("classifica como refunded", hotRef.event === "refunded");
upsertMember(hotRef.upsert!);
check("após refund, status = reembolsado", getMember("joao@gmail.com")?.status === "reembolsado");
check("isMember(joao) === false após refund", !isMember("joao@gmail.com"));

// ─── 2. Eduzz ────────────────────────────────────────────────────────────────
console.log("\n[Eduzz] paid");
const eduzz = parseWebhook("eduzz", {
  trans_status: "PAID",
  cus_email: "maria@gmail.com",
  cus_name: "Maria",
  product_name: "Código da Virada Eduzz",
  trans_cod: "EDZ-001",
});
check("classifica como approved", eduzz.event === "approved");
check("email maria", eduzz.upsert?.email === "maria@gmail.com");
upsertMember(eduzz.upsert!);
check("maria virou ativa", isMember("maria@gmail.com"));

// ─── 3. Kiwify ───────────────────────────────────────────────────────────────
console.log("\n[Kiwify] approved");
const kiw = parseWebhook("kiwify", {
  webhook_event_type: "order_approved",
  Customer: { email: "carlos@gmail.com", full_name: "Carlos" },
  Product: { product_name: "CDV Kiwify" },
  order_id: "KW-001",
});
check("classifica como approved", kiw.event === "approved");
check("email carlos", kiw.upsert?.email === "carlos@gmail.com");
upsertMember(kiw.upsert!);
check("carlos virou ativo", isMember("carlos@gmail.com"));

// ─── 4. Monetizze ────────────────────────────────────────────────────────────
console.log("\n[Monetizze] aprovado");
const mon = parseWebhook("monetizze", {
  tipoEvento: "Compra Finalizada",
  venda: { status: "Finalizada", codigo: "MN-001" },
  comprador: { email: "ana@gmail.com", nome: "Ana" },
  produto: { nome: "CDV Monetizze" },
});
check("monetizze parse", mon.upsert?.email === "ana@gmail.com");
upsertMember(mon.upsert!);
check("ana virou ativa", isMember("ana@gmail.com"));

// ─── 5. Cakto ────────────────────────────────────────────────────────────────
console.log("\n[Cakto] paid");
const cak = parseWebhook("cakto", {
  status: "PAID",
  customer: { email: "lucas@gmail.com", name: "Lucas" },
  product: { name: "CDV Cakto" },
  id: "CK-001",
});
check("cakto parse", cak.upsert?.email === "lucas@gmail.com");
upsertMember(cak.upsert!);
check("lucas virou ativo", isMember("lucas@gmail.com"));

// ─── 6. Perfectpay ───────────────────────────────────────────────────────────
console.log("\n[Perfectpay] aprovada");
const pp = parseWebhook("perfectpay", {
  sale_status_enum_key: "approved",
  customer: { email: "bia@gmail.com", full_name: "Bia" },
  product: { name: "CDV PerfectPay" },
  code: "PP-001",
});
check("perfectpay parse", pp.upsert?.email === "bia@gmail.com");
upsertMember(pp.upsert!);
check("bia virou ativa", isMember("bia@gmail.com"));

// ─── Lista geral ─────────────────────────────────────────────────────────────
console.log("\n[Geral]");
const all = listMembers();
check("6 membros no banco", all.length === 6, `recebeu ${all.length}`);
check("5 ativos + 1 reembolsado", all.filter((m) => m.status === "ativo").length === 5);
const platforms = new Set(all.map((m) => m.platform));
check("6 plataformas distintas", platforms.size === 6, `${[...platforms].join(",")}`);

// ─── Email com case mismatch ─────────────────────────────────────────────────
console.log("\n[Normalização de email]");
upsertMember({ email: "Pedro@GMAIL.com", platform: "hotmart" });
check("upsert normaliza para minúsculas", isMember("PEDRO@gmail.com"));
check("não cria duplicado por case", isMember("pedro@gmail.com") && getMember("Pedro@Gmail.com")?.email === "pedro@gmail.com");


// Daqui pra baixo os testes chamam as rotas de verdade (async), então tudo
// mora dentro de main(): o tsx transpila pra CommonJS e não aceita await solto.
async function main() {
  /* ═══════════════════════════════════════════════════════════════════════════
     FILTRO DE PRODUTO — <PLATAFORMA>_ALLOWED_PRODUCTS
     O webhook do dono está em "todos os produtos": sem filtro, a compra do
     e-book de R$ 27 libera o app e o reembolso dele derruba quem pagou o app.
     ═══════════════════════════════════════════════════════════════════════════ */

  const PLATAFORMAS: Platform[] = ["hotmart", "eduzz", "kiwify", "monetizze", "cakto", "perfectpay"];

  /** Limpa toda env de filtro — cada bloco liga só a que vai testar. */
  function limparFiltros() {
    for (const plat of PLATAFORMAS) delete process.env[`${plat.toUpperCase()}_ALLOWED_PRODUCTS`];
  }

  /** Chama a rota de verdade, como a plataforma chamaria. */
  async function postWebhook(platform: string, body: unknown, token?: string) {
    const url = `http://localhost/api/webhooks/${platform}${token ? `?token=${token}` : ""}`;
    const res = await webhookPOST(
      new Request(url, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }),
      { params: { platform } }
    );
    return { status: res.status, json: (await res.json()) as Record<string, unknown> };
  }

  /** Um aviso de compra por plataforma, no formato que cada uma manda mesmo. */
  const COMPRA: Record<Platform, (email: string, produto: string) => Record<string, unknown>> = {
    hotmart: (email, produto) => ({
      event: "PURCHASE_APPROVED",
      data: { buyer: { email }, product: { id: produto, name: `Produto ${produto}` }, purchase: { transaction: "T1" } },
    }),
    eduzz: (email, produto) => ({ trans_status: "PAID", cus_email: email, product_cod: produto, product_name: `Produto ${produto}` }),
    kiwify: (email, produto) => ({
      webhook_event_type: "order_approved",
      Customer: { email },
      Product: { product_id: produto, product_name: `Produto ${produto}` },
      order_id: "K1",
    }),
    monetizze: (email, produto) => ({
      tipoEvento: "Compra Finalizada",
      venda: { status: "Finalizada", codigo: "M1" },
      comprador: { email },
      produto: { codigo: produto, nome: `Produto ${produto}` },
    }),
    cakto: (email, produto) => ({ status: "PAID", customer: { email }, product: { id: produto, name: `Produto ${produto}` }, id: "C1" }),
    perfectpay: (email, produto) => ({
      sale_status_enum_key: "approved",
      customer: { email },
      product: { code: produto, name: `Produto ${produto}` },
      code: "P1",
    }),
    manual: (email, produto) => ({ email, product: produto }),
  };

  // ─── Env vazia: aceita tudo (nada quebra pra quem já vende) ──────────────────
  console.log("\n[Filtro] env vazia aceita tudo");
  limparFiltros();
  for (const plat of PLATAFORMAS) {
    const body = COMPRA[plat]("semfiltro@gmail.com", "qualquer-coisa");
    const filtro = checkProductFilter(plat, body, parseWebhook(plat, body));
    check(`${plat}: sem env o filtro fica desligado e aceita`, filtro.allowed && !filtro.enabled);
  }

  // ─── Cada plataforma reconhece os PRÓPRIOS campos de produto ─────────────────
  console.log("\n[Filtro] cada plataforma acha o próprio campo de produto");
  for (const plat of PLATAFORMAS) {
    const body = COMPRA[plat]("tokens@gmail.com", "APP-123");
    const tokens = productTokens(plat, body, parseWebhook(plat, body));
    check(`${plat}: acha o id/código do produto`, tokens.includes("app-123"), tokens.join(","));
    check(`${plat}: acha o nome do produto`, tokens.includes("produto app-123"), tokens.join(","));
  }

  // A rede geral: mesmo num JSON fora do formato esperado, o produto que o
  // adapter já normalizou entra como token.
  {
    const parsedFake: ParsedWebhook = {
      platform: "kiwify",
      event: "approved",
      upsert: { email: "x@y.com", platform: "kiwify", product: "Virada App" },
    };
    const tokens = productTokens("kiwify", { formato: "novo" }, parsedFake);
    check("rede geral: usa o produto já normalizado pelo adapter", tokens.includes("virada app"));
  }

  // ─── Produto permitido passa / proibido é ignorado, plataforma por plataforma ─
  console.log("\n[Filtro] produto permitido libera, proibido é ignorado");
  for (const plat of PLATAFORMAS) {
    limparFiltros();
    process.env[`${plat.toUpperCase()}_ALLOWED_PRODUCTS`] = "APP-VIRADA, Produto APP-VIRADA";

    const bom = `${plat}-comprou-o-app@gmail.com`;
    const r1 = await postWebhook(plat, COMPRA[plat](bom, "APP-VIRADA"));
    check(`${plat}: produto permitido responde 200`, r1.status === 200, `status ${r1.status}`);
    check(`${plat}: produto permitido libera o acesso`, isMember(bom));

    const ruim = `${plat}-comprou-so-o-ebook@gmail.com`;
    const r2 = await postWebhook(plat, COMPRA[plat](ruim, "EBOOK-27"));
    check(`${plat}: produto proibido responde ok:true`, r2.json.ok === true, JSON.stringify(r2.json));
    check(`${plat}: produto proibido responde ignored:true`, r2.json.ignored === true);
    check(`${plat}: produto proibido NÃO libera acesso`, !isMember(ruim));
  }

  // ─── O caso que quebra o cliente: reembolso de produto proibido ──────────────
  console.log("\n[Filtro] reembolso do e-book NÃO pode derrubar quem comprou o app");
  limparFiltros();
  process.env.KIWIFY_ALLOWED_PRODUCTS = "APP-VIRADA";
  const duplo = "comprou-os-dois@gmail.com";
  await postWebhook("kiwify", COMPRA.kiwify(duplo, "APP-VIRADA"));
  check("comprou o app: está ativo", isMember(duplo));

  const reembolsoEbook = {
    webhook_event_type: "order_refunded",
    order_status: "refunded",
    Customer: { email: duplo },
    Product: { product_id: "EBOOK-27", product_name: "E-book de R$ 27" },
    order_id: "K-REF",
  };
  const rRef = await postWebhook("kiwify", reembolsoEbook);
  check("reembolso de produto proibido responde ignored", rRef.json.ignored === true, JSON.stringify(rRef.json));
  check("reembolso do e-book NÃO revoga o acesso ao app", isMember(duplo));
  check("status continua ativo", getMember(duplo)?.status === "ativo");

  // E o reembolso do produto CERTO continua revogando.
  const reembolsoApp = {
    webhook_event_type: "order_refunded",
    order_status: "refunded",
    Customer: { email: duplo },
    Product: { product_id: "APP-VIRADA", product_name: "Virada App" },
    order_id: "K-REF2",
  };
  await postWebhook("kiwify", reembolsoApp);
  check("reembolso do app revoga o acesso", !isMember(duplo));
  check("status vira reembolsado", getMember(duplo)?.status === "reembolsado");

  // Aviso magro (sem dizer o produto) com filtro ligado: ignorado de propósito.
  // Na dúvida ninguém perde acesso pago — o dono revoga na mão pelo painel.
  process.env.HOTMART_ALLOWED_PRODUCTS = "APP-VIRADA";
  const pagante = "pagou-o-app@gmail.com";
  await postWebhook("hotmart", COMPRA.hotmart(pagante, "APP-VIRADA"));
  check("hotmart: pagante liberado", isMember(pagante));
  const refMagro = await postWebhook("hotmart", {
    event: "PURCHASE_REFUNDED",
    data: { buyer: { email: pagante } },
  });
  check("reembolso sem produto é ignorado com o filtro ligado", refMagro.json.ignored === true, JSON.stringify(refMagro.json));
  check("e o acesso pago continua de pé", isMember(pagante));
  delete process.env.HOTMART_ALLOWED_PRODUCTS;

  // ─── O aviso ignorado precisa aparecer pro dono (painel /admin/membros) ──────
  console.log("\n[Log] o aviso ignorado fica registrado com o motivo");
  const logs = listWebhookLog(200);
  const ignorado = logs.find((l) => (l.message ?? "").startsWith("produto fora de") && l.email === duplo);
  check("aviso ignorado está no webhook_log", Boolean(ignorado));
  check("o log diz QUAL env configurar", (ignorado?.message ?? "").includes("KIWIFY_ALLOWED_PRODUCTS"), ignorado?.message ?? "");
  check("o log mostra o produto recebido", (ignorado?.message ?? "").includes("ebook-27"), ignorado?.message ?? "");
  check("aviso ignorado não conta como falha", ignorado?.ok === true);

  // ─── Erros básicos da rota ──────────────────────────────────────────────────
  console.log("\n[Rota] e-mail ausente e token errado");
  limparFiltros();
  const semEmail = await postWebhook("kiwify", { webhook_event_type: "order_approved", Product: { product_name: "Virada App" } });
  check("sem e-mail responde 400", semEmail.status === 400, `status ${semEmail.status}`);
  check("sem e-mail explica em português", String(semEmail.json.message ?? "").includes("Email do comprador ausente"));

  process.env.KIWIFY_TOKEN = "segredo-certo";
  const tokenErrado = await postWebhook("kiwify", COMPRA.kiwify("intruso@gmail.com", "x"), "segredo-errado");
  check("token errado responde 401", tokenErrado.status === 401, `status ${tokenErrado.status}`);
  check("token errado NÃO libera ninguém", !isMember("intruso@gmail.com"));

  const tokenCerto = await postWebhook("kiwify", COMPRA.kiwify("com-token@gmail.com", "x"), "segredo-certo");
  check("token certo responde 200", tokenCerto.status === 200, `status ${tokenCerto.status}`);
  check("token certo libera", isMember("com-token@gmail.com"));
  delete process.env.KIWIFY_TOKEN;

  // ─── Plataforma desconhecida ────────────────────────────────────────────────
  const plataformaX = await postWebhook("plataforma-que-nao-existe", { email: "a@b.com" });
  check("plataforma desconhecida responde 404", plataformaX.status === 404, `status ${plataformaX.status}`);

  /* ═══════════════════════════════════════════════════════════════════════════
     /api/access/check — 401 (login) x 503 (servidor)
     Achado T-06: uma exceção do SQLite caía no mesmo catch do token e o
     comprador legítimo via "não encontrada". Quem pagou e lê isso pede reembolso.
     ═══════════════════════════════════════════════════════════════════════════ */
  console.log("\n[access/check] 401 é culpa do login, 503 é culpa do servidor");

  const fetchReal = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("tokeninfo?id_token=")) {
      if (url.includes("TOKEN_RUIM")) {
        return new Response(JSON.stringify({ error_description: "Invalid Value" }), { status: 400 });
      }
      return new Response(
        JSON.stringify({ sub: "sub-1", email: "comprou@gmail.com", email_verified: "true", name: "Quem Comprou" }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    throw new Error(`fetch inesperado no teste: ${url}`);
  }) as typeof fetch;

  async function postCheck(body: unknown) {
    const res = await accessCheckPOST(
      new Request("http://localhost/api/access/check", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
      })
    );
    return { status: res.status, json: (await res.json()) as Record<string, unknown> };
  }

  // Quem comprou entra.
  upsertMember({ email: "comprou@gmail.com", platform: "kiwify", status: "ativo" });
  const ok200 = await postCheck({ credential: "TOKEN_BOM" });
  check("login válido de quem comprou: 200 ativo", ok200.status === 200 && ok200.json.status === "ativo", JSON.stringify(ok200.json));

  // Token ruim → 401.
  const r401 = await postCheck({ credential: "TOKEN_RUIM" });
  check("token inválido responde 401", r401.status === 401, `status ${r401.status}`);
  const msg401 = String(r401.json.message ?? "");
  check("401 fala em entrar de novo", msg401.toLowerCase().includes("entre de novo"), msg401);

  // Banco quebrado → 503, NUNCA "você não comprou".
  // O stack trace que aparece no terminal logo abaixo é O TESTE PASSANDO: é o
  // console.error do servidor. O que a pessoa vê é só a frase curta do 503.
  const dirRuim = path.join(process.cwd(), "data", "nao-sou-diretorio");
  if (!existsSync(dirRuim)) writeFileSync(dirRuim, "isto aqui e um arquivo, nao uma pasta");
  const dirAntigo = process.env.ACCESS_DB_DIR;
  process.env.ACCESS_DB_DIR = path.join(dirRuim, "sub");
  const r503 = await postCheck({ credential: "TOKEN_BOM" });
  if (dirAntigo === undefined) delete process.env.ACCESS_DB_DIR;
  else process.env.ACCESS_DB_DIR = dirAntigo;

  check("banco quebrado responde 503 (não 401)", r503.status === 503, `status ${r503.status}`);
  const msg503 = String(r503.json.message ?? "");
  check("503 diz que o problema é do servidor", msg503.includes("problema no servidor"), msg503);
  check("503 manda tentar em instantes", msg503.includes("instantes"), msg503);
  check("503 não acusa a pessoa de não ter comprado", !/n[ãa]o (comprou|encontrad)/i.test(msg503), msg503);
  check("503 não vaza exceção do Node", !/ENOTDIR|SqliteError|Error:|\/home\//.test(msg503), msg503);
  check("mensagem de 503 é diferente da de 401", msg503 !== msg401);

  // O banco volta a funcionar depois do tropeço (o cache não fica envenenado).
  const depois = await postCheck({ credential: "TOKEN_BOM" });
  check("depois do erro, o banco volta a responder", depois.status === 200 && depois.json.status === "ativo", JSON.stringify(depois.json));

  globalThis.fetch = fetchReal;
  if (existsSync(dirRuim)) unlinkSync(dirRuim);

  /* ═══════════════════════════════════════════════════════════════════════════
     V1 — FILTRO DE PRODUTO COM ID NUMÉRICO
     A Hotmart manda `data.product.id` e a Eduzz `product_cod` como NÚMERO no
     JSON. Se a leitura só aceitasse string, o id sumia: o dono copiava o id do
     painel pra lista de produtos liberados e a compra de verdade era ignorada —
     pior que não ter filtro, porque parece configurado e não libera ninguém.
     ═══════════════════════════════════════════════════════════════════════════ */
  console.log("\n[Filtro] id de produto NUMÉRICO também conta");

  /** Mesmo aviso de compra, mas com o id do produto como número (sem aspas). */
  const COMPRA_ID_NUMERICO: Record<Platform, (email: string, id: number) => Record<string, unknown>> = {
    hotmart: (email, id) => ({
      event: "PURCHASE_APPROVED",
      data: { buyer: { email }, product: { id, name: "Virada App" }, purchase: { transaction: "T-NUM" } },
    }),
    eduzz: (email, id) => ({ trans_status: "PAID", cus_email: email, product_cod: id, product_name: "Virada App" }),
    kiwify: (email, id) => ({
      webhook_event_type: "order_approved",
      Customer: { email },
      Product: { product_id: id, product_name: "Virada App" },
      order_id: "K-NUM",
    }),
    monetizze: (email, id) => ({
      tipoEvento: "Compra Finalizada",
      venda: { status: "Finalizada", codigo: "M-NUM" },
      comprador: { email },
      produto: { codigo: id, nome: "Virada App" },
    }),
    cakto: (email, id) => ({ status: "PAID", customer: { email }, product: { id, name: "Virada App" }, id: "C-NUM" }),
    perfectpay: (email, id) => ({
      sale_status_enum_key: "approved",
      customer: { email },
      product: { code: id, name: "Virada App" },
      code: "P-NUM",
    }),
    manual: (email, id) => ({ email, product_id: id }),
  };

  const ID_NUM = 5551234;
  for (const plat of PLATAFORMAS) {
    limparFiltros();
    // O dono copia o id do painel da plataforma e cola na lista — texto, sempre.
    process.env[`${plat.toUpperCase()}_ALLOWED_PRODUCTS`] = String(ID_NUM);

    const corpoNum = COMPRA_ID_NUMERICO[plat](`${plat}-id-numero@gmail.com`, ID_NUM);
    const tokensNum = productTokens(plat, corpoNum, parseWebhook(plat, corpoNum));
    check(`${plat}: id numérico vira token`, tokensNum.includes(String(ID_NUM)), tokensNum.join(","));

    const rNum = await postWebhook(plat, corpoNum);
    check(`${plat}: compra com id numérico responde 200`, rNum.status === 200, `status ${rNum.status}`);
    check(`${plat}: compra com id numérico LIBERA o acesso`, isMember(`${plat}-id-numero@gmail.com`), JSON.stringify(rNum.json));

    // E a mesma lista continua valendo quando a plataforma manda o id como texto.
    const corpoStr = COMPRA[plat](`${plat}-id-texto@gmail.com`, String(ID_NUM));
    const rStr = await postWebhook(plat, corpoStr);
    check(`${plat}: compra com id em texto LIBERA o acesso`, isMember(`${plat}-id-texto@gmail.com`), JSON.stringify(rStr.json));

    // Produto de fora continua barrado — o conserto não pode abrir a porteira.
    const corpoOutro = COMPRA_ID_NUMERICO[plat](`${plat}-outro-id@gmail.com`, 9999999);
    const rOutro = await postWebhook(plat, corpoOutro);
    check(`${plat}: id numérico DE OUTRO produto continua ignorado`, rOutro.json.ignored === true && !isMember(`${plat}-outro-id@gmail.com`));
  }
  limparFiltros();

  // O `str` do resto do arquivo NÃO pode ter mudado: e-mail e nome continuam
  // exigindo texto. Número em e-mail é lixo de JSON, não comprador.
  {
    const lixo = parseWebhook("cakto", { status: "PAID", customer: { email: 12345, name: 678 } });
    check("e-mail numérico continua sendo recusado (não virou 12345)", lixo.upsert === null, JSON.stringify(lixo.upsert));
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     V2 — QUEDA DO GOOGLE NÃO PODE VIRAR "VOCÊ NÃO COMPROU"
     Antes, QUALQUER resposta não-ok da Google virava 401 ("entre de novo").
     Se a Google cai (5xx) ou está limitando (429), o token da pessoa está
     perfeito: culpá-la é dizer "você não comprou" pra quem pagou.
     ═══════════════════════════════════════════════════════════════════════════ */
  console.log("\n[access/check] Google fora do ar = 503, token ruim = 401");

  const fetchAntes = globalThis.fetch;
  /** O teste decide, a cada caso, o que a Google responde em cada endereço. */
  let respondeGoogle: (url: string) => Response = () => new Response("{}", { status: 200 });
  globalThis.fetch = (async (input: RequestInfo | URL) => respondeGoogle(String(input))) as typeof fetch;

  const perfilOk = JSON.stringify({ sub: "sub-1", email: "comprou@gmail.com", email_verified: "true", name: "Quem Comprou" });

  // ── Google caída / limitando: 503 em TODOS os códigos, nos dois caminhos ──
  for (const codigo of [500, 502, 503, 504, 429]) {
    respondeGoogle = () => new Response("<html>Service Unavailable</html>", { status: codigo });

    const rId = await postCheck({ credential: "TOKEN_BOM" });
    check(`Google ${codigo} no login por credencial: 503 (não 401)`, rId.status === 503, `status ${rId.status}`);
    const msgId = String(rId.json.message ?? "");
    check(`Google ${codigo}: fala em problema no servidor`, msgId.includes("problema no servidor") && msgId.includes("instantes"), msgId);
    check(`Google ${codigo}: não manda "entre de novo"`, !/entre de novo/i.test(msgId), msgId);
    check(`Google ${codigo}: não vaza corpo/HTML da resposta`, !/html|Service Unavailable|\d{3}/.test(msgId), msgId);

    const rAcc = await postCheck({ accessToken: "TOKEN_BOM" });
    check(`Google ${codigo} no login por access token: 503`, rAcc.status === 503, `status ${rAcc.status}`);
  }

  // ── A queda só do userinfo (tokeninfo respondeu) também é 503 ──────────────
  respondeGoogle = (url) =>
    url.includes("tokeninfo")
      ? new Response(JSON.stringify({ aud: "x", sub: "sub-1" }), { status: 200, headers: { "content-type": "application/json" } })
      : new Response("indisponivel", { status: 503 });
  const rUser = await postCheck({ accessToken: "TOKEN_BOM" });
  check("userinfo fora do ar responde 503 (não 401)", rUser.status === 503, `status ${rUser.status}`);

  // ── Token realmente inválido/vencido (4xx) continua 401 ───────────────────
  for (const codigo of [400, 401, 403, 404]) {
    respondeGoogle = () => new Response(JSON.stringify({ error_description: "Invalid Value" }), { status: codigo });
    const r = await postCheck({ credential: "TOKEN_VENCIDO" });
    check(`tokeninfo ${codigo}: 401 de login`, r.status === 401, `status ${r.status}`);
    check(`tokeninfo ${codigo}: manda entrar de novo`, /entre de novo/i.test(String(r.json.message ?? "")), String(r.json.message));
  }

  // ── E o caminho feliz continua feliz ──────────────────────────────────────
  respondeGoogle = (url) =>
    url.includes("tokeninfo")
      ? new Response(perfilOk, { status: 200, headers: { "content-type": "application/json" } })
      : new Response(perfilOk, { status: 200, headers: { "content-type": "application/json" } });
  const rFeliz = await postCheck({ credential: "TOKEN_BOM" });
  check("depois de tudo, quem comprou ainda entra", rFeliz.status === 200 && rFeliz.json.status === "ativo", JSON.stringify(rFeliz.json));

  globalThis.fetch = fetchAntes;

  /* ═══════════════════════════════════════════════════════════════════════════
     V3 — A LISTA DE COMPRADORES NÃO PODE ABRIR SEM SEGREDO CONFIGURADO
     Sem ADMIN_SESSION_SECRET o servidor aceitava o header `x-admin-email`, que
     qualquer pessoa forja: quem soubesse a URL lia nome, e-mail e compra de
     todo mundo. Em produção isso agora fecha (503, "falta configurar").
     ═══════════════════════════════════════════════════════════════════════════ */
  console.log("\n[admin] sem segredo configurado o painel fecha em produção");

  const envAntes = {
    node: process.env.NODE_ENV,
    secret: process.env.ADMIN_SESSION_SECRET,
    emails: process.env.ADMIN_EMAILS,
  };
  /** NODE_ENV é só leitura no tipo do Next; aqui o teste precisa trocar. */
  const setNodeEnv = (v: string) => { (process.env as Record<string, string | undefined>).NODE_ENV = v; };

  process.env.ADMIN_EMAILS = "dono@virada.com";
  const DONO = { "x-admin-email": "dono@virada.com" };
  const INTRUSO = { "x-admin-email": "intruso@qualquer.com" };

  /** Chama as 4 rotas de admin e devolve status + corpo de cada uma. */
  async function baterNoAdmin(headers: Record<string, string>) {
    const membros = await adminMembersGET(new Request("http://localhost/api/admin/members", { headers }));
    const avisos = await adminLogGET(new Request("http://localhost/api/admin/webhook-log", { headers }));
    const manual = await adminManualPOST(new Request("http://localhost/api/admin/members/manual", {
      method: "POST", headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ email: "entrou-pela-porta-errada@gmail.com" }),
    }));
    const status = await adminStatusPOST(new Request("http://localhost/api/admin/members/status", {
      method: "POST", headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ email: "comprou@gmail.com", status: "cancelado" }),
    }));
    return {
      membros: { status: membros.status, json: (await membros.json()) as Record<string, unknown> },
      avisos: { status: avisos.status, json: (await avisos.json()) as Record<string, unknown> },
      manual: { status: manual.status, json: (await manual.json()) as Record<string, unknown> },
      statusRota: { status: status.status, json: (await status.json()) as Record<string, unknown> },
    };
  }

  // ── PRODUÇÃO sem segredo: porta fechada ───────────────────────────────────
  setNodeEnv("production");
  delete process.env.ADMIN_SESSION_SECRET;
  const fechado = await baterNoAdmin(DONO);

  check("produção sem segredo: lista de membros responde 503", fechado.membros.status === 503, `status ${fechado.membros.status}`);
  check("produção sem segredo: NÃO devolve a lista de compradores", fechado.membros.json.members === undefined);
  check("produção sem segredo: avisos de venda respondem 503", fechado.avisos.status === 503, `status ${fechado.avisos.status}`);
  check("produção sem segredo: avisos NÃO vazam e-mails", fechado.avisos.json.entries === undefined);
  check("produção sem segredo: cadastro manual responde 503", fechado.manual.status === 503, `status ${fechado.manual.status}`);
  check("produção sem segredo: o header forjado NÃO cadastrou ninguém", !isMember("entrou-pela-porta-errada@gmail.com"));
  check("produção sem segredo: mudar status responde 503", fechado.statusRota.status === 503, `status ${fechado.statusRota.status}`);
  check("produção sem segredo: o header forjado NÃO mudou status", getMember("comprou@gmail.com")?.status === "ativo");

  const msgFechado = String(fechado.membros.json.message ?? "");
  check("503 do admin explica que falta configurar", /configur/i.test(msgFechado), msgFechado);
  check("503 do admin não mostra nome de variável de ambiente", !/[A-Z_]{6,}=|ADMIN_SESSION_SECRET|NODE_ENV/.test(msgFechado), msgFechado);
  check("503 do admin não manda 'entre de novo'", !/entre de novo/i.test(msgFechado), msgFechado);

  // ── PRODUÇÃO com segredo: só o cookie assinado abre ───────────────────────
  process.env.ADMIN_SESSION_SECRET = "0123456789abcdef0123456789abcdef";
  const semCookie = await baterNoAdmin(DONO);
  check("produção com segredo: header forjado responde 401", semCookie.membros.status === 401, `status ${semCookie.membros.status}`);
  check("produção com segredo: header forjado NÃO devolve a lista", semCookie.membros.json.members === undefined);
  check("401 do admin manda entrar de novo no app", /entre de novo/i.test(String(semCookie.membros.json.message ?? "")), String(semCookie.membros.json.message));

  const cookieBom = createAdminSession("dono@virada.com");
  const comCookie = await adminMembersGET(new Request("http://localhost/api/admin/members", {
    headers: { cookie: `${ADMIN_COOKIE}=${cookieBom}` },
  }));
  const comCookieJson = (await comCookie.json()) as Record<string, unknown>;
  check("produção com segredo: cookie assinado abre a lista", comCookie.status === 200, `status ${comCookie.status}`);
  check("com cookie válido a lista vem de verdade", Array.isArray(comCookieJson.members));
  check("com cookie válido não sobra aviso de porta aberta", !comCookieJson.aviso);

  // ── DESENVOLVIMENTO sem segredo: continua abrindo, mas avisando ───────────
  setNodeEnv("development");
  delete process.env.ADMIN_SESSION_SECRET;
  const devDono = await adminMembersGET(new Request("http://localhost/api/admin/members", { headers: DONO }));
  const devJson = (await devDono.json()) as Record<string, unknown>;
  check("dev sem segredo: o dono ainda entra pelo header", devDono.status === 200, `status ${devDono.status}`);
  check("dev sem segredo: o painel recebe um aviso pra mostrar", typeof devJson.aviso === "string" && (devJson.aviso as string).length > 20, String(devJson.aviso));
  check("o aviso é em português simples, sem nome de variável", !/[A-Z_]{6,}/.test(String(devJson.aviso ?? "")), String(devJson.aviso));

  const devIntruso = await adminMembersGET(new Request("http://localhost/api/admin/members", { headers: INTRUSO }));
  check("dev sem segredo: quem não é admin continua barrado (401)", devIntruso.status === 401, `status ${devIntruso.status}`);

  // Devolve o ambiente como estava, senão os testes seguintes herdam sujeira.
  if (envAntes.node === undefined) delete (process.env as Record<string, string | undefined>).NODE_ENV;
  else setNodeEnv(envAntes.node);
  if (envAntes.secret === undefined) delete process.env.ADMIN_SESSION_SECRET;
  else process.env.ADMIN_SESSION_SECRET = envAntes.secret;
  if (envAntes.emails === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = envAntes.emails;

}

main()
  .then(() => {
    console.log(`\nTotal: ${pass} passou, ${fail} falhou`);
    if (fail > 0) process.exit(1);
  })
  .catch((err) => {
    console.error("\nErro inesperado no teste:", err);
    process.exit(1);
  });
