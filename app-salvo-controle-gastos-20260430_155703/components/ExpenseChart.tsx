"use client";

/**
 * ExpenseChart — gráfico leve de gastos.
 * 100% SVG + CSS. Zero dependências externas.
 * Peso: ~3 KB vs 390 KB do recharts.
 */

import { useMemo, useState } from "react";

type Expense = { category: string; value: number; date: string; nature?: string };
type Income  = { value: number; date: string };

interface Props {
  expenses: Expense[];
  incomes:  Income[];
}

const COLORS = [
  "#22C55E","#F5C542","#3B82F6","#EF4444",
  "#A855F7","#F97316","#06B6D4","#EC4899",
  "#84CC16","#14B8A6","#6366F1","#D97706",
];

const PERIODS = [
  { key: "mes",  label: "Mês" },
  { key: "30d",  label: "30d" },
  { key: "7d",   label: "7d"  },
  { key: "ano",  label: "Ano" },
  { key: "all",  label: "Tudo"},
];

const NATURES = [
  { key: "all",      label: "Todos"    },
  { key: "essencial",label: "Essencial"},
  { key: "impulso",  label: "Impulso"  },
];

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function filterPeriod<T extends { date: string }>(items: T[], period: string): T[] {
  const now = Date.now();
  return items.filter((i) => {
    const d = new Date(i.date).getTime();
    if (period === "7d")  return now - d <= 7  * 864e5;
    if (period === "30d") return now - d <= 30 * 864e5;
    if (period === "mes") {
      const dt = new Date(i.date);
      const n  = new Date();
      return dt.getMonth() === n.getMonth() && dt.getFullYear() === n.getFullYear();
    }
    if (period === "ano") return new Date(i.date).getFullYear() === new Date().getFullYear();
    return true;
  });
}

// ─── Mini gráfico de barras SVG ───────────────────────────────────────────────

interface BarChartProps {
  data:   { name: string; value: number; color: string }[];
  total:  number;
}

