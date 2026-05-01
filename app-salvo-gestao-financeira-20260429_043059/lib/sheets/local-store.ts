import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import {
  Debt,
  Expense,
  Goal,
  Income,
  PaymentMethod,
  Profile,
  TransactionScope,
  TransactionSource,
  UserBadge,
  UserPoint,
  UserStreak,
  ViradaData,
} from "@/lib/types";

const dataDir = path.join(process.cwd(), "data", "planilhas");

const files = {
  users: "usuarios.csv",
  transactions: "lancamentos.csv",
  sales: "vendas.csv",
  purchases: "compras_custos.csv",
  cashFlow: "fluxo_caixa.csv",
  monthlySummary: "resumo_mensal.csv",
  categories: "categorias.csv",
  accountsPayable: "contas_a_pagar.csv",
  accountsReceivable: "contas_a_receber.csv",
  goals: "metas.csv",
  debts: "dividas.csv",
  missions: "missoes_concluidas.csv",
  points: "pontos.csv",
  badges: "medalhas.csv",
  syncLog: "sync_log.csv",
};

const headers = {
  users: [
    "id",
    "full_name",
    "email",
    "whatsapp",
    "password_salt",
    "password_hash",
    "role",
    "plan",
    "access_status",
    "sheet_provider",
    "sheet_url",
    "created_at",
  ],
  transactions: [
    "id",
    "user_id",
    "type",
    "description",
    "amount",
    "category",
    "payment_method",
    "nature",
    "scope",
    "source",
    "date",
    "created_at",
    "sync_status",
    "sync_error",
  ],
  sales: ["id", "user_id", "date", "scope", "description", "amount", "category", "source", "created_at"],
  purchases: [
    "id",
    "user_id",
    "date",
    "scope",
    "description",
    "amount",
    "category",
    "payment_method",
    "nature",
    "source",
    "created_at",
  ],
  cashFlow: [
    "id",
    "user_id",
    "date",
    "month",
    "scope",
    "description",
    "category",
    "source",
    "cash_in",
    "cash_out",
    "movement_result",
    "running_balance",
  ],
  monthlySummary: [
    "id",
    "user_id",
    "month",
    "scope",
    "sales",
    "other_income",
    "total_income",
    "purchases",
    "fixed_costs",
    "variable_costs",
    "total_outflow",
    "result",
    "cash_margin_percent",
  ],
  categories: ["id", "kind", "category", "group_name", "recommended_for"],
  accountsPayable: ["id", "user_id", "name", "amount", "due_date", "status", "priority", "created_at"],
  accountsReceivable: ["id", "user_id", "name", "amount", "due_date", "status", "source", "created_at"],
  goals: ["id", "user_id", "name", "target_amount", "current_amount", "type", "created_at"],
  debts: ["id", "user_id", "name", "total_amount", "installment_amount", "due_date", "priority", "status", "created_at"],
  missions: ["id", "user_id", "mission_day", "completed_at"],
  points: ["id", "user_id", "points", "reason", "created_at"],
  badges: ["id", "user_id", "badge_key", "badge_name", "unlocked_at"],
  syncLog: ["id", "user_id", "provider", "status", "message", "created_at"],
};

type SheetName = keyof typeof files;
type Row = Record<string, string>;

export interface LocalUser {
  id: string;
  email: string;
}

export interface FinanceBundle extends ViradaData {
  user: LocalUser;
  profile: Profile;
  points: UserPoint[];
  badges: UserBadge[];
  streak: UserStreak;
  sheet: {
    provider: "google_sheets" | "excel";
    url: string | null;
    status: "local_csv" | "ready_to_sync";
    files: string[];
  };
}

function ensureStore() {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  (Object.keys(files) as SheetName[]).forEach((sheet) => {
    const filePath = path.join(dataDir, files[sheet]);
    if (!existsSync(filePath)) {
      writeFileSync(filePath, `${headers[sheet].join(",")}\n`, "utf8");
    }
  });

  seedCategories();
}

function escapeCsv(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function readRows(sheet: SheetName): Row[] {
  ensureStore();
  const filePath = path.join(dataDir, files[sheet]);
  const [headerLine, ...lines] = readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean);
  const columns = splitCsvLine(headerLine);

  return lines.map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(columns.map((column, index) => [column, values[index] ?? ""]));
  });
}

