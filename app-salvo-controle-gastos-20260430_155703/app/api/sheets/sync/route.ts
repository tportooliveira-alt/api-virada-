/**
 * POST /api/sheets/sync
 * Lê TODOS os dados do servidor e sincroniza com Google Sheets.
 * Envia: lançamentos, dívidas, metas, pontos, missões.
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createSpreadsheet,
  syncTransactions,
  syncDebts,
  syncGoals,
  logSync,
} from "@/lib/sheets/google-sheets";
import {
  getUserById,
  saveUser,
  getFinanceBundle,
} from "@/lib/sheets/local-store";

export async function POST() {
  try {
    const userId = cookies().get("virada_user_id")?.value;
    if (!userId) return NextResponse.json({ message: "Sessão necessária." }, { status: 401 });

    const user = await getUserById(userId);
    if (!user) return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      return NextResponse.json(
        { message: "Google Sheets não configurado. Configure GOOGLE_SERVICE_ACCOUNT_JSON no .env.local" },
        { status: 503 },
      );
    }

    // Busca TODOS os dados do usuário do servidor
    const bundle = getFinanceBundle(userId);

    // Cria planilha se ainda não existe
    let sheetId = user.sheetId;
    if (!sheetId) {
      sheetId = await createSpreadsheet(`Virada Financeira — ${user.email}`);
      await saveUser({ ...user, sheetId });
    }

    type Row = Record<string, string | number | null>;

    // Converte expenses e incomes para o formato de transação
    const transactions: Row[] = [
      ...(bundle.expenses || []).map((e) => ({
        id: e.id, type: "expense",
        description: e.description, amount: e.value,
        category: e.category, date: e.date,
        paymentMethod: e.paymentMethod ?? null,
        nature: e.nature ?? null,
        scope: e.scope ?? null, source: e.source ?? null,
      })),
      ...(bundle.incomes || []).map((i) => ({
        id: i.id, type: "income",
        description: i.description, amount: i.value,
        category: i.category, date: i.date,
        paymentMethod: null, nature: null,
        scope: i.scope ?? null, source: i.source ?? null,
      })),
    ];

    const debts: Row[] = (bundle.debts || []).map((d) => ({
      id: d.id, name: d.name,
      totalValue: d.totalValue, installmentValue: d.installmentValue,
      dueDate: d.dueDate, priority: d.priority, status: d.status,
    }));

    const goals: Row[] = (bundle.goals || []).map((g) => ({
      id: g.id, name: g.name,
      targetValue: g.targetValue, currentValue: g.currentValue,
      type: g.type,
    }));

    // Sincroniza tudo
    await syncTransactions(sheetId, transactions);
    await syncDebts(sheetId, debts);
    await syncGoals(sheetId, goals);
    await logSync(sheetId, "sync_completo", "all", userId);

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}`;
    console.log(`[sync] Usuário ${user.email} → planilha sincronizada: ${sheetUrl}`);
    console.log(`  Lançamentos: ${transactions.length} | Dívidas: ${debts.length} | Metas: ${goals.length}`);

    return NextResponse.json({ ok: true, sheetId, sheetUrl });
  } catch (error) {
    console.error("[sync] Erro:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro na sincronização." },
      { status: 500 },
    );
  }
}

// GET retorna URL da planilha
export async function GET() {
  try {
    const userId = cookies().get("virada_user_id")?.value;
    if (!userId) return NextResponse.json({ sheetId: null, sheetUrl: null }, { status: 401 });
    const user = await getUserById(userId);
    if (!user?.sheetId) return NextResponse.json({ sheetId: null, sheetUrl: null });
    return NextResponse.json({
      sheetId: user.sheetId,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${user.sheetId}`,
    });
  } catch {
    return NextResponse.json({ message: "Erro." }, { status: 500 });
  }
}
