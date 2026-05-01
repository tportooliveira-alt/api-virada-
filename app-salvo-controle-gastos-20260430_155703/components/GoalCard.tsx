"use client";

import { useState } from "react";
import { ProgressBar } from "@/components/ProgressBar";
import { Goal } from "@/lib/types";
import { formatCurrency, getGoalProgress } from "@/lib/utils";

interface GoalCardProps {
  goal: Goal;
  onUpdate: (id: string, value: number) => void;
}

export function GoalCard({ goal, onUpdate }: GoalCardProps) {
  const [currentValue, setCurrentValue] = useState(String(goal.currentValue));
  const progress = getGoalProgress(goal);

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
              onClick={() => onUpdate(goal.id, Number(currentValue))}
              className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
            >
              Atualizar
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
