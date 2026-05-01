import { EmptyState } from "@/components/EmptyState";
import { Expense, Income } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

interface TransactionListProps {
  type: "expense" | "income";
  items: Array<Expense | Income>;
  onDelete: (id: string) => void;
}

export function TransactionList({ type, items, onDelete }: TransactionListProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        title={type === "expense" ? "Nenhum gasto ainda" : "Nenhuma entrada ainda"}
        description="Comece registrando agora para dar clareza ao seu mês."
      />
    );
  }

  return (
    <div className="grid gap-4">
      {[...items]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map((item) => {
          const isExpense = type === "expense";
          const expenseItem = isExpense ? (item as Expense) : null;

          return (
            <article
              key={item.id}
            className="rounded-lg border border-virada-line bg-white/[0.045] p-4 shadow-panel"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">{item.description}</h3>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-virada-gray">
                      {item.category}
                    </span>
                    {expenseItem ? (
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          expenseItem.nature === "impulso"
                            ? "bg-amber-300/15 text-amber-300"
                            : "bg-sky-400/15 text-sky-300"
                        }`}
                      >
                        {expenseItem.nature === "impulso" ? "Impulso" : "Essencial"}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-virada-gray">
                    <span>{formatDate(item.date)}</span>
                    {expenseItem ? <span>{expenseItem.paymentMethod}</span> : null}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
                  <strong
                    className={`text-xl font-semibold ${
                      isExpense ? "text-rose-300" : "text-emerald-400"
                    }`}
                  >
                    {formatCurrency(item.value)}
                  </strong>
                  <button
                    onClick={() => onDelete(item.id)}
                    className="rounded-xl border border-virada-line px-3 py-2 text-sm text-virada-gray transition hover:border-rose-400/50 hover:text-rose-300"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </article>
          );
        })}
    </div>
  );
}
