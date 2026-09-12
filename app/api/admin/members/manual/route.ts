/**
 * GET/POST /api/admin/members/manual — cadastro manual de membro
 * (caso o webhook falhe e precise liberar acesso na unha).
 *
 * POST { email, name?, platform?, product? }
 */
import { NextResponse } from "next/server";
import { upsertMember } from "@/lib/access/members";
import { authenticateAdmin } from "../../guard";

export async function POST(request: Request) {
  const auth = authenticateAdmin(request);
  if (!auth.email) {
    // 503 = falta configurar o servidor; 401 = a pessoa resolve entrando de novo.
    return NextResponse.json({ message: auth.message ?? "Não autorizado." }, { status: auth.status ?? 401 });
  }
  let body: { email?: string; name?: string; platform?: string; product?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "json invalido" }, { status: 400 });
  }
  if (!body.email) {
    return NextResponse.json({ message: "email obrigatorio" }, { status: 400 });
  }
  const member = upsertMember({
    email: body.email,
    name: body.name ?? null,
    platform: "manual",
    product: body.product ?? null,
    transaction_id: null,
    status: "ativo",
    raw: { note: "cadastro manual via /api/admin/members/manual" },
  });
  return NextResponse.json({ ok: true, member });
}
