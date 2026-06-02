/**
 * GET/POST /api/admin/members/manual — cadastro manual de membro
 * (caso o webhook falhe e precise liberar acesso na unha).
 *
 * POST { email, name?, platform?, product? }
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { upsertMember } from "@/lib/access/members";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/access/admin-session";

export async function POST(request: Request) {
  if (!verifyAdminSession(cookies().get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ message: "nao autorizado" }, { status: 401 });
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
