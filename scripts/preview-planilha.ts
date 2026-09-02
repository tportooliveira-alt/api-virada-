/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Prévia offline da planilha Google — renderiza, aba por aba, exatamente o que
 * lib/sheets/builder.ts manda para o Google: valores, cores, fontes, mesclagens,
 * larguras e alturas. Sem credencial e sem criar planilha de verdade.
 *
 * Serve para comparar com o design do Claude Design
 * (_design/claude-design/Planilha Virada - Redesign.dc.html) antes de sincronizar.
 *
 * Roda com: npx tsx scripts/preview-planilha.ts [saida.html]
 */
import { writeFileSync } from "fs";
import { buildLayoutRequests, buildStaticValues, buildSyncBatch, TAB, TAB_ORDER } from "../lib/sheets/builder";

const OUT = process.argv[2] ?? "planilha-preview.html";

const input = {
  incomes: [
    { id: "i1", description: "Salário", value: 4200, category: "Salário", date: "2026-08-05" },
    { id: "i2", description: "Venda de bolo", value: 420, category: "Renda extra", date: "2026-08-20" },
    { id: "i3", description: "Freela de design", value: 900, category: "Serviço", date: "2026-09-01" },
  ],
  expenses: [
    { id: "e1", description: "Supermercado Extra", value: 786, category: "Mercado", date: "2026-08-05", nature: "essencial", paymentMethod: "Pix" },
    { id: "e2", description: "Cinema", value: 726, category: "Lazer", date: "2026-08-10", nature: "impulso", paymentMethod: "Crédito" },
    { id: "e3", description: "Fatura do cartão", value: 777, category: "Cartão", date: "2026-08-22", nature: "essencial", paymentMethod: "Débito" },
    { id: "e4", description: "Conta de luz", value: 715, category: "Energia", date: "2026-08-12", nature: "essencial", paymentMethod: "Boleto" },
    { id: "e5", description: "Internet fibra", value: 828, category: "Internet", date: "2026-08-15", nature: "essencial", paymentMethod: "Pix" },
    { id: "e6", description: "Farmácia", value: 852, category: "Saúde", date: "2026-09-01", nature: "essencial", paymentMethod: "Pix" },
  ],
  debts: [
    { id: "d1", name: "Cartão Nubank", totalValue: 1800, installmentValue: 600, dueDate: "2026-10-05", priority: "alta", status: "aberta" },
    { id: "d2", name: "Financiamento moto", totalValue: 4200, installmentValue: 350, dueDate: "2026-11-10", priority: "média", status: "negociando" },
  ],
  goals: [
    { id: "g1", name: "Reserva 6 meses", targetValue: 12000, currentValue: 9600, type: "reserva" },
    { id: "g2", name: "Trocar o celular", targetValue: 3000, currentValue: 1200, type: "compra" },
    { id: "g3", name: "Curso de inglês", targetValue: 2000, currentValue: 300, type: "estudo" },
  ],
} as any;

// ── grade por aba ─────────────────────────────────────────────────────────────
type Cell = { v?: unknown; fmt?: any; span?: [number, number]; hidden?: boolean };
type Sheet = { cells: Map<string, Cell>; colW: Map<number, number>; rowH: Map<number, number> };

const sheets = new Map<string, Sheet>();
const ids: Record<string, number> = {};
const byId = new Map<number, string>();
TAB_ORDER.forEach((k, i) => {
  sheets.set(TAB[k], { cells: new Map(), colW: new Map(), rowH: new Map() });
  ids[TAB[k]] = i;
  byId.set(i, TAB[k]);
});

const key = (r: number, c: number) => `${r}:${c}`;
const cell = (s: Sheet, r: number, c: number) => {
  const k = key(r, c);
  if (!s.cells.has(k)) s.cells.set(k, {});
  return s.cells.get(k)!;
};

// valores (ranges A1) ─────────────────────────────────────────────────────────
const colNum = (letters: string) => [...letters].reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0);

