"use client";

import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp, ExternalLink, PenLine, Table } from "lucide-react";
import { ExpenseChart } from "@/components/ExpenseChart";
import { formatCurrency, formatDate, getDashboardMetrics } from "@/lib/utils";
import { useVirada } from "@/providers/virada-provider";

// "+R$ 2.900,00" para entradas, "−R$ 950,00" (U+2212) para gastos
function signed(value: number) {
  return `${value >= 0 ? "+" : "−"}${formatCurrency(Math.abs(value))}`;
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="rounded-[18px] bg-ink-900 p-5 sm:p-7">
        <div className="h-3 w-40 rounded bg-white/[0.12]" />
        <div className="mt-3 h-10 w-52 rounded bg-white/[0.12]" />
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="h-20 rounded-xl bg-white/[0.06]" />
          <div className="h-20 rounded-xl bg-white/[0.06]" />
          <div className="h-20 rounded-xl bg-white/[0.06]" />
        </div>
        <div className="mt-6 h-[52px] rounded-xl bg-white/[0.12]" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="h-72 rounded-2xl border border-ink-200 bg-white" />
        <div className="h-72 rounded-2xl border border-ink-200 bg-white" />
      </div>
    </div>
  );
}

export default function InicioPage() {
  const data = useVirada();
  const metrics = getDashboardMetrics(data);

  if (!data.isReady) return <Skeleton />;

  const positive = metrics.balanceMonth >= 0;
  const monthCount = metrics.monthExpenses.length + metrics.monthIncomes.length;
  const impulseCount = metrics.monthExpenses.filter((item) => item.nature === "impulso").length;

  const latest = [
    ...data.expenses.map((item) => ({
      id: item.id,
      label: item.description || item.category,
      category: item.category,
      value: -item.value,
      date: item.date,
      scope: item.scope ?? "casa",
    })),
    ...data.incomes.map((item) => ({
      id: item.id,
      label: item.description || item.category,
      category: item.category,
      value: item.value,
      date: item.date,
      scope: item.scope ?? "casa",
    })),
  ]
    // data mais recente primeiro; no mesmo dia, o maior valor primeiro
    .sort((a, b) => b.date.localeCompare(a.date) || Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 6);

  return (
    <div className="space-y-5">
      {/* Hero — único fundo escuro da interface */}
      <section className="flex flex-col gap-6 rounded-[18px] bg-ink-900 p-5 text-white sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-ink-400">Olá. Em caixa neste mês</p>
            <p className="money mt-1.5 font-display text-[clamp(32px,6vw,44px)] font-extrabold leading-none tracking-[-0.03em]">
              {formatCurrency(metrics.balanceMonth)}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-semibold ${
              positive ? "bg-green-500/[0.14] text-green-300" : "bg-amber-500/[0.16] text-amber-100"
            }`}
          >
            <i className={`h-2 w-2 rounded-full ${positive ? "bg-green-500" : "bg-amber-500"}`} />
            {positive ? "Positivo · O caixa está respirando." : "Negativo · Gasto maior que entrada."}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="min-w-0 rounded-xl bg-white/[0.06] px-3.5 py-3.5 sm:px-4">
            <p className="flex items-center gap-1.5 text-xs text-ink-400">
              <ArrowUp className="h-3.5 w-3.5 text-green-400" /> Entradas
            </p>
            <p className="money mt-1.5 font-display text-lg font-bold text-green-400 sm:text-xl">{formatCurrency(metrics.incomeMonth)}</p>
            <p className="mt-1 text-xs text-ink-500">Tudo que entrou neste mês.</p>
          </div>
          <div className="min-w-0 rounded-xl bg-white/[0.06] px-3.5 py-3.5 sm:px-4">
            <p className="flex items-center gap-1.5 text-xs text-ink-400">
              <ArrowDown className="h-3.5 w-3.5 text-red-300" /> Gastos
            </p>
            <p className="money mt-1.5 font-display text-lg font-bold sm:text-xl">{formatCurrency(metrics.expenseMonth)}</p>
            <p className="mt-1 text-xs text-ink-500">Compras e custos lançados.</p>
          </div>
          <div className="col-span-2 min-w-0 rounded-xl bg-white/[0.06] px-3.5 py-3.5 sm:col-span-1 sm:px-4">
            <p className="text-xs text-ink-400">Lançamentos no mês</p>
            <p className="mt-1.5 font-display text-lg font-bold tabular-nums sm:text-xl">{monthCount}</p>
            <p className="mt-1 text-xs text-ink-500">
              {impulseCount === 0 ? "Nenhum por impulso." : `${impulseCount} por impulso.`}
            </p>
          </div>
        </div>

        <Link
          href="/app/lancar"
          className="flex min-h-[52px] items-center justify-center gap-2.5 rounded-xl bg-green-500 px-4 py-3 text-[15px] font-bold text-green-900 transition-colors duration-150 hover:bg-green-400"
        >
          <PenLine className="h-[18px] w-[18px] shrink-0" />
          <span className="text-center">
            Lançar agora <span className="font-medium text-green-800">— leva 10 segundos</span>
          </span>
        </Link>
      </section>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,400px),1fr))] items-start gap-5">
        {/* Análise de gastos */}
        <section className="surface-card flex min-w-0 flex-col gap-[18px] p-5 sm:p-[22px]">
          <div>
            <p className="eyebrow">Análise de gastos</p>
            <h2 className="mt-1 text-lg font-bold tracking-[-0.01em] text-ink-900">Pra onde está indo seu dinheiro?</h2>
          </div>
          <ExpenseChart expenses={data.expenses} incomes={data.incomes} />
        </section>

        <div className="flex min-w-0 flex-col gap-5">
          {/* Últimos lançamentos */}
          <section className="surface-card flex flex-col gap-2 p-5 sm:p-[22px]">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold tracking-[-0.01em] text-ink-900">Últimos lançamentos</h2>
              <Link
                href="/app/lancar"
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-green-700 transition-colors duration-150 hover:text-green-800"
              >
                Novo <ArrowRight className="h-[15px] w-[15px]" />
              </Link>
            </div>
            {latest.length === 0 ? (
              <p className="rounded-xl bg-ink-50 p-4 text-sm text-ink-500">
                Nenhum lançamento ainda. Comece pelo botão Lançar.
              </p>
            ) : (
              <div>
                {latest.map((item) => {
                  const income = item.value >= 0;
                  return (
                    <div key={item.id} className="flex items-center justify-between gap-3 border-b border-ink-100 py-3 last:border-b-0">
                      <span className="flex min-w-0 items-center gap-3">
                        <span
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-[13px] font-bold ${
                            income ? "bg-green-100 text-green-700" : "bg-ink-100 text-ink-600"
                          }`}
                        >
                          {item.label.charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-ink-900">{item.label}</span>
                          <span className="mt-0.5 block text-xs text-ink-500">
                            {formatDate(item.date)} · {item.category} · {item.scope === "empresa" ? "Empresa" : "Casa"}
                          </span>
                        </span>
                      </span>
                      <strong className={`money shrink-0 text-sm ${income ? "text-green-700" : "text-ink-900"}`}>
                        {signed(item.value)}
                      </strong>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Planilha Google */}
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ink-200 bg-amber-50 px-5 py-5 sm:px-[22px]">
            <div className="flex min-w-0 items-center gap-3.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-amber-100 text-amber-800">
                <Table className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <p className="eyebrow !tracking-[0.1em]">Planilha Google</p>
                <p className="mt-1 text-sm leading-5 text-ink-700">
                  {data.sheet.sheetUrl
                    ? "Sua planilha está conectada e recebe cada lançamento."
                    : "Base completa em abas: lançamentos, metas, dívidas, pontos e logs."}
                </p>
              </div>
            </div>
            {data.sheet.sheetUrl ? (
              <a
                href={data.sheet.sheetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-amber-300 bg-white px-3.5 py-2 text-[13px] font-semibold text-amber-800 transition-colors duration-150 hover:bg-amber-50"
              >
                Abrir planilha <ExternalLink className="h-[15px] w-[15px]" />
              </a>
            ) : (
              <Link
                href="/app/conta"
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-amber-300 bg-white px-3.5 py-2 text-[13px] font-semibold text-amber-800 transition-colors duration-150 hover:bg-amber-50"
              >
                Conectar <ArrowRight className="h-[15px] w-[15px]" />
              </Link>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
