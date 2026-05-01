/**
 * IndexedDB — armazenamento local no celular.
 * Funciona 100% offline. Dados ficam no dispositivo.
 * Sincroniza com Google Planilhas quando há conexão.
 */
import { openDB, type IDBPDatabase } from "idb";
import type { UserPoint, UserBadge, UserStreak } from "@/lib/types";
export type { UserPoint, UserBadge, UserStreak }; // re-export para os consumidores

const DB_NAME = "virada-app";
const DB_VERSION = 1;

export interface LocalUser {
  id: string;
  email: string;
  fullName: string | null;
  whatsapp: string | null;
  passwordHash: string;
  role: "customer" | "admin";
  plan: "basic" | "premium";
  sheetId: string | null;
  sheetEmail: string | null;
  createdAt: string;
}

export interface SyncLog {
  id: string;
  action: string;
  table: string;
  recordId: string;
  timestamp: string;
  synced: boolean;
}

let _db: IDBPDatabase | null = null;

export async function getDB(): Promise<IDBPDatabase> {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Usuários
      if (!db.objectStoreNames.contains("users")) {
        const users = db.createObjectStore("users", { keyPath: "id" });
        users.createIndex("email", "email", { unique: true });
      }
      // Lançamentos financeiros (receitas + despesas)
      if (!db.objectStoreNames.contains("transactions")) {
        const tx = db.createObjectStore("transactions", { keyPath: "id" });
        tx.createIndex("userId", "userId");
        tx.createIndex("date", "date");
        tx.createIndex("type", "type");
      }
      // Dívidas
      if (!db.objectStoreNames.contains("debts")) {
        const debts = db.createObjectStore("debts", { keyPath: "id" });
        debts.createIndex("userId", "userId");
      }
      // Metas
      if (!db.objectStoreNames.contains("goals")) {
        const goals = db.createObjectStore("goals", { keyPath: "id" });
        goals.createIndex("userId", "userId");
      }
      // Pontos / gamificação
      if (!db.objectStoreNames.contains("points")) {
        const pts = db.createObjectStore("points", { keyPath: "id" });
        pts.createIndex("userId", "userId");
      }
      // Medalhas
      if (!db.objectStoreNames.contains("badges")) {
        const bdg = db.createObjectStore("badges", { keyPath: "id" });
        bdg.createIndex("userId", "userId");
      }
      // Streak
      if (!db.objectStoreNames.contains("streaks")) {
        db.createObjectStore("streaks", { keyPath: "userId" });
      }
      // Missões concluídas
      if (!db.objectStoreNames.contains("missions")) {
        const msn = db.createObjectStore("missions", { keyPath: "id" });
        msn.createIndex("userId", "userId");
      }
      // Fila de sincronização (pendências para o Google Sheets)
      if (!db.objectStoreNames.contains("syncQueue")) {
        const sq = db.createObjectStore("syncQueue", { keyPath: "id" });
        sq.createIndex("synced", "synced");
      }
    },
  });
  return _db;
}

// ─── Helpers genéricos ────────────────────────────────────────────────────────

export async function dbGet<T>(store: string, key: string): Promise<T | undefined> {
  const db = await getDB();
  return db.get(store, key) as Promise<T | undefined>;
}

export async function dbPut<T>(store: string, value: T): Promise<void> {
  const db = await getDB();
  await db.put(store, value);
}

export async function dbDelete(store: string, key: string): Promise<void> {
  const db = await getDB();
  await db.delete(store, key);
}

export async function dbGetAllByIndex<T>(
  store: string,
  index: string,
  value: string,
): Promise<T[]> {
  const db = await getDB();
  return db.getAllFromIndex(store, index, value) as Promise<T[]>;
}

// ─── Usuários ─────────────────────────────────────────────────────────────────

export async function getUserByEmail(email: string): Promise<LocalUser | undefined> {
  const db = await getDB();
  return db.getFromIndex("users", "email", email) as Promise<LocalUser | undefined>;
}

export async function saveUser(user: LocalUser): Promise<void> {
  await dbPut("users", user);
}

export async function getUserById(id: string): Promise<LocalUser | undefined> {
  return dbGet<LocalUser>("users", id);
}

// ─── Transações ───────────────────────────────────────────────────────────────

export interface DBTransaction {
  id: string;
  userId: string;
  type: "income" | "expense";
  description: string;
  amount: number;
  category: string;
  date: string;
  paymentMethod: string;
  nature?: string;
  scope?: string;
  source?: string;
}

export async function addTransaction(tx: DBTransaction): Promise<void> {
  await dbPut("transactions", tx);
  await queueSync("transactions", tx.id, "add");
}

export async function getTransactions(userId: string): Promise<DBTransaction[]> {
  return dbGetAllByIndex<DBTransaction>("transactions", "userId", userId);
}

export async function removeTransaction(id: string): Promise<void> {
  await dbDelete("transactions", id);
  await queueSync("transactions", id, "delete");
}

// ─── Dívidas ──────────────────────────────────────────────────────────────────

export interface DBDebt {
  id: string;
  userId: string;
  name: string;
  totalValue: number;
  installmentValue: number;
  dueDate: string;
  priority: string;
  status: string;
}

export async function saveDebt(debt: DBDebt): Promise<void> {
  await dbPut("debts", debt);
  await queueSync("debts", debt.id, "add");
}

export async function getDebts(userId: string): Promise<DBDebt[]> {
  return dbGetAllByIndex<DBDebt>("debts", "userId", userId);
}

export async function removeDebt(id: string): Promise<void> {
  await dbDelete("debts", id);
  await queueSync("debts", id, "delete");
}

// ─── Metas ────────────────────────────────────────────────────────────────────

export interface DBGoal {
  id: string;
  userId: string;
  name: string;
  targetValue: number;
  currentValue: number;
  type: string;
}

export async function saveGoal(goal: DBGoal): Promise<void> {
  await dbPut("goals", goal);
  await queueSync("goals", goal.id, "add");
}

export async function getGoals(userId: string): Promise<DBGoal[]> {
  return dbGetAllByIndex<DBGoal>("goals", "userId", userId);
}

// ─── Streak ───────────────────────────────────────────────────────────────────

export interface DBStreak {
  userId: string;
  currentStreak: number;
  bestStreak: number;
  lastActiveDate: string | null;
}

export async function getStreak(userId: string): Promise<DBStreak> {
  const found = await dbGet<DBStreak>("streaks", userId);
  return found ?? { userId, currentStreak: 0, bestStreak: 0, lastActiveDate: null };
}

export async function saveStreak(streak: DBStreak): Promise<void> {
  await dbPut("streaks", streak);
}

// ─── Fila de sincronização ────────────────────────────────────────────────────

async function queueSync(table: string, recordId: string, action: string): Promise<void> {
  const db = await getDB();
  await db.put("syncQueue", {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    action,
    table,
    recordId,
    timestamp: new Date().toISOString(),
    synced: false,
  });
}

export async function getPendingSync(): Promise<SyncLog[]> {
  const db = await getDB();
  // IDBKeyRange.only(0) equivale a synced = false (armazenado como 0 no IndexedDB)
  const all = await db.getAll("syncQueue") as SyncLog[];
  return all.filter((s) => !s.synced);
}

export async function markSynced(id: string): Promise<void> {
  const db = await getDB();
  const item = await db.get("syncQueue", id);
  if (item) await db.put("syncQueue", { ...item, synced: true });
}
