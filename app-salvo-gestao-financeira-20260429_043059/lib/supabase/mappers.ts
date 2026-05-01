import { Debt, Expense, Goal, Income, Profile, UserBadge, UserPoint, UserStreak } from "@/lib/types";

type DbRow = Record<string, string | number | boolean | null>;

export function mapExpense(row: DbRow): Expense {
  return {
    id: String(row.id),
    description: String(row.description),
    value: Number(row.amount),
    category: (row.category ?? "Outros") as Expense["category"],
    date: String(row.expense_date),
    paymentMethod: (row.payment_method ?? "Outro") as Expense["paymentMethod"],
    nature: row.is_impulse ? "impulso" : "essencial",
  };
}

export function mapIncome(row: DbRow): Income {
  return {
    id: String(row.id),
    description: String(row.description),
    value: Number(row.amount),
    category: (row.category ?? "Outros") as Income["category"],
    date: String(row.income_date),
  };
}

export function mapDebt(row: DbRow): Debt {
  return {
    id: String(row.id),
    name: String(row.name),
    totalValue: Number(row.total_amount),
    installmentValue: Number(row.installment_amount ?? 0),
    dueDate: String(row.due_date ?? ""),
    priority: (row.priority ?? "média") as Debt["priority"],
    status: (row.status ?? "aberta") as Debt["status"],
  };
}

export function mapGoal(row: DbRow): Goal {
  return {
    id: String(row.id),
    name: String(row.name),
    targetValue: Number(row.target_amount),
    currentValue: Number(row.current_amount ?? 0),
    type: (row.type ?? "economia") as Goal["type"],
  };
}

export function mapProfile(row: DbRow): Profile {
  return {
    id: String(row.id),
    fullName: row.full_name ? String(row.full_name) : null,
    email: row.email ? String(row.email) : null,
    role: (row.role ?? "customer") as Profile["role"],
    plan: (row.plan ?? "basic") as Profile["plan"],
    accessStatus: (row.access_status ?? "active") as Profile["accessStatus"],
  };
}

export function mapPoint(row: DbRow): UserPoint {
  return {
    id: String(row.id),
    points: Number(row.points),
    reason: row.reason ? String(row.reason) : null,
    createdAt: String(row.created_at),
  };
}

export function mapBadge(row: DbRow): UserBadge {
  return {
    id: String(row.id),
    badgeKey: String(row.badge_key),
    badgeName: String(row.badge_name),
    unlockedAt: String(row.unlocked_at),
  };
}

export function mapStreak(row: DbRow | null): UserStreak {
  return {
    currentStreak: Number(row?.current_streak ?? 0),
    bestStreak: Number(row?.best_streak ?? 0),
    lastActiveDate: row?.last_active_date ? String(row.last_active_date) : null,
  };
}
