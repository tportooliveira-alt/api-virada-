/**
 * Testa os 6 adapters de webhook + SQLite. Roda com:
 *   npx tsx scripts/test-webhooks.ts
 */
import { unlinkSync, existsSync } from "fs";
import path from "path";

// Apaga o DB de testes pra começar limpo
const dbFile = path.join(process.cwd(), "data", "access.db");
if (existsSync(dbFile)) unlinkSync(dbFile);
const dbWal = `${dbFile}-wal`; if (existsSync(dbWal)) unlinkSync(dbWal);
const dbShm = `${dbFile}-shm`; if (existsSync(dbShm)) unlinkSync(dbShm);

import { parseWebhook } from "../lib/access/adapters";
import { isMember, getMember, listMembers, upsertMember } from "../lib/access/members";

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

console.log(`\nTotal: ${pass} passou, ${fail} falhou`);
if (fail > 0) process.exit(1);