function writeRows(sheet: SheetName, rows: Row[]) {
  ensureStore();
  const columns = headers[sheet];
  const content = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => escapeCsv(row[column])).join(",")),
  ].join("\n");

  writeFileSync(path.join(dataDir, files[sheet]), `${content}\n`, "utf8");
}

function makeCsv(sheet: SheetName, rows: Row[]) {
  const columns = headers[sheet];
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => escapeCsv(row[column])).join(",")),
  ].join("\n");
}

function appendRow(sheet: SheetName, row: Row) {
  const rows = readRows(sheet);
  rows.push(row);
  writeRows(sheet, rows);
}

function seedCategories() {
  const filePath = path.join(dataDir, files.categories);
  const existing = readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean);

  if (existing.length > 1) {
    return;
  }

  const rows: Row[] = [
    { id: "cat-sale", kind: "entrada", category: "Venda", group_name: "Receita operacional", recommended_for: "empresa" },
    { id: "cat-receipt", kind: "entrada", category: "Recebimento", group_name: "Receita operacional", recommended_for: "casa_empresa" },
    { id: "cat-salary", kind: "entrada", category: "Salário", group_name: "Renda fixa", recommended_for: "casa" },
    { id: "cat-service", kind: "entrada", category: "Serviço", group_name: "Receita de serviço", recommended_for: "empresa" },
    { id: "cat-extra", kind: "entrada", category: "Renda extra", group_name: "Receita extra", recommended_for: "casa_empresa" },
    { id: "cat-purchase", kind: "saida", category: "Compra", group_name: "Compras", recommended_for: "casa_empresa" },
    { id: "cat-stock", kind: "saida", category: "Estoque", group_name: "Custo de mercadoria", recommended_for: "empresa" },
    { id: "cat-supplier", kind: "saida", category: "Fornecedor", group_name: "Custo operacional", recommended_for: "empresa" },
    { id: "cat-tax", kind: "saida", category: "Impostos", group_name: "Tributos", recommended_for: "empresa" },
    { id: "cat-marketing", kind: "saida", category: "Marketing", group_name: "Venda e aquisição", recommended_for: "empresa" },
    { id: "cat-market", kind: "saida", category: "Mercado", group_name: "Casa", recommended_for: "casa" },
    { id: "cat-rent", kind: "saida", category: "Aluguel", group_name: "Custo fixo", recommended_for: "casa_empresa" },
    { id: "cat-energy", kind: "saida", category: "Energia", group_name: "Custo fixo", recommended_for: "casa_empresa" },
    { id: "cat-internet", kind: "saida", category: "Internet", group_name: "Custo fixo", recommended_for: "casa_empresa" },
    { id: "cat-card", kind: "saida", category: "Cartão", group_name: "Dívida", recommended_for: "casa_empresa" },
  ];

  const content = [
    headers.categories.join(","),
    ...rows.map((row) => headers.categories.map((column) => escapeCsv(row[column])).join(",")),
  ].join("\n");

  writeFileSync(filePath, `${content}\n`, "utf8");
}

function classifyPurchase(row: Row) {
  if (["Aluguel", "Energia", "Água", "Internet", "Funcionário"].includes(row.category)) {
    return "fixed";
  }

  if (["Estoque", "Fornecedor", "Compra", "Marketing", "Impostos"].includes(row.category)) {
    return "variable";
  }

  return row.nature === "impulso" ? "variable" : "fixed";
}

function monthOf(date: string) {
  return date.slice(0, 7);
}

