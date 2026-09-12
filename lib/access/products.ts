/**
 * Filtro de produto por plataforma.
 *
 * Sem ele, QUALQUER compra aprovada na mesma conta de venda vira membro ativo do
 * app — inclusive a compra de outro produto seu. Defina no .env a env da
 * plataforma com o id (ou o nome) do produto que dá acesso:
 *
 *   KIWIFY_ALLOWED_PRODUCTS=<id do produto do Código da Virada>
 *   HOTMART_ALLOWED_PRODUCTS=...  (uma ou mais, separadas por vírgula)
 *
 * Env vazia ou ausente = aceita tudo (era o comportamento antigo).
 */
import type { Platform } from "./members";

/* Onde cada plataforma manda a identificação do produto/oferta. Vale o id ou o
   nome — basta um dos caminhos bater com a lista permitida. */
const PRODUCT_PATHS: Record<Platform, string[]> = {
  hotmart: ["data.product.id", "data.product.ucode", "data.product.name", "data.offer.code", "data.offer.name"],
  kiwify: ["Product.product_id", "Product.product_name", "product.product_id", "product.product_name", "product_id", "product_name"],
  eduzz: ["product_cod", "product_id", "product_name", "product.id", "product.name"],
  monetizze: ["produto.codigo", "produto.chave", "produto.nome", "produto.descricao"],
  cakto: ["product.id", "product.name", "product_id", "product_name"],
  perfectpay: ["product.code", "product.name", "plan.code", "plan.name"],
  manual: ["product"],
};

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function readPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const key of path.split(".")) {
    if (cur && typeof cur === "object" && key in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return cur;
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

export function productTokens(platform: Platform, body: Record<string, unknown>): string[] {
  const candidates = PRODUCT_PATHS[platform]
    .map((path) => asString(readPath(body, path)))
    .filter((v): v is string => Boolean(v));

  return [...new Set(candidates.map(normalizeToken))];
}

export function allowedProducts(platform: Platform): string[] {
  return (process.env[`${platform.toUpperCase()}_ALLOWED_PRODUCTS`] ?? "")
    .split(",")
    .map((item) => normalizeToken(item))
    .filter(Boolean);
}

export function shouldProcessEvent(platform: Platform, body: Record<string, unknown>): boolean {
  const allowed = allowedProducts(platform);
  if (allowed.length === 0) return true;

  const incoming = productTokens(platform, body);
  return incoming.some((token) => allowed.includes(token));
}
