/**
 * Membros (compradores) — abstração sobre o SQLite.
 * Toda plataforma de venda escreve aqui via webhook.
 */
import { db } from "./db";

export type Platform = "hotmart" | "eduzz" | "kiwify" | "monetizze" | "cakto" | "perfectpay" | "manual";
export type MemberStatus = "ativo" | "cancelado" | "reembolsado";

export interface Member {
  email: string;
  name: string | null;
  platform: Platform;
  product: string | null;
  transaction_id: string | null;
  status: MemberStatus;
  added_at: string;
  cancelled_at: string | null;
}

interface MemberRow {
  email: string;
  name: string | null;
  platform: string;
  product: string | null;
  transaction_id: string | null;
  status: string;
  added_at: string;
  cancelled_at: string | null;
}

const norm = (s: string) => s.trim().toLowerCase();

export function isMember(email: string): boolean {
  const row = db().prepare("SELECT status FROM members WHERE email = ?").get(norm(email)) as { status: string } | undefined;
  return row?.status === "ativo";
}

export function getMember(email: string): Member | null {
  const row = db().prepare("SELECT * FROM members WHERE email = ?").get(norm(email)) as MemberRow | undefined;
  return row ? rowToMember(row) : null;
}

export function listMembers(): Member[] {
  const rows = db().prepare("SELECT * FROM members ORDER BY added_at DESC").all() as MemberRow[];
  return rows.map(rowToMember);
}

export interface UpsertInput {
  email: string;
  name?: string | null;
  platform: Platform;
  product?: string | null;
  transaction_id?: string | null;
  status?: MemberStatus;
  raw?: unknown;
}

export function upsertMember(input: UpsertInput): Member {
  const email = norm(input.email);
  const status = input.status ?? "ativo";
  db().prepare(`
    INSERT INTO members (email, name, platform, product, transaction_id, status, raw)
    VALUES (@email, @name, @platform, @product, @transaction_id, @status, @raw)
    ON CONFLICT(email) DO UPDATE SET
      name = COALESCE(excluded.name, members.name),
      platform = excluded.platform,
      product = COALESCE(excluded.product, members.product),
      transaction_id = COALESCE(excluded.transaction_id, members.transaction_id),
      status = excluded.status,
      cancelled_at = CASE WHEN excluded.status = 'ativo' THEN NULL ELSE datetime('now') END,
      raw = excluded.raw
  `).run({
    email,
    name: input.name ?? null,
    platform: input.platform,
    product: input.product ?? null,
    transaction_id: input.transaction_id ?? null,
    status,
    raw: input.raw ? JSON.stringify(input.raw) : null,
  });
  return getMember(email)!;
}

export function setStatus(email: string, status: MemberStatus): Member | null {
  const e = norm(email);
  const cancelled = status === "ativo" ? null : new Date().toISOString();
  const result = db().prepare("UPDATE members SET status = ?, cancelled_at = ? WHERE email = ?").run(status, cancelled, e);
  if (result.changes === 0) return null;
  return getMember(e);
}

export function logWebhook(input: { platform: string; event?: string; email?: string; ok: boolean; message?: string }) {
  db().prepare(`
    INSERT INTO webhook_log (platform, event, email, ok, message)
    VALUES (?, ?, ?, ?, ?)
  `).run(input.platform, input.event ?? null, input.email ?? null, input.ok ? 1 : 0, input.message ?? null);
}

function rowToMember(row: MemberRow): Member {
  return {
    email: row.email,
    name: row.name,
    platform: row.platform as Platform,
    product: row.product,
    transaction_id: row.transaction_id,
    status: row.status as MemberStatus,
    added_at: row.added_at,
    cancelled_at: row.cancelled_at,
  };
}

/**
 * Últimos avisos de venda recebidos (tabela webhook_log).
 *
 * Existe porque um webhook recusado hoje responde 200 e some: a venda não vira
 * acesso e o dono só descobre quando o cliente reclama. O painel lê isto.
 */
export interface WebhookLogEntry {
  id: number;
  platform: string;
  event: string | null;
  email: string | null;
  ok: boolean;
  message: string | null;
  received_at: string;
}

interface WebhookLogRow {
  id: number;
  platform: string;
  event: string | null;
  email: string | null;
  ok: number;
  message: string | null;
  received_at: string;
}

export function listWebhookLog(limit = 100): WebhookLogEntry[] {
  // Teto no limite: o painel é uma tela de celular, não um dump do banco.
  const take = Math.min(Math.max(Math.trunc(limit) || 0, 1), 500);
  const rows = db()
    .prepare("SELECT * FROM webhook_log ORDER BY id DESC LIMIT ?")
    .all(take) as WebhookLogRow[];
  return rows.map((row) => ({
    id: row.id,
    platform: row.platform,
    event: row.event,
    email: row.email,
    ok: row.ok === 1,
    message: row.message,
    received_at: row.received_at,
  }));
}