function rebuildDerivedSheets(userId: string) {
  const transactions = transactionRows(userId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const salesRows: Row[] = [];
  const purchaseRows: Row[] = [];
  const cashFlowRows: Row[] = [];
  const summary = new Map<string, Row>();
  let runningBalance = 0;

  transactions.forEach((row) => {
    const isIncome = row.type === "income";
    const value = amount(row);
    const cashIn = isIncome ? value : 0;
    const cashOut = isIncome ? 0 : value;
    runningBalance += cashIn - cashOut;
    const month = monthOf(row.date);
    const scope = row.scope || "casa";
    const summaryKey = `${month}:${scope}`;

    if (!summary.has(summaryKey)) {
      summary.set(summaryKey, {
        id: `${userId}-${month}-${scope}`,
        user_id: userId,
        month,
        scope,
        sales: "0",
        other_income: "0",
        total_income: "0",
        purchases: "0",
        fixed_costs: "0",
        variable_costs: "0",
        total_outflow: "0",
        result: "0",
        cash_margin_percent: "0",
      });
    }

    const summaryRow = summary.get(summaryKey)!;

    cashFlowRows.push({
      id: row.id,
      user_id: userId,
      date: row.date,
      month,
      scope,
      description: row.description,
      category: row.category,
      source: row.source,
      cash_in: String(cashIn),
      cash_out: String(cashOut),
      movement_result: String(cashIn - cashOut),
      running_balance: String(runningBalance),
    });

    if (isIncome) {
      salesRows.push({
        id: row.id,
        user_id: userId,
        date: row.date,
        scope,
        description: row.description,
        amount: row.amount,
        category: row.category,
        source: row.source,
        created_at: row.created_at,
      });

      const field = row.category === "Venda" || row.category === "Serviço" ? "sales" : "other_income";
      summaryRow[field] = String(Number(summaryRow[field]) + value);
      summaryRow.total_income = String(Number(summaryRow.total_income) + value);
    } else {
      purchaseRows.push({
        id: row.id,
        user_id: userId,
        date: row.date,
        scope,
        description: row.description,
        amount: row.amount,
        category: row.category,
        payment_method: row.payment_method,
        nature: row.nature,
        source: row.source,
        created_at: row.created_at,
      });

      const bucket = classifyPurchase(row);
      if (row.category === "Compra" || row.category === "Estoque" || row.category === "Fornecedor") {
        summaryRow.purchases = String(Number(summaryRow.purchases) + value);
      } else if (bucket === "fixed") {
        summaryRow.fixed_costs = String(Number(summaryRow.fixed_costs) + value);
      } else {
        summaryRow.variable_costs = String(Number(summaryRow.variable_costs) + value);
      }
      summaryRow.total_outflow = String(Number(summaryRow.total_outflow) + value);
    }

    summaryRow.result = String(Number(summaryRow.total_income) - Number(summaryRow.total_outflow));
    summaryRow.cash_margin_percent =
      Number(summaryRow.total_income) > 0
        ? String(Math.round((Number(summaryRow.result) / Number(summaryRow.total_income)) * 100))
        : "0";
  });

  const replaceUserRows = (sheet: SheetName, rows: Row[]) => {
    writeRows(sheet, [...readRows(sheet).filter((row) => row.user_id !== userId), ...rows]);
  };

  replaceUserRows("sales", salesRows);
  replaceUserRows("purchases", purchaseRows);
  replaceUserRows("cashFlow", cashFlowRows);
  replaceUserRows("monthlySummary", Array.from(summary.values()));
}

function now() {
  return new Date().toISOString();
}

function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password: string, salt: string, storedHash: string) {
  const hash = scryptSync(password, salt, 64);
  const stored = Buffer.from(storedHash, "hex");
  return stored.length === hash.length && timingSafeEqual(stored, hash);
}

function toProfile(row: Row): Profile {
  return {
    id: row.id,
    fullName: row.full_name || null,
    email: row.email || null,
    whatsapp: row.whatsapp || null,
    role: row.role === "admin" ? "admin" : "customer",
    plan: row.plan === "premium" ? "premium" : "basic",
    accessStatus: row.access_status === "blocked" || row.access_status === "cancelled" ? row.access_status : "active",
    sheetProvider: row.sheet_provider === "excel" ? "excel" : "google_sheets",
    sheetUrl: row.sheet_url || null,
  };
}

export function createUser(input: {
  fullName: string;
  email: string;
  whatsapp: string;
  password: string;
  sheetProvider?: "google_sheets" | "excel";
  sheetUrl?: string;
}) {
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  const whatsapp = input.whatsapp.trim();

  if (!fullName) {
    throw new Error("Informe seu nome.");
  }

  if (!email) {
    throw new Error("Informe seu email.");
  }

  if (input.password.length < 6) {
    throw new Error("A senha precisa ter pelo menos 6 caracteres.");
  }

  const users = readRows("users");

  if (users.some((user) => user.email.toLowerCase() === email)) {
    throw new Error("Já existe uma conta com este email.");
  }

  const password = hashPassword(input.password);
  const row: Row = {
    id: randomUUID(),
    full_name: fullName,
    email,
    whatsapp,
    password_salt: password.salt,
    password_hash: password.hash,
    role: "customer",
    plan: "basic",
    access_status: "active",
    sheet_provider: input.sheetProvider ?? "google_sheets",
    sheet_url: input.sheetUrl?.trim() ?? "",
    created_at: now(),
  };

  appendRow("users", row);
  appendRow("syncLog", {
    id: randomUUID(),
    user_id: row.id,
    provider: row.sheet_provider,
    status: "local_csv",
    message: "Base local criada em CSV para sincronizacao futura com planilha.",
    created_at: now(),
  });

  return { id: row.id, email: row.email, profile: toProfile(row) };
}

