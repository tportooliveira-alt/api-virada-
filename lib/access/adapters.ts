/**
 * Adapters de webhook por plataforma. Cada plataforma manda um JSON
 * diferente e este módulo normaliza tudo para um formato único.
 *
 * Como adicionar uma plataforma nova:
 *   1) Adicione um adapter em ADAPTERS abaixo
 *   2) Adicione a chave em Platform (lib/access/members.ts)
 *   3) Adicione a env de validação opcional em VALIDATORS
 *
 * URLs configuradas em cada painel de venda:
 *   /api/webhooks/hotmart    /api/webhooks/eduzz   /api/webhooks/kiwify
 *   /api/webhooks/monetizze  /api/webhooks/cakto   /api/webhooks/perfectpay
 */
import type { Platform, UpsertInput } from "./members";

export interface ParsedWebhook {
  platform: Platform;
  event: string;        // canonical: "approved" | "cancelled" | "refunded" | "chargeback" | "ignored"
  upsert: UpsertInput | null;
}

type Adapter = (body: Record<string, unknown>) => ParsedWebhook;

const get = (obj: unknown, path: string): unknown => {
  let cur: unknown = obj;
  for (const k of path.split(".")) {
    if (cur && typeof cur === "object" && k in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[k];
    } else return undefined;
  }
  return cur;
};
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

function classify(raw: string | null | undefined): ParsedWebhook["event"] {
  const e = (raw ?? "").toUpperCase();
  if (e.includes("REFUND") || e.includes("REEMBOLS")) return "refunded";
  if (e.includes("CHARGEBACK") || e.includes("DISPUTE")) return "chargeback";
  if (e.includes("CANCEL") || e.includes("EXPIRED") || e.includes("EXPIRADA")) return "cancelled";
  if (e.includes("APPROV") || e.includes("COMPLETE") || e.includes("PAID") || e.includes("FINALIZ") || e.includes("APROVAD") || e.includes("PAGA")) return "approved";
  return "ignored";
}

const ADAPTERS: Record<Platform, Adapter> = {
  // ─── Hotmart ─────────────────────────────────────────────────────────────
  hotmart: (b) => {
    const event = classify(str(b.event) ?? str(get(b, "data.purchase.status")) ?? undefined);
    const email = str(get(b, "data.buyer.email"));
    if (!email) return { platform: "hotmart", event, upsert: null };
    return {
      platform: "hotmart",
      event,
      upsert: {
        email,
        name: str(get(b, "data.buyer.name")),
        product: str(get(b, "data.product.name")),
        transaction_id: str(get(b, "data.purchase.transaction")),
        platform: "hotmart",
        status: eventToStatus(event),
        raw: b,
      },
    };
  },

  // ─── Eduzz ───────────────────────────────────────────────────────────────
  eduzz: (b) => {
    const event = classify(str(get(b, "trans_status_message")) ?? str(get(b, "trans_status")) ?? str(b.event));
    const email = str(get(b, "cus_email")) ?? str(get(b, "customer.email"));
    if (!email) return { platform: "eduzz", event, upsert: null };
    return {
      platform: "eduzz",
      event,
      upsert: {
        email,
        name: str(get(b, "cus_name")) ?? str(get(b, "customer.name")),
        product: str(get(b, "product_name")) ?? str(get(b, "product.name")),
        transaction_id: str(get(b, "trans_cod")) ?? str(get(b, "transaction.id")),
        platform: "eduzz",
        status: eventToStatus(event),
        raw: b,
      },
    };
  },

  // ─── Kiwify ──────────────────────────────────────────────────────────────
  kiwify: (b) => {
    const event = classify(str(b.order_status) ?? str(b.webhook_event_type) ?? str(b.event));
    const email = str(get(b, "Customer.email")) ?? str(get(b, "customer.email")) ?? str(b.customer_email);
    if (!email) return { platform: "kiwify", event, upsert: null };
    return {
      platform: "kiwify",
      event,
      upsert: {
        email,
        name: str(get(b, "Customer.full_name")) ?? str(get(b, "customer.full_name")),
        product: str(get(b, "Product.product_name")) ?? str(get(b, "product.product_name")) ?? str(b.product_name),
        transaction_id: str(b.order_id) ?? str(b.order_ref),
        platform: "kiwify",
        status: eventToStatus(event),
        raw: b,
      },
    };
  },

  // ─── Monetizze ───────────────────────────────────────────────────────────
  monetizze: (b) => {
    const event = classify(str(get(b, "venda.status")) ?? str(get(b, "tipoEvento")) ?? str(b.event));
    const email = str(get(b, "comprador.email")) ?? str(get(b, "venda.email"));
    if (!email) return { platform: "monetizze", event, upsert: null };
    return {
      platform: "monetizze",
      event,
      upsert: {
        email,
        name: str(get(b, "comprador.nome")),
        product: str(get(b, "produto.nome")) ?? str(get(b, "produto.descricao")),
        transaction_id: str(get(b, "venda.codigo")) ?? str(get(b, "venda.id")),
        platform: "monetizze",
        status: eventToStatus(event),
        raw: b,
      },
    };
  },

  // ─── Cakto ───────────────────────────────────────────────────────────────
  cakto: (b) => {
    const event = classify(str(b.status) ?? str(b.event));
    const email = str(get(b, "customer.email")) ?? str(b.customer_email);
    if (!email) return { platform: "cakto", event, upsert: null };
    return {
      platform: "cakto",
      event,
      upsert: {
        email,
        name: str(get(b, "customer.name")) ?? str(b.customer_name),
        product: str(get(b, "product.name")) ?? str(b.product_name),
        transaction_id: str(b.id) ?? str(b.order_id) ?? str(b.transaction_id),
        platform: "cakto",
        status: eventToStatus(event),
        raw: b,
      },
    };
  },

  // ─── Perfectpay ──────────────────────────────────────────────────────────
  perfectpay: (b) => {
    const event = classify(str(b.sale_status_enum_key) ?? str(b.sale_status_detail) ?? str(b.event));
    const email = str(get(b, "customer.email")) ?? str(b.customer_email);
    if (!email) return { platform: "perfectpay", event, upsert: null };
    return {
      platform: "perfectpay",
      event,
      upsert: {
        email,
        name: str(get(b, "customer.full_name")) ?? str(b.customer_name),
        product: str(get(b, "product.name")) ?? str(b.product_name),
        transaction_id: str(b.code) ?? str(b.sale_id),
        platform: "perfectpay",
        status: eventToStatus(event),
        raw: b,
      },
    };
  },

  manual: (b) => {
    const email = str(get(b, "email"));
    if (!email) return { platform: "manual", event: "ignored", upsert: null };
    return {
      platform: "manual",
      event: "approved",
      upsert: {
        email,
        name: str(get(b, "name")),
        product: str(get(b, "product")),
        transaction_id: str(get(b, "transaction_id")),
        platform: "manual",
        status: "ativo",
      },
    };
  },
};

