"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, MoreHorizontal, Plus, Table, X } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet, SheetAction } from "@/components/ui/Sheet";
import type { Debt, DebtPriority, DebtStatus, Goal } from "@/lib/types";
import { formatCurrency, formatDate, formatDateFull, timeAgo, toInputDate } from "@/lib/utils";
import { useVirada } from "@/providers/virada-provider";

// ── Período e abas ────────────────────────────────────────────────────────────

type Period = "mes" | "30d" | "ano" | "all";
type Tab = "resumo" | "lancamentos" | "receitas" | "despesas" | "dividas" | "metas" | "fluxo" | "mensal";

const PERIODS: { value: Period; label: string }[] = [
  { value: "mes", label: "Mês" },
  { value: "30d", label: "30 dias" },
  { value: "ano", label: "Ano" },
  { value: "all", label: "Tudo" },
];

const TABS: { value: Tab; label: string }[] = [
  { value: "resumo", label: "Resumo" },
  { value: "lancamentos", label: "Lançamentos" },
  { value: "receitas", label: "Entradas" },
  { value: "despesas", label: "Gastos" },
  { value: "dividas", label: "Dívidas" },
  { value: "metas", label: "Metas" },
  { value: "fluxo", label: "Dia a dia" },
  { value: "mensal", label: "Por mês" },
];

const CHART_COLORS = Array.from({ length: 10 }, (_, i) => `var(--chart-${i + 1})`);

// Datas são "AAAA-MM-DD": comparação de texto já ordena certo.
function inPeriod(date: string, period: Period) {
  if (period === "all") return true;
  const today = toInputDate();
  if (period === "mes") return date.slice(0, 7) === today.slice(0, 7);
  if (period === "ano") return date.slice(0, 4) === today.slice(0, 4);
  const limit = new Date();
  limit.setDate(limit.getDate() - 30);
  return date >= toInputDate(limit);
}

// "+R$ 2.900,00" para o que entrou, "−R$ 950,00" (U+2212) para o que saiu
function signed(value: number) {
  return `${value >= 0 ? "+" : "−"}${formatCurrency(Math.abs(value))}`;
}

