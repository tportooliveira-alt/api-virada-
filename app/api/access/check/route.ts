/**
 * POST /api/access/check
 * Body: { credential?: string, accessToken?: string }
 *
 * 1) Valida ID token OU access token no endpoint público da Google
 * 2) Confere se o email está na lista de membros (SQLite de compradores)
 *    OU se está em ADMIN_EMAILS — admins entram sem precisar comprar.
 * 3) Devolve { status, email, name, sub, isAdmin }
 *
 * Três respostas diferentes, de propósito (achado T-06):
 *   401 → o login em si não passou (token vencido, e-mail não confirmado).
 *         A pessoa consegue resolver: entrar de novo.
 *   503 → o servidor tropeçou (Google respondendo 5xx/429, banco de compradores
 *         ilegível). NÃO é culpa de quem comprou, então não pode aparecer
 *         como "sua conta não foi encontrada" — quem pagou e lê isso pede
 *         reembolso. O detalhe técnico fica só no log do servidor.
 *   200 com status "inativo" → login ok, mas o e-mail não consta como compra.
 */
import { NextResponse } from "next/server";
import { isMember } from "@/lib/access/members";
import { ADMIN_COOKIE, createAdminSession, isAdminEmail } from "@/lib/access/admin-session";

interface TokenInfo {
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  exp?: string | number;
  error_description?: string;
}

