/**
 * Sessão admin assinada (HMAC) — guardada em cookie httpOnly.
 *
 * Por que existe: as rotas /api/admin/* NÃO podem confiar num header de texto
 * (qualquer um forja). Em vez disso, o /api/access/check valida o token Google,
 * confere se o email está em ADMIN_EMAILS e, só então, emite este cookie assinado.
 * As rotas admin verificam a assinatura + expiração + ADMIN_EMAILS server-side.
 *
 * Fail-closed: sem ADMIN_SESSION_SECRET (>= 16 chars) no servidor, nenhuma sessão
 * é criada nem aceita — o admin fica bloqueado (seguro por padrão).
 */
import crypto from "crypto";

export const ADMIN_COOKIE = "virada_admin";
const TTL_MS = 12 * 60 * 60 * 1000; // 12 horas

function secret(): string | null {
  const s = process.env.ADMIN_SESSION_SECRET;
  return s && s.length >= 16 ? s : null;
}

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}

function sign(payload: string, key: string): string {
  return crypto.createHmac("sha256", key).update(payload).digest("base64url");
}

/** Cria o token de sessão (`base64(email|exp).hmac`). Null se não há secret. */
export function createAdminSession(email: string): string | null {
  const key = secret();
  if (!key) return null;
  const exp = Date.now() + TTL_MS;
  const payload = `${email.trim().toLowerCase()}|${exp}`;
  const b64 = Buffer.from(payload).toString("base64url");
  return `${b64}.${sign(payload, key)}`;
}

/**
 * Verifica o token. Retorna o email do admin se válido (assinatura ok, não
 * expirado e ainda presente em ADMIN_EMAILS), senão null.
 */
export function verifyAdminSession(token: string | null | undefined): string | null {
  if (!token) return null;
  const key = secret();
  if (!key) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [b64, sig] = parts;

  let payload: string;
  try {
    payload = Buffer.from(b64, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const expected = sign(payload, key);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  const sep = payload.lastIndexOf("|");
  if (sep < 0) return null;
  const email = payload.slice(0, sep);
  const exp = Number(payload.slice(sep + 1));
  if (!email || !Number.isFinite(exp) || Date.now() > exp) return null;
  if (!isAdminEmail(email)) return null;

  return email;
}
