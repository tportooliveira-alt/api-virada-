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
  /** Data (AAAA-MM-DD) em que o lançamento foi estornado. Ver `isEstornado`. */
  estornadoEm?: string;
  /** Gasto criado por "Paguei a parcela": id da dívida paga. */
  debtId?: string;
}

export interface Income {
  id: string;
  description: string;
  value: number;
  category: IncomeCategory;
  date: string;
  scope?: TransactionScope;
  source?: TransactionSource;
  /** Data (AAAA-MM-DD) em que o lançamento foi estornado. Ver `isEstornado`. */
  estornadoEm?: string;
}

// ─── Contrato de ESTORNO (app, planilha e prévia seguem isto) ────────────────
// Estornar NÃO cria lançamento contrário: marca o original com `estornadoEm`.
// O lançamento continua no histórico (aparece nas listas), mas fica FORA de
// todo total: entradas, gastos, saldo, por categoria, por impulso, fluxo e
// resumo mensal. Quem agrega usa `semEstornados(lista)` antes de somar.
// Estornar com um contra-lançamento em receita inflava "Entradas" e criava
// categoria de despesa dentro de receita (ex.: "Lazer"), por isso a marca.

export function isEstornado(tx: { estornadoEm?: string }): boolean {
  return Boolean(tx.estornadoEm);
}

/** Lista só com os lançamentos que contam para os totais. */
export function semEstornados<T extends { estornadoEm?: string }>(items: T[]): T[] {
  return items.filter((item) => !isEstornado(item));
}

/** Uma parcela paga via "Paguei a parcela". Os campos `prev*` guardam o que o
 *  "Desfazer" precisa devolver exatamente (31/01 → 28/02 não volta por conta). */
export interface DebtPayment {
  id: string;
  date: string;
  value: number;
  expenseId: string;
  prevDueDate?: string;
  prevStatus?: DebtStatus;
  prevPaidValue?: number;
}

export interface Debt {
  id: string;
  name: string;
  totalValue: number;
  installmentValue: number;
  dueDate: string;
  priority: DebtPriority;
  status: DebtStatus;
  /** Soma paga até agora. Ausente em dados antigos = 0 (ver `debtPaid`). */
  paidValue?: number;
  payments?: DebtPayment[];
}

// ─── Contrato de PARCELA PAGA (app, planilha e prévia seguem isto) ───────────
// Dívida antiga não tem `paidValue`: é 0, nunca NaN. Tudo em centavos inteiros
// antes de dividir — 0,30 / 0,10 em ponto flutuante dá 2,9999… e teto vira 3
// por sorte, mas 0,3 / 0,1 = 3,0000000000000004 e teto viraria 4.

export function debtPaid(debt: Pick<Debt, "paidValue">): number {
  return Number.isFinite(debt.paidValue) ? (debt.paidValue as number) : 0;
}

export function debtRemaining(debt: Pick<Debt, "totalValue" | "paidValue">): number {
  return Math.max(0, Math.round(debt.totalValue * 100) - Math.round(debtPaid(debt) * 100)) / 100;
}

export function debtInstallmentsLeft(debt: Pick<Debt, "totalValue" | "paidValue" | "installmentValue">): number {
  const parcela = Math.round(debt.installmentValue * 100);
  if (!(parcela > 0)) return 0;
  return Math.ceil(Math.round(debtRemaining(debt) * 100) / parcela);
}

// ─── Contrato de DÍVIDA EM ABERTO (app, planilha e prévia seguem isto) ───────
// "Em aberto" = "aberta" OU "negociando". Uma dívida negociando ainda é devida;
// só "quitada" sai dos totais. Lista explícita (e não `!== "quitada"`) para um
// status novo não entrar nos totais sem decisão.
export function isOpenDebt(debt: Pick<Debt, "status">): boolean {
  return debt.status === "aberta" || debt.status === "negociando";
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

// ─── Três bolsos (e-book, "A regra dos três bolsos") ─────────────────────────
export type PocketKey = "contas" | "dividas" | "vida";
/** "organizando" = 50/30/20 · "virada" = 50/40/10. A fase é MANUAL (o app só sugere). */
export type BudgetPhase = "organizando" | "virada";

export interface ViradaSettings {
  /** "Quanto entra por mês, mais ou menos?" Ausente ou 0 = não informada. */
  expectedIncome?: number;
  /** Ausente = "organizando". */
  budgetPhase?: BudgetPhase;
}

export interface ViradaData {
  expenses: Expense[];
  incomes: Income[];
  debts: Debt[];
  goals: Goal[];
  missionStatus: Record<string, boolean>;
  settings?: ViradaSettings;
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
