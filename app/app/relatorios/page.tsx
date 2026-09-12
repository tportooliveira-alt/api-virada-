"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, MoreHorizontal, Plus, Table, X } from "lucide-react";
import { ExpenseChart, type ChartNature } from "@/components/ExpenseChart";
import { PocketsCard } from "@/components/PocketsCard";
import { Chip } from "@/components/ui/Chip";
import { Sheet, SheetAction } from "@/components/ui/Sheet";
import type { Debt, DebtPriority, DebtStatus, Expense, Goal, Income } from "@/lib/types";
import { debtInstallmentsLeft, debtPaid, debtRemaining, isEstornado, isOpenDebt, semEstornados } from "@/lib/types";
import {
  dailyFlow,
  diasAte,
  formatCurrency,
  formatDate,
  formatDateFull,
  getGoalProgress,
  groupTopCategories,
  inPeriod,
  isGoalReached,
  roundMoney,
  savingsRate,
  shiftMonth,
  timeAgo,
  toInputDate,
} from "@/lib/utils";
import { useVirada } from "@/providers/virada-provider";

import { mensagemDaParcela, mesDaUrl } from "./mes-e-toast";

// ── Mês e abas ────────────────────────────────────────────────────────────────

type Tab = "resumo" | "lancamentos" | "receitas" | "despesas" | "dividas" | "metas" | "fluxo" | "mensal";

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

const TOAST_MS = 6000;

// "+R$ 2.900,00" para o que entrou, "−R$ 950,00" (U+2212) para o que saiu
function signed(value: number) {
  return `${value >= 0 ? "+" : "−"}${formatCurrency(Math.abs(value))}`;
}

// "Sobrou do que entrou": taxa de sobra sobre as entradas; negativo é gasto acima do que entrou
function sobrouLabel(rate: number | null) {
  if (rate === null) return "sem entradas";
  if (rate < 0) return `gastou ${-rate}% a mais do que entrou`;
  return `sobrou ${rate}% do que entrou`;
}

// "2026-09" → "Setembro 2026"
function monthLabel(ym: string) {
  const [year, month] = ym.split("-").map(Number);
  const nome = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(year, month - 1, 1));
  return `${nome.charAt(0).toUpperCase() + nome.slice(1)} ${year}`;
}

function scopeLabel(scope?: string) {
  return scope === "empresa" ? "Empresa" : "Casa";
}

// "vence em 5 dias" · "vence hoje" · "venceu há 3 dias"
function vencimentoLabel(dias: number) {
  if (dias === 0) return "vence hoje";
  if (dias > 0) return `vence em ${dias} dia${dias === 1 ? "" : "s"}`;
  return `venceu há ${-dias} dia${dias === -1 ? "" : "s"}`;
}

function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`;
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
  /** Com onPress a linha inteira vira botão (toque abre a folha de ações). */
  onPress?: () => void;
  selected?: boolean;
}

function ListRow({ ini, positive, title, meta, value, valueClass, onPress, selected }: RowProps) {
  const inner = (
    <>
      <span className="flex min-w-0 items-center gap-3">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-[13px] font-bold ${
            positive ? "bg-green-100 text-green-700" : "bg-ink-100 text-ink-600"
          }`}
        >
          {ini}
        </span>
        {/* 2 linhas em vez de "…": em 360 px o corte comia justamente o valor
            ("12 de set. · resultado +R$ 2.17…") e o detalhe da linha. */}
        <span className="min-w-0 text-left">
          <span className="line-clamp-2 text-sm font-semibold text-ink-900">{title}</span>
          {/* Sem clamp: o detalhe é frase NOSSA e pode passar de 2 linhas em 360 px
              ("6 lançamentos · gastou 420% a mais do que entrou"). Cortar esconde
              justamente o número. Linha mais alta é melhor que informação sumida. */}
          <span className="mt-0.5 text-xs text-ink-500">{meta}</span>
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <strong className={`money text-sm ${valueClass}`}>{value}</strong>
        {onPress && <ChevronRight className="h-4 w-4 text-ink-400" />}
      </span>
    </>
  );
  if (!onPress) {
    return <div className="flex items-center justify-between gap-2.5 border-b border-ink-100 py-3 last:border-b-0">{inner}</div>;
  }
  return (
    <button
      type="button"
      onClick={onPress}
      aria-current={selected ? "true" : undefined}
      className={`-mx-2 flex w-[calc(100%+16px)] items-center justify-between gap-2.5 rounded-[10px] border-b border-ink-100 px-2 py-3 transition-colors duration-150 last:border-b-0 hover:bg-ink-50 ${
        selected ? "bg-green-50" : ""
      }`}
    >
      {inner}
    </button>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="rounded-xl border border-dashed border-ink-300 p-6 text-center text-sm text-ink-500">{children}</p>;
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

const secondaryClass =
  "flex min-h-[44px] items-center justify-center rounded-[10px] border border-ink-200 bg-white px-4 text-sm font-bold text-ink-900 transition-colors duration-150 hover:bg-ink-50";

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
  estornadoEm?: string;
};

