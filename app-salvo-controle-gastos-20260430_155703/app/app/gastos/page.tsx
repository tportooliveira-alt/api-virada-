"use client";

import { EmptyState } from "@/components/EmptyState";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionList } from "@/components/TransactionList";
import { formatCurrency } from "@/lib/utils";
import { useVirada } from "@/providers/virada-provider";

export default function ExpensesPage() {
  const data = useVirada();
  const impulseTotal = data.expenses
    .filter((item) => item.nature === "impulso")
    .reduce((total, item) => total + item.value, 0);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="space-y-6">
        <article className="rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
          <h2 className="text-2xl font-semibold text-white">Cadastrar gasto</h2>
          <p className="mt-2 text-sm leading-6 text-virada-gray">
            Registrar é o primeiro corte. O que aparece deixa de drenar no escuro.
          </p>
          <div className="mt-5">
            <TransactionForm type="expense" onSubmit={data.addExpense} />
          </div>
        </article>

        <article className="rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
          <h3 className="text-xl font-semibold text-white">Leitura rápida dos gastos</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-slate-950/30 p-4">
              <p className="text-sm text-virada-gray">Total de gastos</p>
              <strong className="mt-2 block text-2xl text-white">
                {formatCurrency(data.expenses.reduce((total, item) => total + item.value, 0))}
              </strong>
            </div>
            <div className="rounded-lg bg-slate-950/30 p-4">
              <p className="text-sm text-virada-gray">Gastos por impulso</p>
              <strong className="mt-2 block text-2xl text-amber-300">
                {formatCurrency(impulseTotal)}
              </strong>
            </div>
          </div>

          {impulseTotal > 0 ? (
            <p className="mt-4 text-sm leading-6 text-virada-gray">
              Existe espaço real para economia. Se parte desse valor parar de sair, sua virada ganha fôlego.
            </p>
          ) : (
            <div className="mt-4">
              <EmptyState
                title="Nenhum gasto por impulso registrado"
                description="Se aparecer, marque como impulso. Isso ajuda a enxergar onde dá para cortar."
              />
            </div>
          )}
        </article>
      </section>

      <section className="rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
        <h2 className="text-2xl font-semibold text-white">Gastos cadastrados</h2>
        <p className="mt-2 text-sm leading-6 text-virada-gray">
          Exclua o que foi lançado errado. O objetivo aqui é clareza.
        </p>
        <div className="mt-5">
          <TransactionList type="expense" items={data.expenses} onDelete={data.removeExpense} />
        </div>
      </section>
    </div>
  );
}
