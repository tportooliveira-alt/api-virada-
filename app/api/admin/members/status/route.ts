/**
 * POST /api/admin/members/status — muda o status de um membro.
 * Body: { email: string, status: "ativo" | "cancelado" | "reembolsado" }
 * Auth: cookie de sessão admin assinado (ver /api/access/check).
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { setStatus, type MemberStatus } from "@/lib/access/members";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/access/admin-session";

const VALID: MemberStatus[] = ["ativo", "cancelado", "reembolsado"];

export async function POST(request: Request) {
  if (!verifyAdminSession(cookies().get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ message: "nao autorizado" }, { status: 401 });
  }

  let body: { email?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "json invalido" }, { status: 400 });
  }

  if (!body.email) {
    return NextResponse.json({ message: "email obrigatorio" }, { status: 400 });
  }
  if (!body.status || !VALID.includes(body.status as MemberStatus)) {
    return NextResponse.json(
      { message: `status invalido. use: ${VALID.join(", ")}` },
      { status: 400 }
    );
  }

  const member = setStatus(body.email, body.status as MemberStatus);
  if (!member) {
    return NextResponse.json({ message: "membro nao encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, member });
}
