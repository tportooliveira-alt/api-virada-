import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { missions } from "@/lib/constants";
import {
  addDebtRow,
  addEstorno,
  addGoalRow,
  addPointRow,
  addSheetLog,
  addTransaction,
  getFinanceBundle,
  removeDebtRow,
  removeGoalRow,
  removeTransaction,
  setMissionRow,
  updateDebtRow,
  updateGoalRow,
} from "@/lib/sheets/local-store";

function currentUserId() {
  return cookies().get("virada_user_id")?.value ?? "";
}

export async function GET() {
  try {
    const userId = currentUserId();
    if (!userId) {
      return NextResponse.json({ message: "Sessão necessária." }, { status: 401 });
    }

    return NextResponse.json(getFinanceBundle(userId));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao carregar dados." },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = currentUserId();
    if (!userId) {
      return NextResponse.json({ message: "Sessão necessária." }, { status: 401 });
    }

    const body = await request.json();
    const action = String(body.action ?? "");
    const payload = body.payload ?? {};

    if (action === "addExpense") {
      addTransaction(userId, {
        type: "expense",
        description: payload.description,
        amount: Number(payload.value),
        category: payload.category,
        paymentMethod: payload.paymentMethod,
        nature: payload.nature,
        scope: payload.scope,
        source: payload.source,
        date: payload.date,
      });
    }

    if (action === "addIncome") {
      addTransaction(userId, {
        type: "income",
        description: payload.description,
        amount: Number(payload.value),
        category: payload.category,
        scope: payload.scope,
        source: payload.source,
        date: payload.date,
      });
    }

    if (action === "removeExpense" || action === "removeIncome") {
      removeTransaction(userId, String(payload.id));
    }

    if (action === "addGoal") {
      addGoalRow(userId, payload);
    }

    if (action === "updateGoal") {
      updateGoalRow(userId, String(payload.id), Number(payload.currentValue));
    }

    if (action === "addDebt") {
      addDebtRow(userId, payload);
    }

    if (action === "updateDebt") {
      updateDebtRow(userId, String(payload.id), payload.status);
    }

    if (action === "removeDebt") {
      removeDebtRow(userId, String(payload.id));
    }

    if (action === "removeGoal") {
      removeGoalRow(userId, String(payload.id));
    }

    if (action === "estorno") {
      addEstorno(userId, payload);
    }

    if (action === "toggleMission") {
      const mission = missions.find((item) => item.id === payload.id);
      if (mission) {
        setMissionRow(userId, mission.day, Boolean(payload.completed));
      }
    }

    if (action === "addPoints") {
      addPointRow(userId, Number(payload.points), String(payload.reason ?? ""));
    }

    if (action === "syncSheet") {
      addSheetLog(userId, "prepared", "Sincronizacao com Google Planilhas preparada para credenciais do servidor.");
    }

    return NextResponse.json(getFinanceBundle(userId));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao salvar dados." },
      { status: 400 },
    );
  }
}