export function authenticateUser(emailInput: string, password: string) {
  const email = emailInput.trim().toLowerCase();
  const user = readRows("users").find((row) => row.email.toLowerCase() === email);

  if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
    throw new Error("Email ou senha inválidos.");
  }

  if (user.access_status !== "active") {
    throw new Error("Acesso bloqueado ou cancelado.");
  }

  return { id: user.id, email: user.email, profile: toProfile(user) };
}

export function findUserById(userId: string) {
  const row = readRows("users").find((user) => user.id === userId);
  return row ? { id: row.id, email: row.email, profile: toProfile(row) } : null;
}

function amount(row: Row) {
  return Number(row.amount || row.total_amount || row.current_amount || 0);
}

function transactionRows(userId: string) {
  return readRows("transactions").filter((row) => row.user_id === userId);
}

export function getFinanceBundle(userId: string): FinanceBundle {
  const user = findUserById(userId);
  if (!user) {
    throw new Error("Sessão inválida.");
  }

  const transactions = transactionRows(userId);
  const expenses: Expense[] = transactions
    .filter((row) => row.type === "expense" || row.type === "debt_payment")
    .map((row) => ({
      id: row.id,
      description: row.description,
      value: amount(row),
      category: (row.category || "Outros") as Expense["category"],
      date: row.date,
      paymentMethod: (row.payment_method || "Outro") as PaymentMethod,
      nature: row.nature === "impulso" ? "impulso" : ("essencial" as Expense["nature"]),
      scope: (row.scope || "casa") as TransactionScope,
      source: (row.source || "app") as TransactionSource,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const incomes: Income[] = transactions
    .filter((row) => row.type === "income")
    .map((row) => ({
      id: row.id,
      description: row.description,
      value: amount(row),
      category: (row.category || "Outros") as Income["category"],
      date: row.date,
      scope: (row.scope || "casa") as TransactionScope,
      source: (row.source || "app") as TransactionSource,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const goals: Goal[] = readRows("goals")
    .filter((row) => row.user_id === userId)
    .map((row) => ({
      id: row.id,
      name: row.name,
      targetValue: Number(row.target_amount || 0),
      currentValue: Number(row.current_amount || 0),
      type: (row.type || "economia") as Goal["type"],
    }));

  const debts: Debt[] = readRows("debts")
    .filter((row) => row.user_id === userId)
    .map((row) => ({
      id: row.id,
      name: row.name,
      totalValue: Number(row.total_amount || 0),
      installmentValue: Number(row.installment_amount || 0),
      dueDate: row.due_date,
      priority: (row.priority || "média") as Debt["priority"],
      status: (row.status || "aberta") as Debt["status"],
    }));

  const missionStatus = Object.fromEntries(
    readRows("missions")
      .filter((row) => row.user_id === userId)
      .map((row) => [`mission-${row.mission_day}`, true]),
  );

  const points: UserPoint[] = readRows("points")
    .filter((row) => row.user_id === userId)
    .map((row) => ({
      id: row.id,
      points: Number(row.points || 0),
      reason: row.reason || null,
      createdAt: row.created_at,
    }));

  const badges: UserBadge[] = readRows("badges")
    .filter((row) => row.user_id === userId)
    .map((row) => ({
      id: row.id,
      badgeKey: row.badge_key,
      badgeName: row.badge_name,
      unlockedAt: row.unlocked_at,
    }));

  return {
    user: { id: user.id, email: user.email },
    profile: user.profile,
    expenses,
    incomes,
    debts,
    goals,
    missionStatus,
    points,
    badges,
    streak: { currentStreak: 0, bestStreak: 0, lastActiveDate: null },
    sheet: {
      provider: user.profile.sheetProvider ?? "google_sheets",
      url: user.profile.sheetUrl ?? null,
      status: user.profile.sheetUrl ? "ready_to_sync" : "local_csv",
      files: Object.values(files),
    },
  };
}

export function addTransaction(
  userId: string,
  input: {
    type: "expense" | "income" | "debt_payment" | "saving";
    description: string;
    amount: number;
    category: string;
    paymentMethod?: string;
    nature?: string;
    scope?: TransactionScope;
    source?: TransactionSource;
    date: string;
  },
) {
  const row: Row = {
    id: randomUUID(),
    user_id: userId,
    type: input.type,
    description: input.description,
    amount: String(input.amount),
    category: input.category,
    payment_method: input.paymentMethod ?? "",
    nature: input.nature ?? "",
    scope: input.scope ?? "casa",
    source: input.source ?? "app",
    date: input.date,
    created_at: now(),
    sync_status: "pending",
    sync_error: "",
  };

  appendRow("transactions", row);
  rebuildDerivedSheets(userId);
  return row.id;
}

export function removeTransaction(userId: string, id: string) {
  writeRows(
    "transactions",
    readRows("transactions").filter((row) => !(row.user_id === userId && row.id === id)),
  );
  rebuildDerivedSheets(userId);
}

export function addGoalRow(userId: string, input: Omit<Goal, "id">) {
  appendRow("goals", {
    id: randomUUID(),
    user_id: userId,
    name: input.name,
    target_amount: String(input.targetValue),
    current_amount: String(input.currentValue),
    type: input.type,
    created_at: now(),
  });
}

export function updateGoalRow(userId: string, id: string, currentValue: number) {
  writeRows(
    "goals",
    readRows("goals").map((row) =>
      row.user_id === userId && row.id === id ? { ...row, current_amount: String(currentValue) } : row,
    ),
  );
}

export function addDebtRow(userId: string, input: Omit<Debt, "id">) {
  const id = randomUUID();
  appendRow("debts", {
    id,
    user_id: userId,
    name: input.name,
    total_amount: String(input.totalValue),
    installment_amount: String(input.installmentValue),
    due_date: input.dueDate,
    priority: input.priority,
    status: input.status,
    created_at: now(),
  });
  appendRow("accountsPayable", {
    id,
    user_id: userId,
    name: input.name,
    amount: String(input.installmentValue || input.totalValue),
    due_date: input.dueDate,
    status: input.status,
    priority: input.priority,
    created_at: now(),
  });
}

export function updateDebtRow(userId: string, id: string, status: Debt["status"]) {
  writeRows(
    "debts",
    readRows("debts").map((row) => (row.user_id === userId && row.id === id ? { ...row, status } : row)),
  );
}

export function addPointRow(userId: string, points: number, reason: string) {
  appendRow("points", {
    id: randomUUID(),
    user_id: userId,
    points: String(points),
    reason,
    created_at: now(),
  });
}

export function setMissionRow(userId: string, missionDay: number, completed: boolean) {
  if (!completed) {
    writeRows(
      "missions",
      readRows("missions").filter((row) => !(row.user_id === userId && row.mission_day === String(missionDay))),
    );
    return;
  }

  const rows = readRows("missions");
  if (!rows.some((row) => row.user_id === userId && row.mission_day === String(missionDay))) {
    rows.push({ id: randomUUID(), user_id: userId, mission_day: String(missionDay), completed_at: now() });
    writeRows("missions", rows);
  }
}

export function addSheetLog(userId: string, status: string, message: string) {
  appendRow("syncLog", {
    id: randomUUID(),
    user_id: userId,
    provider: "google_sheets",
    status,
    message,
    created_at: now(),
  });
}

export function exportUserSheet(userId: string, sheet: string) {
  ensureStore();
  const allowed = Object.keys(files) as SheetName[];
  const target = allowed.find((item) => files[item] === sheet || item === sheet);

  if (!target) {
    throw new Error("Planilha não encontrada.");
  }

  if (target === "users") {
    const profileRows = readRows("users")
      .filter((row) => row.id === userId)
      .map((row) => ({
        id: row.id,
        full_name: row.full_name,
        email: row.email,
        whatsapp: row.whatsapp,
        role: row.role,
        plan: row.plan,
        access_status: row.access_status,
        sheet_provider: row.sheet_provider,
        sheet_url: row.sheet_url,
        created_at: row.created_at,
      }));

    const columns = [
      "id",
      "full_name",
      "email",
      "whatsapp",
      "role",
      "plan",
      "access_status",
      "sheet_provider",
      "sheet_url",
      "created_at",
    ];
    return [
      columns.join(","),
      ...profileRows.map((row) => columns.map((column) => escapeCsv(row[column as keyof typeof row])).join(",")),
    ].join("\n");
  }

  const rows = readRows(target).filter((row) => !("user_id" in row) || row.user_id === userId);
  return makeCsv(target, rows);
}