function place(range: string, values: unknown[][]) {
  const m = /^(?:'([^']+)'|([^!]+))!([A-Z]+)(\d+)/.exec(range);
  if (!m) return;
  const s = sheets.get(m[1] ?? m[2]);
  if (!s) return;
  const c0 = colNum(m[3]) - 1;
  const r0 = Number(m[4]) - 1;
  values.forEach((row, i) =>
    row.forEach((v, j) => {
      if (v !== "" && v != null) cell(s, r0 + i, c0 + j).v = v;
    }),
  );
}

buildStaticValues().forEach((v: any) => place(v.range, v.values));
const sync = buildSyncBatch(input) as any;
sync.valueRanges.forEach((v: any) => place(v.range, v.values));

// formatos (requests da API) ──────────────────────────────────────────────────
const merge = (a: any, b: any) => {
  if (!b) return a;
  const out = { ...(a ?? {}) };
  for (const k of Object.keys(b)) {
    out[k] = b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) ? merge(out[k], b[k]) : b[k];
  }
  return out;
};

buildLayoutRequests(ids).forEach((req: any) => {
  if (req.repeatCell) {
    const { range: rg, cell: c } = req.repeatCell;
    const s = sheets.get(byId.get(rg.sheetId) ?? "");
    if (!s || !c?.userEnteredFormat) return;
    const r1 = Math.min(rg.endRowIndex ?? 0, 80);
    for (let r = rg.startRowIndex ?? 0; r < r1; r++)
      for (let cc = rg.startColumnIndex ?? 0; cc < (rg.endColumnIndex ?? 0); cc++)
        cell(s, r, cc).fmt = merge(cell(s, r, cc).fmt, c.userEnteredFormat);
  } else if (req.mergeCells) {
    const rg = req.mergeCells.range;
    const s = sheets.get(byId.get(rg.sheetId) ?? "");
    if (!s || (rg.startRowIndex ?? 0) > 80) return;
    cell(s, rg.startRowIndex, rg.startColumnIndex).span = [rg.endRowIndex - rg.startRowIndex, rg.endColumnIndex - rg.startColumnIndex];
    for (let r = rg.startRowIndex; r < rg.endRowIndex; r++)
      for (let c = rg.startColumnIndex; c < rg.endColumnIndex; c++)
        if (r !== rg.startRowIndex || c !== rg.startColumnIndex) cell(s, r, c).hidden = true;
  } else if (req.updateDimensionProperties) {
    const { range: rg, properties } = req.updateDimensionProperties;
    const s = sheets.get(byId.get(rg.sheetId) ?? "");
    if (!s) return;
    const end = Math.min(rg.endIndex, 80);
    for (let i = rg.startIndex; i < end; i++) {
      if (rg.dimension === "COLUMNS") s.colW.set(i, properties.pixelSize);
      else s.rowH.set(i, properties.pixelSize);
    }
  }
});

// ── render ────────────────────────────────────────────────────────────────────
const css = (c: any) => (c ? `rgb(${Math.round((c.red ?? 0) * 255)},${Math.round((c.green ?? 0) * 255)},${Math.round((c.blue ?? 0) * 255)})` : "");
const esc = (s: unknown) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const colName = (n: number) => { let s = ""; n += 1; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = (n - r - 1) / 26; } return s; };
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function show(v: unknown, fmt: any) {
  if (v == null) return "";
  const t = fmt?.numberFormat?.type;
  if (typeof v === "number") {
    if (t === "CURRENCY") return brl(v);
    if (t === "PERCENT") return `${Math.round(v * 100)}%`;
    if (t === "NUMBER") return v.toLocaleString("pt-BR");
  }
  if (typeof v === "string" && v.startsWith("=")) {
    const m = /"color1"\\"(#[0-9A-Fa-f]{6})"/.exec(v);
    return m ? `<span class="bar" style="background:${m[1]}"></span>` : `<span class="f">fórmula</span>`;
  }
  return esc(v);
}

