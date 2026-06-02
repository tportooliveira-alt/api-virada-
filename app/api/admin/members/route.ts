/**
 * GET /api/admin/members — lista todos os membros (somente admin).
 * Auth: cookie de sessão admin assinado, emitido pelo /api/access/check após
 * validar o token Google e conferir ADMIN_EMAILS. Header de texto não é aceito.
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { listMembers } from "@/lib/access/members";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/access/admin-session";

export async function GET() {
  if (!verifyAdminSession(cookies().get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ message: "nao autorizado" }, { status: 401 });
  }
  const members = listMembers();
  const summary = {
    total: members.length,
    ativos: members.filter(m => m.status === "ativo").length,
    cancelados: members.filter(m => m.status === "cancelado").length,
    reembolsados: members.filter(m => m.status === "reembolsado").length,
    por_plataforma: members.reduce((acc, m) => {
      acc[m.platform] = (acc[m.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };
  return NextResponse.json({ summary, members });
}
