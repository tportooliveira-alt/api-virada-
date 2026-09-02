"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { ProgressBar } from "@/components/ProgressBar";
import { Goal } from "@/lib/types";
import { formatCurrency, getGoalProgress, parseCurrencyInput } from "@/lib/utils";

interface GoalCardProps {
  goal: Goal;
  onUpdate: (id: string, value: number) => void;
  onDelete?: (id: string) => void;
}

export function GoalCard({ goal, onUpdate, onDelete }: GoalCardProps) {
  const [currentValue, setCurrentValue] = useState(String(goal.currentValue));
  const [error, setError] = useState("");
  const progress = getGoalProgress(goal);

  function handleUpdate() {
    const parsedValue = parseCurrencyInput(currentValue);
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      setError("Valor inválido.");
      return;
    }
    onUpdate(goal.id, parsedValue);
    setError("");
  }

  return (
    <article className="rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-semibold text-white">{goal.name}</h3>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-virada-gray">
              {goal.type}
            </span>
          </div>
          <div className="grid gap-1 text-sm text-virada-gray">
            <p>Valor alvo: {formatCurrency(goal.targetValue)}</p>
            <p>Valor atual: {formatCurrency(goal.currentValue)}</p>
          </div>
        </div>

        <div className="w-full max-w-xs space-y-3">
          <ProgressBar value={progress} label="Progresso" tone="gold" />
          <div className="flex gap-2">
            <input
              value={currentValue}
              onChange={(event) => setCurrentValue(event.target.value)}
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-xl border border-virada-line bg-white/5 px-3 py-2 text-white outline-none"
            />
            <button
              onClick={handleUpdate}
              className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
            >
              Atualizar
            </button>
          </div>
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
          {onDelete ? (
            <button
              onClick={() => {
                if (window.confirm("Excluir esta meta?")) onDelete(goal.id);
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-400/30 px-3 py-2 text-sm text-rose-300 transition hover:bg-rose-500/10"
            >
              <Trash2 className="h-4 w-4" />
              Excluir meta
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
