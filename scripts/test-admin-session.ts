/**
 * Testa lib/access/admin-session — assinatura/verificação do cookie admin.
 * Roda: npx tsx scripts/test-admin-session.ts
 */
import { createAdminSession, verifyAdminSession } from "../lib/access/admin-session";

let pass = 0;
let fail = 0;
function ok(cond: boolean, msg: string) {
  if (cond) {
    pass++;
    console.log("  ✓", msg);
  } else {
    fail++;
    console.error("  ✗ FALHOU:", msg);
  }
}

// ── Fail-closed: sem ADMIN_SESSION_SECRET ──────────────────────────────────
delete process.env.ADMIN_SESSION_SECRET;
process.env.ADMIN_EMAILS = "admin@x.com";
ok(createAdminSession("admin@x.com") === null, "sem secret: createAdminSession devolve null");
ok(verifyAdminSession("qualquer.coisa") === null, "sem secret: verify devolve null");

// ── Com secret válido ──────────────────────────────────────────────────────
process.env.ADMIN_SESSION_SECRET = "0123456789abcdef0123456789abcdef";
process.env.ADMIN_EMAILS = "admin@x.com, boss@y.com";

const token = createAdminSession("Admin@X.com");
ok(typeof token === "string", "com secret: cria token");
ok(verifyAdminSession(token) === "admin@x.com", "verify devolve email normalizado (lowercase)");

// ── Rejeições ──────────────────────────────────────────────────────────────
ok(verifyAdminSession((token as string) + "x") === null, "token adulterado = null");
ok(verifyAdminSession("formato.invalido.demais") === null, "formato inválido = null");
ok(verifyAdminSession("semponto") === null, "sem assinatura = null");
ok(verifyAdminSession(null) === null, "null = null");
ok(verifyAdminSession("") === null, "vazio = null");

const intruso = createAdminSession("intruso@z.com");
ok(verifyAdminSession(intruso) === null, "email fora de ADMIN_EMAILS = null");

// ── Revogação: remover o email de ADMIN_EMAILS invalida sessão já emitida ──
process.env.ADMIN_EMAILS = "boss@y.com";
ok(verifyAdminSession(token) === null, "remover de ADMIN_EMAILS revoga a sessão");

// ── Secret diferente não valida token assinado por outro secret ────────────
process.env.ADMIN_EMAILS = "admin@x.com";
process.env.ADMIN_SESSION_SECRET = "ffffffffffffffffffffffffffffffff";
ok(verifyAdminSession(token) === null, "secret trocado invalida token antigo");

console.log(`\nTotal: ${pass} passou, ${fail} falhou`);
process.exit(fail ? 1 : 0);
