"use client";

import { useState, useMemo } from "react";
import { FileSpreadsheet, Trash2, RotateCcw } from "lucide-react";
import { GoogleSyncButton } from "@/components/GoogleSyncButton";
import { useVirada } from "@/providers/virada-provider";
import type { Expense, Income } from "@/lib/types";

// ─── Formatadores ─────────────────────────────────────────────────────────────
function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function pct(a: number, b: number) {
  if (b === 0) return "—";
  return ((a / b) * 100).toFixed(1) + "%";
}
function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  const names = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${names[Number(mo) - 1]}/${y}`;
}

// ─── Cores ────────────────────────────────────────────────────────────────────
const COLORS = [
  "#22C55E","#3B82F6","#F5C542","#EF4444",
  "#A855F7","#F97316","#06B6D4","#EC4899",
  "#14B8A6","#84CC16","#F43F5E","#8B5CF6",
];

// ─── Chip colorido ────────────────────────────────────────────────────────────
function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ background: color + "22", color }}
    >
      {label}
    </span>
  );
}

// ─── Barra de progresso ───────────────────────────────────────────────────────
function Bar({ value, total, color }: { value: number; total: number; color: string }) {
  const w = total > 0 ? Math.max((value / total) * 100, 2) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-white/10">
      <div className="h-full rounded-full transition-all" style={{ width: `${w}%`, background: color }} />
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPI({
  label, value, sub, color, emoji,
}: { label: string; value: string; sub?: string; color: string; emoji: string }) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ borderColor: color + "33", background: color + "0a" }}
    >
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
          {label}
        </p>
        <span className="text-base">{emoji}</span>
      </div>
      <p className="mt-1.5 text-xl font-extrabold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

// ─── Gráfico de pizza SVG ─────────────────────────────────────────────────────
function PieChart({ slices }: { slices: { value: number; color: string; label: string }[] }) {
  const total = slices.reduce((s, d) => s + d.value, 0);
  let angle = -Math.PI / 2;
  return (
    <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0">
      {total === 0 ? (
        <circle cx="50" cy="50" r="40" fill="#1e293b" />
      ) : slices.map((d, i) => {
        if (d.value === 0) return null;
        const sweep = (d.value / total) * 2 * Math.PI;
        const x1 = 50 + 40 * Math.cos(angle);
        const y1 = 50 + 40 * Math.sin(angle);
        angle += sweep;
        const x2 = 50 + 40 * Math.cos(angle);
        const y2 = 50 + 40 * Math.sin(angle);
        const large = sweep > Math.PI ? 1 : 0;
        return (
          <path
            key={i}
            d={`M50 50 L${x1} ${y1} A40 40 0 ${large} 1 ${x2} ${y2} Z`}
            fill={d.color}
            stroke="#07111F"
            strokeWidth="1.5"
          />
        );
      })}
      <circle cx="50" cy="50" r="22" fill="#07111F" />
      {total > 0 && (
        <text x="50" y="55" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold">
          {slices.length}
        </text>
      )}
    </svg>
  );
}

// ─── Gráfico de barras mensal SVG ─────────────────────────────────────────────
function MonthBarChart({ data }: {
  data: { month: string; inc: number; exp: number }[];
}) {
  const maxVal = Math.max(...data.flatMap(d => [d.inc, d.exp]), 1);
  const barW = 12;
  const gap = 6;
  const groupW = barW * 2 + gap;
  const groupGap = 14;
  const totalW = data.length * (groupW + groupGap);
  const h = 80;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${Math.max(totalW, 200)} ${h + 30}`}
        className="w-full min-w-[200px]"
        style={{ height: h + 30 }}
      >
        {data.map((d, i) => {
          const x = i * (groupW + groupGap) + 4;
          const incH = (d.inc / maxVal) * h;
          const expH = (d.exp / maxVal) * h;
          return (
            <g key={d.month}>
              {/* barra receita */}
              <rect
                x={x} y={h - incH} width={barW} height={incH}
                rx="2" fill="#22C55E" opacity="0.9"
              />
              {/* barra gasto */}
              <rect
                x={x + barW + gap} y={h - expH} width={barW} height={expH}
                rx="2" fill="#EF4444" opacity="0.9"
              />
              {/* label */}
              <text
                x={x + barW + gap / 2} y={h + 18}
                textAnchor="middle" fill="#94a3b8" fontSize="7"
              >
                {d.month}
              </text>
            </g>
          );
        })}
        {/* legenda */}
        <g transform={`translate(${totalW - 80}, 4)`}>
          <rect width="8" height="8" rx="2" fill="#22C55E" />
          <text x="11" y="7.5" fill="#94a3b8" fontSize="7">Entradas</text>
          <rect y="12" width="8" height="8" rx="2" fill="#EF4444" />
          <text x="11" y="19.5" fill="#94a3b8" fontSize="7">Gastos</text>
        </g>
      </svg>
    </div>
  );
}

