import { Debt, Expense, Goal, Income, Mission, ViradaData } from "@/lib/types";

export const storageKey = "virada-app:v1";

export function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${date}T00:00:00`));
}

export function toInputDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

export function isFromCurrentMonth(date: string) {
  const current = new Date();
  const target = new Date(`${date}T00:00:00`);

  return (
    current.getFullYear() === target.getFullYear() &&
    current.getMonth() === target.getMonth()
  );
}

export function sumValues<T>(items: T[], selector: (item: T) => number) {
  return items.reduce((total, item) => total + selector(item), 0);
}

export function getGoalProgress(goal: Goal) {
  if (goal.targetValue <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
}

export function getDashboardMetrics(data: ViradaData) {
  const monthIncomes = data.incomes.filter((item) => isFromCurrentMonth(item.date));
  const monthExpenses = data.expenses.filter((item) => isFromCurrentMonth(item.date));
  const openDebts = data.debts.filter((item) => item.status !== "quitada");
  const reserveGoal = data.goals.find((item) => item.type === "reserva");

  const incomeMonth = sumValues(monthIncomes, (item) => item.value);
  const expenseMonth = sumValues(monthExpenses, (item) => item.value);
  const balanceMonth = incomeMonth - expenseMonth;
  const openDebtsTotal = sumValues(openDebts, (item) => item.totalValue);
  const estimatedEconomy = sumValues(
    monthExpenses.filter((item) => item.nature === "impulso"),
    (item) => item.value,
  );
  const reserveProgress = reserveGoal ? getGoalProgress(reserveGoal) : 0;
  const reserveCurrent = reserveGoal?.currentValue ?? 0;
  const missionProgress = Math.round(
    (Object.values(data.missionStatus).filter(Boolean).length / 30) * 100,
  );

  return {
    incomeMonth,
    expenseMonth,
    balanceMonth,
    openDebtsTotal,
    estimatedEconomy,
    reserveProgress,
    reserveCurrent,
    monthIncomes,
    monthExpenses,
    openDebts,
    missionProgress,
  };
}

export function getMissionOfDay(missions: Mission[]) {
  const today = new Date().getDate();
  return missions[(today - 1) % missions.length];
}

export function getMonthlyChart(expenses: Expense[], incomes: Income[]) {
  const incomeMonth = sumValues(incomes.filter((item) => isFromCurrentMonth(item.date)), (item) => item.value);
  const essentialMonth = sumValues(
    expenses.filter((item) => isFromCurrentMonth(item.date) && item.nature === "essencial"),
    (item) => item.value,
  );
  const impulseMonth = sumValues(
    expenses.filter((item) => isFromCurrentMonth(item.date) && item.nature === "impulso"),
    (item) => item.value,
  );

  const max = Math.max(incomeMonth, essentialMonth, impulseMonth, 1);

  return [
    { label: "Entradas", value: incomeMonth, percentage: Math.round((incomeMonth / max) * 100), tone: "bg-emerald-500" },
    { label: "Essenciais", value: essentialMonth, percentage: Math.round((essentialMonth / max) * 100), tone: "bg-sky-500" },
    { label: "Impulso", value: impulseMonth, percentage: Math.round((impulseMonth / max) * 100), tone: "bg-amber-400" },
  ];
}

export function sortByDateDesc<T extends { date?: string; dueDate?: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const first = a.date ?? a.dueDate ?? "";
    const second = b.date ?? b.dueDate ?? "";
    return new Date(second).getTime() - new Date(first).getTime();
  });
}

export function getDebtStatusLabel(status: Debt["status"]) {
  if (status === "aberta") return "Aberta";
  if (status === "negociando") return "Negociando";
  return "Quitada";
}

export function getPriorityClasses(priority: Debt["priority"]) {
  if (priority === "alta") return "border-rose-500/60 bg-rose-500/10";
  if (priority === "média") return "border-amber-400/50 bg-amber-400/10";
  return "border-slate-700 bg-slate-800/40";
}

export function getSummaryMessage(metrics: ReturnType<typeof getDashboardMetrics>) {
  if (metrics.balanceMonth < 0) {
    return "Seu dinheiro não some. Ele vai para algum lugar. Hoje o foco é enxergar os vazamentos e agir neles.";
  }

  if (metrics.estimatedEconomy > 0) {
    return "Existe espaço claro para corte inteligente. Não é dinheiro fácil. É direção.";
  }

  return "Você já começou a organizar a virada. Continue pequeno, mas continue hoje.";
}

export function getViradaLevel(score: number) {
  if (score <= 20) return "Começando a Virada";
  if (score <= 40) return "Saindo do Caos";
  if (score <= 60) return "Organizando a Vida";
  if (score <= 80) return "Controlando o Dinheiro";
  return "Mente Financeira Forte";
}

export function calculateViradaScore(data: ViradaData, totalPoints: number, activeDays = 0) {
  const hasExpense = data.expenses.length > 0 ? 10 : 0;
  const hasIncome = data.incomes.length > 0 ? 10 : 0;
  const hasMission = Object.values(data.missionStatus).some(Boolean) ? 10 : 0;
  const hasGoal = data.goals.length > 0 ? 10 : 0;
  const hasSaving = data.goals.some((goal) => goal.type === "reserva" && goal.currentValue > 0) ? 15 : 0;
  const hasDebtReview = data.debts.some((debt) => debt.status !== "aberta") ? 10 : 0;
  const hasExtraIncome = data.incomes.some((income) => income.category !== "Salário") ? 10 : 0;
  const pointsScore = Math.min(15, Math.floor(totalPoints / 20));
  const activityScore = Math.min(10, activeDays * 2);

  return Math.min(
    100,
    hasExpense +
      hasIncome +
      hasMission +
      hasGoal +
      hasSaving +
      hasDebtReview +
      hasExtraIncome +
      pointsScore +
      activityScore,
  );
}
