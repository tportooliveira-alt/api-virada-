"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Banknote, CreditCard, ExternalLink, Lightbulb, ReceiptText, Table, Target, Trophy, TrendingUp, Wallet } from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";
import { MissaoDoDia } from "@/components/MissaoDoDia";
import { QuickLaunchCard } from "@/components/QuickLaunchCard";
import { ExpenseChart } from "@/components/ExpenseChart";
import { formatCurrency, formatDate, getMetricsByScope, getMissionOfDay } from "@/lib/utils";
import type { MetricsScope } from "@/lib/utils";
import { useVirada } from "@/providers/virada-provider";
import { missions } from "@/lib/constants";

const SCOPE_KEY = "virada-inicio-scope";

function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-virada-line bg-white/[0.045] p-5">
      <div className="h-3 w-20 rounded bg-white/10" />
      <div className="mt-3 h-7 w-32 rounded bg-white/10" />
      <div className="mt-2 h-3 w-28 rounded bg-white/10" />
    </div>
  );
}

export default function InicioPage() {
  const data = useVirada();
  const [scope, setScope] = useState<MetricsScope>("currentMonth");

  // Persiste a preferência no localStorage (sem SSR crash)
  useEffect(() => {
    const saved = localStorage.getItem(SCOPE_KEY);
    if (saved === "all" || saved === "currentMonth") setScope(saved);
  }, []);

  function handleScope(next: MetricsScope) {
    setScope(next);
    localStorage.setItem(SCOPE_KEY, next);
  }

  const metrics = getMetricsByScope(data, scope);
  const missionOfDay = getMissionOfDay(missions);
  const isMissionDone = Boolean(data.missionStatus[missionOfDay.id]);

  if (!data.isReady) {
    return (
      <div className="space-y-5">
        <div className="animate-pulse rounded-lg border border-virada-line bg-white/[0.045] p-5">
          <div className="h-3 w-16 rounded bg-white/10" />
          <div className="mt-2 h-8 w-48 rounded bg-white/10" />
          <div className="mt-2 h-3 w-64 rounded bg-white/10" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
      </div>
    );
  }
  const latest = [
    ...data.expenses.map((item) => ({
      id: item.id,
      label: item.description,
      category: item.category,
      value: -item.value,
      date: item.date,
      scope: item.scope ?? "casa",
    })),
    ...data.incomes.map((item) => ({
      id: item.id,
      label: item.description,
      category: item.category,
      value: item.value,
      date: item.date,
      scope: item.scope ?? "casa",
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-virada-gray">
              Olá{data.profile?.fullName ? `, ${data.profile.fullName}` : ""}.
            </p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight text-white">
              {scope === "currentMonth" ? "Seu caixa do mês" : "Visão geral"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-virada-gray">
              {scope === "currentMonth"
                ? "Veja o que entrou, o que saiu e o resultado sem abrir a planilha completa."
                : "Totais acumulados de todos os períodos lançados."}
            </p>
          </div>
          {/* Toggle de escopo */}
          <div className="mt-1 flex shrink-0 overflow-hidden rounded-lg border border-virada-line bg-white/[0.04]">
            <button
              onClick={() => handleScope("currentMonth")}
              className={`px-3 py-1.5 text-xs font-semibold transition ${
                scope === "currentMonth"
                  ? "bg-emerald-500 text-white"
                  : "text-virada-gray hover:text-white"
              }`}
            >
              Mês atual
            </button>
            <button
              onClick={() => handleScope("all")}
              className={`px-3 py-1.5 text-xs font-semibold transition ${
                scope === "all"
                  ? "bg-emerald-500 text-white"
                  : "text-virada-gray hover:text-white"
              }`}
            >
              Ver tudo
            </button>
          </div>
        </div>
      </section>

      <MissaoDoDia
        mission={missionOfDay}
        done={isMissionDone}
        onToggle={data.toggleMission}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          label="Em caixa"
          value={formatCurrency(metrics.balanceMonth)}
          helper={scope === "currentMonth" ? "Entradas menos gastos do mês." : "Entradas menos gastos de todos os períodos."}
          tone={metrics.balanceMonth >= 0 ? "green" : "gold"}
          icon={<Wallet className="h-5 w-5" />}
        />
        <DashboardCard
          label="Entradas"
          value={formatCurrency(metrics.incomeMonth)}
          helper={scope === "currentMonth" ? "Tudo que entrou neste mês." : "Total de entradas lançadas."}
          tone="green"
          icon={<Banknote className="h-5 w-5" />}
        />
        <DashboardCard
          label="Gastos"
          value={formatCurrency(metrics.expenseMonth)}
          helper={scope === "currentMonth" ? "Compras e custos do mês." : "Total de gastos lançados."}
          tone="slate"
          icon={<ReceiptText className="h-5 w-5" />}
        />
        <DashboardCard
          label="Resultado"
          value={metrics.balanceMonth >= 0 ? "Positivo" : "Negativo"}
          helper={metrics.balanceMonth >= 0 ? "O caixa está respirando." : "Gasto maior que entrada."}
          tone={metrics.balanceMonth >= 0 ? "green" : "gold"}
          icon={<Table className="h-5 w-5" />}
        />
      </section>

      <QuickLaunchCard />

      {/* Gráfico — pra onde está indo o dinheiro */}
      <section className="rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">
              Análise de gastos
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">Pra onde está indo seu dinheiro?</h2>
          </div>
        </div>
        <ExpenseChart expenses={data.expenses} incomes={data.incomes} />
      </section>

      <section className="rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-virada-gold">
              Planilha por trás
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Base completa</h2>
          </div>
          {data.sheet.sheetUrl ? (
            <a
              href={data.sheet.sheetUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm font-semibold text-emerald-300"
            >
              Abrir planilha <ExternalLink className="h-4 w-4" />
            </a>
          ) : (
            <Link href="/app/evolucao" className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
              Conectar <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
        <p className="mt-3 text-sm leading-6 text-virada-gray">
          {data.sheet.sheetUrl
            ? "Sua planilha está conectada. Use a tela Planilha para abrir ou puxar todos os dados."
            : "Os dados completos já estão organizados em abas CSV locais: lançamentos, metas, dívidas, pontos e logs."}
        </p>
      </section>

      {/* === ATALHOS pros recursos do Kit (revelam features antes escondidas no menu) === */}
      <section className="rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-virada-gold">
            Caminho da virada
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">Use seu Kit completo</h2>
          <p className="mt-1 text-sm text-virada-gray">Tudo que você comprou está aqui — escolha por onde avançar agora.</p>
        </div>
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
          <Link href="/app/dividas" className="group flex items-center gap-3 rounded-md bg-white/5 p-3 transition hover:bg-emerald-500/10 hover:ring-1 hover:ring-emerald-400/40">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-rose-500/15 text-rose-300">
              <CreditCard className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Dívidas</p>
              <p className="text-[11px] text-virada-gray">Negociar agora</p>
            </div>
          </Link>
          <Link href="/app/metas" className="group flex items-center gap-3 rounded-md bg-white/5 p-3 transition hover:bg-emerald-500/10 hover:ring-1 hover:ring-emerald-400/40">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-amber-500/15 text-amber-300">
              <Target className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Metas</p>
              <p className="text-[11px] text-virada-gray">Reserva + objetivos</p>
            </div>
          </Link>
          <Link href="/app/missoes" className="group flex items-center gap-3 rounded-md bg-white/5 p-3 transition hover:bg-emerald-500/10 hover:ring-1 hover:ring-emerald-400/40">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-emerald-500/15 text-emerald-300">
              <Trophy className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Missões</p>
              <p className="text-[11px] text-virada-gray">30 dias gamificados</p>
            </div>
          </Link>
          <Link href="/app/gastos" className="group flex items-center gap-3 rounded-md bg-white/5 p-3 transition hover:bg-emerald-500/10 hover:ring-1 hover:ring-emerald-400/40">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-slate-500/15 text-slate-300">
              <ReceiptText className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Gastos</p>
              <p className="text-[11px] text-virada-gray">Lista completa</p>
            </div>
          </Link>
          <Link href="/app/entradas" className="group flex items-center gap-3 rounded-md bg-white/5 p-3 transition hover:bg-emerald-500/10 hover:ring-1 hover:ring-emerald-400/40">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-emerald-500/15 text-emerald-300">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Entradas</p>
              <p className="text-[11px] text-virada-gray">Tudo que entrou</p>
            </div>
          </Link>
          <Link href="/app/renda-extra" className="group flex items-center gap-3 rounded-md bg-white/5 p-3 transition hover:bg-emerald-500/10 hover:ring-1 hover:ring-emerald-400/40">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-virada-gold/15 text-virada-gold">
              <Lightbulb className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Renda extra</p>
              <p className="text-[11px] text-virada-gray">Ideias práticas</p>
            </div>
          </Link>
        </div>
      </section>

      <section className="rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-white">Últimos lançamentos</h2>
          <Link href="/app/lancar" className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
            Novo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-4 grid gap-3">
          {latest.length === 0 ? (
            <p className="rounded-md bg-white/5 p-4 text-sm text-virada-gray">
              Nenhum lançamento ainda. Comece pelo botão Lançar.
            </p>
          ) : (
            latest.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-md bg-white/5 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{item.label}</p>
                  <p className="mt-1 text-xs text-virada-gray">
                    {formatDate(item.date)} · {item.category} · {item.scope === "empresa" ? "Empresa" : "Casa"}
                  </p>
                </div>
                <strong className={item.value >= 0 ? "shrink-0 text-emerald-300" : "shrink-0 text-rose-300"}>
                  {formatCurrency(item.value)}
                </strong>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
