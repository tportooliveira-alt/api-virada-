/**
 * POST /api/access/check
 * Body: { credential: string }  // ID token JWT do Google
 *
 * 1) Valida o ID token chamando o endpoint público do Google
 * 2) Confere se o email está na lista de membros (Hotmart)
 *    OU se está em ADMIN_EMAILS — admins entram sem precisar comprar.
 * 3) Devolve { status, email, name, sub, isAdmin } — sub é o ID Google imutável
 *
 * O cliente grava { email, sub, status } no IndexedDB. A próxima abertura
 * pode usar offline-first: se já está "ativo" localmente e o sub bate, libera.
 */
import { NextResponse } from "next/server";
import { isMember } from "@/lib/access/members";

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

function isAdminEmail(email: string): boolean {
  const list = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

export async function POST(request: Request) {
  const expectedClient = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID;

  let credential = "";
  try {
    const body = (await request.json()) as { credential?: string };
    credential = String(body.credential ?? "");
  } catch {
    return NextResponse.json({ message: "Body inválido." }, { status: 400 });
  }
  if (!credential) {
    return NextResponse.json({ message: "Credential ausente." }, { status: 400 });
  }

  // Valida o ID token via endpoint público da Google (sem dependências)
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  if (!res.ok) {
    return NextResponse.json({ message: "Token Google inválido." }, { status: 401 });
  }
  const info = (await res.json()) as TokenInfo;

  if (info.error_description) {
    return NextResponse.json({ message: info.error_description }, { status: 401 });
  }
  if (expectedClient && info.aud && info.aud !== expectedClient) {
    return NextResponse.json({ message: "Audiência inválida." }, { status: 401 });
  }
  if (!info.email || !info.sub) {
    return NextResponse.json({ message: "Token sem email/sub." }, { status: 401 });
  }
  if (info.email_verified !== true && info.email_verified !== "true") {
    return NextResponse.json({ message: "Email Google não verificado." }, { status: 401 });
  }

  const admin = isAdminEmail(info.email);
  const ativo = admin || isMember(info.email);

  return NextResponse.json({
    status: ativo ? "ativo" : "inativo",
    email: info.email,
    sub: info.sub,
    name: info.name ?? info.email,
    picture: info.picture ?? null,
    isAdmin: admin,
  });
}
