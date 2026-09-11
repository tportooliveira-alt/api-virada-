/**
 * SQLite local — banco de compradores. Arquivo em data/access.db.
 * Tabela única: members (email, plataforma, produto, transação, status).
 */
import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import path from "path";

// Onde o arquivo do banco mora. Configurável porque nem todo host deixa
// escrever no diretório da aplicação — num preview serverless só /tmp é
// gravável, e lá o banco é EFÊMERO (some a cada cold start). Na VPS, que é o
// alvo de produção, o padrão `data/` continua valendo e é persistente.
const DIR = process.env.ACCESS_DB_DIR || path.join(process.cwd(), "data");
const FILE = path.join(DIR, "access.db");

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;
  // Criar o diretório aqui, e não no topo do módulo: um `import` que toca o
  // disco derruba qualquer rota que só queira, por exemplo, checar ADMIN_EMAILS.
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
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
