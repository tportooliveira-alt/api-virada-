"use client";

/**
 * Planilha Profissional — dashboard completo com visual de Google Sheets premium.
 * Dados reais do app, formatação de analista financeiro.
 */

import { useState, useMemo } from "react";
import { useVirada } from "@/providers/virada-provider";
import { ExpenseChart } from "@/components/ExpenseChart";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function pct(a: number, b: number) {
  if (b === 0) return "—";
  return ((a / b) * 100).toFixed(1) + "%";
}

// ─── Mini barra sparkline ─────────────────────────────────────────────────────
function Bar({ value, total, color }: { value: number; total: number; color: string }) {
  const w = total > 0 ? Math.max((value / total) * 100, 2) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-white/10">
      <div className="h-full rounded-full transition-all" style={{ width: `${w}%`, background: color }} />
    </div>
  );
}

// ─── Célula colorida ──────────────────────────────────────────────────────────
function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: color + "25", color }}>
      {label}
    </span>
  );
}

// ─── Tabela profissional ──────────────────────────────────────────────────────
function SheetTable({ headers, rows, totalsRow }: {
  headers: string[];
  rows: (string | number | JSX.Element)[][];
  totalsRow?: (string | number | JSX.Element)[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: "#0d1a2e" }}>
            {headers.map((h, i) => (
              <th key={i} className="whitespace-nowrap border border-white/10 px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-300">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white/[0.02]" : ""}>
              {row.map((cell, j) => (
                <td key={j} className="border border-white/[0.06] px-3 py-2 text-slate-300">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={headers.length} className="border border-white/[0.06] px-3 py-6 text-center text-slate-500">
                Nenhum dado registrado
              </td>
            </tr>
          )}
          {totalsRow && (
            <tr style={{ background: "#0d1a2e" }}>
              {totalsRow.map((cell, j) => (
                <td key={j} className="border border-white/20 px-3 py-2.5 text-sm font-bold text-white">
                  {cell}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Card KPI ─────────────────────────────────────────────────────────────────
function KPI({ label, value, sub, color, emoji }: { label: string; value: string; sub?: string; color: string; emoji: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: color + "30", background: color + "08" }}>
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>{label}</span>
        <span className="text-xl">{emoji}</span>
      </div>
      <p className="mt-2 text-2xl font-extrabold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

// ─── SVG Pie simples ──────────────────────────────────────────────────────────
const PIE_COLORS = ["#22C55E","#F5C542","#3B82F6","#EF4444","#A855F7","#F97316","#06B6D4","#EC4899"];

function MiniPie({ data }: { data: { value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  let angle = -Math.PI / 2;
  return (
    <svg viewBox="0 0 100 100" className="h-24 w-24">
      {data.map((d, i) => {
        if (total === 0 || d.value === 0) return null;
        const sweep = (d.value / total) * 2 * Math.PI;
        const x1 = 50 + 40 * Math.cos(angle);
        const y1 = 50 + 40 * Math.sin(angle);
        angle += sweep;
        const x2 = 50 + 40 * Math.cos(angle);
        const y2 = 50 + 40 * Math.sin(angle);
        const large = sweep > Math.PI ? 1 : 0;
        return (
          <path key={i}
            d={`M50 50 L${x1} ${y1} A40 40 0 ${large} 1 ${x2} ${y2} Z`}
            fill={PIE_COLORS[i % PIE_COLORS.length]}
            stroke="#07111F" strokeWidth="1.5"
          />
        );
      })}
      <circle cx="50" cy="50" r="22" fill="#07111F" />
    </svg>
  );
}

// ─── Abas da planilha ─────────────────────────────────────────────────────────
const TABS = [
  { key: "dashboard",  label: "📊 Dashboard",       color: "#22C55E" },
  { key: "lancamentos",label: "📋 Lançamentos",      color: "#3B82F6" },
  { key: "receitas",   label: "📥 Receitas",         color: "#10B981" },
  { key: "despesas",   label: "📤 Despesas",         color: "#EF4444" },
  { key: "dividas",    label: "🔴 Dívidas",          color: "#F97316" },
  { key: "metas",      label: "🎯 Metas",            color: "#A855F7" },
  { key: "fluxo",      label: "📈 Fluxo de Caixa",  color: "#06B6D4" },
  { key: "resumo",     label: "🗓️ Resumo Mensal",    color: "#F5C542" },
];

export default function PlanilhaDemoPage() {
  const data = useVirada();
  const [activeTab, setActiveTab] = useState("dashboard");

  const totalInc = data.incomes.reduce((s, i) => s + i.value, 0);
  const totalExp = data.expenses.reduce((s, e) => s + e.value, 0);
  const balance  = totalInc - totalExp;
  const totalDebt = data.debts.filter(d => d.status === "aberta").reduce((s, d) => s + d.totalValue, 0);
  const economia = totalInc > 0 ? ((totalInc - totalExp) / totalInc * 100).toFixed(1) : "0";

  // Gastos por categoria
  const expByCat = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of data.expenses) map[e.category] = (map[e.category] ?? 0) + e.value;
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [data.expenses]);

  // Receitas por categoria
  const incByCat = useMemo(() => {
    const map: Record<string, number> = {};
    for (const i of data.incomes) map[i.category] = (map[i.category] ?? 0) + i.value;
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [data.incomes]);

  // Fluxo por dia
  const byDate = useMemo(() => {
    const map = new Map<string, { inc: number; exp: number }>();
    for (const i of data.incomes)  { const d = i.date.split("T")[0]; const p = map.get(d) ?? { inc: 0, exp: 0 }; p.inc += i.value; map.set(d, p); }
    for (const e of data.expenses) { const d = e.date.split("T")[0]; const p = map.get(d) ?? { inc: 0, exp: 0 }; p.exp += e.value; map.set(d, p); }
    let acc = 0;
    return [...map.entries()].sort().map(([date, { inc, exp }]) => {
      acc += inc - exp;
      return { date, inc, exp, dia: inc - exp, acc };
    });
  }, [data.incomes, data.expenses]);

  // Resumo mensal
  const byMonth = useMemo(() => {
    const map = new Map<string, { inc: number; exp: number; count: number }>();
    for (const t of [...data.incomes, ...data.expenses]) {
      const m = t.date.slice(0, 7);
      const p = map.get(m) ?? { inc: 0, exp: 0, count: 0 };
      if ("paymentMethod" in t) p.exp += t.value; else p.inc += t.value;
      p.count++;
      map.set(m, p);
    }
    return [...map.entries()].sort();
  }, [data.incomes, data.expenses]);

  const renderContent = () => {
    switch (activeTab) {

      // ── DASHBOARD ──────────────────────────────────────────
      case "dashboard":
        return (
          <div className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <KPI label="Receitas" value={brl(totalInc)}  sub={`${data.incomes.length} lançamentos`} color="#22C55E" emoji="📥" />
              <KPI label="Gastos"   value={brl(totalExp)}  sub={`${data.expenses.length} lançamentos`} color="#EF4444" emoji="📤" />
              <KPI label="Saldo"    value={brl(balance)}   sub={balance >= 0 ? "✅ Positivo" : "⚠️ Negativo"} color={balance >= 0 ? "#3B82F6" : "#F97316"} emoji="💰" />
              <KPI label="Economia" value={economia + "%"} sub="do total de receitas" color="#A855F7" emoji="🏦" />
            </div>

            {/* Gráfico de gastos */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-4 text-sm font-bold text-white">📊 Onde está indo seu dinheiro</p>
              <ExpenseChart expenses={data.expenses} incomes={data.incomes} />
            </div>

            {/* Gastos por categoria */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-red-400">Gastos por Categoria</p>
                <div className="flex gap-4">
                  <MiniPie data={expByCat.map(([,v]) => ({ value: v }))} />
                  <div className="flex-1 space-y-2">
                    {expByCat.slice(0, 5).map(([cat, val], i) => (
                      <div key={cat}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <div className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i] }} />
                            <span className="text-slate-300">{cat}</span>
                          </div>
                          <span className="font-semibold text-white">{pct(val, totalExp)}</span>
                        </div>
                        <Bar value={val} total={totalExp} color={PIE_COLORS[i]} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex justify-between border-t border-white/10 pt-2 text-xs font-bold">
                  <span className="text-slate-400">Total</span>
                  <span className="text-red-300">{brl(totalExp)}</span>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-400">Receitas por Categoria</p>
                <div className="flex gap-4">
                  <MiniPie data={incByCat.map(([,v]) => ({ value: v }))} />
                  <div className="flex-1 space-y-2">
                    {incByCat.slice(0, 5).map(([cat, val], i) => (
                      <div key={cat}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <div className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i] }} />
                            <span className="text-slate-300">{cat}</span>
                          </div>
                          <span className="font-semibold text-white">{pct(val, totalInc)}</span>
                        </div>
                        <Bar value={val} total={totalInc} color={PIE_COLORS[i]} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex justify-between border-t border-white/10 pt-2 text-xs font-bold">
                  <span className="text-slate-400">Total</span>
                  <span className="text-emerald-300">{brl(totalInc)}</span>
                </div>
              </div>
            </div>

            {/* Status geral */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Status Geral</p>
              <div className="grid gap-2 text-xs">
                {[
                  { label: "Dívidas abertas", value: data.debts.filter(d=>d.status==="aberta").length, unit: "dívidas", color: totalDebt > 0 ? "#EF4444" : "#22C55E" },
                  { label: "Total em dívidas", value: brl(totalDebt), unit: "", color: totalDebt > 0 ? "#EF4444" : "#22C55E" },
                  { label: "Metas ativas", value: data.goals.length, unit: "metas", color: "#A855F7" },
                  { label: "Lançamentos", value: data.incomes.length + data.expenses.length, unit: "total", color: "#3B82F6" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                    <span className="text-slate-400">{item.label}</span>
                    <span className="font-bold" style={{ color: item.color }}>
                      {item.value}{item.unit ? " " + item.unit : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      // ── LANÇAMENTOS ────────────────────────────────────────
      case "lancamentos":
        return (
          <SheetTable
            headers={["Tipo","Descrição","Valor","Categoria","Data","Pagamento","Natureza","Escopo"]}
            rows={[
              ...data.expenses.map(e => [
                <Chip key="t" label="GASTO" color="#EF4444" />,
                e.description, brl(e.value), e.category, e.date,
                e.paymentMethod ?? "—", e.nature ?? "—", e.scope ?? "casa"
              ]),
              ...data.incomes.map(i => [
                <Chip key="t" label="RECEITA" color="#22C55E" />,
                i.description, brl(i.value), i.category, i.date, "—", "—", i.scope ?? "casa"
              ]),
            ]}
            totalsRow={[
              "TOTAL", `${data.expenses.length + data.incomes.length} registros`,
              <span key="t" className="text-blue-300">{brl(totalInc - totalExp)}</span>,
              "", "", "", "", ""
            ]}
          />
        );

      // ── RECEITAS ────────────────────────────────────────────
      case "receitas":
        return (
          <SheetTable
            headers={["Descrição","Valor","Categoria","Data","Escopo"]}
            rows={data.incomes.map(i => [i.description, <span key="v" className="font-semibold text-emerald-300">{brl(i.value)}</span>, i.category, i.date, i.scope ?? "casa"])}
            totalsRow={["TOTAL RECEITAS", <span key="t" className="text-emerald-300">{brl(totalInc)}</span>, `${data.incomes.length} registros`, "", ""]}
          />
        );

      // ── DESPESAS ────────────────────────────────────────────
      case "despesas":
        return (
          <SheetTable
            headers={["Descrição","Valor","Categoria","Data","Pagamento","Natureza"]}
            rows={data.expenses.map(e => [
              e.description,
              <span key="v" className="font-semibold text-red-300">{brl(e.value)}</span>,
              e.category, e.date,
              e.paymentMethod ?? "—",
              e.nature === "impulso"
                ? <Chip key="n" label="IMPULSO" color="#F97316" />
                : <Chip key="n" label="ESSENCIAL" color="#3B82F6" />,
            ])}
            totalsRow={["TOTAL GASTOS", <span key="t" className="text-red-300">{brl(totalExp)}</span>, `${data.expenses.length} registros`, "", "", ""]}
          />
        );

      // ── DÍVIDAS ─────────────────────────────────────────────
      case "dividas":
        return (
          <SheetTable
            headers={["Dívida","Valor Total","Parcela","Vencimento","Prioridade","Status"]}
            rows={data.debts.map(d => [
              d.name, brl(d.totalValue), brl(d.installmentValue), d.dueDate,
              d.priority === "alta" ? <Chip key="p" label="ALTA" color="#EF4444" /> : d.priority === "média" ? <Chip key="p" label="MÉDIA" color="#F97316" /> : <Chip key="p" label="BAIXA" color="#22C55E" />,
              d.status === "quitada" ? <Chip key="s" label="QUITADA" color="#22C55E" /> : d.status === "negociando" ? <Chip key="s" label="NEGOCIANDO" color="#F5C542" /> : <Chip key="s" label="ABERTA" color="#EF4444" />,
            ])}
            totalsRow={["TOTAL EM DÍVIDAS", <span key="t" className="text-red-300">{brl(totalDebt)}</span>, "", "", "", `${data.debts.filter(d=>d.status==="aberta").length} abertas`]}
          />
        );

      // ── METAS ───────────────────────────────────────────────
      case "metas":
        return (
          <SheetTable
            headers={["Meta","Valor Alvo","Valor Atual","Progresso","Faltando","Tipo"]}
            rows={data.goals.map(g => {
              const prog = g.targetValue > 0 ? (g.currentValue / g.targetValue * 100) : 0;
              const falta = Math.max(g.targetValue - g.currentValue, 0);
              return [
                g.name, brl(g.targetValue), brl(g.currentValue),
                <div key="p" className="flex items-center gap-2">
                  <div className="h-1.5 w-16 rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-purple-500" style={{ width: `${Math.min(prog, 100)}%` }} />
                  </div>
                  <span className="text-purple-300">{prog.toFixed(0)}%</span>
                </div>,
                <span key="f" className="text-slate-400">{brl(falta)}</span>,
                g.type,
              ];
            })}
          />
        );

      // ── FLUXO DE CAIXA ──────────────────────────────────────
      case "fluxo":
        return (
          <SheetTable
            headers={["Data","Entradas","Saídas","Saldo do Dia","Saldo Acumulado"]}
            rows={byDate.map(f => [
              f.date,
              f.inc > 0 ? <span key="i" className="font-semibold text-emerald-300">{brl(f.inc)}</span> : "—",
              f.exp > 0 ? <span key="e" className="font-semibold text-red-300">{brl(f.exp)}</span> : "—",
              <span key="d" className={f.dia >= 0 ? "text-emerald-300" : "text-red-300"}>{brl(f.dia)}</span>,
              <span key="a" className={`font-bold ${f.acc >= 0 ? "text-blue-300" : "text-orange-300"}`}>{brl(f.acc)}</span>,
            ])}
            totalsRow={["RESULTADO FINAL","","",<span key="r" className={balance>=0?"text-emerald-300":"text-red-300"}>{brl(balance)}</span>, ""]}
          />
        );

      // ── RESUMO MENSAL ────────────────────────────────────────
      case "resumo":
        return (
          <SheetTable
            headers={["Mês/Ano","Entradas","Saídas","Resultado","Lançamentos","Economia %"]}
            rows={byMonth.map(([month, { inc, exp, count }]) => {
              const result = inc - exp;
              const eco = inc > 0 ? (result / inc * 100) : 0;
              return [
                <span key="m" className="font-semibold text-white">{month}</span>,
                <span key="i" className="text-emerald-300">{brl(inc)}</span>,
                <span key="e" className="text-red-300">{brl(exp)}</span>,
                <span key="r" className={`font-bold ${result >= 0 ? "text-blue-300" : "text-orange-300"}`}>{brl(result)}</span>,
                count,
                <span key="p" className={eco >= 20 ? "text-emerald-300" : eco >= 0 ? "text-yellow-300" : "text-red-300"}>
                  {eco.toFixed(1)}%
                </span>,
              ];
            })}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header estilo Google Sheets */}
      <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/15">
              <span className="text-lg">📊</span>
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Google Planilhas — {data.user?.email}</p>
              <p className="text-sm font-semibold text-white">Virada Financeira — Dashboard Completo</p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold text-emerald-300">Ao vivo</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-semibold transition ${
              activeTab === tab.key
                ? "border-white/20 bg-slate-800 text-white shadow"
                : "border-white/[0.08] bg-white/[0.03] text-slate-500 hover:text-slate-300"
            }`}
          >
            <div className="h-2 w-2 rounded-full" style={{ background: tab.color }} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
        {renderContent()}
      </div>

      <p className="text-center text-[10px] text-slate-600">
        📊 Prévia exata da planilha que será criada no Google Drive do usuário ao sincronizar
      </p>
    </div>
  );
}
