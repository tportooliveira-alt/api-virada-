/**
 * GET /api/admin/members — lista todos os membros (somente ADMIN_EMAILS).
 * Auth: cookie de sessão admin assinado (ver app/api/admin/guard.ts).
 */
import { NextResponse } from "next/server";
import { listMembers } from "@/lib/access/members";
import { authenticateAdmin } from "../guard";

export async function GET(request: Request) {
  const auth = authenticateAdmin(request);
  if (!auth.email) {
    // 503 = falta configurar o servidor; 401 = a pessoa resolve entrando de novo.
    return NextResponse.json({ message: auth.message ?? "Não autorizado." }, { status: auth.status ?? 401 });
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
  // `aviso` só vem preenchido quando a porta abriu sem segredo de administrador
  // (só acontece fora de produção). O painel mostra em tela pra ninguém achar
  // que o servidor de verdade está assim.
  return NextResponse.json({ summary, members, aviso: auth.warning ?? null });
}
