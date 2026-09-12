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
let _db: Database.Database | null = null;
let _file = "";

// Resolver o caminho na hora da chamada (e não no topo do módulo) tem dois
// motivos: um `import` que toca o disco derrubaria qualquer rota que só queira,
// por exemplo, checar ADMIN_EMAILS; e assim o teste consegue apontar
// ACCESS_DB_DIR pra um lugar inválido e provar que a falha do banco vira 503
// ("problema no servidor") em vez de "você não comprou".
function dbFile(): string {
  const dir = process.env.ACCESS_DB_DIR || path.join(process.cwd(), "data");
  return path.join(dir, "access.db");
}

export function db(): Database.Database {
  const FILE = dbFile();
  if (_db && _file === FILE) return _db;
  if (_db) {
    _db.close();
    _db = null;
  }
  const DIR = path.dirname(FILE);
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
  _db = new Database(FILE);
  _file = FILE;
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
