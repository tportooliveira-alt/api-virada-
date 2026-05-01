/**
 * POST /api/admin/members/status — muda o status de um membro.
 * Body: { email: string, status: "ativo" | "cancelado" | "reembolsado" }
 * Auth: header `x-admin-email` deve estar em process.env.ADMIN_EMAILS (csv).
 */
import { NextResponse } from "next/server";
import { setStatus, type MemberStatus } from "@/lib/access/members";

function isAdmin(email: string | null): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

const VALID: MemberStatus[] = ["ativo", "cancelado", "reembolsado"];

export async function POST(request: Request) {
  if (!isAdmin(request.headers.get("x-admin-email"))) {
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
