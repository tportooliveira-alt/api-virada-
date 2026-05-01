"use client";

import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { missions } from "@/lib/constants";
import {
  Debt,
  DebtStatus,
  Expense,
  Goal,
  Income,
  ImpulseCheckPayload,
  Profile,
  UserBadge,
  UserPoint,
  UserStreak,
  ViradaData,
} from "@/lib/types";
import { calculateViradaScore, getViradaLevel } from "@/lib/utils";

interface AppUser {
  id: string;
  email: string;
}

interface SheetState {
  provider: "google_sheets" | "excel";
  url: string | null;
  status: "local_csv" | "ready_to_sync";
  files: string[];
}

interface FinanceBundle extends ViradaData {
  user: AppUser;
  profile: Profile;
  points: UserPoint[];
  badges: UserBadge[];
  streak: UserStreak;
  sheet: SheetState;
}

interface ViradaContextValue extends ViradaData {
  isReady: boolean;
  user: AppUser | null;
  profile: Profile | null;
  points: UserPoint[];
  badges: UserBadge[];
  streak: UserStreak;
  sheet: SheetState;
  totalPoints: number;
  viradaScore: number;
  viradaLevel: string;
  isPremium: boolean;
  isAdmin: boolean;
  refreshData: () => Promise<void>;
  addExpense: (payload: Omit<Expense, "id">) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
  addIncome: (payload: Omit<Income, "id">) => Promise<void>;
  removeIncome: (id: string) => Promise<void>;
  addDebt: (payload: Omit<Debt, "id">) => Promise<void>;
  updateDebtStatus: (id: string, status: DebtStatus) => Promise<void>;
  addGoal: (payload: Omit<Goal, "id">) => Promise<void>;
  updateGoalCurrentValue: (id: string, currentValue: number) => Promise<void>;
  toggleMission: (id: string) => Promise<void>;
  saveImpulseCheck: (payload: ImpulseCheckPayload) => Promise<void>;
  addPoints: (points: number, reason: string) => Promise<void>;
  syncSheet: () => Promise<void>;
  signOut: () => Promise<void>;
  resetLocalData: () => void;
}

const emptyState: ViradaData = {
  expenses: [],
  incomes: [],
  debts: [],
  goals: [],
  missionStatus: {},
};

const emptyStreak: UserStreak = {
  currentStreak: 0,
  bestStreak: 0,
  lastActiveDate: null,
};

const emptySheet: SheetState = {
  provider: "google_sheets",
  url: null,
  status: "local_csv",
  files: [],
};

const ViradaContext = createContext<ViradaContextValue | null>(null);

export function ViradaProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<ViradaData>(emptyState);
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [points, setPoints] = useState<UserPoint[]>([]);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [streak, setStreak] = useState<UserStreak>(emptyStreak);
  const [sheet, setSheet] = useState<SheetState>(emptySheet);

  function applyBundle(bundle: FinanceBundle) {
    setUser(bundle.user);
    setProfile(bundle.profile);
    setData({
      expenses: bundle.expenses,
      incomes: bundle.incomes,
      debts: bundle.debts,
      goals: bundle.goals,
      missionStatus: bundle.missionStatus,
    });
    setPoints(bundle.points);
    setBadges(bundle.badges);
    setStreak(bundle.streak);
    setSheet(bundle.sheet);
  }

  const refreshData = useCallback(async () => {
    const response = await fetch("/api/finance", { cache: "no-store" });

    if (response.status === 401) {
      setUser(null);
      setProfile(null);
      setData(emptyState);
      setPoints([]);
      setBadges([]);
      setStreak(emptyStreak);
      setSheet(emptySheet);
      setIsReady(true);
      return;
    }

    if (!response.ok) {
      setIsReady(true);
      return;
    }

    applyBundle(await response.json());
    setIsReady(true);
  }, []);

  const runAction = useCallback(async (action: string, payload: unknown = {}) => {
    const response = await fetch("/api/finance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload }),
    });

    if (!response.ok) {
      throw new Error("Não foi possível salvar os dados.");
    }

    applyBundle(await response.json());
  }, []);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const totalPoints = points.reduce((total, point) => total + point.points, 0);
  const viradaScore = calculateViradaScore(data, totalPoints, streak.currentStreak);
  const viradaLevel = getViradaLevel(viradaScore);

  const value = useMemo<ViradaContextValue>(
    () => ({
      ...data,
      isReady,
      user,
      profile,
      points,
      badges,
      streak,
      sheet,
      totalPoints,
      viradaScore,
      viradaLevel,
      isPremium: profile?.plan === "premium" || profile?.role === "admin",
      isAdmin: profile?.role === "admin",
      refreshData,
      addPoints: async (amount, reason) => {
        await runAction("addPoints", { points: amount, reason });
      },
      addExpense: async (payload) => {
        await runAction("addExpense", payload);
        await runAction("addPoints", { points: 10, reason: "registrar gasto" });
      },
      removeExpense: async (id) => {
        await runAction("removeExpense", { id });
      },
      addIncome: async (payload) => {
        await runAction("addIncome", payload);
        await runAction("addPoints", { points: 10, reason: "registrar entrada" });
      },
      removeIncome: async (id) => {
        await runAction("removeIncome", { id });
      },
      addDebt: async (payload) => {
        await runAction("addDebt", payload);
      },
      updateDebtStatus: async (id, status) => {
        await runAction("updateDebt", { id, status });
        await runAction("addPoints", { points: 10, reason: "revisar dívida" });
      },
      addGoal: async (payload) => {
        await runAction("addGoal", payload);
      },
      updateGoalCurrentValue: async (id, currentValue) => {
        await runAction("updateGoal", { id, currentValue });
      },
      toggleMission: async (id) => {
        const mission = missions.find((item) => item.id === id);
        if (!mission) return;
        await runAction("toggleMission", { id, completed: !data.missionStatus[id] });
        if (!data.missionStatus[id]) {
          await runAction("addPoints", { points: 10, reason: "cumprir missão" });
        }
      },
      saveImpulseCheck: async () => {
        await runAction("addPoints", { points: 15, reason: "evitar compra por impulso" });
      },
      syncSheet: async () => {
        await runAction("syncSheet");
      },
      signOut: async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        setUser(null);
        setProfile(null);
        setData(emptyState);
        setPoints([]);
        setBadges([]);
        setStreak(emptyStreak);
        setSheet(emptySheet);
      },
      resetLocalData: () => {
        setData(emptyState);
        setPoints([]);
        setBadges([]);
        setStreak(emptyStreak);
      },
    }),
    [
      badges,
      data,
      isReady,
      points,
      profile,
      refreshData,
      runAction,
      sheet,
      streak,
      totalPoints,
      user,
      viradaLevel,
      viradaScore,
    ],
  );

  return <ViradaContext.Provider value={value}>{children}</ViradaContext.Provider>;
}

export function useVirada() {
  const context = useContext(ViradaContext);

  if (!context) {
    throw new Error("useVirada deve ser usado dentro de ViradaProvider");
  }

  return context;
}
