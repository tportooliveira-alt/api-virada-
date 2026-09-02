"use client";

import Link from "next/link";
import { ArrowRight, Banknote, CalendarDays, ExternalLink, ReceiptText, Sparkles, TrendingUp } from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";
import { QuickLaunchCard } from "@/components/QuickLaunchCard";
import { ExpenseChart } from "@/components/ExpenseChart";
import { formatCurrency, formatDate, getDashboardMetrics } from "@/lib/utils";
import { useVirada } from "@/providers/virada-provider";

function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-[1.2rem] border border-[#133335]/10 bg-white p-5">
      <div className="h-3 w-20 rounded bg-[#E8F0EC]" />
      <div className="mt-3 h-7 w-32 rounded bg-[#E8F0EC]" />
      <div className="mt-2 h-3 w-28 rounded bg-[#E8F0EC]" />
    </div>
  );
}

export default function InicioPage() {
  const data = useVirada();
  const metrics = getDashboardMetrics(data);
  const currentMonth = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date());

  if (!data.isReady) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse rounded-[1.35rem] bg-[#133335] p-6">
          <div className="h-3 w-16 rounded bg-white/15" />
          <div className="mt-3 h-9 w-48 rounded bg-white/15" />
          <div className="mt-3 h-3 w-64 rounded bg-white/15" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <CardSkeleton /><CardSkeleton /><CardSkeleton />
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
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-[1.45rem] bg-[#133335] p-5 pr-12 text-[#F6FAF8] shadow-[0_22px_56px_rgba(19,51,53,0.18)] sm:p-7 sm:pr-16">
        <div className="flex flex-wrap items-center gap-2 text-[#CBEA6B]">
          <CalendarDays className="h-4 w-4" />
          <span className="text-xs font-extrabold uppercase tracking-[0.14em] first-letter:uppercase">{currentMonth}</span>
        </div>
        <p className="mt-5 text-sm text-[#B8CBC6]">Olá{data.profile?.fullName ? `, ${data.profile.fullName}` : ""}. Seu saldo do mês é</p>
        <strong className="mt-1 block font-display text-[2.15rem] font-semibold leading-tight tracking-[-0.04em] text-[#F6FAF8] sm:text-[2.8rem]">
          {formatCurrency(metrics.balanceMonth)}
        </strong>
        <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-[#DCE8E4]">
          <Sparkles className="h-4 w-4 text-[#CBEA6B]" />
          {metrics.balanceMonth >= 0 ? "Você está fechando o mês no positivo." : "Suas saídas passaram das entradas deste mês."}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <DashboardCard
          label="Entradas"
          value={formatCurrency(metrics.incomeMonth)}
          helper="Tudo que entrou neste mês."
          tone="green"
          icon={<Banknote className="h-5 w-5" />}
        />
        <DashboardCard
          label="Gastos"
          value={formatCurrency(metrics.expenseMonth)}
          helper="Compras e custos lançados."
          tone="slate"
          icon={<ReceiptText className="h-5 w-5" />}
        />
        <DashboardCard
          label="Situação"
          value={metrics.balanceMonth >= 0 ? "Positivo" : "Negativo"}
          helper={metrics.balanceMonth >= 0 ? "O caixa está respirando." : "Hora de rever as saídas."}
          tone={metrics.balanceMonth >= 0 ? "green" : "gold"}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[1.12fr_0.88fr]">
        {/* Gráfico — pra onde está indo o dinheiro */}
        <section className="surface-card p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Análise de gastos</p>
              <h2 className="mt-1.5 text-xl font-semibold text-[#133335]">Para onde está indo seu dinheiro?</h2>
            </div>
          </div>
          <ExpenseChart expenses={data.expenses} incomes={data.incomes} />
        </section>
        <QuickLaunchCard />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <section className="surface-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Planilha por trás</p>
            <h2 className="mt-1.5 text-xl font-semibold text-[#133335]">Base completa</h2>
          </div>
          {data.sheet.sheetUrl ? (
            <a
              href={data.sheet.sheetUrl}
              target="_blank"
              rel="noreferrer"
              className="-mr-2 flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-[#08785A] transition hover:bg-[#EBF8F3]"
            >
              Abrir planilha <ExternalLink className="h-4 w-4" />
            </a>
          ) : (
            <Link href="/app/evolucao" className="-mr-2 flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-[#08785A] transition hover:bg-[#EBF8F3]">
              Conectar <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
        <p className="mt-3 text-sm leading-6 text-[#647875]">
          {data.sheet.sheetUrl
            ? "Sua planilha está conectada. Use a tela Planilha para abrir ou puxar todos os dados."
            : "Os dados completos já estão organizados em abas CSV locais: lançamentos, metas, dívidas, pontos e logs."}
        </p>
      </section>

      <section className="surface-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-[#133335]">Últimos lançamentos</h2>
          <Link href="/app/lancar" className="-mr-2 flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-[#08785A] transition hover:bg-[#EBF8F3]">
            Novo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-4 grid gap-3">
          {latest.length === 0 ? (
            <p className="rounded-xl bg-[#F4F7F5] p-4 text-sm text-[#647875]">
              Nenhum lançamento ainda. Comece pelo botão Lançar.
            </p>
          ) : (
            latest.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#133335]/[0.08] bg-[#F8FAF9] p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#133335]">{item.label}</p>
                  <p className="mt-1 text-xs text-[#647875]">
                    {formatDate(item.date)} · {item.category} · {item.scope === "empresa" ? "Empresa" : "Casa"}
                  </p>
                </div>
                <strong className={item.value >= 0 ? "shrink-0 text-[#08785A]" : "shrink-0 text-[#C34A39]"}>
                  {formatCurrency(item.value)}
                </strong>
              </div>
            ))
          )}
        </div>
      </section>
      </div>
    </div>
  );
}