function styleOf(f: any) {
  if (!f) return "";
  const t = f.textFormat ?? {};
  const parts = [
    f.backgroundColor ? `background:${css(f.backgroundColor)}` : "",
    t.foregroundColor ? `color:${css(t.foregroundColor)}` : "",
    t.fontSize ? `font-size:${t.fontSize}px` : "",
    t.bold ? "font-weight:700" : "",
    f.horizontalAlignment ? `text-align:${{ LEFT: "left", CENTER: "center", RIGHT: "right" }[f.horizontalAlignment as string] ?? "left"}` : "",
    f.verticalAlignment === "MIDDLE" ? "vertical-align:middle" : "",
  ];
  return parts.filter(Boolean).join(";");
}

let html = `<!doctype html><meta charset="utf-8"><title>Prévia da planilha — Virada</title>
<style>
 body{margin:0;font:13px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;background:#F1F5F9;color:#0F172A}
 header{padding:12px 16px;background:#0F172A;color:#E2E8F0;position:sticky;top:0;z-index:2}
 h1{font-size:15px;margin:0}
 p.sub{margin:4px 0 0;color:#94A3B8;font-size:12px}
 nav{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
 nav a{font-size:12px;font-weight:600;color:#0F172A;background:#F5C542;padding:4px 9px;border-radius:6px;text-decoration:none}
 section{margin:22px 16px 30px}
 h2{font-size:12px;color:#475569;letter-spacing:.08em;text-transform:uppercase;margin:0 0 8px}
 .wrap{overflow-x:auto;background:#fff;border:1px solid #E5E9F0;border-radius:8px}
 table{border-collapse:collapse;table-layout:fixed}
 td,th.h{border:1px solid #E5E9F0;padding:2px 7px;font-size:11px;overflow:hidden;white-space:nowrap}
 th.h{background:#F8FAFC;color:#94A3B8;font-weight:600;text-align:center;font-size:10px}
 .bar{display:block;height:8px;border-radius:2px;width:100%}
 .f{color:#94A3B8;font-style:italic;font-size:10px}
</style>
<header><h1>Prévia da planilha Google — como ela nasce hoje</h1>
<p class="sub">Renderizada de lib/sheets/builder.ts: mesmos valores, cores, fontes e mesclagens que vão para o Google.</p>
<nav>`;
TAB_ORDER.forEach((k) => (html += `<a href="#${encodeURIComponent(TAB[k])}">${esc(TAB[k])}</a>`));
html += `</nav></header>`;

const MAXR = 46, MAXC = 12;
TAB_ORDER.forEach((k) => {
  const name = TAB[k];
  const s = sheets.get(name)!;
  html += `<section id="${encodeURIComponent(name)}"><h2>${esc(name)}</h2><div class="wrap"><table><tr><th class="h" style="width:32px"></th>`;
  for (let c = 0; c < MAXC; c++) html += `<th class="h" style="width:${(s.colW.get(c) ?? 100)}px">${colName(c)}</th>`;
  html += "</tr>";
  for (let r = 0; r < MAXR; r++) {
    html += `<tr style="height:${s.rowH.get(r) ?? 21}px"><th class="h">${r + 1}</th>`;
    for (let c = 0; c < MAXC; c++) {
      const cl = s.cells.get(key(r, c));
      if (cl?.hidden) continue;
      const span = cl?.span;
      const attr = span ? ` rowspan="${span[0]}" colspan="${span[1]}"` : "";
      html += `<td${attr} style="${styleOf(cl?.fmt)}">${show(cl?.v, cl?.fmt)}</td>`;
    }
    html += "</tr>";
  }
  html += "</table></div></section>";
});

writeFileSync(OUT, html, "utf8");
console.log(`ok: ${OUT} — ${TAB_ORDER.length} abas`);
