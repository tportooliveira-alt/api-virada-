"use client";

/**
 * ExpenseChart — análise de gastos.
 * 100% SVG + CSS. Zero dependências externas.
 */

import { useMemo, useState } from "react";
import { semEstornados } from "@/lib/types";
import { groupTopCategories, inPeriod, roundMoney, type Period } from "@/lib/utils";

type Expense = { category: string; value: number; date: string; nature?: string; estornadoEm?: string };
type Income  = { value: number; date: string; estornadoEm?: string };
type Nature  = "all" | "essencial" | "impulso";

interface Props {
  expenses: Expense[];
  incomes:  Income[];
  /** Período inicial (padrão "mes"). Existe pra teste renderizar cada período sem clique. */
  defaultPeriod?: Period;
  /** Filtro de natureza inicial (padrão "all"). Idem. */
  defaultNature?: Nature;
}

// Paleta de gráfico do design system (--chart-1..10 em globals.css)
const CHART_COLORS = Array.from({ length: 10 }, (_, i) => `var(--chart-${i + 1})`);

const PERIODS: { key: Period; label: string }[] = [
  { key: "mes",  label: "Mês" },
  { key: "30d",  label: "30d" },
  { key: "7d",   label: "7d"  },
  { key: "ano",  label: "Ano" },
  { key: "all",  label: "Tudo"},
];

const NATURES: { key: Nature; label: string }[] = [
  { key: "all",      label: "Todos"    },
  { key: "essencial",label: "Essencial"},
  { key: "impulso",  label: "Impulso"  },
];

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Donut SVG (R=64, furo 46, total no centro) ──────────────────────────────

interface DonutProps { data: { value: number; color: string }[]; total: number; label: string }

