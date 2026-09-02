/**
 * virada-store — persistência dos dados financeiros no IndexedDB.
 *
 * Guarda o objeto `ViradaData` INTEIRO (mesmo formato do localStorage antigo),
 * numa única chave. Não normaliza em tabelas — assim a exportação para a
 * planilha (lib/sheets/builder.ts) continua recebendo exatamente a mesma forma.
 *
 * IndexedDB é mais durável e sem o limite de ~5MB do localStorage.
 */

import { openDB, type IDBPDatabase } from "idb";
import type { ViradaData } from "@/lib/types";

const DB_NAME = "virada";
const STORE = "state";
const KEY = "data";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> | null {
  if (typeof indexedDB === "undefined") return null; // SSR ou ambiente sem IndexedDB
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      },
    });
  }
  return dbPromise;
}

/** Lê os dados salvos. Retorna null se não houver nada ou o IndexedDB falhar. */
export async function loadData(): Promise<ViradaData | null> {
  const p = getDb();
  if (!p) return null;
  try {
    const db = await p;
    return ((await db.get(STORE, KEY)) as ViradaData | undefined) ?? null;
  } catch {
    return null;
  }
}

/** Salva os dados. Lança em caso de falha (o provider avisa o usuário). */
export async function saveData(data: ViradaData): Promise<void> {
  const p = getDb();
  if (!p) throw new Error("IndexedDB indisponível");
  const db = await p;
  await db.put(STORE, data, KEY);
}

/** Apaga os dados salvos (usado no reset). */
export async function clearData(): Promise<void> {
  const p = getDb();
  if (!p) return;
  try {
    const db = await p;
    await db.delete(STORE, KEY);
  } catch {
    // nada a limpar
  }
}
