"use client";

import Link from "next/link";
import {
  ArrowDown, ArrowRight, ArrowUp, FileSpreadsheet, Mic, Sparkles, Award
} from "lucide-react";
import { formatCurrency, formatDate, getDashboardMetrics, formatDecimal, isFromCurrentMonth } from "@/lib/utils";
import { useVirada } from "@/providers/virada-provider";
import { computeFinancialIntelligence } from "@/lib/financial-intelligence";
import { useMemo } from "react";

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
  // Sem o useMemo, getDashboardMetrics devolvia um objeto novo a cada render e
  // furava a memoria do useMemo abaixo — o diagnostico inteiro era recalculado
  // a cada toque, varrendo a lista de lancamentos de novo. Travava o celular.
  // Depender de `data` inteiro nao adiantaria: o provider devolve um objeto novo
  // a cada render, que e exatamente o que furava a memoria aqui.
  const metrics = useMemo(
    () => getDashboardMetrics(data),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.expenses, data.incomes, data.debts, data.goals, data.missionStatus],
  );

  // So os gastos do mes: a renda comparada e a do mes (metrics.incomeMonth).
  // Mandando o historico inteiro, "Essenciais (meta: ate 50%)" chegava a 250%.
  const expensesMonth = useMemo(
    () => data.expenses.filter((item) => isFromCurrentMonth(item.date)),
    [data.expenses],
  );

  const intel = useMemo(() => {
    if (!data.isReady) return null;
    return computeFinancialIntelligence({
      incomeMonth: metrics.incomeMonth,
      expenseMonth: metrics.expenseMonth,
      balanceMonth: metrics.balanceMonth,
      totalCash: metrics.balanceMonth,
      expenses: expensesMonth,
      debts: data.debts,
      goals: data.goals.map((g) => ({ current: g.currentValue, target: g.targetValue })),
    });
  }, [data.isReady, metrics, expensesMonth, data.debts, data.goals]);

  if (!data.isReady || !intel) return <Skeleton />;

  const positive = metrics.balanceMonth >= 0;

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
    .sort((a, b) => b.date.localeCompare(a.date) || Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 6);

  // A planilha real do comprador vive no Drive dele (provider: sheet.sheetUrl, já com /edit).
  // Este banner apontava para a prévia — quem clicava nunca chegava na planilha de verdade.
  // Quem ainda não tem planilha vai para /app/conta, o único lugar que fala com o Google.
  // O estado "carregando" não aparece aqui: acima, sem data.isReady a página é o Skeleton.
  const sheetUrl = data.sheet.sheetUrl;
  const sheetBanner = (
    <>
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-9 place-items-center rounded-lg bg-emerald-500 text-[#0F382C] shadow">
          <FileSpreadsheet className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-bold text-emerald-300 uppercase tracking-wide">
            Planilha Inteligente Google Sheets
          </p>
          <p className="text-sm font-semibold text-white">
            {sheetUrl ? "Abrir minha planilha no Google Drive" : "Criar minha planilha agora"}
          </p>
        </div>
      </div>
      <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-emerald-300">
        {sheetUrl ? "Abrir planilha" : "Criar planilha"} <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </>
  );

  return (
    <div className="space-y-5">
      {/* Hero — Fundo Escuro Executivo com Diagnóstico Real */}
      <section className="flex flex-col gap-6 rounded-[18px] bg-ink-900 p-5 text-white sm:p-7 shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
              Saldo Líquido em Caixa • Mês Atual
            </p>
            <p className="money mt-1.5 font-display text-[clamp(32px,6vw,44px)] font-extrabold leading-none tracking-[-0.03em]">
              {formatCurrency(metrics.balanceMonth)}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                positive ? "bg-green-500/[0.18] text-green-300 border border-green-500/30" : "bg-red-500/[0.18] text-red-200 border border-red-500/30"
              }`}
            >
              <i className={`h-2 w-2 rounded-full ${positive ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
              {positive ? "Caixa Positivo · Sobra Real" : "Déficit · Ajuste Imediato"}
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-3 py-1.5 text-xs font-semibold text-emerald-300 border border-white/[0.1]">
              <Award className="h-3.5 w-3.5" /> Score {intel.score.total}/100
            </span>
          </div>
        </div>

        {/* 3 Cards Principais de Transformação Financeira (Substituindo o "Lançamentos: 3") */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="min-w-0 rounded-xl bg-white/[0.06] px-3.5 py-3.5 sm:px-4 border border-white/[0.05]">
            <p className="flex items-center gap-1.5 text-xs text-ink-400">
              <ArrowUp className="h-3.5 w-3.5 text-green-400" /> Entradas
            </p>
            <p className="money mt-1.5 font-display text-lg font-bold text-green-400 sm:text-xl">
              {formatCurrency(metrics.incomeMonth)}
            </p>
            <p className="mt-1 text-[11px] text-ink-400">Renda confirmada</p>
          </div>

          <div className="min-w-0 rounded-xl bg-white/[0.06] px-3.5 py-3.5 sm:px-4 border border-white/[0.05]">
            <p className="flex items-center gap-1.5 text-xs text-ink-400">
              <ArrowDown className="h-3.5 w-3.5 text-red-300" /> Saídas
            </p>
            <p className="money mt-1.5 font-display text-lg font-bold sm:text-xl text-red-200">
              {formatCurrency(metrics.expenseMonth)}
            </p>
            <p className="mt-1 text-[11px] text-ink-400">Despesas do mês</p>
          </div>

          {/* KPI Comercial: Taxa de Sobra / Poupança Real & Runway */}
          <div className="col-span-2 min-w-0 rounded-xl bg-white/[0.06] px-3.5 py-3.5 sm:col-span-1 sm:px-4 border border-white/[0.05]">
            <p className="flex items-center gap-1.5 text-xs text-ink-400">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Sobra Real (%)
            </p>
            <p className="money mt-1.5 font-display text-lg font-bold text-white sm:text-xl">
              {formatDecimal(intel.savingsRate.pct)}%
            </p>
            <p className="mt-1 text-[11px] text-emerald-300 font-medium">
              Runway: {intel.runway.days} dias de respiro
            </p>
          </div>
        </div>

        {/* Banner de Acesso à Planilha Executiva Google Sheets */}
        <div className="rounded-xl bg-gradient-to-r from-emerald-900/60 to-emerald-950/90 border border-emerald-500/30 p-3.5 transition hover:border-emerald-400/60">
          {sheetUrl ? (
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between text-white"
            >
              {sheetBanner}
            </a>
          ) : (
            <Link href="/app/conta" className="flex items-center justify-between text-white">
              {sheetBanner}
            </Link>
          )}
          <p className="mt-2.5 border-t border-emerald-500/20 pt-2.5 text-[11px] text-ink-400">
            <Link href="/app/planilha-demo" className="font-semibold text-emerald-300 hover:text-emerald-200">
              Prévia: ver como ela é por dentro
            </Link>
          </p>
        </div>

        {/* Botão de Lançar Rápido */}
        <Link
          href="/app/lancar"
          className="flex min-h-[48px] items-center justify-center gap-2.5 rounded-xl bg-green-500 px-4 py-3 text-[15px] font-bold text-green-900 transition-colors duration-150 hover:bg-green-400 shadow-md"
        >
          <Mic className="h-[18px] w-[18px] shrink-0" />
          <span className="text-center">
            Lançar agora <span className="font-medium text-green-800">— por voz ou texto</span>
          </span>
        </Link>
      </section>

      {/* Grid: Termômetro 50/30/20 & Últimos Lançamentos */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,400px),1fr))] items-start gap-5">
        
        {/* Termômetro Regra 50/30/20 no App */}
        <section className="surface-card flex min-w-0 flex-col gap-4 p-5 sm:p-6 border border-ink-200">
          <div className="flex items-center justify-between pb-2 border-b border-ink-100">
            <div>
              <p className="eyebrow">Diagnóstico Automático</p>
              <h2 className="mt-0.5 text-lg font-bold tracking-tight text-ink-900">
                Regra 50/30/20 da Virada
              </h2>
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
              {intel.score.label}
            </span>
          </div>

          <div className="space-y-3.5">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-ink-700">Essenciais (Meta: até 50%)</span>
                <span className={`font-bold ${intel.rule503020.essentials.isOver ? "text-amber-600" : "text-emerald-700"}`}>
                  {formatDecimal(intel.rule503020.essentials.pct)}% ({formatCurrency(intel.rule503020.essentials.value)})
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-ink-100 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${intel.rule503020.essentials.isOver ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(intel.rule503020.essentials.pct, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-ink-700">Estilo de Vida & Impulso (Meta: até 30%)</span>
                <span className={`font-bold ${intel.rule503020.lifestyle.isOver ? "text-red-600" : "text-blue-700"}`}>
                  {formatDecimal(intel.rule503020.lifestyle.pct)}% ({formatCurrency(intel.rule503020.lifestyle.value)})
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-ink-100 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${intel.rule503020.lifestyle.isOver ? "bg-red-500" : "bg-blue-500"}`}
                  style={{ width: `${Math.min(intel.rule503020.lifestyle.pct, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-ink-700">Reserva & Liberdade (Meta: min. 20%)</span>
                <span className="font-bold text-purple-700">
                  {formatDecimal(intel.rule503020.future.pct)}% ({formatCurrency(intel.savingsRate.value)})
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-ink-100 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-purple-500"
                  style={{ width: `${Math.min(intel.rule503020.future.pct, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-ink-500 pt-1">
            {intel.score.description}
          </p>
        </section>

        {/* Análise de gastos ou Últimos Lançamentos */}
        <section className="surface-card flex flex-col gap-2 p-5 sm:p-6 border border-ink-200">
          <div className="flex items-center justify-between gap-4 pb-2 border-b border-ink-100">
            <h2 className="text-lg font-bold tracking-tight text-ink-900">Últimos lançamentos</h2>
            <Link
              href="/app/lancar"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
            >
              Novo <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {latest.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink-300 p-6 text-center text-sm text-ink-500">
              Nenhum lançamento ainda. Toque em <b className="font-semibold text-ink-600">Lançar</b>.
            </p>
          ) : (
            <div className="divide-y divide-ink-100">
              {latest.map((item) => {
                const income = item.value >= 0;
                return (
                  <div key={item.id} className="flex items-center justify-between gap-3 py-3">
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold ${
                          income ? "bg-green-100 text-green-700" : "bg-ink-100 text-ink-600"
                        }`}
                      >
                        {income ? "↑" : "↓"}
                      </span>
                      <span className="min-w-0 truncate">
                        <strong className="block truncate text-sm font-semibold text-ink-900">
                          {item.label}
                        </strong>
                        <small className="block text-xs text-ink-500">
                          {item.category} · {formatDate(item.date)}
                        </small>
                      </span>
                    </span>
                    <span
                      className={`money shrink-0 text-sm font-bold tabular-nums ${
                        income ? "text-green-600" : "text-ink-900"
                      }`}
                    >
                      {income ? "+" : "−"}{formatCurrency(Math.abs(item.value))}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