interface Toast {
  message: string;
  undo: () => void;
}

function Relatorios() {
  const data = useVirada();
  const searchParams = useSearchParams();
  const aba = searchParams.get("aba");
  const tab: Tab = TABS.some((t) => t.value === aba) ? (aba as Tab) : "resumo";

  // Mês vem da URL (?mes=AAAA-MM ou ?mes=tudo) — recarregar reabre o mesmo mês.
  const hoje = toInputDate();
  const mesAtual = hoje.slice(0, 7);
  const { mes, tudo, invalido: mesInvalido } = mesDaUrl(searchParams.get("mes"), mesAtual);
  const periodoLabel = tudo ? "neste período" : "neste mês";

  // folhas de ação
  const [txSheet, setTxSheet] = useState<TxRow | null>(null);
  const [debtSheet, setDebtSheet] = useState<Debt | null>(null);
  const [goalSheet, setGoalSheet] = useState<Goal | null>(null);
  const [goalCents, setGoalCents] = useState(0);

  // toast "Apagado · Desfazer" / "Parcela registrada · Desfazer"
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Resumo: filtro por categoria (legenda) e natureza (chip do gráfico)
  const [categoriaSel, setCategoriaSel] = useState<string | null>(null);
  const [natureza, setNatureza] = useState<ChartNature>("all");
  useEffect(() => setCategoriaSel(null), [mes, tudo]);

  // "Paguei a parcela" com valor ajustado
  const [ajustando, setAjustando] = useState<{ id: string; cents: number } | null>(null);

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

  // Histórico (listas) mostra tudo do mês, estornado inclusive; totais e gráficos
  // usam só `expenses`/`incomes`, já sem estornados (contrato em lib/types.ts).
  // inPeriod "mes" ancorado no dia 1º do mês escolhido: comparação por texto, sem fuso.
  const { expensesPeriod, incomesPeriod, expenses, incomes } = useMemo(() => {
    const expensesPeriod = data.expenses.filter((item) => inPeriod(item.date, tudo ? "all" : "mes", `${mes}-01`));
    const incomesPeriod = data.incomes.filter((item) => inPeriod(item.date, tudo ? "all" : "mes", `${mes}-01`));
    return { expensesPeriod, incomesPeriod, expenses: semEstornados(expensesPeriod), incomes: semEstornados(incomesPeriod) };
  }, [data.expenses, data.incomes, mes, tudo]);

  const totInc = roundMoney(incomes.reduce((sum, item) => sum + item.value, 0));
  const totExp = roundMoney(expenses.reduce((sum, item) => sum + item.value, 0));
  const saldo = roundMoney(totInc - totExp);
  const sobrou = savingsRate(totInc, totExp);

  const rows: TxRow[] = useMemo(
    () =>
      [
        ...expensesPeriod.map((item): TxRow => ({ ...item, type: "expense" })),
        ...incomesPeriod.map((item): TxRow => ({ ...item, type: "income" })),
      ].sort((a, b) => b.date.localeCompare(a.date) || b.value - a.value),
    [expensesPeriod, incomesPeriod],
  );

  // Resumo: as mesmas fatias do gráfico (8 maiores + "Outros"), pra lista filtrada
  // bater com o donut — "Outros" agrega o que não coube nas 7 nomeadas.
  const expensesNatureza = useMemo(
    () => expenses.filter((item) => natureza === "all" || item.nature === natureza),
    [expenses, natureza],
  );
  const nomeadas = useMemo(
    () => groupTopCategories(expensesNatureza, 8).filter((c) => c.name !== "Outros").map((c) => c.name),
    [expensesNatureza],
  );
  const gastosDoResumo: TxRow[] = useMemo(() => {
    const lista = categoriaSel === null
      ? expensesNatureza
      : expensesNatureza.filter((item) => (categoriaSel === "Outros" ? !nomeadas.includes(item.category) : item.category === categoriaSel));
    return lista.map((item): TxRow => ({ ...item, type: "expense" })).sort((a, b) => b.date.localeCompare(a.date) || b.value - a.value);
  }, [expensesNatureza, categoriaSel, nomeadas]);
  const somaResumo = roundMoney(gastosDoResumo.reduce((sum, item) => sum + item.value, 0));

  const impulso = roundMoney(expenses.filter((item) => item.nature === "impulso").reduce((sum, item) => sum + item.value, 0));
  const impulsoPct = totExp > 0 ? Math.round((impulso / totExp) * 100) : 0;

  // Dia a dia: resultado por data + acumulado (centavos exatos), mais recente primeiro
  const byDate = useMemo(() => dailyFlow(incomes, expenses).reverse(), [expenses, incomes]);

  // Por mês: sempre sobre todos os dados (sem estornados)
  const byMonth = useMemo(() => {
    const map = new Map<string, { inc: number; exp: number; n: number }>();
    semEstornados(data.incomes).forEach((item) => {
      const ym = item.date.slice(0, 7);
      const m = map.get(ym) ?? { inc: 0, exp: 0, n: 0 };
      map.set(ym, { ...m, inc: m.inc + item.value, n: m.n + 1 });
    });
    semEstornados(data.expenses).forEach((item) => {
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

  // Aba e mês vivem na URL, sem ida ao servidor: o Next sincroniza o useSearchParams
  // com o histórico. Recarregar ou compartilhar o link reabre no mesmo lugar.
  function setQuery(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => (value === null ? params.delete(key) : params.set(key, value)));
    window.history.replaceState(null, "", `?${params.toString()}`);
  }
  const goTab = (next: Tab) => setQuery({ aba: next });
  const goMes = (next: string) => setQuery({ mes: next });

  function showToast(next: Toast) {
    clearTimeout(toastTimer.current);
    setToast(next);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }

  function desfazerToast() {
    if (!toast) return;
    toast.undo();
    clearTimeout(toastTimer.current);
    setToast(null);
  }

  // Excluir apaga na hora; o toast devolve o MESMO objeto (mesmo id) por 6 s.
  function excluirLancamento(row: TxRow) {
    const original: Expense | Income | undefined =
      row.type === "expense" ? data.expenses.find((item) => item.id === row.id) : data.incomes.find((item) => item.id === row.id);
    if (!original) return;
    if (row.type === "expense") data.removeExpense(row.id);
    else data.removeIncome(row.id);
    setTxSheet(null);
    showToast({
      message: "Apagado",
      undo: () => (row.type === "expense" ? data.restoreExpense(original as Expense) : data.restoreIncome(original as Income)),
    });
  }

  // Valor sugerido da parcela: a parcela cadastrada, ou o que falta se for menor.
  function parcelaSugerida(debt: Debt) {
    const restante = debtRemaining(debt);
    return debt.installmentValue > 0 ? Math.min(debt.installmentValue, restante) : restante;
  }

  function pagarParcela(debt: Debt, value: number) {
    const ids = data.payDebtInstallment(debt.id, value);
    setAjustando(null);
    if (!ids) return;
    showToast({
      message: mensagemDaParcela(value, debt.name, formatCurrency),
      undo: () => data.undoDebtPayment(ids.paymentId),
    });
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
      <Empty>{`Nada por aqui ${periodoLabel}.`}</Empty>
    ) : (
      <div>
        {list.map((item) => {
          const positive = item.type === "income";
          const estornado = isEstornado(item);
          return (
            <ListRow
              key={item.id}
              ini={item.category.charAt(0)}
              positive={positive && !estornado}
              title={item.description || item.category}
              meta={`${formatDate(item.date)} · ${item.category} · ${scopeLabel(item.scope)}${estornado ? " · Estornado" : ""}`}
              value={signed(positive ? item.value : -item.value)}
              valueClass={estornado ? "text-ink-400 line-through" : positive ? "text-green-700" : "text-ink-900"}
              onPress={() => setTxSheet(item)}
            />
          );
        })}
      </div>
    );

  const navBtnClass =
    "grid h-11 w-11 shrink-0 place-items-center rounded-[10px] border border-ink-200 bg-white text-ink-700 transition-colors duration-150 hover:bg-ink-50";

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
            {/* Em 360 px o rótulo comprido empurrava o aviso e virava "Planilha não conecta…" */}
            <span className="sm:hidden">Conectar</span>
            <span className="hidden sm:inline">Conectar em Conta</span>
          </Link>
        )}
      </div>

      {/* ‹ Setembro 2026 › — e "Tudo" como chip secundário */}
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Mês anterior" onClick={() => goMes(shiftMonth(mes, -1))} className={navBtnClass}>
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 aria-live="polite" className="min-w-0 flex-1 text-center text-base font-bold tracking-[-0.01em] text-ink-900">
          {tudo ? "Todos os meses" : monthLabel(mes)}
        </h2>
        <button type="button" aria-label="Próximo mês" onClick={() => goMes(shiftMonth(mes, 1))} className={navBtnClass}>
          <ChevronRight className="h-5 w-5" />
        </button>
        <Chip active={tudo} onClick={() => goMes(tudo ? mesAtual : "tudo")}>
          Tudo
        </Chip>
      </div>

      {/* Link com mês que não existe: abre o mês de hoje e diz por quê, em vez de
          mostrar "Janeiro 2026" zerado como se fosse a verdade. */}
      {mesInvalido && (
        <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] leading-5 text-amber-900">
          {`Esse link tinha um mês que não existe. Abri ${monthLabel(mesAtual)}.`}
        </p>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <div className="min-w-0 rounded-[12px] border border-ink-200 bg-white px-4 py-3.5">
          <p className="text-xs text-ink-500">Entradas</p>
          <p className="money mt-1 font-display text-lg font-bold sm:text-xl text-green-700">{formatCurrency(totInc)}</p>
          <p className="mt-0.5 text-xs text-ink-500">{plural(incomes.length, "lançamento", "lançamentos")}</p>
        </div>
        <div className="min-w-0 rounded-[12px] border border-ink-200 bg-white px-4 py-3.5">
          <p className="text-xs text-ink-500">Gastos</p>
          <p className="money mt-1 font-display text-lg font-bold sm:text-xl text-ink-900">{formatCurrency(totExp)}</p>
          <p className="mt-0.5 text-xs text-ink-500">{plural(expenses.length, "lançamento", "lançamentos")}</p>
        </div>
        <div
          className={`min-w-0 rounded-[12px] border px-4 py-3.5 ${
            saldo >= 0 ? "border-[#BBF7D0] bg-green-50" : "border-red-200 bg-red-50"
          }`}
        >
          <p className="text-xs text-ink-500">Saldo</p>
          <p className={`money mt-1 font-display text-lg font-bold sm:text-xl ${saldo >= 0 ? "text-green-700" : "text-red-700"}`}>
            {formatCurrency(saldo)}
          </p>
          <p className="mt-0.5 text-xs text-ink-500">{saldo >= 0 ? "O caixa está respirando." : "Gasto maior que entrada."}</p>
        </div>
        <div className="min-w-0 rounded-[12px] border border-ink-200 bg-white px-4 py-3.5">
          <p className="text-xs text-ink-500">Sobrou do que entrou</p>
          <p className="money mt-1 font-display text-lg font-bold sm:text-xl text-ink-900">{sobrou === null ? "—" : `${sobrou}%`}</p>
          <p className="mt-0.5 text-xs text-ink-500">saldo dividido pelas entradas</p>
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
        // min-w-0 nos filhos: sem isso a lista (texto nowrap) alargava a coluna e a tela
        // estourava na horizontal em 360px.
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <div className="flex min-w-0 flex-col gap-4">
            <section className="flex min-w-0 flex-col gap-4 rounded-xl border border-ink-200 bg-white p-[18px]">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">Gastos por categoria · toque pra filtrar</p>
              <ExpenseChart
                expenses={data.expenses}
                incomes={data.incomes}
                period={tudo ? "all" : mes}
                nature={natureza}
                onNatureChange={setNatureza}
                selectedCategory={categoriaSel}
                onSelectCategory={setCategoriaSel}
                showTotals={false}
              />
            </section>
            {/* Os 3 bolsos DO MÊS NAVEGADO: até aqui só o Início mostrava, sempre no mês
                corrente, então ao andar ‹ › ninguém via o orçamento daquele mês.
                Em "Tudo" não faz sentido — o alvo do bolso é mensal. */}
            {!tudo && <PocketsCard data={data} mes={mes} />}
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <section className="flex flex-col gap-3 rounded-xl border border-ink-200 bg-white p-[18px]">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">Por impulso {periodoLabel}</p>
              <p className="money font-display text-2xl font-bold text-ink-900">
                {formatCurrency(impulso)}{" "}
                <span className="font-sans text-[13px] font-medium text-ink-500">{impulsoPct}% dos gastos</span>
              </p>
              <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
                <div className="h-full rounded-full bg-amber-500" style={{ width: `${impulsoPct}%` }} />
              </div>
            </section>

            {/* Lista dos gastos do mês — filtrada pela categoria tocada na legenda */}
            <section className="flex flex-col gap-2 rounded-xl border border-ink-200 bg-white p-[18px]" aria-label="Gastos do período">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 line-clamp-2 text-sm font-semibold text-ink-900">
                  {categoriaSel === null
                    ? `Gastos ${periodoLabel} · ${formatCurrency(somaResumo)}`
                    : `${categoriaSel} · ${formatCurrency(somaResumo)} · ${plural(gastosDoResumo.length, "lançamento", "lançamentos")}`}
                </p>
                {categoriaSel !== null && (
                  <button
                    type="button"
                    onClick={() => setCategoriaSel(null)}
                    aria-label="Limpar filtro de categoria"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-ink-200 text-ink-600 transition-colors duration-150 hover:bg-ink-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {txRows(gastosDoResumo)}
            </section>
          </div>
        </div>
      )}

      {tab === "lancamentos" && txRows(rows)}
      {tab === "receitas" && txRows(rows.filter((item) => item.type === "income"))}
      {tab === "despesas" && txRows(rows.filter((item) => item.type === "expense"))}

      {tab === "fluxo" &&
        (byDate.length === 0 ? (
          <Empty>{`Nada por aqui ${periodoLabel}.`}</Empty>
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
          <Empty>Nenhum lançamento ainda.</Empty>
        ) : (
          <div>
            {byMonth.map((m) => {
              const result = roundMoney(m.inc - m.exp);
              const label = monthLabel(m.ym);
              return (
                <ListRow
                  key={m.ym}
                  ini={label.charAt(0)}
                  positive={result >= 0}
                  title={label}
                  meta={`${plural(m.n, "lançamento", "lançamentos")} · ${sobrouLabel(savingsRate(m.inc, m.exp))}`}
                  value={signed(result)}
                  valueClass={result >= 0 ? "text-green-700" : "text-red-700"}
                  selected={!tudo && m.ym === mes}
                  onPress={() => setQuery({ mes: m.ym, aba: "resumo" })}
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
            <Empty>Nenhuma dívida cadastrada. Toque em Cadastrar dívida pra pôr a primeira no mapa.</Empty>
          ) : (
            <div className="flex flex-col gap-2.5">
              {data.debts.map((debt) => {
                const aberta = isOpenDebt(debt);
                const pago = debtPaid(debt);
                const parcelas = debtInstallmentsLeft(debt);
                const pct = debt.totalValue > 0 ? Math.min(100, Math.round((pago / debt.totalValue) * 100)) : 0;
                const dias = diasAte(debt.dueDate, hoje);
                const sugerida = parcelaSugerida(debt);
                const ajuste = ajustando?.id === debt.id ? ajustando : null;
                return (
                  <div key={debt.id} data-debt-id={debt.id} className="flex flex-col gap-2.5 rounded-[14px] border border-ink-200 bg-white px-4 py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="line-clamp-2 text-sm font-semibold text-ink-900">{debt.name}</span>
                        <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-bold capitalize ${debtPill[debt.status]}`}>
                          {debt.status}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setDebtSheet(debt)}
                        aria-label={`Opções de ${debt.name}`}
                        className="grid h-10 w-9 shrink-0 place-items-center rounded-[10px] text-ink-500 transition-colors duration-150 hover:bg-ink-100"
                      >
                        <MoreHorizontal className="h-[18px] w-[18px]" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
                      {aberta && (
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 font-bold ${
                            dias < 0 ? "bg-red-50 text-red-700" : dias <= 7 ? "bg-amber-50 text-amber-700" : "bg-ink-100 text-ink-600"
                          }`}
                        >
                          {vencimentoLabel(dias)}
                        </span>
                      )}
                      <span>{`vence ${formatDateFull(debt.dueDate)} · parcela ${formatCurrency(debt.installmentValue)} · prioridade ${debt.priority}`}</span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                      <div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
                    </div>
                    {/* Frase, não número: pode quebrar. Com .money (nowrap) uma dívida
                        de R$ 32.000 media 304 contra 294 px de caixa em 360 px. */}
                    <p className="text-xs tabular-nums text-ink-600">
                      {`${formatCurrency(pago)} pagos de ${formatCurrency(debt.totalValue)}`}
                      {aberta && debt.installmentValue > 0 ? ` · faltam ${plural(parcelas, "parcela", "parcelas")}` : ""}
                      {aberta && debt.installmentValue <= 0 ? ` · faltam ${formatCurrency(debtRemaining(debt))}` : ""}
                    </p>

                    {aberta && sugerida > 0 && (
                      ajuste ? (
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();
                            if (ajuste.cents > 0) pagarParcela(debt, ajuste.cents / 100);
                          }}
                          className="flex flex-col gap-2 rounded-xl bg-ink-50 p-3"
                        >
                          <MoneyField label="Quanto você pagou?" cents={ajuste.cents} onChange={(cents) => setAjustando({ id: debt.id, cents })} />
                          <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => setAjustando(null)} className={secondaryClass}>
                              Cancelar
                            </button>
                            <button type="submit" className={primaryClass}>
                              Confirmar pagamento
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex gap-2">
                          <button type="button" onClick={() => pagarParcela(debt, sugerida)} className={`${primaryClass} flex-1`}>
                            {`Paguei a parcela (${formatCurrency(sugerida)})`}
                          </button>
                          <button
                            type="button"
                            onClick={() => setAjustando({ id: debt.id, cents: Math.round(sugerida * 100) })}
                            className={secondaryClass}
                          >
                            ajustar valor
                          </button>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
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
            <Empty>Nenhuma meta ainda. Toque em Criar meta.</Empty>
          ) : (
            <div className="flex flex-col gap-2.5">
              {data.goals.map((goal) => {
                const p = getGoalProgress(goal);
                const tone = p >= 75 ? "text-green-700" : p >= 35 ? "text-amber-700" : "text-red-500";
                const bar = p >= 75 ? "bg-green-700" : p >= 35 ? "bg-amber-700" : "bg-red-500";
                return (
                  <div key={goal.id} className="flex flex-col gap-2 rounded-[14px] border border-ink-200 bg-white px-4 py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 line-clamp-2 text-sm font-semibold text-ink-900">{goal.name}</span>
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
                      {isGoalReached(goal)
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

      {/* Folha: lançamento — Editar · Excluir · Cancelar */}
      <Sheet open={txSheet !== null} onClose={() => setTxSheet(null)} title="O que fazer com este lançamento?">
        {txSheet && (
          <>
            <p className="text-sm leading-relaxed text-ink-600">
              {txSheet.description || txSheet.category} · {formatCurrency(txSheet.value)}.{" "}
              {isEstornado(txSheet)
                ? "Já foi estornado: continua no histórico, mas fora dos totais — por isso não dá pra editar."
                : "Excluir apaga de vez, mas dá pra desfazer logo em seguida."}
            </p>
            <div className="flex flex-col gap-2">
              {!isEstornado(txSheet) && (
                <Link
                  href={`/app/lancar?editar=${txSheet.id}`}
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white text-sm font-bold text-ink-900 transition-colors duration-150 hover:bg-ink-50"
                >
                  Editar
                </Link>
              )}
              <SheetAction tone="danger" onClick={() => excluirLancamento(txSheet)}>
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

      {/* Toast com Desfazer (exclusão e parcela paga) */}
      {toast && (
        <div
          role="status"
          className="fixed inset-x-3.5 bottom-[calc(88px+env(safe-area-inset-bottom))] z-[45] mx-auto flex max-w-[560px] items-center justify-between gap-3 rounded-[14px] bg-ink-900 px-4 py-3 text-white shadow-float lg:bottom-6"
        >
          {/* 2 linhas em vez de "…": nome de dívida comprido não pode esconder o que foi feito */}
          <p className="min-w-0 line-clamp-2 text-sm font-semibold">{toast.message}</p>
          <button
            type="button"
            onClick={desfazerToast}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-[10px] border border-white/[0.18] px-4 text-[13px] font-bold transition-colors duration-150 hover:bg-white/[0.06]"
          >
            Desfazer
          </button>
        </div>
      )}
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