// ─── Tabela profissional ───────────────────────────────────────────────────────
function ProTable({
  headers, rows, totals,
}: {
  headers: string[];
  rows: (string | number | React.ReactNode)[][];
  totals?: (string | number | React.ReactNode)[];
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] py-10 text-center text-sm text-slate-500">
        Nenhum dado para exibir com os filtros aplicados
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
      <table className="w-full min-w-max text-xs">
        <thead>
          <tr className="bg-slate-900/80">
            {headers.map((h, i) => (
              <th
                key={i}
                className="border-b border-white/[0.08] px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white/[0.015]" : ""}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="border-b border-white/[0.04] px-3 py-2 text-slate-300 whitespace-nowrap"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {totals && (
          <tfoot>
            <tr className="bg-slate-900/80">
              {totals.map((cell, j) => (
                <td
                  key={j}
                  className="border-t border-white/[0.15] px-3 py-2.5 text-[11px] font-bold text-white whitespace-nowrap"
                >
                  {cell}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

// ─── Abas ─────────────────────────────────────────────────────────────────────
const TABS = [
  { key: "dashboard",   label: "Dashboard",      emoji: "📊" },
  { key: "lancamentos", label: "Lançamentos",     emoji: "📋" },
  { key: "receitas",    label: "Receitas",        emoji: "📥" },
  { key: "despesas",    label: "Despesas",        emoji: "📤" },
  { key: "dividas",     label: "Dívidas",         emoji: "🔴" },
  { key: "metas",       label: "Metas",           emoji: "🎯" },
  { key: "fluxo",       label: "Fluxo de Caixa", emoji: "📈" },
  { key: "mensal",      label: "Por Mês",         emoji: "🗓️" },
];

// ─── Linha de lançamento com ações ───────────────────────────────────────────
function TxRow({
  tx, tipo, onDelete, onEstorno,
}: {
  tx: Expense | Income;
  tipo: "GASTO" | "RECEITA";
  onDelete: () => void;
  onEstorno: () => void;
}) {
  const [confirm, setConfirm] = useState<"delete" | "estorno" | null>(null);
  const isExpense = tipo === "GASTO";

  return (
    <tr className="group">
      <td className="border-b border-white/[0.04] px-3 py-2 whitespace-nowrap">
        <Chip label={tipo} color={isExpense ? "#EF4444" : "#22C55E"} />
      </td>
      <td className="border-b border-white/[0.04] px-3 py-2 text-slate-300 max-w-[120px] truncate whitespace-nowrap">
        {tx.description}
      </td>
      <td className="border-b border-white/[0.04] px-3 py-2 whitespace-nowrap">
        <span className={`font-semibold ${isExpense ? "text-red-300" : "text-emerald-300"}`}>
          {brl(tx.value)}
        </span>
      </td>
      <td className="border-b border-white/[0.04] px-3 py-2 text-slate-400 whitespace-nowrap">{tx.category}</td>
      <td className="border-b border-white/[0.04] px-3 py-2 text-slate-400 whitespace-nowrap">{tx.date}</td>
      <td className="border-b border-white/[0.04] px-3 py-2 whitespace-nowrap">
        {"paymentMethod" in tx ? tx.paymentMethod : "—"}
      </td>
      <td className="border-b border-white/[0.04] px-3 py-2 whitespace-nowrap">
        {"nature" in tx && tx.nature === "impulso"
          ? <Chip label="Impulso" color="#F97316" />
          : "nature" in tx
          ? <Chip label="Essencial" color="#3B82F6" />
          : "—"}
      </td>
      <td className="border-b border-white/[0.04] px-3 py-2 whitespace-nowrap">
        {tx.scope ?? "casa"}
      </td>
      <td className="border-b border-white/[0.04] px-2 py-2 whitespace-nowrap">
        {confirm === null ? (
          <div className="flex gap-1">
            <button
              onClick={() => setConfirm("estorno")}
              title="Estornar (cria lançamento de reversão)"
              className="rounded p-1.5 text-slate-600 transition hover:bg-amber-500/10 hover:text-amber-300"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setConfirm("delete")}
              title="Excluir permanentemente"
              className="rounded p-1.5 text-slate-600 transition hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400">
              {confirm === "delete" ? "Excluir?" : "Estornar?"}
            </span>
            <button
              onClick={() => {
                if (confirm === "delete") {
                  onDelete();
                } else {
                  onEstorno();
                }
                setConfirm(null);
              }}
              className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-300 hover:bg-red-500/30"
            >
              Sim
            </button>
            <button
              onClick={() => setConfirm(null)}
              className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-white"
            >
              Não
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function EvolucaoPage() {
  const data = useVirada();
  const [tab, setTab] = useState("dashboard");
  const [monthFilter, setMonthFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "receita" | "gasto">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Meses disponíveis nos dados
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const e of data.expenses) set.add(e.date.slice(0, 7));
    for (const i of data.incomes)  set.add(i.date.slice(0, 7));
    return [...set].sort().reverse();
  }, [data.expenses, data.incomes]);

  // Categorias disponíveis
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    if (typeFilter !== "receita") for (const e of data.expenses) set.add(e.category);
    if (typeFilter !== "gasto")   for (const i of data.incomes)  set.add(i.category);
    return [...set].sort();
  }, [data.expenses, data.incomes, typeFilter]);

  // Dados filtrados
  const filteredExpenses = useMemo(() => {
    if (typeFilter === "receita") return [];
    return data.expenses.filter(e => {
      const okMonth = monthFilter === "all" || e.date.startsWith(monthFilter);
      const okCat   = categoryFilter === "all" || e.category === categoryFilter;
      return okMonth && okCat;
    });
  }, [data.expenses, monthFilter, typeFilter, categoryFilter]);

  const filteredIncomes = useMemo(() => {
    if (typeFilter === "gasto") return [];
    return data.incomes.filter(i => {
      const okMonth = monthFilter === "all" || i.date.startsWith(monthFilter);
      const okCat   = categoryFilter === "all" || i.category === categoryFilter;
      return okMonth && okCat;
    });
  }, [data.incomes, monthFilter, typeFilter, categoryFilter]);

  // Métricas
  const totalInc  = filteredIncomes.reduce((s, i) => s + i.value, 0);
  const totalExp  = filteredExpenses.reduce((s, e) => s + e.value, 0);
  const balance   = totalInc - totalExp;
  const ecoNum    = totalInc > 0 ? ((balance / totalInc) * 100) : 0;
  const impulsoTotal = filteredExpenses
    .filter(e => e.nature === "impulso")
    .reduce((s, e) => s + e.value, 0);

  // Gastos por categoria
  const expByCat = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of filteredExpenses) map[e.category] = (map[e.category] ?? 0) + e.value;
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredExpenses]);

  // Receitas por categoria
  const incByCat = useMemo(() => {
    const map: Record<string, number> = {};
    for (const i of filteredIncomes) map[i.category] = (map[i.category] ?? 0) + i.value;
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredIncomes]);

  // Fluxo por dia
  const byDate = useMemo(() => {
    const map = new Map<string, { inc: number; exp: number }>();
    for (const i of filteredIncomes) {
      const d = i.date.split("T")[0];
      const p = map.get(d) ?? { inc: 0, exp: 0 };
      p.inc += i.value;
      map.set(d, p);
    }
    for (const e of filteredExpenses) {
      const d = e.date.split("T")[0];
      const p = map.get(d) ?? { inc: 0, exp: 0 };
      p.exp += e.value;
      map.set(d, p);
    }
    let acc = 0;
    return [...map.entries()].sort().map(([date, { inc, exp }]) => {
      acc += inc - exp;
      return { date, inc, exp, dia: inc - exp, acc };
    });
  }, [filteredIncomes, filteredExpenses]);

  // Resumo mensal (todos os dados, sem filtro de mês)
  const byMonth = useMemo(() => {
    const map = new Map<string, { inc: number; exp: number; count: number }>();
    for (const i of data.incomes) {
      const m = i.date.slice(0, 7);
      const p = map.get(m) ?? { inc: 0, exp: 0, count: 0 };
      p.inc += i.value; p.count++;
      map.set(m, p);
    }
    for (const e of data.expenses) {
      const m = e.date.slice(0, 7);
      const p = map.get(m) ?? { inc: 0, exp: 0, count: 0 };
      p.exp += e.value; p.count++;
      map.set(m, p);
    }
    return [...map.entries()].sort();
  }, [data.incomes, data.expenses]);

  // Dívidas
  const openDebts = data.debts.filter(d => d.status !== "quitada");
  const totalDebt = openDebts.reduce((s, d) => s + d.totalValue, 0);

  // Reset categoria ao mudar tipo
  function handleTypeFilter(v: "all" | "receita" | "gasto") {
    setTypeFilter(v);
    setCategoryFilter("all");
  }

  // ─── Conteúdo das abas ────────────────────────────────────────────────────
  function renderTab() {
    switch (tab) {

      // ── DASHBOARD ──────────────────────────────────────────────────────────
      case "dashboard":
        return (
          <div className="space-y-5">
            {/* Gráfico de categorias */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Gastos por categoria */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-red-400">
                  Gastos por Categoria
                </p>
                {filteredExpenses.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-500">Sem gastos no período</p>
                ) : (
                  <div className="flex gap-4">
                    <PieChart
                      slices={expByCat.map(([, v], i) => ({
                        value: v, color: COLORS[i % COLORS.length], label: "",
                      }))}
                    />
                    <div className="flex-1 space-y-2">
                      {expByCat.slice(0, 6).map(([cat, val], i) => (
                        <div key={cat}>
                          <div className="mb-0.5 flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <div className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                              <span className="text-slate-300 truncate max-w-[80px]">{cat}</span>
                            </div>
                            <span className="font-semibold text-white shrink-0">{pct(val, totalExp)}</span>
                          </div>
                          <Bar value={val} total={totalExp} color={COLORS[i % COLORS.length]} />
                        </div>
                      ))}
                      <div className="mt-2 flex justify-between border-t border-white/10 pt-2 text-xs font-bold">
                        <span className="text-slate-500">Total</span>
                        <span className="text-red-300">{brl(totalExp)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Receitas por categoria */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  Receitas por Categoria
                </p>
                {filteredIncomes.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-500">Sem receitas no período</p>
                ) : (
                  <div className="flex gap-4">
                    <PieChart
                      slices={incByCat.map(([, v], i) => ({
                        value: v, color: COLORS[i % COLORS.length], label: "",
                      }))}
                    />
                    <div className="flex-1 space-y-2">
                      {incByCat.slice(0, 6).map(([cat, val], i) => (
                        <div key={cat}>
                          <div className="mb-0.5 flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <div className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                              <span className="text-slate-300 truncate max-w-[80px]">{cat}</span>
                            </div>
                            <span className="font-semibold text-white shrink-0">{pct(val, totalInc)}</span>
                          </div>
                          <Bar value={val} total={totalInc} color={COLORS[i % COLORS.length]} />
                        </div>
                      ))}
                      <div className="mt-2 flex justify-between border-t border-white/10 pt-2 text-xs font-bold">
                        <span className="text-slate-500">Total</span>
                        <span className="text-emerald-300">{brl(totalInc)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Gráfico mensal de barras */}
            {byMonth.length > 0 && (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Comparativo Mensal — Entradas vs Gastos
                </p>
                <MonthBarChart
                  data={byMonth.map(([m, { inc, exp }]) => ({
                    month: monthLabel(m), inc, exp,
                  }))}
                />
              </div>
            )}

            {/* Indicadores extras */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-center">
                <p className="text-[10px] text-slate-500">Gastos por Impulso</p>
                <p className="mt-1 text-base font-bold text-amber-300">{brl(impulsoTotal)}</p>
                <p className="text-[10px] text-slate-600">{pct(impulsoTotal, totalExp)} dos gastos</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-center">
                <p className="text-[10px] text-slate-500">Dívidas Abertas</p>
                <p className="mt-1 text-base font-bold text-red-300">{brl(totalDebt)}</p>
                <p className="text-[10px] text-slate-600">{openDebts.length} dívidas</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-center">
                <p className="text-[10px] text-slate-500">Lançamentos</p>
                <p className="mt-1 text-base font-bold text-blue-300">
                  {filteredIncomes.length + filteredExpenses.length}
                </p>
                <p className="text-[10px] text-slate-600">no período</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-center">
                <p className="text-[10px] text-slate-500">Metas Ativas</p>
                <p className="mt-1 text-base font-bold text-purple-300">{data.goals.length}</p>
                <p className="text-[10px] text-slate-600">em andamento</p>
              </div>
            </div>
          </div>
        );

      // ── LANÇAMENTOS ────────────────────────────────────────────────────────
      case "lancamentos": {
        const allTx = [
          ...filteredExpenses.sort((a, b) => b.date.localeCompare(a.date)).map(e => ({ tx: e as Expense | Income, tipo: "GASTO" as const })),
          ...filteredIncomes.sort((a, b) => b.date.localeCompare(a.date)).map(i => ({ tx: i as Expense | Income, tipo: "RECEITA" as const })),
        ].sort((a, b) => b.tx.date.localeCompare(a.tx.date));

        if (allTx.length === 0) {
          return (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] py-10 text-center text-sm text-slate-500">
              Nenhum dado para exibir com os filtros aplicados
            </div>
          );
        }

        return (
          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full min-w-max text-xs">
              <thead>
                <tr className="bg-slate-900/80">
                  {["Tipo","Descrição","Valor","Categoria","Data","Pagto","Natureza","Escopo","Ações"].map((h, i) => (
                    <th key={i} className="border-b border-white/[0.08] px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allTx.map(({ tx, tipo }) => (
                  <TxRow
                    key={tx.id}
                    tx={tx}
                    tipo={tipo}
                    onDelete={() => tipo === "GASTO" ? data.removeExpense(tx.id) : data.removeIncome(tx.id)}
                    onEstorno={() => data.estornar({ id: tx.id, type: tipo === "GASTO" ? "expense" : "income", description: tx.description, value: tx.value, category: tx.category, paymentMethod: (tx as Expense).paymentMethod, nature: (tx as Expense).nature, scope: tx.scope, date: tx.date })}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900/80">
                  <td className="border-t border-white/[0.15] px-3 py-2.5 text-[11px] font-bold text-white">TOTAL</td>
                  <td className="border-t border-white/[0.15] px-3 py-2.5 text-[11px] font-bold text-white">{allTx.length} registros</td>
                  <td className="border-t border-white/[0.15] px-3 py-2.5 text-[11px] font-bold">
                    <span className={balance >= 0 ? "text-emerald-300" : "text-red-300"}>{brl(balance)}</span>
                  </td>
                  {Array(6).fill(null).map((_, i) => <td key={i} className="border-t border-white/[0.15] px-3 py-2.5" />)}
                </tr>
              </tfoot>
            </table>
          </div>
        );
      }

      // ── RECEITAS ───────────────────────────────────────────────────────────
      case "receitas":
        return (
          <ProTable
            headers={["Descrição","Valor","Categoria","Data","Escopo"]}
            rows={filteredIncomes
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(i => [
                i.description,
                <span key="v" className="font-semibold text-emerald-300">{brl(i.value)}</span>,
                i.category, i.date, i.scope ?? "casa",
              ])}
            totals={[
              "TOTAL RECEITAS",
              <span key="t" className="text-emerald-300">{brl(totalInc)}</span>,
              `${filteredIncomes.length} registros`, "", "",
            ]}
          />
        );

      // ── DESPESAS ───────────────────────────────────────────────────────────
      case "despesas":
        return (
          <div className="space-y-4">
            {/* Mini resumo despesas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                <p className="text-[10px] text-slate-500">Total Essencial</p>
                <p className="mt-1 font-bold text-blue-300">
                  {brl(filteredExpenses.filter(e => e.nature === "essencial").reduce((s, e) => s + e.value, 0))}
                </p>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <p className="text-[10px] text-slate-500">Total Impulso</p>
                <p className="mt-1 font-bold text-amber-300">{brl(impulsoTotal)}</p>
              </div>
            </div>
            <ProTable
              headers={["Descrição","Valor","Categoria","Data","Pagto","Natureza","Escopo"]}
              rows={filteredExpenses
                .sort((a, b) => b.date.localeCompare(a.date))
                .map(e => [
                  e.description,
                  <span key="v" className="font-semibold text-red-300">{brl(e.value)}</span>,
                  e.category, e.date, e.paymentMethod,
                  e.nature === "impulso"
                    ? <Chip key="n" label="Impulso" color="#F97316" />
                    : <Chip key="n" label="Essencial" color="#3B82F6" />,
                  e.scope ?? "casa",
                ])}
              totals={[
                "TOTAL GASTOS",
                <span key="t" className="text-red-300">{brl(totalExp)}</span>,
                `${filteredExpenses.length} registros`, "", "", "", "",
              ]}
            />
          </div>
        );

      // ── DÍVIDAS ────────────────────────────────────────────────────────────
      case "dividas":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Abertas", val: data.debts.filter(d=>d.status==="aberta").length, color: "#EF4444" },
                { label: "Negociando", val: data.debts.filter(d=>d.status==="negociando").length, color: "#F5C542" },
                { label: "Quitadas", val: data.debts.filter(d=>d.status==="quitada").length, color: "#22C55E" },
              ].map(item => (
                <div key={item.label} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-center">
                  <p className="text-[10px] text-slate-500">{item.label}</p>
                  <p className="mt-1 text-lg font-bold" style={{ color: item.color }}>{item.val}</p>
                </div>
              ))}
            </div>
            <ProTable
              headers={["Dívida","Total","Parcela","Vencimento","Prioridade","Status","Ação"]}
              rows={data.debts.map(d => [
                d.name,
                brl(d.totalValue),
                brl(d.installmentValue),
                d.dueDate,
                d.priority === "alta"
                  ? <Chip key="p" label="Alta" color="#EF4444" />
                  : d.priority === "média"
                  ? <Chip key="p" label="Média" color="#F97316" />
                  : <Chip key="p" label="Baixa" color="#22C55E" />,
                d.status === "quitada"
                  ? <Chip key="s" label="Quitada" color="#22C55E" />
                  : d.status === "negociando"
                  ? <Chip key="s" label="Negociando" color="#F5C542" />
                  : <Chip key="s" label="Aberta" color="#EF4444" />,
                <button
                  key="del"
                  onClick={() => { if (window.confirm("Excluir esta dívida?")) void data.removeDebt(d.id); }}
                  className="rounded p-1 text-slate-600 transition hover:bg-red-500/10 hover:text-red-400"
                  title="Excluir dívida"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>,
              ])}
              totals={[
                "TOTAL ABERTO",
                <span key="t" className="text-red-300">{brl(totalDebt)}</span>,
                "", "", "", `${openDebts.length} abertas`, "",
              ]}
            />
          </div>
        );

      // ── METAS ──────────────────────────────────────────────────────────────
      case "metas":
        return (
          <ProTable
            headers={["Meta","Alvo","Atual","Progresso","Faltando","Tipo","Ação"]}
            rows={data.goals.map(g => {
              const prog = g.targetValue > 0 ? (g.currentValue / g.targetValue * 100) : 0;
              const falta = Math.max(g.targetValue - g.currentValue, 0);
              return [
                g.name,
                brl(g.targetValue),
                <span key="a" className="text-emerald-300">{brl(g.currentValue)}</span>,
                <div key="p" className="flex items-center gap-2 min-w-[80px]">
                  <div className="h-1.5 flex-1 rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-purple-500"
                      style={{ width: `${Math.min(prog, 100)}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-purple-300 text-[10px]">{prog.toFixed(0)}%</span>
                </div>,
                <span key="f" className="text-slate-400">{brl(falta)}</span>,
                g.type,
                <button
                  key="del"
                  onClick={() => { if (window.confirm("Excluir esta meta?")) void data.removeGoal(g.id); }}
                  className="rounded p-1 text-slate-600 transition hover:bg-red-500/10 hover:text-red-400"
                  title="Excluir meta"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>,
              ];
            })}
          />
        );

      // ── FLUXO DE CAIXA ─────────────────────────────────────────────────────
      case "fluxo":
        return (
          <ProTable
            headers={["Data","Entradas","Saídas","Resultado do Dia","Saldo Acumulado"]}
            rows={byDate.map(f => [
              f.date,
              f.inc > 0
                ? <span key="i" className="font-semibold text-emerald-300">{brl(f.inc)}</span>
                : <span key="i" className="text-slate-600">—</span>,
              f.exp > 0
                ? <span key="e" className="font-semibold text-red-300">{brl(f.exp)}</span>
                : <span key="e" className="text-slate-600">—</span>,
              <span key="d" className={f.dia >= 0 ? "font-semibold text-emerald-300" : "font-semibold text-red-300"}>
                {brl(f.dia)}
              </span>,
              <span key="a" className={`font-bold ${f.acc >= 0 ? "text-blue-300" : "text-orange-300"}`}>
                {brl(f.acc)}
              </span>,
            ])}
            totals={[
              "RESULTADO FINAL", "", "",
              <span key="r" className={balance >= 0 ? "text-emerald-300" : "text-red-300"}>
                {brl(balance)}
              </span>,
              "",
            ]}
          />
        );

      // ── RESUMO MENSAL ──────────────────────────────────────────────────────
      case "mensal":
        return (
          <div className="space-y-4">
            {byMonth.length > 0 && (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Evolução Mensal
                </p>
                <MonthBarChart
                  data={byMonth.map(([m, { inc, exp }]) => ({
                    month: monthLabel(m), inc, exp,
                  }))}
                />
              </div>
            )}
            <ProTable
              headers={["Mês","Entradas","Gastos","Resultado","Lançamentos","Economia"]}
              rows={byMonth.map(([month, { inc, exp, count }]) => {
                const result = inc - exp;
                const eco = inc > 0 ? (result / inc * 100) : 0;
                return [
                  <span key="m" className="font-semibold text-white">{monthLabel(month)}</span>,
                  <span key="i" className="text-emerald-300">{brl(inc)}</span>,
                  <span key="e" className="text-red-300">{brl(exp)}</span>,
                  <span key="r" className={`font-bold ${result >= 0 ? "text-blue-300" : "text-orange-300"}`}>
                    {brl(result)}
                  </span>,
                  <span key="c" className="text-slate-400">{count}</span>,
                  <span key="p" className={eco >= 20 ? "text-emerald-300" : eco >= 0 ? "text-yellow-300" : "text-red-300"}>
                    {eco.toFixed(1)}%
                  </span>,
                ];
              })}
            />
          </div>
        );

      default:
        return null;
    }
  }

  const isFiltered = monthFilter !== "all" || typeFilter !== "all" || categoryFilter !== "all";

  return (
    <div className="space-y-4 pb-6">

      {/* ── Google Sync ─────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              Google Planilhas
            </p>
            <p className="text-sm font-semibold text-white">Sincronizar com 1 clique</p>
          </div>
          <a
            href="/app/planilha-demo"
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400 transition hover:text-white"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Ver prévia
          </a>
        </div>
        <GoogleSyncButton
          expenses={data.expenses}
          incomes={data.incomes}
          debts={data.debts}
          goals={data.goals}
          userEmail={data.user?.email ?? "usuario"}
        />
      </section>

      {/* ── Filtros ─────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Filtros
          </p>
          {isFiltered && (
            <button
              onClick={() => { setMonthFilter("all"); setTypeFilter("all"); setCategoryFilter("all"); }}
              className="text-[10px] text-slate-500 hover:text-red-400 transition"
            >
              ✕ Limpar filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Mês */}
          <label className="grid gap-1">
            <span className="text-[10px] text-slate-500">Período</span>
            <select
              value={monthFilter}
              onChange={e => setMonthFilter(e.target.value)}
              className="rounded-xl border border-white/[0.08] bg-slate-900 px-3 py-2 text-xs text-white outline-none"
            >
              <option value="all">Todos os meses</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </select>
          </label>

          {/* Tipo */}
          <label className="grid gap-1">
            <span className="text-[10px] text-slate-500">Tipo</span>
            <select
              value={typeFilter}
              onChange={e => handleTypeFilter(e.target.value as "all" | "receita" | "gasto")}
              className="rounded-xl border border-white/[0.08] bg-slate-900 px-3 py-2 text-xs text-white outline-none"
            >
              <option value="all">Todos</option>
              <option value="receita">Receitas</option>
              <option value="gasto">Gastos</option>
            </select>
          </label>

          {/* Categoria */}
          <label className="grid gap-1">
            <span className="text-[10px] text-slate-500">Categoria</span>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-white/[0.08] bg-slate-900 px-3 py-2 text-xs text-white outline-none"
            >
              <option value="all">Todas as categorias</option>
              {availableCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>

        {isFiltered && (
          <p className="mt-2 text-[10px] text-amber-400">
            ⚠️ Filtros ativos — os dados exibidos são parciais
          </p>
        )}
      </section>

      {/* ── KPIs ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <KPI label="Receitas" value={brl(totalInc)} sub={`${filteredIncomes.length} lançamentos`} color="#22C55E" emoji="📥" />
        <KPI label="Gastos" value={brl(totalExp)} sub={`${filteredExpenses.length} lançamentos`} color="#EF4444" emoji="📤" />
        <KPI
          label="Saldo"
          value={brl(balance)}
          sub={balance >= 0 ? "✅ Positivo" : "⚠️ Negativo"}
          color={balance >= 0 ? "#3B82F6" : "#F97316"}
          emoji="💰"
        />
        <KPI
          label="Economia"
          value={`${Math.max(0, ecoNum).toFixed(1)}%`}
          sub="do total de receitas"
          color="#A855F7"
          emoji="🏦"
        />
      </div>

      {/* ── Abas da planilha ────────────────────────────────────────── */}
      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03]">
        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto border-b border-white/[0.06] p-2 pb-0">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-t-lg border-b-2 px-3 py-2 text-[11px] font-semibold transition ${
                tab === t.key
                  ? "border-emerald-400 bg-white/[0.04] text-white"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              <span>{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="p-4">
          {renderTab()}
        </div>
      </section>

    </div>
  );
}