function Donut({ data, total, label }: DonutProps) {
  const R = 64; const C = 70;
  const nonZero = data.filter((d) => d.value > 0);
  let angle = -Math.PI / 2;
  const slices = nonZero.map((d) => {
    const a = total > 0 ? (d.value / total) * 2 * Math.PI : 0;
    const x1 = C + R * Math.cos(angle);
    const y1 = C + R * Math.sin(angle);
    angle += a;
    const x2 = C + R * Math.cos(angle);
    const y2 = C + R * Math.sin(angle);
    return { color: d.color, a, d: `M ${C} ${C} L ${x1} ${y1} A ${R} ${R} 0 ${a > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z` };
  });

  return (
    <div className="relative h-[150px] w-[150px] shrink-0">
      <svg viewBox="0 0 140 140" className="h-full w-full">
        {nonZero.length === 1 ? (
          <circle cx={C} cy={C} r={R} fill={nonZero[0].color} />
        ) : (
          slices.filter((s) => s.a > 0.01).map((s, i) => (
            <path key={i} d={s.d} fill={s.color} stroke="#fff" strokeWidth="2" />
          ))
        )}
        <circle cx={C} cy={C} r={46} fill="#fff" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-400">{label}</p>
          <p className="money mt-0.5 font-display text-[15px] font-bold text-ink-900">{brl(total)}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ExpenseChart({ expenses, incomes, defaultPeriod = "mes", defaultNature = "all" }: Props) {
  const [period, setPeriod] = useState<Period>(defaultPeriod);
  const [nature, setNature] = useState<Nature>(defaultNature);

  const { byCategory, totalOut, totalIn, natureTotal } = useMemo(() => {
    // Estornado fica fora de todo total (contrato em lib/types.ts).
    const exp = semEstornados(expenses).filter((e) => inPeriod(e.date, period));
    const inc = semEstornados(incomes).filter((i) => inPeriod(i.date, period));
    // O chip Essencial/Impulso filtra só o donut/ranking: os cards Entradas/Saídas/Saldo
    // são do período inteiro, senão "Impulso" mostrava saldo de R$ 2.700 pra quem tem R$ 200.
    const expNature = exp.filter((e) => nature === "all" || e.nature === nature);
    const byCategory = groupTopCategories(expNature, 8).map((c, i) => ({ ...c, color: CHART_COLORS[i % CHART_COLORS.length] }));
    return {
      byCategory,
      totalOut:    roundMoney(exp.reduce((s, e) => s + e.value, 0)),
      totalIn:     roundMoney(inc.reduce((s, e) => s + e.value, 0)),
      natureTotal: roundMoney(expNature.reduce((s, e) => s + e.value, 0)),
    };
  }, [expenses, incomes, period, nature]);

  const balance = roundMoney(totalIn - totalOut);
  const hasAny = expenses.length > 0 || incomes.length > 0;
  const natureLabel = NATURES.find((n) => n.key === nature)?.label ?? "Todos";

  return (
    <div className="flex flex-col gap-[18px]">
      {/* Período */}
      <div className="flex gap-0.5 rounded-[10px] bg-ink-100 p-1" role="tablist" aria-label="Período">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            role="tab"
            aria-selected={period === p.key}
            onClick={() => setPeriod(p.key)}
            className={`flex-1 rounded-[7px] py-[7px] text-xs font-semibold transition-colors duration-150 ${
              period === p.key ? "bg-white text-ink-900 shadow-segment" : "text-ink-500 hover:text-ink-700"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Entradas / Saídas / Saldo — do período inteiro, sem o filtro de natureza */}
      <div className="grid grid-cols-3 gap-2">
        <div className="min-w-0 rounded-[10px] bg-green-50 px-2.5 py-2.5 sm:px-3">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-green-700">Entradas</p>
          <p className="money mt-1 text-sm font-bold text-green-800">{brl(totalIn)}</p>
        </div>
        <div className="min-w-0 rounded-[10px] bg-red-50 px-2.5 py-2.5 sm:px-3">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-red-700">Saídas</p>
          <p className="money mt-1 text-sm font-bold text-[#991B1B]">{brl(totalOut)}</p>
        </div>
        <div className={`min-w-0 rounded-[10px] px-2.5 py-2.5 sm:px-3 ${balance >= 0 ? "bg-blue-50" : "bg-[#FFF7ED]"}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-600">Saldo</p>
          <p className={`money mt-1 text-sm font-bold ${balance >= 0 ? "text-blue-700" : "text-[#C2410C]"}`}>{brl(balance)}</p>
        </div>
      </div>

      {/* Tipo de gasto — filtra o donut e o ranking abaixo */}
      <div className="flex flex-wrap gap-2">
        {NATURES.map((n) => (
          <button
            key={n.key}
            type="button"
            aria-pressed={nature === n.key}
            onClick={() => setNature(n.key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
              nature === n.key
                ? "border-ink-900 bg-ink-900 text-white"
                : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50"
            }`}
          >
            {n.label}
          </button>
        ))}
      </div>

      {byCategory.length === 0 ? (
        <p className="rounded-xl bg-ink-50 p-4 text-sm text-ink-500">
          {!hasAny
            ? "Nenhum lançamento ainda. Toque em Lançar."
            : nature === "all"
              ? "Nenhum gasto neste período."
              : `Nenhum gasto ${nature === "impulso" ? "por impulso" : "essencial"} neste período.`}
        </p>
      ) : (
        <>
          {/* Donut + legenda (todas as fatias: os % somam 100) */}
          <div className="flex flex-wrap items-center gap-5">
            <Donut data={byCategory} total={natureTotal} label={nature === "all" ? "Saídas" : natureLabel} />
            <div className="flex min-w-[160px] flex-1 flex-col gap-2">
              {byCategory.map((c) => (
                <div key={c.name} className="flex items-center gap-2.5 text-[13px] text-ink-700">
                  <i className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: c.color }} />
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <span className="money text-xs text-ink-400">{brl(c.value)}</span>
                  <b className="w-[38px] text-right tabular-nums text-ink-900">{c.pct}%</b>
                </div>
              ))}
            </div>
          </div>

          {/* Ranking */}
          <div className="flex flex-col gap-3 border-t border-ink-100 pt-[18px]">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">Maior gasto do período</p>
            {byCategory.slice(0, 5).map((c, i) => (
              <div key={c.name}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-[13px] text-ink-700">
                  <span className="flex min-w-0 items-center">
                    <span className="truncate">{c.name}</span>
                    {i === 0 && (
                      <span className="ml-2 shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold tracking-[0.06em] text-red-700">
                        MAIOR
                      </span>
                    )}
                  </span>
                  <strong className="money shrink-0 text-ink-900">{brl(c.value)}</strong>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
                  <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: c.color }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