interface UserInfo {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

/**
 * Erro que a PESSOA consegue resolver (entrar de novo). Tudo que não for isso
 * é problema do servidor e vira 503 — nunca "você não comprou".
 */
class LoginError extends Error {}

/**
 * Erro do lado de lá: a Google caiu (5xx) ou está limitando a gente (429).
 * NÃO é LoginError de propósito — cai no catch genérico e vira 503.
 */
class GoogleIndisponivel extends Error {}

const ERRO_SERVIDOR = "Estamos com um problema no servidor. Tente de novo em instantes.";
const ERRO_LOGIN = "Não conseguimos confirmar seu login com o Google. Entre de novo.";

function emailVerified(value: unknown): boolean {
  return value === true || value === "true";
}

/**
 * Separa "o token da pessoa é ruim" de "a Google está fora do ar".
 *
 * POR QUE: antes, QUALQUER resposta não-ok virava 401 ("entre de novo") ou
 * "conta não encontrada". Só que 5xx e 429 não falam nada sobre o token —
 * falam da Google. Quem pagou e vê "não conseguimos confirmar seu login"
 * enquanto a Google pisca acha que perdeu o acesso e pede reembolso. O código
 * da resposta fica só no log do servidor; na tela vai a frase curta do 503.
 */
function conferirRespostaDaGoogle(res: Response, onde: string): void {
  if (res.status >= 500 || res.status === 429) {
    throw new GoogleIndisponivel(`${onde} respondeu ${res.status}`);
  }
  // 4xx aqui é token vencido, revogado ou malformado: isso a pessoa resolve.
  if (!res.ok) throw new LoginError(ERRO_LOGIN);
}

/** fetch que transforma queda de rede em erro de SERVIDOR, não de login. */
async function fetchGoogle(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (cause) {
    // Sem internet no servidor / Google fora do ar: não é o token da pessoa.
    throw new Error(`falha de rede ao falar com a Google: ${String(cause)}`);
  }
}

async function validateByIdToken(idToken: string, expectedClient?: string) {
  const res = await fetchGoogle(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  conferirRespostaDaGoogle(res, "tokeninfo (id_token)");

  const info = (await res.json()) as TokenInfo;
  if (info.error_description) throw new LoginError(ERRO_LOGIN);
  if (expectedClient && info.aud && info.aud !== expectedClient) {
    throw new LoginError("Esse login veio de outro aplicativo. Entre de novo pela página do Virada.");
  }
  if (!info.email || !info.sub) throw new LoginError(ERRO_LOGIN);
  if (!emailVerified(info.email_verified)) {
    throw new LoginError("A Google ainda não confirmou esse e-mail. Confirme o e-mail na sua conta Google e tente de novo.");
  }

  return {
    email: info.email,
    sub: info.sub,
    name: info.name ?? info.email,
    picture: info.picture ?? null,
  };
}

async function validateByAccessToken(accessToken: string, expectedClient?: string) {
  const tokenRes = await fetchGoogle(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
  conferirRespostaDaGoogle(tokenRes, "tokeninfo (access_token)");
  const tokenInfo = (await tokenRes.json()) as TokenInfo;

  if (expectedClient && tokenInfo.aud && tokenInfo.aud !== expectedClient) {
    throw new LoginError("Esse login veio de outro aplicativo. Entre de novo pela página do Virada.");
  }

  const userRes = await fetchGoogle("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  conferirRespostaDaGoogle(userRes, "userinfo");

  const user = (await userRes.json()) as UserInfo;
  if (!user.email || !user.sub) throw new LoginError(ERRO_LOGIN);
  if (!emailVerified(user.email_verified)) {
    throw new LoginError("A Google ainda não confirmou esse e-mail. Confirme o e-mail na sua conta Google e tente de novo.");
  }

  return {
    email: user.email,
    sub: user.sub,
    name: user.name ?? user.email,
    picture: user.picture ?? null,
  };
}

export async function POST(request: Request) {
  const expectedClient = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID;

  let credential = "";
  let accessToken = "";
  try {
    const body = (await request.json()) as { credential?: string; accessToken?: string };
    credential = String(body.credential ?? "");
    accessToken = String(body.accessToken ?? "");
  } catch {
    return NextResponse.json({ message: "Não recebemos os dados do login. Entre de novo." }, { status: 400 });
  }

  if (!credential && !accessToken) {
    return NextResponse.json({ message: "Não recebemos os dados do login. Entre de novo." }, { status: 400 });
  }

  // ── Etapa 1: quem é a pessoa (culpa possível do token → 401) ──────────────
  let profile: { email: string; sub: string; name: string; picture: string | null };
  try {
    profile = credential
      ? await validateByIdToken(credential, expectedClient)
      : await validateByAccessToken(accessToken, expectedClient);
  } catch (error) {
    if (error instanceof LoginError) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    // Qualquer outra coisa (Google fora do ar, rede, JSON estranho) é problema
    // nosso: o detalhe técnico fica aqui no log, a pessoa vê só a frase curta.
    if (error instanceof GoogleIndisponivel) {
      console.error("[access/check] Google indisponível:", error.message);
    } else {
      console.error("[access/check] falha ao validar login:", error);
    }
    return NextResponse.json({ message: ERRO_SERVIDOR }, { status: 503 });
  }

  // ── Etapa 2: a pessoa comprou? (culpa possível do banco → 503) ────────────
  const admin = isAdminEmail(profile.email);
  let ativo: boolean;
  try {
    ativo = admin || isMember(profile.email);
  } catch (error) {
    // O SQLite caiu/sumiu/está travado. Dizer "conta não encontrada" aqui
    // seria acusar de caloteiro quem pagou. Melhor pedir pra tentar de novo.
    console.error("[access/check] banco de compradores indisponível:", error);
    return NextResponse.json({ message: ERRO_SERVIDOR }, { status: 503 });
  }

  const response = NextResponse.json({
    status: ativo ? "ativo" : "inativo",
    email: profile.email,
    sub: profile.sub,
    name: profile.name,
    picture: profile.picture,
    isAdmin: admin,
  });

  // Cookie de admin assinado: é o que autoriza /api/admin/* server-side.
  // Só sai daqui, depois de a Google confirmar o e-mail e o e-mail estar em
  // ADMIN_EMAILS — o painel nunca emite sessão por conta própria.
  if (admin) {
    const token = createAdminSession(profile.email);
    if (token) {
      response.cookies.set(ADMIN_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 12 * 60 * 60,
      });
    }
  }

  return response;
}