function BarChartSVG({ data, total }: BarChartProps) {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map((d) => d.value));
  const W = 300; const BAR_H = 18; const GAP = 6;
  const svgH = data.length * (BAR_H + GAP);

  return (
    <svg viewBox={`0 0 ${W} ${svgH}`} className="w-full" style={{ height: svgH }}>
      {data.map((d, i) => {
        const barW = maxVal > 0 ? (d.value / maxVal) * (W - 90) : 0;
        const y = i * (BAR_H + GAP);
        const pct = total > 0 ? ((d.value / total) * 100).toFixed(0) : "0";
        return (
          <g key={d.name}>
            {/* barra */}
            <rect x={0} y={y} width={Math.max(barW, 2)} height={BAR_H}
              rx={4} fill={d.color} opacity={0.85} />
            {/* rótulo à direita */}
            <text x={barW + 6} y={y + BAR_H / 2 + 5}
              fontSize="10" fill="#CBD5E1" dominantBaseline="middle">
              {pct}% {d.name.length > 10 ? d.name.slice(0, 9) + "…" : d.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Mini gráfico de pizza SVG ────────────────────────────────────────────────

interface PieProps { data: { value: number; color: string }[]; total: number }

function PieSVG({ data, total }: PieProps) {
  const R = 60; const CX = 70; const CY = 70;
  let startAngle = -Math.PI / 2;
  const slices = data.map((d) => {
    const angle = total > 0 ? (d.value / total) * 2 * Math.PI : 0;
    const x1 = CX + R * Math.cos(startAngle);
    const y1 = CY + R * Math.sin(startAngle);
    startAngle += angle;
    const x2 = CX + R * Math.cos(startAngle);
    const y2 = CY + R * Math.sin(startAngle);
    const large = angle > Math.PI ? 1 : 0;
    return { ...d, x1, y1, x2, y2, large, angle };
  });
  return (
    <svg viewBox="0 0 140 140" className="h-32 w-32 shrink-0">
      {slices.filter((s) => s.angle > 0.01).map((s, i) => (
        <path key={i}
          d={`M ${CX} ${CY} L ${s.x1} ${s.y1} A ${R} ${R} 0 ${s.large} 1 ${s.x2} ${s.y2} Z`}
          fill={s.color} stroke="#07111F" strokeWidth="2"
        />
      ))}
      {/* donut hole */}
      <circle cx={CX} cy={CY} r={36} fill="#0B1020" />
    </svg>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ExpenseChart({ expenses, incomes }: Props) {
  const [period, setPeriod] = useState("mes");
  const [nature, setNature] = useState("all");

  const filteredExp = useMemo(() => {
    let list = filterPeriod(expenses, period);
    if (nature !== "all") list = list.filter((e) => e.nature === nature);
    return list;
  }, [expenses, period, nature]);

  const filteredInc = useMemo(() => filterPeriod(incomes, period), [incomes, period]);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of filteredExp) map[e.category] = (map[e.category] ?? 0) + e.value;
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));
  }, [filteredExp]);

  const totalExp = filteredExp.reduce((s, e) => s + e.value, 0);
  const totalInc = filteredInc.reduce((s, i) => s + i.value, 0);
  const balance  = totalInc - totalExp;

  if (expenses.length === 0 && incomes.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
        Nenhum lançamento ainda. Toque em <strong className="text-white">Lançar</strong>.
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Cards resumo */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-emerald-500/10 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-emerald-400">Entradas</p>
          <p className="mt-1 text-sm font-bold text-emerald-300">{brl(totalInc)}</p>
        </div>
        <div className="rounded-xl bg-red-500/10 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-red-400">Saídas</p>
          <p className="mt-1 text-sm font-bold text-red-300">{brl(totalExp)}</p>
        </div>
        <div className={`rounded-xl p-3 text-center ${balance >= 0 ? "bg-blue-500/10" : "bg-orange-500/10"}`}>
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Saldo</p>
          <p className={`mt-1 text-sm font-bold ${balance >= 0 ? "text-blue-300" : "text-orange-300"}`}>
            {brl(balance)}
          </p>
        </div>
      </div>

      {/* Filtros de período */}
      <div className="flex gap-1 rounded-xl bg-white/5 p-1">
        {PERIODS.map((p) => (
          <button key={p.key} onClick={() => setPeriod(p.key)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition
              ${period === p.key ? "bg-emerald-500 text-slate-950" : "text-slate-400"}`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Filtros de natureza */}
      <div className="flex gap-1 rounded-xl bg-white/5 p-1">
        {NATURES.map((n) => (
          <button key={n.key} onClick={() => setNature(n.key)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition
              ${nature === n.key ? "bg-amber-400 text-slate-950" : "text-slate-400"}`}>
            {n.label}
          </button>
        ))}
      </div>

      {byCategory.length === 0 ? (
        <p className="text-center text-sm text-slate-400">Nenhum gasto neste período.</p>
      ) : (
        <>
          {/* Pizza + Legenda */}
          <div className="flex items-center gap-4">
            <PieSVG data={byCategory} total={totalExp} />
            <div className="flex-1 space-y-1.5">
              {byCategory.slice(0, 6).map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.color }} />
                  <span className="flex-1 truncate text-xs text-slate-300">{d.name}</span>
                  <span className="shrink-0 text-xs font-bold text-white">
                    {totalExp > 0 ? ((d.value / totalExp) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Barras horizontais */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              💸 Pra onde foi
            </p>
            <BarChartSVG data={byCategory} total={totalExp} />
          </div>

          {/* Ranking com barra de progresso CSS */}
          <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Maior gasto do período
            </p>
            {byCategory.slice(0, 5).map((d, i) => {
              const pct = totalExp > 0 ? (d.value / totalExp) * 100 : 0;
              return (
                <div key={d.name}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-slate-300 flex items-center gap-1">
                      {i === 0 && <span className="text-[10px] rounded bg-red-500/20 px-1 text-red-400">MAIOR</span>}
                      {d.name}
                    </span>
                    <span className="font-semibold text-white">{brl(d.value)}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: d.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
