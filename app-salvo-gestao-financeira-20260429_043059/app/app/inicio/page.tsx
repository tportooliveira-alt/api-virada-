"use client";

import Link from "next/link";
import { ArrowRight, Banknote, ReceiptText, Table, Wallet } from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";
import { QuickLaunchCard } from "@/components/QuickLaunchCard";
import { formatCurrency, formatDate, getDashboardMetrics } from "@/lib/utils";
import { useVirada } from "@/providers/virada-provider";

export default function InicioPage() {
  const data = useVirada();
  const metrics = getDashboardMetrics(data);
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
        <p className="text-sm text-virada-gray">
          Olá{data.profile?.fullName ? `, ${data.profile.fullName}` : ""}.
        </p>
        <h2 className="mt-2 text-3xl font-semibold leading-tight text-white">Seu caixa do mês</h2>
        <p className="mt-2 text-sm leading-6 text-virada-gray">
          Veja o que entrou, o que saiu e o resultado sem abrir a planilha completa.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          label="Em caixa"
          value={formatCurrency(metrics.balanceMonth)}
          helper="Entradas menos gastos do mês."
          tone={metrics.balanceMonth >= 0 ? "green" : "gold"}
          icon={<Wallet className="h-5 w-5" />}
        />
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
          label="Resultado"
          value={metrics.balanceMonth >= 0 ? "Positivo" : "Negativo"}
          helper={metrics.balanceMonth >= 0 ? "O caixa está respirando." : "Gasto maior que entrada."}
          tone={metrics.balanceMonth >= 0 ? "green" : "gold"}
          icon={<Table className="h-5 w-5" />}
        />
      </section>

      <QuickLaunchCard />

      <section className="rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-virada-gold">
              Planilha por trás
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Base completa</h2>
          </div>
          <Link href="/app/evolucao" className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
            Abrir <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="mt-3 text-sm leading-6 text-virada-gray">
          {data.sheet.url
            ? "Sua planilha está conectada. Use a tela Planilha para abrir ou puxar todos os dados."
            : "Os dados completos já estão organizados em abas CSV locais: lançamentos, metas, dívidas, pontos e logs."}
        </p>
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
