/**
 * Sessão do COMPRADOR, assinada (HMAC) e guardada em cookie httpOnly.
 *
 * Por que existe: `public/downloads/` e `public/biblioteca/` são servidos como
 * arquivo estático pelo Next. Sem porteiro, o e-book inteiro e os bônus baixavam
 * por URL direta, sem login e sem ter comprado — o produto inteiro de graça.
 *
 * O /api/access/check já valida o token do Google e confere se o e-mail está na
 * lista de quem comprou. Quando confere, emite este cookie; o middleware da raiz
 * é quem barra /downloads e /biblioteca para quem não o tem.
 *
 * Gêmeo de admin-session.ts, com duas diferenças que importam:
 *
 * 1. Usa Web Crypto (async), não o `crypto` do Node. O middleware do Next roda no
 *    Edge, onde o módulo `crypto` não existe. Web Crypto funciona nos dois lados.
 * 2. Dura 30 dias, não 12 horas. O comprador volta ao material semanas depois;
 *    pedir login de novo toda vez viraria suporte.
 *
 * O payload leva o prefixo "membro" para que um token daqui nunca seja aceito
 * como sessão de admin, mesmo compartilhando o mesmo segredo.
 *
 * Fail-closed: sem segredo (>= 16 chars) no servidor, nenhuma sessão é criada nem
 * aceita. Em produção o ADMIN_SESSION_SECRET já existe, então o porteiro funciona.
 */

export const MEMBER_COOKIE = "virada_membro";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias
const ESCOPO = "membro";

function secret(): string | null {
  // Aceita um segredo próprio; se não houver, usa o do admin (que já está na VPS).
  const s = process.env.MEMBER_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;
  return s && s.length >= 16 ? s : null;
}

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deB64url(texto: string): Uint8Array | null {
  try {
    const bin = atob(texto.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

async function sign(payload: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const chave = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const assinatura = await crypto.subtle.sign("HMAC", chave, enc.encode(payload));
  return b64url(new Uint8Array(assinatura));
}

/** Comparação em tempo constante — o Edge não tem timingSafeEqual. */
function igualSemVazarTempo(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferenca = 0;
  for (let i = 0; i < a.length; i++) diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferenca === 0;
}

/** Cria o token (`base64(membro|email|exp).hmac`). Null se não há segredo. */
export async function createMemberSession(email: string): Promise<string | null> {
  const key = secret();
  if (!key) return null;

  const exp = Date.now() + TTL_MS;
  const payload = `${ESCOPO}|${email.trim().toLowerCase()}|${exp}`;
  const b64 = b64url(new TextEncoder().encode(payload));
  return `${b64}.${await sign(payload, key)}`;
}

/**
 * Verifica o token. Devolve o e-mail se a assinatura confere, o escopo é "membro"
 * e não expirou. Senão, null.
 *
 * Não reconsulta a lista de compradores: um reembolso só tira o acesso quando a
 * sessão vence. É a mesma janela de risco de qualquer cookie de sessão, e evita
 * ir ao banco a cada arquivo baixado.
 */
export async function verifyMemberSession(token: string | null | undefined): Promise<string | null> {
  if (!token) return null;
  const key = secret();
  if (!key) return null;

  const partes = token.split(".");
  if (partes.length !== 2) return null;
  const [b64, assinatura] = partes;

  const bytes = deB64url(b64);
  if (!bytes) return null;
  const payload = new TextDecoder().decode(bytes);

  if (!igualSemVazarTempo(assinatura, await sign(payload, key))) return null;

  const campos = payload.split("|");
  if (campos.length !== 3) return null;
  const [escopo, email, expTexto] = campos;
  if (escopo !== ESCOPO) return null;

  const exp = Number(expTexto);
  if (!email || !Number.isFinite(exp) || Date.now() > exp) return null;

  return email;
}
