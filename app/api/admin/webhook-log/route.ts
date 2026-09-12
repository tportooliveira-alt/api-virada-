/**
 * GET /api/admin/webhook-log?limit=100 — últimos avisos de venda recebidos.
 *
 * É o único jeito de o dono descobrir uma venda que não virou acesso sem
 * esperar o cliente reclamar: aviso que chegou com produto fora do filtro, sem
 * e-mail, com token errado ou com JSON quebrado responde 200 pra plataforma
 * (senão ela fica reenviando) e some. Aqui ele aparece.
 */
import { NextResponse } from "next/server";
import { listWebhookLog } from "@/lib/access/members";
import { authenticateAdmin } from "../guard";

export async function GET(request: Request) {
  const auth = authenticateAdmin(request);
  if (!auth.email) {
    // 503 = falta configurar o servidor; 401 = a pessoa resolve entrando de novo.
    return NextResponse.json({ message: auth.message ?? "Não autorizado." }, { status: auth.status ?? 401 });
  }

  const limit = Number(new URL(request.url).searchParams.get("limit") ?? 100);

  try {
    const entries = listWebhookLog(Number.isFinite(limit) ? limit : 100);
    const falhas = entries.filter((e) => !e.ok).length;
    const ignorados = entries.filter((e) => e.ok && (e.message ?? "").startsWith("produto fora de")).length;
    return NextResponse.json({ summary: { total: entries.length, falhas, ignorados }, entries });
  } catch (error) {
    // Mesma regra do /api/access/check: falha de banco é problema do servidor.
    console.error("[admin/webhook-log] banco indisponível:", error);
    return NextResponse.json(
      { message: "Estamos com um problema no servidor. Tente de novo em instantes." },
      { status: 503 }
    );
  }
}
