/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Prévia offline da planilha Google — mostra, aba por aba, o que
 * lib/sheets/builder.ts coloca em cada célula, sem credencial e sem criar
 * planilha de verdade. Serve para comparar com o design do Claude Design
 * (_design/claude-design/Planilha Virada - Redesign.dc.html) antes de sincronizar.
 *
 * Roda com: npx tsx scripts/preview-planilha.ts [arquivo-de-saida.html]
 */
import { writeFileSync } from "fs";
import { buildStaticValues, buildSyncBatch, TAB, TAB_ORDER } from "../lib/sheets/builder";

const OUT = process.argv[2] ?? "planilha-preview.html";

const input = {
  incomes: [
    { id: "i1", description: "Salário", value: 3000, category: "Salário", date: "2026-06-05" },
    { id: "i2", description: "Venda de bolo", value: 420, category: "Renda extra", date: "2026-06-20" },
  ],
  expenses: [
    { id: "e1", description: "Supermercado Extra", value: 800, category: "Mercado", date: "2026-06-05", nature: "essencial" },
    { id: "e2", description: "Cinema", value: 250, category: "Lazer", date: "2026-06-10", nature: "impulso" },
    { id: "e3", description: "Fatura do cartão", value: 1109.2, category: "Cartão", date: "2026-06-22", nature: "essencial" },
  ],
  debts: [
    { id: "d1", name: "Cartão Nubank", totalValue: 1800, installmentValue: 600, dueDate: "2026-07-05", priority: "alta", status: "aberta" },
  ],
  goals: [
    { id: "g1", name: "Reserva 6 meses", targetValue: 12000, currentValue: 3000, type: "reserva" },
  ],
} as any;

// ── monta uma grade por aba a partir dos ranges A1 ────────────────────────────
type Grid = Map<string, unknown>; // "linha:coluna" -> valor
const grids = new Map<string, Grid>();
TAB_ORDER.forEach((k) => grids.set(TAB[k], new Map()));

const colNum = (letters: string) =>
  [...letters].reduce((n, c) => n * 26 + (c.charCodeAt(0) - 64), 0);

function place(range: string, values: unknown[][]) {
  const m = /^(?:'([^']+)'|([^!]+))!([A-Z]+)(\d+)/.exec(range);
  if (!m) return;
  const tab = m[1] ?? m[2];
  const grid = grids.get(tab);
  if (!grid) return;
  const c0 = colNum(m[3]);
  const r0 = Number(m[4]);
  values.forEach((row, i) =>
    row.forEach((v, j) => {
      if (v !== "" && v != null) grid.set(`${r0 + i}:${c0 + j}`, v);
    }),
  );
}

buildStaticValues().forEach((v: any) => place(v.range, v.values));
const sync = buildSyncBatch(input) as any;
sync.valueRanges.forEach((v: any) => place(v.range, v.values));

// ── render ────────────────────────────────────────────────────────────────────
const esc = (s: unknown) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const colName = (n: number) => {
  let s = "";
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = (n - r - 1) / 26; }
  return s;
};

let html = `<!doctype html><meta charset="utf-8"><title>Prévia da planilha — Virada</title>
<style>
 body{margin:0;font:13px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;background:#0F172A;color:#E2E8F0}
 header{padding:12px 16px;border-bottom:1px solid #1E293B}
 h1{font-size:15px;margin:0}
 p.sub{margin:4px 0 0;color:#94A3B8;font-size:12px}
 section{margin:18px 16px 26px}
 h2{font-size:13px;color:#F5C542;letter-spacing:.08em;text-transform:uppercase;margin:0 0 8px}
 .wrap{overflow-x:auto;background:#fff;border-radius:8px}
 table{border-collapse:collapse;font-size:12px;color:#0F172A;min-width:100%}
 th,td{border:1px solid #E5E9F0;padding:4px 7px;white-space:nowrap;vertical-align:top}
 th{background:#F1F5F9;color:#64748B;font-weight:600;text-align:center;width:34px}
 td.f{color:#15803D;font-family:ui-monospace,Consolas,monospace;font-size:11px}
</style>
<header><h1>Prévia da planilha Google (offline)</h1>
<p class="sub">Gerada por lib/sheets/builder.ts — mesmas células que vão para o Google. Verde = fórmula.</p></header>`;

TAB_ORDER.forEach((key) => {
  const tab = TAB[key];
  const grid = grids.get(tab)!;
  if (grid.size === 0) return;
  let maxR = 0, maxC = 0;
  grid.forEach((_, k) => {
    const [r, c] = k.split(":").map(Number);
    maxR = Math.max(maxR, r); maxC = Math.max(maxC, c);
  });
  html += `<section><h2>${esc(tab)}</h2><div class="wrap"><table><tr><th></th>`;
  for (let c = 1; c <= maxC; c++) html += `<th>${colName(c)}</th>`;
  html += "</tr>";
  for (let r = 1; r <= maxR; r++) {
    html += `<tr><th>${r}</th>`;
    for (let c = 1; c <= maxC; c++) {
      const v = grid.get(`${r}:${c}`);
      const formula = typeof v === "string" && v.startsWith("=");
      html += `<td class="${formula ? "f" : ""}">${v == null ? "" : esc(v)}</td>`;
    }
    html += "</tr>";
  }
  html += "</table></div></section>";
});

writeFileSync(OUT, html, "utf8");
console.log(`ok: ${OUT} — ${TAB_ORDER.length} abas`);
