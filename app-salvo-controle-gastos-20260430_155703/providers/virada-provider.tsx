"use client";

/**
 * ViradaProvider — 100% local, zero servidor.
 * Dados ficam no celular do usuário (localStorage).
 * Sem login. Abre e usa. Deploy gratuito no Netlify.
 */

import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  Debt,
  DebtStatus,
  Expense,
  Goal,
  ImpulseCheckPayload,
  Income,
  ViradaData,
} from "@/lib/types";
import { createId, storageKey } from "@/lib/utils";
import { missions } from "@/lib/constants";

// ─── Tipos públicos ───────────────────────────────────────────────────────────

interface ViradaContextValue extends ViradaData {
  isReady: boolean;
  addExpense: (payload: Omit<Expense, "id">) => void;
  removeExpense: (id: string) => void;
  addIncome: (payload: Omit<Income, "id">) => void;
  removeIncome: (id: string) => void;
  addDebt: (payload: Omit<Debt, "id">) => void;
  removeDebt: (id: string) => void;
  updateDebtStatus: (id: string, status: DebtStatus) => void;
  addGoal: (payload: Omit<Goal, "id">) => void;
  removeGoal: (id: string) => void;
  updateGoalCurrentValue: (id: string, value: number) => void;
  toggleMission: (id: string) => void;
  estornar: (tx: {
    id: string;
    type: "expense" | "income";
    description: string;
    value: number;
    category: string;
    paymentMethod?: string;
    nature?: string;
    scope?: string;
    date: string;
  }) => void;
  saveImpulseCheck: (payload: ImpulseCheckPayload) => void;
  resetLocalData: () => void;
  // Compatibilidade com GoogleSyncButton e planilha
  user: { id: string; email: string; fullName: string | null } | null;
  sheet: { sheetUrl: string | null };
}

// ─── Estado inicial ───────────────────────────────────────────────────────────

const initialData: ViradaData = {
  expenses: [],
  incomes: [],
  debts: [],
  goals: [],
  missionStatus: {},
};

function newId(prefix: string) {
  return createId(prefix);
}

const ViradaContext = createContext<ViradaContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ViradaProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<ViradaData>(initialData);
  const [isReady, setIsReady] = useState(false);
  const skipSave = useRef(false);

  // Carregar do localStorage na montagem
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ViradaData>;
        setData({
          expenses: parsed.expenses ?? [],
          incomes: parsed.incomes ?? [],
          debts: parsed.debts ?? [],
          goals: parsed.goals ?? [],
          missionStatus: parsed.missionStatus ?? {},
        });
      }
    } catch {
      // localStorage indisponível ou dados corrompidos — começa vazio
    }
    setIsReady(true);
  }, []);

  // Salvar no localStorage sempre que os dados mudarem
  useEffect(() => {
    if (!isReady || skipSave.current) { skipSave.current = false; return; }
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {
      // sem espaço — ignora
    }
  }, [data, isReady]);

  // Updater tipado
  const update = useCallback((updater: (prev: ViradaData) => ViradaData) => {
    setData(updater);
  }, []);

  const value = useMemo<ViradaContextValue>(() => ({
    ...data,
    isReady,

    // ── Usuário fictício (sem login) ──────────────────────────────────────
    user: { id: "local", email: "local@virada.app", fullName: null },
    sheet: { sheetUrl: null },

    // ── Gastos ────────────────────────────────────────────────────────────
    addExpense: (payload) => {
      update((prev) => ({
        ...prev,
        expenses: [{ id: newId("expense"), ...payload }, ...prev.expenses],
      }));
    },
    removeExpense: (id) => {
      update((prev) => ({ ...prev, expenses: prev.expenses.filter((e) => e.id !== id) }));
    },

    // ── Receitas ──────────────────────────────────────────────────────────
    addIncome: (payload) => {
      update((prev) => ({
        ...prev,
        incomes: [{ id: newId("income"), ...payload }, ...prev.incomes],
      }));
    },
    removeIncome: (id) => {
      update((prev) => ({ ...prev, incomes: prev.incomes.filter((i) => i.id !== id) }));
    },

    // ── Dívidas ───────────────────────────────────────────────────────────
    addDebt: (payload) => {
      update((prev) => ({
        ...prev,
        debts: [{ id: newId("debt"), ...payload }, ...prev.debts],
      }));
    },
    removeDebt: (id) => {
      update((prev) => ({ ...prev, debts: prev.debts.filter((d) => d.id !== id) }));
    },
    updateDebtStatus: (id, status) => {
      update((prev) => ({
        ...prev,
        debts: prev.debts.map((d) => (d.id === id ? { ...d, status } : d)),
      }));
    },

    // ── Metas ─────────────────────────────────────────────────────────────
    addGoal: (payload) => {
      update((prev) => ({
        ...prev,
        goals: [{ id: newId("goal"), ...payload }, ...prev.goals],
      }));
    },
    removeGoal: (id) => {
      update((prev) => ({ ...prev, goals: prev.goals.filter((g) => g.id !== id) }));
    },
    updateGoalCurrentValue: (id, currentValue) => {
      update((prev) => ({
        ...prev,
        goals: prev.goals.map((g) => (g.id === id ? { ...g, currentValue } : g)),
      }));
    },

    // ── Missões ───────────────────────────────────────────────────────────
    toggleMission: (id) => {
      update((prev) => ({
        ...prev,
        missionStatus: { ...prev.missionStatus, [id]: !prev.missionStatus[id] },
      }));
    },

    // ── Estorno ───────────────────────────────────────────────────────────
    estornar: (tx) => {
      if (tx.type === "expense") {
        update((prev) => ({
          ...prev,
          incomes: [
            {
              id: newId("income"),
              description: `ESTORNO — ${tx.description}`,
              value: tx.value,
              category: (tx.category as Income["category"]) ?? "Outros",
              date: tx.date,
              scope: (tx.scope as Income["scope"]) ?? "casa",
              source: "app",
            },
            ...prev.incomes,
          ],
        }));
      } else {
        update((prev) => ({
          ...prev,
          expenses: [
            {
              id: newId("expense"),
              description: `ESTORNO — ${tx.description}`,
              value: tx.value,
              category: (tx.category as Expense["category"]) ?? "Outros",
              paymentMethod: (tx.paymentMethod as Expense["paymentMethod"]) ?? "Outro",
              nature: "essencial",
              date: tx.date,
              scope: (tx.scope as Expense["scope"]) ?? "casa",
              source: "app",
            },
            ...prev.expenses,
          ],
        }));
      }
    },

    // ── Impulso ───────────────────────────────────────────────────────────
    saveImpulseCheck: () => { /* sem servidor — apenas local */ },

    // ── Reset ─────────────────────────────────────────────────────────────
    resetLocalData: () => {
      localStorage.removeItem(storageKey);
      skipSave.current = true;
      setData(initialData);
    },
  }), [data, isReady, update]);

  return <ViradaContext.Provider value={value}>{children}</ViradaContext.Provider>;
}

export function useVirada(): ViradaContextValue {
  const ctx = useContext(ViradaContext);
  if (!ctx) throw new Error("useVirada deve ser usado dentro de ViradaProvider");
  return ctx;
}
