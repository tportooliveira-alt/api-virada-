export type ExpenseCategory =
  | "Mercado"
  | "Compra"
  | "Fornecedor"
  | "Estoque"
  | "Impostos"
  | "Marketing"
  | "Funcionário"
  | "Aluguel"
  | "Energia"
  | "Água"
  | "Internet"
  | "Transporte"
  | "Cartão"
  | "Dívida"
  | "Delivery"
  | "Lazer"
  | "Saúde"
  | "Educação"
  | "Outros";

export type IncomeCategory =
  | "Salário"
  | "Venda"
  | "Recebimento"
  | "Renda extra"
  | "Venda de item"
  | "Serviço"
  | "Comissão"
  | "Outros";

export type PaymentMethod = "Pix" | "Dinheiro" | "Débito" | "Crédito" | "Boleto" | "Outro";
export type ExpenseNature = "essencial" | "impulso";
export type DebtPriority = "baixa" | "média" | "alta";
export type DebtStatus = "aberta" | "negociando" | "quitada";
export type GoalType = "reserva" | "dívida" | "economia" | "renda extra";
export type AccessRole = "customer" | "admin";
export type AccessPlan = "basic" | "premium";
export type AccessStatus = "active" | "blocked" | "cancelled";
export type ParsedFinancialType = "expense" | "income" | "debt_payment" | "saving";
export type TransactionScope = "casa" | "empresa";
export type TransactionSource = "app" | "whatsapp" | "planilha";
export type SheetProvider = "google_sheets" | "excel";

export interface Expense {
  id: string;
  description: string;
  value: number;
  category: ExpenseCategory;
  date: string;
  paymentMethod: PaymentMethod;
  nature: ExpenseNature;
  scope?: TransactionScope;
  source?: TransactionSource;
}

export interface Income {
  id: string;
  description: string;
  value: number;
  category: IncomeCategory;
  date: string;
  scope?: TransactionScope;
  source?: TransactionSource;
}

export interface Debt {
  id: string;
  name: string;
  totalValue: number;
  installmentValue: number;
  dueDate: string;
  priority: DebtPriority;
  status: DebtStatus;
}

export interface Goal {
  id: string;
  name: string;
  targetValue: number;
  currentValue: number;
  type: GoalType;
}

export interface Mission {
  id: string;
  day: number;
  title: string;
  description: string;
}

export interface ExtraIncomeIdea {
  id: string;
  title: string;
  category: string;
  initialInvestment: string;
  difficulty: string;
  timeToStart: string;
  steps: string[];
  message: string;
}

export interface Lesson {
  id: string;
  title: string;
  text: string;
  action: string;
}

export interface ViradaData {
  expenses: Expense[];
  incomes: Income[];
  debts: Debt[];
  goals: Goal[];
  missionStatus: Record<string, boolean>;
}

export interface Profile {
  id: string;
  fullName: string | null;
  email: string | null;
  whatsapp?: string | null;
  role: AccessRole;
  plan: AccessPlan;
  accessStatus: AccessStatus;
  sheetProvider?: SheetProvider;
  sheetUrl?: string | null;
}

export interface UserPoint {
  id: string;
  points: number;
  reason: string | null;
  createdAt: string;
}

export interface UserBadge {
  id: string;
  badgeKey: string;
  badgeName: string;
  unlockedAt: string;
}

export interface UserStreak {
  currentStreak: number;
  bestStreak: number;
  lastActiveDate: string | null;
}

export interface ParsedFinancialInput {
  type: ParsedFinancialType;
  amount: number;
  category: string;
  description: string;
  date: string;
  confidence: number;
}

export interface ImpulseCheckPayload {
  itemName: string;
  amount: number;
  needNow: boolean;
  fitsBudget: boolean;
  canWait24h: boolean;
  emotionalPurchase: boolean;
  decision: string;
}