function eventToStatus(event: ParsedWebhook["event"]): "ativo" | "cancelado" | "reembolsado" {
  if (event === "approved") return "ativo";
  if (event === "refunded") return "reembolsado";
  return "cancelado";
}

export function isPlatform(p: string): p is Platform {
  return p in ADAPTERS;
}

export function parseWebhook(platform: Platform, body: Record<string, unknown>): ParsedWebhook {
  return ADAPTERS[platform](body);
}

/* Tokens secretos por plataforma — usados pra autenticar a origem do webhook.
   Defina no .env:
     HOTMART_TOKEN, EDUZZ_TOKEN, KIWIFY_TOKEN,
     MONETIZZE_TOKEN, CAKTO_TOKEN, PERFECTPAY_TOKEN
   Se a env não existir, o webhook fica aberto (use só pra testes locais).
*/
export function expectedToken(platform: Platform): string | null {
  const map: Record<Platform, string> = {
    hotmart: "HOTMART_TOKEN",
    eduzz: "EDUZZ_TOKEN",
    kiwify: "KIWIFY_TOKEN",
    monetizze: "MONETIZZE_TOKEN",
    cakto: "CAKTO_TOKEN",
    perfectpay: "PERFECTPAY_TOKEN",
    manual: "MANUAL_TOKEN",
  };
  return process.env[map[platform]] ?? null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Filtro de produto — quem paga o QUÊ entra no app
   ═══════════════════════════════════════════════════════════════════════════

   O painel da plataforma costuma mandar o webhook de "todos os produtos" da
   conta. Sem filtro, quem comprou o e-book de R$ 27 ganha o app inteiro — e,
   pior, o REEMBOLSO desse e-book derruba o acesso de quem comprou o app.

   Por isso cada plataforma tem a sua env `<PLATAFORMA>_ALLOWED_PRODUCTS`
   (lista separada por vírgula com id, código ou nome do produto):

     HOTMART_ALLOWED_PRODUCTS, EDUZZ_ALLOWED_PRODUCTS, KIWIFY_ALLOWED_PRODUCTS,
     MONETIZZE_ALLOWED_PRODUCTS, CAKTO_ALLOWED_PRODUCTS,
     PERFECTPAY_ALLOWED_PRODUCTS, MANUAL_ALLOWED_PRODUCTS

   Env vazia (ou ausente) = aceita tudo, que é o comportamento de sempre:
   ninguém que já vende hoje para de vender por causa desta mudança.

   O filtro vale para TODO evento — compra, cancelamento, reembolso e
   chargeback. Se o produto não é nosso na hora de liberar, também não é nosso
   na hora de revogar.

   Efeito colateral assumido: com o filtro ligado, um aviso que não diz QUAL
   produto é (acontece em reembolso magro de algumas plataformas) também é
   ignorado — na dúvida, ninguém perde acesso que pagou. Esses avisos aparecem
   em /admin/membros ("Últimos avisos de venda recebidos") e o dono revoga na
   mão. Preferimos deixar um reembolso passar batido a tirar o app de quem
   comprou: o primeiro o dono conserta, o segundo vira reclamação.
*/

/** Onde cada plataforma esconde o identificador do produto no JSON do webhook. */
const PRODUCT_PATHS: Record<Platform, string[]> = {
  hotmart: [
    "data.product.id",
    "data.product.ucode",
    "data.product.name",
    "data.offer.code",
    "data.offer.name",
  ],
  eduzz: [
    "product_cod",
    "product_id",
    "product_name",
    "product.id",
    "product.name",
    "content_id",
    "content_title",
  ],
  kiwify: [
    "Product.product_id",
    "Product.product_name",
    "product.product_id",
    "product.product_name",
    "product_id",
    "product_name",
    "Subscription.plan.id",
    "Subscription.plan.name",
  ],
  monetizze: [
    "produto.codigo",
    "produto.chave",
    "produto.nome",
    "produto.descricao",
  ],
  cakto: [
    "product.id",
    "product.short_id",
    "product.name",
    "offer.id",
    "offer.name",
    "product_id",
    "product_name",
  ],
  perfectpay: [
    "product.code",
    "product.external_reference",
    "product.name",
    "plan.code",
    "plan.name",
    "product_code",
    "product_name",
  ],
  manual: ["product", "product_id", "product_name"],
};

/**
 * Identificador de produto tirado do JSON cru.
 *
 * POR QUE não usa o `str` lá de cima: `str` só aceita string, e está certo pro
 * resto do arquivo (e-mail, nome — número ali é lixo de JSON, não comprador).
 * Mas o ID de produto vem NÚMERO em várias plataformas: a Hotmart manda
 * `data.product.id: 5551234` e a Eduzz `product_cod: 5551234` sem aspas.
 * Descartando o número, o id sumia da comparação: o dono copiava o id do painel
 * pra `<PLATAFORMA>_ALLOWED_PRODUCTS`, a compra de verdade caía fora do filtro e
 * ninguém era liberado — pior que não ter filtro, porque parece configurado.
 * Aqui número e bigint viram texto antes de comparar; o resto continua fora.
 */
function idProduto(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : null;
  if (typeof v === "bigint") return String(v);
  return null;
}

/** Tokens comparáveis: minúsculo, sem espaço nas pontas, sem repetição. */
function tokenize(values: (string | null)[]): string[] {
  const clean = values.filter((v): v is string => Boolean(v)).map((v) => v.trim().toLowerCase());
  return [...new Set(clean.filter(Boolean))];
}

/**
 * Tudo que, neste aviso, pode identificar o produto. Além dos campos próprios
 * da plataforma entra o `product` já normalizado pelo adapter — rede geral
 * para quando a plataforma mudar o formato do JSON sem avisar.
 */
export function productTokens(
  platform: Platform,
  body: Record<string, unknown>,
  parsed?: ParsedWebhook
): string[] {
  const fromPaths = (PRODUCT_PATHS[platform] ?? []).map((p) => idProduto(get(body, p)));
  return tokenize([...fromPaths, parsed?.upsert?.product ?? null]);
}

/** Nome da env de filtro desta plataforma (ex.: "KIWIFY_ALLOWED_PRODUCTS"). */
export function allowedProductsEnvName(platform: Platform): string {
  return `${platform.toUpperCase()}_ALLOWED_PRODUCTS`;
}

/** Lista configurada pelo dono, já normalizada. Vazia = sem filtro. */
export function allowedProducts(platform: Platform): string[] {
  return tokenize((process.env[allowedProductsEnvName(platform)] ?? "").split(","));
}

export interface ProductFilter {
  /** Processar este aviso? Sem env configurada é sempre `true`. */
  allowed: boolean;
  /** A env está preenchida (o filtro está ligado)? */
  enabled: boolean;
  envName: string;
  /** O que veio no aviso — vai pro log pro dono saber o que autorizar. */
  tokens: string[];
}

export function checkProductFilter(
  platform: Platform,
  body: Record<string, unknown>,
  parsed?: ParsedWebhook
): ProductFilter {
  const envName = allowedProductsEnvName(platform);
  const allowList = allowedProducts(platform);
  const tokens = productTokens(platform, body, parsed);

  if (allowList.length === 0) {
    return { allowed: true, enabled: false, envName, tokens };
  }
  return {
    allowed: tokens.some((t) => allowList.includes(t)),
    enabled: true,
    envName,
    tokens,
  };
}

/** Frase pro webhook_log: o dono precisa saber QUAL código autorizar. */
export function productFilterReason(filter: ProductFilter): string {
  const visto = filter.tokens.length ? filter.tokens.join(" | ") : "(o aviso não trouxe produto)";
  return `produto fora de ${filter.envName} — recebido: ${visto}`;
}