// "2026-09" → "Setembro de 2026"
function monthLabel(ym: string) {
  const [year, month] = ym.split("-").map(Number);
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function scopeLabel(scope?: string) {
  return scope === "empresa" ? "Empresa" : "Casa";
}

// Entrada de valor em centavos: a pessoa digita só os números
function centsFromInput(raw: string) {
  return Number(raw.replace(/\D/g, "").slice(0, 12));
}

// ── Peças de interface ────────────────────────────────────────────────────────

interface RowProps {
  ini: string;
  positive: boolean;
  title: string;
  meta: string;
  value: string;
  valueClass: string;
  onMore?: () => void;
}

function ListRow({ ini, positive, title, meta, value, valueClass, onMore }: RowProps) {
  return (
    <div className="flex items-center justify-between gap-2.5 border-b border-ink-100 py-3 last:border-b-0">
      <span className="flex min-w-0 items-center gap-3">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-[13px] font-bold ${
            positive ? "bg-green-100 text-green-700" : "bg-ink-100 text-ink-600"
          }`}
        >
          {ini}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-ink-900">{title}</span>
          <span className="mt-0.5 block truncate text-xs text-ink-500">{meta}</span>
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <strong className={`money text-sm ${valueClass}`}>{value}</strong>
        {onMore && (
          <button
            type="button"
            onClick={onMore}
            aria-label={`Opções de ${title}`}
            className="grid h-10 w-9 place-items-center rounded-[10px] text-ink-500 transition-colors duration-150 hover:bg-ink-100"
          >
            <MoreHorizontal className="h-[18px] w-[18px]" />
          </button>
        )}
      </span>
    </div>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="rounded-xl border border-dashed border-ink-300 p-6 text-center text-sm text-ink-500">{children}</p>;
}

function Donut({ slices, total }: { slices: { name: string; value: number; color: string }[]; total: number }) {
  const C = 70;
  const R = 64;
  let angle = -Math.PI / 2;
  const paths = slices.map((slice) => {
    const a = (slice.value / total) * 2 * Math.PI;
    const x1 = C + R * Math.cos(angle);
    const y1 = C + R * Math.sin(angle);
    angle += a;
    const x2 = C + R * Math.cos(angle);
    const y2 = C + R * Math.sin(angle);
    return { color: slice.color, a, d: `M ${C} ${C} L ${x1} ${y1} A ${R} ${R} 0 ${a > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z` };
  });
  return (
    <svg viewBox="0 0 140 140" className="h-[120px] w-[120px] shrink-0" aria-hidden="true">
      {paths.length === 1 ? (
        <circle cx={C} cy={C} r={R} fill={paths[0].color} />
      ) : (
        paths.filter((p) => p.a > 0.01).map((p, i) => <path key={i} d={p.d} fill={p.color} stroke="#fff" strokeWidth="2" />)
      )}
      <circle cx={C} cy={C} r={44} fill="#fff" />
    </svg>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <span className="block text-xs font-semibold uppercase tracking-[0.06em] text-ink-500">{children}</span>;
}

// Campo de R$ dentro do formulário inline: rótulo em cima, valor grande sem borda
function MoneyField({ label, cents, onChange }: { label: string; cents: number; onChange: (cents: number) => void }) {
  return (
    <label className="block min-w-0 rounded-xl border border-ink-200 bg-white px-3.5 py-3 transition-colors duration-150 focus-within:border-green-500">
      <FieldLabel>{label}</FieldLabel>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={formatCurrency(cents / 100)}
        onChange={(event) => onChange(centsFromInput(event.target.value))}
        className={`money mt-1 w-full bg-transparent text-lg font-bold outline-none focus-visible:shadow-none ${
          cents > 0 ? "text-ink-900" : "text-ink-400"
        }`}
      />
    </label>
  );
}

const textInputClass =
  "w-full rounded-xl border border-ink-200 bg-white px-3.5 py-3 text-[15px] text-ink-900 outline-none transition-colors duration-150 placeholder:text-ink-400 focus:border-green-500";

const primaryClass =
  "flex min-h-[44px] items-center justify-center rounded-[10px] bg-green-500 px-4 text-sm font-bold text-green-900 transition-colors duration-150 hover:bg-green-400";

// Botão que abre/fecha um formulário inline (fechado = Ink 900, aberto = secundário)
function ToggleButton({ open, onClick, label }: { open: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={`flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border text-sm font-bold transition-colors duration-150 ${
        open ? "border-ink-200 bg-white text-ink-900 hover:bg-ink-50" : "border-ink-900 bg-ink-900 text-white hover:bg-ink-800"
      }`}
    >
      {open ? <X className="h-[18px] w-[18px]" /> : <Plus className="h-[18px] w-[18px]" />}
      {open ? "Fechar" : label}
    </button>
  );
}

const debtPill: Record<DebtStatus, string> = {
  aberta: "bg-red-50 text-red-700",
  negociando: "bg-amber-50 text-amber-700",
  quitada: "bg-green-100 text-green-700",
};

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-12 rounded-xl bg-amber-50" />
      <div className="h-11 rounded-[10px] bg-ink-100" />
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <div className="h-20 rounded-xl bg-ink-100" />
        <div className="h-20 rounded-xl bg-ink-100" />
        <div className="h-20 rounded-xl bg-ink-100" />
        <div className="h-20 rounded-xl bg-ink-100" />
      </div>
      <div className="h-64 rounded-2xl border border-ink-200 bg-white" />
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

type TxRow = {
  id: string;
  type: "expense" | "income";
  description: string;
  category: string;
  value: number;
  date: string;
  scope?: string;
  paymentMethod?: string;
  nature?: string;
};

function Relatorios() {
  const data = useVirada();
  const searchParams = useSearchParams();
  const aba = searchParams.get("aba");
  const tab: Tab = TABS.some((t) => t.value === aba) ? (aba as Tab) : "resumo";
  const [period, setPeriod] = useState<Period>("mes");

  // folhas de ação
  const [txSheet, setTxSheet] = useState<TxRow | null>(null);
  const [debtSheet, setDebtSheet] = useState<Debt | null>(null);
  const [goalSheet, setGoalSheet] = useState<Goal | null>(null);
  const [goalCents, setGoalCents] = useState(0);

  // formulários inline
  const [debtForm, setDebtForm] = useState(false);
  const [debtName, setDebtName] = useState("");
  const [debtTotal, setDebtTotal] = useState(0);
  const [debtInstallment, setDebtInstallment] = useState(0);
  const [debtDue, setDebtDue] = useState(toInputDate());
  const [debtPriority, setDebtPriority] = useState<DebtPriority>("média");
  const [goalForm, setGoalForm] = useState(false);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState(0);
  const [goalCurrent, setGoalCurrent] = useState(0);

  const { expenses, incomes } = useMemo(
    () => ({
      expenses: data.expenses.filter((item) => inPeriod(item.date, period)),
      incomes: data.incomes.filter((item) => inPeriod(item.date, period)),
    }),
    [data.expenses, data.incomes, period],
  );

  const totInc = incomes.reduce((sum, item) => sum + item.value, 0);
  const totExp = expenses.reduce((sum, item) => sum + item.value, 0);
  const saldo = totInc - totExp;
  const economia = totInc > 0 ? `${Math.max(0, Math.round((saldo / totInc) * 100))}%` : "—";

  const rows: TxRow[] = useMemo(
    () =>
      [
        ...expenses.map((item): TxRow => ({ ...item, type: "expense" })),
        ...incomes.map((item): TxRow => ({ ...item, type: "income" })),
      ].sort((a, b) => b.date.localeCompare(a.date) || b.value - a.value),
    [expenses, incomes],
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((item) => map.set(item.category, (map.get(item.category) ?? 0) + item.value));
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8) // design: donut só com as 8 maiores categorias
      .map((c, i) => ({ ...c, color: CHART_COLORS[i % CHART_COLORS.length] }));
  }, [expenses]);

  const impulso = expenses.filter((item) => item.nature === "impulso").reduce((sum, item) => sum + item.value, 0);
  const impulsoPct = totExp > 0 ? Math.round((impulso / totExp) * 100) : 0;

  // Dia a dia: resultado por data + acumulado, mais recente primeiro
  const byDate = useMemo(() => {
    const map = new Map<string, { inc: number; exp: number }>();
    incomes.forEach((item) => {
      const day = map.get(item.date) ?? { inc: 0, exp: 0 };
      map.set(item.date, { ...day, inc: day.inc + item.value });
    });
    expenses.forEach((item) => {
      const day = map.get(item.date) ?? { inc: 0, exp: 0 };
      map.set(item.date, { ...day, exp: day.exp + item.value });
    });
    let acc = 0;
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, day]) => {
        acc += day.inc - day.exp;
        return { date, ...day, result: day.inc - day.exp, acc };
      })
      .reverse();
  }, [expenses, incomes]);

  // Por mês: sempre sobre todos os dados
  const byMonth = useMemo(() => {
    const map = new Map<string, { inc: number; exp: number; n: number }>();
    data.incomes.forEach((item) => {
      const ym = item.date.slice(0, 7);
      const m = map.get(ym) ?? { inc: 0, exp: 0, n: 0 };
      map.set(ym, { ...m, inc: m.inc + item.value, n: m.n + 1 });
    });
    data.expenses.forEach((item) => {
      const ym = item.date.slice(0, 7);
      const m = map.get(ym) ?? { inc: 0, exp: 0, n: 0 };
      map.set(ym, { ...m, exp: m.exp + item.value, n: m.n + 1 });
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([ym, m]) => ({ ym, ...m }));
  }, [data.expenses, data.incomes]);

  const debtCounts = {
    aberta: data.debts.filter((d) => d.status === "aberta").length,
    negociando: data.debts.filter((d) => d.status === "negociando").length,
    quitada: data.debts.filter((d) => d.status === "quitada").length,
  };

  // Chegando por link direto (?aba=metas), rola a fileira de abas até a aba ativa aparecer
  const tabsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const list = tabsRef.current;
    const active = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !active) return;
    const left = active.getBoundingClientRect().left - list.getBoundingClientRect().left + list.scrollLeft - 16;
    list.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [tab, data.isReady]);

  if (!data.isReady) return <Skeleton />;

  // Troca de aba sem ida ao servidor: o Next sincroniza o useSearchParams com o histórico
  function goTab(next: Tab) {
    window.history.replaceState(null, "", `?aba=${next}`);
  }

  function saveDebt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!debtName.trim() || debtTotal <= 0) return;
    data.addDebt({
      name: debtName.trim(),
      totalValue: debtTotal / 100,
      installmentValue: debtInstallment / 100,
      dueDate: debtDue || toInputDate(),
      priority: debtPriority,
      status: "aberta",
    });
    setDebtName("");
    setDebtTotal(0);
    setDebtInstallment(0);
    setDebtDue(toInputDate());
    setDebtPriority("média");
    setDebtForm(false);
  }

  function saveGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!goalName.trim() || goalTarget <= 0) return;
    data.addGoal({ name: goalName.trim(), targetValue: goalTarget / 100, currentValue: goalCurrent / 100, type: "reserva" });
    setGoalName("");
    setGoalTarget(0);
    setGoalCurrent(0);
    setGoalForm(false);
  }

  function openGoalSheet(goal: Goal) {
    setGoalCents(Math.round(goal.currentValue * 100));
    setGoalSheet(goal);
  }

  const txRows = (list: TxRow[]) =>
    list.length === 0 ? (
      <Empty>Nada por aqui neste período.</Empty>
    ) : (
      <div>
        {list.map((item) => {
          const positive = item.type === "income";
          return (
            <ListRow
              key={item.id}
              ini={item.category.charAt(0)}
              positive={positive}
              title={item.description || item.category}
              meta={`${formatDate(item.date)} · ${item.category} · ${scopeLabel(item.scope)}`}
              value={signed(positive ? item.value : -item.value)}
              valueClass={positive ? "text-green-700" : "text-ink-900"}
              onMore={() => setTxSheet(item)}
            />
          );
        })}
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      {/* Planilha Google */}
      <div className="flex items-center justify-between gap-3 rounded-[12px] border border-amber-300 bg-amber-50 px-3.5 py-2.5">
        <span className="flex min-w-0 items-center gap-2.5 text-[13px] text-amber-800">
          <Table className="h-[18px] w-[18px] shrink-0" />
          <span className="truncate">
            {data.sheet.sheetUrl
              ? data.sheet.lastSync
                ? `Planilha Google atualizada ${timeAgo(data.sheet.lastSync)}`
                : "Planilha Google conectada"
              : (
                <>
                  <span className="sm:hidden">Planilha não conectada</span>
                  <span className="hidden sm:inline">Planilha Google ainda não conectada</span>
                </>
              )}
          </span>
        </span>
        {data.sheet.sheetUrl ? (
          <a
            href={data.sheet.sheetUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1 text-[13px] font-bold text-amber-800 hover:underline"
          >
            Abrir <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          <Link href="/app/conta" className="shrink-0 text-[13px] font-bold text-amber-800 hover:underline">
            Conectar em Conta
          </Link>
        )}
      </div>

      <Segmented options={PERIODS} value={period} onChange={setPeriod} label="Período" />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <div className="min-w-0 rounded-[12px] border border-ink-200 bg-white px-4 py-3.5">
          <p className="text-xs text-ink-500">Entradas</p>
          <p className="money mt-1 font-display text-xl font-bold text-green-700">{formatCurrency(totInc)}</p>
          <p className="mt-0.5 text-xs text-ink-500">
            {incomes.length} lançamento{incomes.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="min-w-0 rounded-[12px] border border-ink-200 bg-white px-4 py-3.5">
          <p className="text-xs text-ink-500">Gastos</p>
          <p className="money mt-1 font-display text-xl font-bold text-ink-900">{formatCurrency(totExp)}</p>
          <p className="mt-0.5 text-xs text-ink-500">
            {expenses.length} lançamento{expenses.length === 1 ? "" : "s"}
          </p>
        </div>
        <div
          className={`min-w-0 rounded-[12px] border px-4 py-3.5 ${
            saldo >= 0 ? "border-[#BBF7D0] bg-green-50" : "border-red-200 bg-red-50"
          }`}
        >
          <p className="text-xs text-ink-500">Saldo</p>
          <p className={`money mt-1 font-display text-xl font-bold ${saldo >= 0 ? "text-green-700" : "text-red-700"}`}>
            {formatCurrency(saldo)}
          </p>
          <p className="mt-0.5 text-xs text-ink-500">{saldo >= 0 ? "O caixa está respirando." : "Gasto maior que entrada."}</p>
        </div>
        <div className="min-w-0 rounded-[12px] border border-ink-200 bg-white px-4 py-3.5">
          <p className="text-xs text-ink-500">Sobrou do que entrou</p>
          <p className="money mt-1 font-display text-xl font-bold text-ink-900">{economia}</p>
          <p className="mt-0.5 text-xs text-ink-500">economia do período</p>
        </div>
      </div>

      {/* Abas */}
      <div
        ref={tabsRef}
        role="tablist"
        aria-label="Seções do relatório"
        className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {TABS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={tab === item.value}
            onClick={() => goTab(item.value)}
            className={`inline-flex min-h-[36px] shrink-0 items-center rounded-full border px-3.5 text-[13px] font-semibold transition-colors duration-150 ${
              tab === item.value ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "resumo" && (
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <section className="flex flex-col gap-4 rounded-xl border border-ink-200 bg-white p-[18px]">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">Gastos por categoria</p>
            {byCategory.length === 0 ? (
              <p className="text-sm text-ink-500">Nenhum gasto neste período.</p>
            ) : (
              <div className="flex items-center gap-5">
                <Donut slices={byCategory} total={totExp} />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  {byCategory.slice(0, 5).map((c) => (
                    <div key={c.name} className="flex items-center gap-2.5 text-[13px] text-ink-700">
                      <i className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: c.color }} />
                      <span className="min-w-0 flex-1 truncate">{c.name}</span>
                      <b className="tabular-nums">{Math.round((c.value / totExp) * 100)}%</b>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
          <section className="flex flex-col gap-3 rounded-xl border border-ink-200 bg-white p-[18px]">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">Por impulso neste período</p>
            <p className="money font-display text-2xl font-bold text-ink-900">
              {formatCurrency(impulso)}{" "}
              <span className="font-sans text-[13px] font-medium text-ink-500">{impulsoPct}% dos gastos</span>
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
              <div className="h-full rounded-full bg-amber-500" style={{ width: `${impulsoPct}%` }} />
            </div>
          </section>
        </div>
      )}

      {tab === "lancamentos" && txRows(rows)}
      {tab === "receitas" && txRows(rows.filter((item) => item.type === "income"))}
      {tab === "despesas" && txRows(rows.filter((item) => item.type === "expense"))}

      {tab === "fluxo" &&
        (byDate.length === 0 ? (
          <Empty>Nada por aqui neste período.</Empty>
        ) : (
          <div>
            {byDate.map((day) => (
              <ListRow
                key={day.date}
                ini={day.date.slice(8, 10)}
                positive={day.result >= 0}
                title={`${formatDate(day.date)} · resultado ${signed(day.result)}`}
                meta={`entrou ${formatCurrency(day.inc)} · saiu ${formatCurrency(day.exp)}`}
                value={signed(day.acc)}
                valueClass={day.acc >= 0 ? "text-blue-700" : "text-[#C2410C]"}
              />
            ))}
          </div>
        ))}

      {tab === "mensal" &&
        (byMonth.length === 0 ? (
          <Empty>Nada por aqui neste período.</Empty>
        ) : (
          <div>
            {byMonth.map((m) => {
              const result = m.inc - m.exp;
              const pct = m.inc > 0 ? Math.max(0, Math.round((result / m.inc) * 100)) : 0;
              const label = monthLabel(m.ym);
              return (
                <ListRow
                  key={m.ym}
                  ini={label.charAt(0)}
                  positive={result >= 0}
                  title={label}
                  meta={`${m.n} lançamento${m.n === 1 ? "" : "s"} · sobrou ${pct}% do que entrou`}
                  value={signed(result)}
                  valueClass={result >= 0 ? "text-green-700" : "text-red-700"}
                />
              );
            })}
          </div>
        ))}

      {tab === "dividas" && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-red-50 px-3 py-2.5 text-center text-red-700">
              <p className="text-xs font-semibold">Abertas</p>
              <p className="font-display text-[22px] font-bold tabular-nums">{debtCounts.aberta}</p>
            </div>
            <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-center text-amber-700">
              <p className="text-xs font-semibold">Negociando</p>
              <p className="font-display text-[22px] font-bold tabular-nums">{debtCounts.negociando}</p>
            </div>
            <div className="rounded-xl bg-green-100 px-3 py-2.5 text-center text-green-700">
              <p className="text-xs font-semibold">Quitadas</p>
              <p className="font-display text-[22px] font-bold tabular-nums">{debtCounts.quitada}</p>
            </div>
          </div>

          <ToggleButton open={debtForm} onClick={() => setDebtForm((v) => !v)} label="Cadastrar dívida" />

          {debtForm && (
            <form onSubmit={saveDebt} className="flex flex-col gap-2.5 rounded-2xl border border-ink-200 bg-ink-50 p-4">
              <p className="text-sm text-ink-600">Coloque a dívida no mapa. Ela pesa menos quando está organizada.</p>
              <input
                type="text"
                value={debtName}
                onChange={(event) => setDebtName(event.target.value)}
                placeholder="Nome da dívida (ex.: Cartão, Empréstimo)"
                aria-label="Nome da dívida"
                className={textInputClass}
              />
              <div className="grid grid-cols-2 gap-2.5">
                <MoneyField label="Valor total" cents={debtTotal} onChange={setDebtTotal} />
                <MoneyField label="Parcela" cents={debtInstallment} onChange={setDebtInstallment} />
              </div>
              <label className="block rounded-xl border border-ink-200 bg-white px-3.5 py-3 focus-within:border-green-500">
                <FieldLabel>Vencimento</FieldLabel>
                <input
                  type="date"
                  value={debtDue}
                  onChange={(event) => setDebtDue(event.target.value)}
                  className="mt-1 w-full bg-transparent text-[15px] text-ink-900 outline-none focus-visible:shadow-none"
                />
              </label>
              <div className="flex gap-2">
                {(["alta", "média", "baixa"] as DebtPriority[]).map((p) => (
                  <Chip key={p} wide active={debtPriority === p} onClick={() => setDebtPriority(p)}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Chip>
                ))}
              </div>
              <button type="submit" className={primaryClass}>
                Salvar dívida
              </button>
            </form>
          )}

          {data.debts.length === 0 ? (
            <Empty>Nenhuma dívida cadastrada.</Empty>
          ) : (
            <div>
              {data.debts.map((debt) => (
                <div key={debt.id} className="flex items-center justify-between gap-2.5 border-b border-ink-100 py-3 last:border-b-0">
                  <span className="min-w-0">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-semibold text-ink-900">{debt.name}</span>
                      <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-bold capitalize ${debtPill[debt.status]}`}>
                        {debt.status}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-ink-500">
                      vence {formatDateFull(debt.dueDate)} · parcela {formatCurrency(debt.installmentValue)} · prioridade {debt.priority}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <strong className="money text-sm text-ink-900">{formatCurrency(debt.totalValue)}</strong>
                    <button
                      type="button"
                      onClick={() => setDebtSheet(debt)}
                      aria-label={`Opções de ${debt.name}`}
                      className="grid h-10 w-9 place-items-center rounded-[10px] text-ink-500 transition-colors duration-150 hover:bg-ink-100"
                    >
                      <MoreHorizontal className="h-[18px] w-[18px]" />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "metas" && (
        <div className="flex flex-col gap-3">
          <ToggleButton open={goalForm} onClick={() => setGoalForm((v) => !v)} label="Criar meta" />

          {goalForm && (
            <form onSubmit={saveGoal} className="flex flex-col gap-2.5 rounded-2xl border border-ink-200 bg-ink-50 p-4">
              <input
                type="text"
                value={goalName}
                onChange={(event) => setGoalName(event.target.value)}
                placeholder="Nome da meta (ex.: Reserva de emergência)"
                aria-label="Nome da meta"
                className={textInputClass}
              />
              <div className="grid grid-cols-2 gap-2.5">
                <MoneyField label="Quero chegar em" cents={goalTarget} onChange={setGoalTarget} />
                <MoneyField label="Já tenho" cents={goalCurrent} onChange={setGoalCurrent} />
              </div>
              <button type="submit" className={primaryClass}>
                Salvar meta
              </button>
            </form>
          )}

          {data.goals.length === 0 ? (
            <Empty>Nenhuma meta ainda.</Empty>
          ) : (
            <div className="flex flex-col gap-2.5">
              {data.goals.map((goal) => {
                const p = goal.targetValue > 0 ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100)) : 0;
                const tone = p >= 75 ? "text-green-700" : p >= 35 ? "text-amber-700" : "text-red-500";
                const bar = p >= 75 ? "bg-green-700" : p >= 35 ? "bg-amber-700" : "bg-red-500";
                return (
                  <div key={goal.id} className="flex flex-col gap-2 rounded-[14px] border border-ink-200 bg-white px-4 py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-ink-900">{goal.name}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        <b className={`text-sm tabular-nums ${tone}`}>{p}%</b>
                        <button
                          type="button"
                          onClick={() => openGoalSheet(goal)}
                          aria-label={`Opções de ${goal.name}`}
                          className="grid h-10 w-9 place-items-center rounded-[10px] text-ink-500 transition-colors duration-150 hover:bg-ink-100"
                        >
                          <MoreHorizontal className="h-[18px] w-[18px]" />
                        </button>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
                      <div className={`h-full rounded-full ${bar}`} style={{ width: `${p}%` }} />
                    </div>
                    <p className="text-xs text-ink-500">
                      {p >= 100
                        ? `Meta alcançada · ${formatCurrency(goal.targetValue)}`
                        : `${formatCurrency(goal.currentValue)} de ${formatCurrency(goal.targetValue)} · faltam ${formatCurrency(
                            goal.targetValue - goal.currentValue,
                          )}`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Folha: lançamento */}
      <Sheet open={txSheet !== null} onClose={() => setTxSheet(null)} title="O que fazer com este lançamento?">
        {txSheet && (
          <>
            <p className="text-sm leading-relaxed text-ink-600">
              {txSheet.description || txSheet.category} · {formatCurrency(txSheet.value)}. Desfazer cria um lançamento contrário e mantém
              o histórico; excluir apaga de vez.
            </p>
            <div className="flex flex-col gap-2">
              <SheetAction
                onClick={() => {
                  data.estornar(txSheet);
                  setTxSheet(null);
                }}
              >
                Desfazer lançamento
              </SheetAction>
              <SheetAction
                tone="danger"
                onClick={() => {
                  if (txSheet.type === "expense") data.removeExpense(txSheet.id);
                  else data.removeIncome(txSheet.id);
                  setTxSheet(null);
                }}
              >
                Excluir
              </SheetAction>
              <SheetAction tone="ghost" onClick={() => setTxSheet(null)}>
                Cancelar
              </SheetAction>
            </div>
          </>
        )}
      </Sheet>

      {/* Folha: dívida */}
      <Sheet open={debtSheet !== null} onClose={() => setDebtSheet(null)} title="O que fazer com esta dívida?">
        {debtSheet && (
          <>
            <p className="text-sm leading-relaxed text-ink-600">
              {debtSheet.name} · {formatCurrency(debtSheet.totalValue)} · {debtSheet.status}.
            </p>
            <div className="flex flex-col gap-2">
              {debtSheet.status === "aberta" && (
                <SheetAction
                  onClick={() => {
                    data.updateDebtStatus(debtSheet.id, "negociando");
                    setDebtSheet(null);
                  }}
                >
                  Marcar como negociando
                </SheetAction>
              )}
              {debtSheet.status !== "quitada" && (
                <SheetAction
                  onClick={() => {
                    data.updateDebtStatus(debtSheet.id, "quitada");
                    setDebtSheet(null);
                  }}
                >
                  Marcar como quitada
                </SheetAction>
              )}
              {debtSheet.status !== "aberta" && (
                <SheetAction
                  onClick={() => {
                    data.updateDebtStatus(debtSheet.id, "aberta");
                    setDebtSheet(null);
                  }}
                >
                  Reabrir
                </SheetAction>
              )}
              <SheetAction
                tone="danger"
                onClick={() => {
                  data.removeDebt(debtSheet.id);
                  setDebtSheet(null);
                }}
              >
                Excluir
              </SheetAction>
              <SheetAction tone="ghost" onClick={() => setDebtSheet(null)}>
                Cancelar
              </SheetAction>
            </div>
          </>
        )}
      </Sheet>

      {/* Folha: meta */}
      <Sheet open={goalSheet !== null} onClose={() => setGoalSheet(null)} title="Atualizar meta">
        {goalSheet && (
          <>
            <p className="text-sm leading-relaxed text-ink-600">
              {goalSheet.name} · quero chegar em {formatCurrency(goalSheet.targetValue)}.
            </p>
            <MoneyField label="Já tenho agora" cents={goalCents} onChange={setGoalCents} />
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className={primaryClass}
                onClick={() => {
                  data.updateGoalCurrentValue(goalSheet.id, goalCents / 100);
                  setGoalSheet(null);
                }}
              >
                Salvar valor
              </button>
              <SheetAction
                tone="danger"
                onClick={() => {
                  data.removeGoal(goalSheet.id);
                  setGoalSheet(null);
                }}
              >
                Excluir
              </SheetAction>
              <SheetAction tone="ghost" onClick={() => setGoalSheet(null)}>
                Cancelar
              </SheetAction>
            </div>
          </>
        )}
      </Sheet>
    </div>
  );
}

// useSearchParams exige Suspense no App Router
export default function RelatoriosPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <Relatorios />
    </Suspense>
  );
}
