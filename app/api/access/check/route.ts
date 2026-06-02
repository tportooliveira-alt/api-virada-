/**
 * POST /api/access/check
 * Body: { credential?: string, accessToken?: string }
 *
 * 1) Valida ID token OU access token no endpoint público da Google
 * 2) Confere se o email está na lista de membros (Hotmart)
 *    OU se está em ADMIN_EMAILS — admins entram sem precisar comprar.
 * 3) Devolve { status, email, name, sub, isAdmin }
 */
import { NextResponse } from "next/server";
import { isMember } from "@/lib/access/members";
import { ADMIN_COOKIE, createAdminSession, isAdminEmail } from "@/lib/access/admin-session";

interface TokenInfo {
  aud?: string;
  azp?: string;
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

function emailVerified(value: unknown): boolean {
  return value === true || value === "true";
}

async function validateByIdToken(idToken: string, expectedClient: string) {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!res.ok) throw new Error("Token Google inválido.");

  const info = (await res.json()) as TokenInfo;
  if (info.error_description) throw new Error(info.error_description);
  if (info.aud !== expectedClient) throw new Error("Audiência inválida.");
  if (!info.email || !info.sub) throw new Error("Token sem email/sub.");
  if (!emailVerified(info.email_verified)) throw new Error("Email Google não verificado.");

  return {
    email: info.email,
    sub: info.sub,
    name: info.name ?? info.email,
    picture: info.picture ?? null,
  };
}

async function validateByAccessToken(accessToken: string, expectedClient: string) {
  const tokenRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
  if (!tokenRes.ok) throw new Error("Access token inválido.");
  const tokenInfo = (await tokenRes.json()) as TokenInfo;

  if (tokenInfo.aud !== expectedClient && tokenInfo.azp !== expectedClient) {
    throw new Error("Audiência inválida.");
  }

  const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userRes.ok) throw new Error("Não foi possível obter perfil Google.");

  const user = (await userRes.json()) as UserInfo;
  if (!user.email || !user.sub) throw new Error("Perfil Google sem email/sub.");
  if (!emailVerified(user.email_verified)) throw new Error("Email Google não verificado.");

  return {
    email: user.email,
    sub: user.sub,
    name: user.name ?? user.email,
    picture: user.picture ?? null,
  };
}

export async function POST(request: Request) {
  const expectedClient = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID;
  if (!expectedClient) {
    return NextResponse.json(
      { message: "Servidor sem GOOGLE_CLIENT_ID configurado." },
      { status: 500 }
    );
  }

  let credential = "";
  let accessToken = "";
  try {
    const body = (await request.json()) as { credential?: string; accessToken?: string };
    credential = String(body.credential ?? "");
    accessToken = String(body.accessToken ?? "");
  } catch {
    return NextResponse.json({ message: "Body inválido." }, { status: 400 });
  }

  if (!credential && !accessToken) {
    return NextResponse.json({ message: "Credential/access token ausente." }, { status: 400 });
  }

  try {
    const profile = credential
      ? await validateByIdToken(credential, expectedClient)
      : await validateByAccessToken(accessToken, expectedClient);

    const admin = isAdminEmail(profile.email);
    const ativo = admin || isMember(profile.email);

    const response = NextResponse.json({
      status: ativo ? "ativo" : "inativo",
      email: profile.email,
      sub: profile.sub,
      name: profile.name,
      picture: profile.picture,
      isAdmin: admin,
    });

    // Emite (ou limpa) o cookie de sessão admin assinado. Só admins recebem.
    const session = admin ? createAdminSession(profile.email) : null;
    if (session) {
      response.cookies.set(ADMIN_COOKIE, session, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 12,
      });
    } else {
      response.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
    }
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Token Google inválido.";
    return NextResponse.json({ message }, { status: 401 });
  }
}
