"use client";

import { Download, FileSpreadsheet, RefreshCcw } from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";
import { formatCurrency, getDashboardMetrics } from "@/lib/utils";
import { useVirada } from "@/providers/virada-provider";

function sumByCategory<T extends { category: string; value: number }>(items: T[]) {
  return Object.entries(
    items.reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] ?? 0) + item.value;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
}

function sheetLabel(file: string) {
  return file
    .replace(".csv", "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function EvolucaoPage() {
  const data = useVirada();
  const metrics = getDashboardMetrics(data);
  const incomeByCategory = sumByCategory(data.incomes);
  const expenseByCategory = sumByCategory(data.expenses);
  const salesTotal = data.incomes
    .filter((item) => ["Venda", "Serviço", "Recebimento"].includes(item.category))
    .reduce((total, item) => total + item.value, 0);
  const businessOutflow = data.expenses
    .filter((item) => item.scope === "empresa")
    .reduce((total, item) => total + item.value, 0);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-virada-gold">
              Base financeira completa
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Planilhas estruturadas</h2>
            <p className="mt-2 text-sm leading-6 text-virada-gray">
              A tela inicial mostra só o essencial. Aqui ficam as abas completas para gestão, análise e exportação.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void data.syncSheet()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-virada-line text-emerald-300"
            title="Preparar sincronização"
          >
            <RefreshCcw className="h-5 w-5" />
          </button>
        </div>

        {data.sheet.url ? (
          <a
            href={data.sheet.url}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-md bg-emerald-500 px-5 py-3 font-semibold text-slate-950"
          >
            <FileSpreadsheet className="h-5 w-5" />
            Abrir planilha conectada
          </a>
        ) : (
          <p className="mt-4 rounded-md border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
            Google Planilhas ainda não está conectado. Mesmo assim, o app já grava em abas CSV prontas para importar no Google Planilhas ou Excel.
          </p>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          label="Vendas e recebimentos"
          value={formatCurrency(salesTotal)}
          helper="Entradas operacionais registradas."
          tone="green"
        />
        <DashboardCard
          label="Compras e custos"
          value={formatCurrency(metrics.expenseMonth)}
          helper="Saídas do mês."
        />
        <DashboardCard
          label="Custos da empresa"
          value={formatCurrency(businessOutflow)}
          helper="Lançamentos marcados como empresa."
          tone="gold"
        />
        <DashboardCard
          label="Resultado"
          value={formatCurrency(metrics.balanceMonth)}
          helper="Fluxo líquido do mês."
          tone={metrics.balanceMonth >= 0 ? "green" : "gold"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
          <h2 className="text-xl font-semibold text-white">Entradas por categoria</h2>
          <div className="mt-4 grid gap-3">
            {incomeByCategory.length === 0 ? (
              <p className="rounded-md bg-white/5 p-4 text-sm text-virada-gray">Nenhuma entrada registrada.</p>
            ) : (
              incomeByCategory.map(([category, value]) => (
                <div key={category} className="flex items-center justify-between gap-3 rounded-md bg-white/5 p-3">
                  <span className="text-sm text-virada-gray">{category}</span>
                  <strong className="text-emerald-300">{formatCurrency(value)}</strong>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
          <h2 className="text-xl font-semibold text-white">Saídas por categoria</h2>
          <div className="mt-4 grid gap-3">
            {expenseByCategory.length === 0 ? (
              <p className="rounded-md bg-white/5 p-4 text-sm text-virada-gray">Nenhuma saída registrada.</p>
            ) : (
              expenseByCategory.map(([category, value]) => (
                <div key={category} className="flex items-center justify-between gap-3 rounded-md bg-white/5 p-3">
                  <span className="text-sm text-virada-gray">{category}</span>
                  <strong className="text-rose-300">{formatCurrency(value)}</strong>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
        <h2 className="text-xl font-semibold text-white">Abas disponíveis</h2>
        <p className="mt-2 text-sm leading-6 text-virada-gray">
          Baixe qualquer aba para abrir no Google Planilhas ou Excel. Cada exportação entrega só os dados do usuário logado.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.sheet.files.map((file) => (
            <a
              key={file}
              href={`/api/sheets/export?sheet=${encodeURIComponent(file)}`}
              className="flex min-h-14 items-center justify-between gap-3 rounded-md border border-virada-line bg-white/5 px-4 py-3 text-sm text-white"
            >
              <span>{sheetLabel(file)}</span>
              <Download className="h-4 w-4 shrink-0 text-emerald-300" />
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
