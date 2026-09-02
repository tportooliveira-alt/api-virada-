/**
 * SQLite local — banco de compradores. Arquivo em data/access.db.
 * Tabela única: members (email, plataforma, produto, transação, status).
 */
import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import path from "path";

const DIR = path.join(process.cwd(), "data");
if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });

const FILE = path.join(DIR, "access.db");

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;
  _db = new Database(FILE);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  _db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      email           TEXT PRIMARY KEY,
      name            TEXT,
      platform        TEXT NOT NULL,
      product         TEXT,
      transaction_id  TEXT,
      status          TEXT NOT NULL DEFAULT 'ativo',
      added_at        TEXT NOT NULL DEFAULT (datetime('now')),
      cancelled_at    TEXT,
      raw             TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
    CREATE INDEX IF NOT EXISTS idx_members_platform ON members(platform);

    CREATE TABLE IF NOT EXISTS webhook_log (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      platform  TEXT NOT NULL,
      event     TEXT,
      email     TEXT,
      ok        INTEGER NOT NULL,
      message   TEXT,
      received_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return _db;
}
