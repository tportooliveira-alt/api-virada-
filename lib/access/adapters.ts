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
