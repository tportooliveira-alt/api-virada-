"use client";

import { TransactionForm } from "@/components/TransactionForm";
import { TransactionList } from "@/components/TransactionList";
import type { Income } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { useVirada } from "@/providers/virada-provider";

export default function IncomesPage() {
  const data = useVirada();
  const extraIncomeTotal = data.incomes
    .filter((item) => item.category !== "Salário")
    .reduce((total, item) => total + item.value, 0);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="space-y-6">
        <article className="rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
          <h2 className="text-2xl font-semibold text-white">Cadastrar entrada</h2>
          <p className="mt-2 text-sm leading-6 text-virada-gray">
            Salário, comissão, venda ou serviço. Toda entrada conta.
          </p>
          <div className="mt-5">
            <TransactionForm type="income" onSubmit={data.addIncome} />
          </div>
        </article>

        <article className="rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
          <h3 className="text-xl font-semibold text-white">Visão rápida das entradas</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-slate-950/30 p-4">
              <p className="text-sm text-virada-gray">Total de entradas</p>
              <strong className="mt-2 block text-2xl text-white">
                {formatCurrency(data.incomes.reduce((total, item) => total + item.value, 0))}
              </strong>
            </div>
            <div className="rounded-lg bg-slate-950/30 p-4">
              <p className="text-sm text-virada-gray">Renda extra registrada</p>
              <strong className="mt-2 block text-2xl text-emerald-400">
                {formatCurrency(extraIncomeTotal)}
              </strong>
            </div>
          </div>
        </article>
      </section>

      <section className="rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
        <h2 className="text-2xl font-semibold text-white">Entradas cadastradas</h2>
        <p className="mt-2 text-sm leading-6 text-virada-gray">
          Mantenha o histórico. Isso mostra se sua renda extra está começando a respirar.
        </p>
        <div className="mt-5">
          <TransactionList
            type="income"
            items={data.incomes}
            onDelete={data.removeIncome}
            onEstorno={(item) => {
              const income = item as Income;
              data.estornar({
                id: income.id,
                type: "income",
                description: income.description,
                value: income.value,
                category: income.category,
                scope: income.scope,
                date: income.date,
              });
            }}
          />
        </div>
      </section>
    </div>
  );
}
