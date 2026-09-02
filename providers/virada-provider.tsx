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
  Profile,
  ViradaData,
} from "@/lib/types";
import { createId, storageKey } from "@/lib/utils";
import { missions } from "@/lib/constants";
import { loadData, saveData, clearData } from "@/lib/db/virada-store";

// ─── Tipos públicos ───────────────────────────────────────────────────────────

interface ViradaContextValue extends ViradaData {
  isReady: boolean;
  saveError: boolean;
  profile: Pick<Profile, "fullName" | "email" | "role" | "plan" | "accessStatus"> | null;
  isAdmin: boolean;
  addExpense: (payload: Omit<Expense, "id">) => string;
  removeExpense: (id: string) => void;
  addIncome: (payload: Omit<Income, "id">) => string;
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
  addPoints: (points: number, reason: string) => void;
  saveImpulseCheck: (payload: ImpulseCheckPayload) => void;
  resetLocalData: () => void;
  // Compatibilidade com GoogleSyncButton e planilha
  user: { id: string; email: string; fullName: string | null } | null;
  sheet: { sheetUrl: string | null; lastSync: string | null };
}

// ─── Estado inicial ───────────────────────────────────────────────────────────

const initialData: ViradaData = {
  expenses: [],
  incomes: [],
  debts: [],
  goals: [],
  missionStatus: {},
};

const accountKey = "virada-account-v1";
const sheetMetaKey = "virada_sheet_meta";

interface LocalAccount {
  name?: string;
  email?: string;
}

interface LocalSheetMeta {
  spreadsheetUrl?: string;
  lastSync?: string;
}

const noSheet = { sheetUrl: null, lastSync: null };

function readSheetMeta(): { sheetUrl: string | null; lastSync: string | null } {
  try {
    const raw = localStorage.getItem(sheetMetaKey);
    if (!raw) return noSheet;
    const meta = JSON.parse(raw) as LocalSheetMeta;
    return { sheetUrl: meta.spreadsheetUrl ?? null, lastSync: meta.lastSync ?? null };
  } catch {
    return noSheet;
  }
}

function newId(prefix: string) {
  return createId(prefix);
}

const ViradaContext = createContext<ViradaContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ViradaProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<ViradaData>(initialData);
  const [profile, setProfile] = useState<ViradaContextValue["profile"]>(null);
  const [sheet, setSheet] = useState<ViradaContextValue["sheet"]>(noSheet);
  const [isReady, setIsReady] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const skipSave = useRef(false);

  // Carregar na montagem: IndexedDB é a fonte da verdade dos dados financeiros,
  // com migração única do localStorage antigo (que fica intacto como backup).
  useEffect(() => {
    let cancelled = false;

    function readLegacy(): ViradaData | null {
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<ViradaData>;
        return {
          expenses: parsed.expenses ?? [],
          incomes: parsed.incomes ?? [],
          debts: parsed.debts ?? [],
          goals: parsed.goals ?? [],
          missionStatus: parsed.missionStatus ?? {},
        };
      } catch {
        return null;
      }
    }

    void (async () => {
      // Conta e URL da planilha continuam no localStorage (dados pequenos, não financeiros)
      try {
        const accountRaw = localStorage.getItem(accountKey);
        if (accountRaw) {
          const account = JSON.parse(accountRaw) as LocalAccount;
          setProfile({
            fullName: account.name ?? null,
            email: account.email ?? null,
            role: account.email === "admin@local.dev" ? "admin" : "customer",
            plan: "basic",
            accessStatus: "active",
          });
        }
        setSheet(readSheetMeta());
      } catch {
        // localStorage indisponível — segue
      }

      // Dados financeiros: tenta IndexedDB; se vazio, migra 1x do localStorage.
      let loaded = await loadData();
      if (!loaded) {
        const legacy = readLegacy();
        if (legacy) {
          loaded = legacy;
          try {
            await saveData(legacy);
          } catch {
            // migra em memória mesmo se a 1ª escrita falhar
          }
        }
      }

      if (!cancelled && loaded) {
        skipSave.current = true; // não regravar logo após carregar
        setData(loaded);
      }
      if (!cancelled) setIsReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function refreshSheetUrl() {
      setSheet(readSheetMeta());
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === sheetMetaKey) refreshSheetUrl();
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener("virada-sheet-meta-changed", refreshSheetUrl);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("virada-sheet-meta-changed", refreshSheetUrl);
    };
  }, []);

  // Salvar no IndexedDB sempre que os dados mudarem — avisando se falhar
  useEffect(() => {
    if (!isReady || skipSave.current) { skipSave.current = false; return; }
    let active = true;
    void (async () => {
      try {
        await saveData(data);
        if (active) setSaveError(false);
      } catch {
        // Não engole mais em silêncio: sinaliza que o salvamento falhou
        if (active) setSaveError(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [data, isReady]);

  // Updater tipado
  const update = useCallback((updater: (prev: ViradaData) => ViradaData) => {
    setData(updater);
  }, []);

  const value = useMemo<ViradaContextValue>(() => ({
    ...data,
    isReady,
    saveError,
    profile,
    isAdmin: profile?.role === "admin",

    // ── Usuário fictício (sem login) ──────────────────────────────────────
    user: { id: "local", email: profile?.email ?? "local@virada.app", fullName: profile?.fullName ?? null },
    sheet,

    // ── Gastos ────────────────────────────────────────────────────────────
    addExpense: (payload) => {
      const id = newId("expense");
      update((prev) => ({
        ...prev,
        expenses: [{ id, ...payload }, ...prev.expenses],
      }));
      return id; // quem lançou pode desfazer (removeExpense)
    },
    removeExpense: (id) => {
      update((prev) => ({ ...prev, expenses: prev.expenses.filter((e) => e.id !== id) }));
    },

    // ── Receitas ──────────────────────────────────────────────────────────
    addIncome: (payload) => {
      const id = newId("income");
      update((prev) => ({
        ...prev,
        incomes: [{ id, ...payload }, ...prev.incomes],
      }));
      return id;
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
    addPoints: () => { /* pontos locais ainda não exibidos no app */ },
    saveImpulseCheck: () => { /* sem servidor — apenas local */ },

    // ── Reset ─────────────────────────────────────────────────────────────
    resetLocalData: () => {
      localStorage.removeItem(storageKey);
      void clearData();
      skipSave.current = true;
      setData(initialData);
    },
  }), [data, isReady, saveError, profile, sheet, update]);

  return <ViradaContext.Provider value={value}>{children}</ViradaContext.Provider>;
}

export function useVirada(): ViradaContextValue {
  const ctx = useContext(ViradaContext);
  if (!ctx) throw new Error("useVirada deve ser usado dentro de ViradaProvider");
  return ctx;
}
