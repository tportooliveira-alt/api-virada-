/**
 * GET /api/admin/members — lista todos os membros (somente ADMIN_EMAILS).
 * Auth: header `x-admin-email` deve estar em process.env.ADMIN_EMAILS (csv).
 */
import { NextResponse } from "next/server";
import { listMembers } from "@/lib/access/members";

function isAdmin(email: string | null): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

export async function GET(request: Request) {
  const headerEmail = request.headers.get("x-admin-email");
  if (!isAdmin(headerEmail)) {
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
