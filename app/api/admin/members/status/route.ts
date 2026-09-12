/**
 * POST /api/admin/members/status — muda o status de um membro.
 * Body: { email: string, status: "ativo" | "cancelado" | "reembolsado" }
 * Auth: cookie de sessão admin assinado (ver app/api/admin/guard.ts).
 */
import { NextResponse } from "next/server";
import { setStatus, type MemberStatus } from "@/lib/access/members";
import { authenticateAdmin } from "../../guard";

const VALID: MemberStatus[] = ["ativo", "cancelado", "reembolsado"];

export async function POST(request: Request) {
  const auth = authenticateAdmin(request);
  if (!auth.email) {
    // 503 = falta configurar o servidor; 401 = a pessoa resolve entrando de novo.
    return NextResponse.json({ message: auth.message ?? "Não autorizado." }, { status: auth.status ?? 401 });
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
