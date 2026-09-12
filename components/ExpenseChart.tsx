"use client";

/**
 * ExpenseChart — análise de gastos.
 * 100% SVG + CSS. Zero dependências externas.
 * O período vem do pai ("AAAA-MM" ou "all") — o seletor de período mora na tela.
 */

import { useMemo, useState } from "react";
import { semEstornados } from "@/lib/types";
import { groupTopCategories, inPeriod, roundMoney, type Period } from "@/lib/utils";

type Expense = { category: string; value: number; date: string; nature?: string; estornadoEm?: string };
type Income  = { value: number; date: string; estornadoEm?: string };
export type ChartNature = "all" | "essencial" | "impulso";

interface Props {
  expenses: Expense[];
  incomes:  Income[];
  /** "AAAA-MM" (um mês), "all" (tudo) ou um Period de lib/utils. Padrão: mês corrente. */
  period?: string;
  /** Mesmo papel de `period`; nome antigo mantido pros testes que renderizam "7d"/"30d". */
  defaultPeriod?: Period;
  /** Filtro de natureza: controlado pelo pai (nature + onNatureChange) ou interno. */
  nature?: ChartNature;
  onNatureChange?: (nature: ChartNature) => void;
  defaultNature?: ChartNature;
  /** Com onSelectCategory a legenda vira botão: toque marca/desmarca a categoria. */
  selectedCategory?: string | null;
  onSelectCategory?: (category: string | null) => void;
  /** false = sem os cards Entradas/Saídas/Saldo (a tela já mostra os seus). */
  showTotals?: boolean;
}

// Paleta de gráfico do design system (--chart-1..10 em globals.css)
const CHART_COLORS = Array.from({ length: 10 }, (_, i) => `var(--chart-${i + 1})`);

const NATURES: { key: ChartNature; label: string }[] = [
  { key: "all",      label: "Todos"    },
  { key: "essencial",label: "Essencial"},
  { key: "impulso",  label: "Impulso"  },
];

const MONTH_KEY = /^\d{4}-\d{2}$/;

// "AAAA-MM" → inPeriod "mes" ancorado no dia 1º daquele mês; o resto é um Period.
function noPeriodo(date: string, period: string) {
  if (MONTH_KEY.test(period)) return inPeriod(date, "mes", `${period}-01`);
  return inPeriod(date, period as Period);
}

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

export function ExpenseChart({
  expenses,
  incomes,
  period,
  defaultPeriod = "mes",
  nature: natureProp,
  onNatureChange,
  defaultNature = "all",
  selectedCategory = null,
  onSelectCategory,
  showTotals = true,
}: Props) {
  const activePeriod = period ?? defaultPeriod;
  const [ownNature, setOwnNature] = useState<ChartNature>(defaultNature);
  const nature = natureProp ?? ownNature;
  function setNature(next: ChartNature) {
    setOwnNature(next);
    onNatureChange?.(next);
  }

  const { byCategory, totalOut, totalIn, natureTotal } = useMemo(() => {
    // Estornado fica fora de todo total (contrato em lib/types.ts).
    const exp = semEstornados(expenses).filter((e) => noPeriodo(e.date, activePeriod));
    const inc = semEstornados(incomes).filter((i) => noPeriodo(i.date, activePeriod));
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
  }, [expenses, incomes, activePeriod, nature]);

  const balance = roundMoney(totalIn - totalOut);
  const hasAny = expenses.length > 0 || incomes.length > 0;
  const natureLabel = NATURES.find((n) => n.key === nature)?.label ?? "Todos";
  const periodoLabel = MONTH_KEY.test(activePeriod) ? "neste mês" : "neste período";

  return (
    <div className="flex flex-col gap-[18px]">
      {/* Entradas / Saídas / Saldo — do período inteiro, sem o filtro de natureza */}
      {showTotals && (
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
      )}

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
              ? `Nenhum gasto ${periodoLabel}.`
              : `Nenhum gasto ${nature === "impulso" ? "por impulso" : "essencial"} ${periodoLabel}.`}
        </p>
      ) : (
        <>
          {/* Donut + legenda (todas as fatias: os % somam 100). Em tela estreita a legenda
              fica ABAIXO do donut: lado a lado, "Mercado" virava "M…" e ninguém sabia em que
              fatia estava tocando. */}
          <div className="flex flex-col min-[480px]:flex-row min-[480px]:items-center gap-5">
            <Donut data={byCategory} total={natureTotal} label={nature === "all" ? "Saídas" : natureLabel} />
            <div className="flex w-full min-w-0 flex-1 flex-col gap-2">
              {byCategory.map((c) => {
                const conteudo = (
                  <>
                    <i className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: c.color }} />
                    <span className="min-w-0 flex-1 text-left">{c.name}</span>
                    <span className="money text-xs text-ink-400">{brl(c.value)}</span>
                    <b className="w-[38px] text-right tabular-nums text-ink-900">{c.pct}%</b>
                  </>
                );
                if (!onSelectCategory) {
                  return (
                    <div key={c.name} className="flex items-center gap-2.5 text-[13px] text-ink-700">
                      {conteudo}
                    </div>
                  );
                }
                const ativa = selectedCategory === c.name;
                return (
                  <button
                    key={c.name}
                    type="button"
                    aria-pressed={ativa}
                    onClick={() => onSelectCategory(ativa ? null : c.name)}
                    className={`-mx-2 flex min-h-[36px] items-center gap-2.5 rounded-[8px] px-2 text-[13px] text-ink-700 transition-colors duration-150 ${
                      ativa ? "bg-ink-100" : "hover:bg-ink-50"
                    }`}
                  >
                    {conteudo}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ranking */}
          <div className="flex flex-col gap-3 border-t border-ink-100 pt-[18px]">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">Maior gasto {periodoLabel === "neste mês" ? "do mês" : "do período"}</p>
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
