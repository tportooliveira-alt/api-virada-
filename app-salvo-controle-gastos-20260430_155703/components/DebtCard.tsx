import { Debt } from "@/lib/types";
import {
  formatCurrency,
  formatDate,
  getDebtStatusLabel,
  getPriorityClasses,
} from "@/lib/utils";

interface DebtCardProps {
  debt: Debt;
  onStatusChange: (id: string, status: Debt["status"]) => void;
}

export function DebtCard({ debt, onStatusChange }: DebtCardProps) {
  return (
    <article
      className={`rounded-lg border p-5 shadow-panel ${getPriorityClasses(debt.priority)}`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold text-white">{debt.name}</h3>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-virada-gold">
              {debt.priority}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-virada-gray">
              {getDebtStatusLabel(debt.status)}
            </span>
          </div>
          <div className="grid gap-1 text-sm text-virada-gray">
            <p>Total: {formatCurrency(debt.totalValue)}</p>
            <p>Parcela: {formatCurrency(debt.installmentValue)}</p>
            <p>Vencimento: {formatDate(debt.dueDate)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onStatusChange(debt.id, "negociando")}
            className="rounded-xl border border-virada-line px-3 py-2 text-sm text-virada-gray transition hover:border-amber-300/50 hover:text-amber-300"
          >
            Negociando
          </button>
          <button
            onClick={() => onStatusChange(debt.id, "quitada")}
            className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            Marcar quitada
          </button>
        </div>
      </div>
    </article>
  );
}
