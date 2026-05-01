"use client";

import { useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { GoalCard } from "@/components/GoalCard";
import { goalTypes } from "@/lib/constants";
import { GoalType } from "@/lib/types";
import { parseCurrencyInput } from "@/lib/utils";
import { useVirada } from "@/providers/virada-provider";

export default function GoalsPage() {
  const data = useVirada();
  const [name, setName] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [type, setType] = useState<GoalType>("reserva");
  const [error, setError] = useState("");

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
        <h2 className="text-2xl font-semibold text-white">Criar meta financeira</h2>
        <p className="mt-2 text-sm leading-6 text-virada-gray">
          Meta boa é a que mostra próximo passo, não só um sonho distante.
        </p>

        <form
          className="mt-5 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const parsedTarget = parseCurrencyInput(targetValue);
            const parsedCurrent = parseCurrencyInput(currentValue);
            if (!Number.isFinite(parsedTarget) || parsedTarget <= 0 || !Number.isFinite(parsedCurrent) || parsedCurrent < 0) {
              setError("Informe valores válidos para alvo e valor atual.");
              return;
            }
            data.addGoal({
              name,
              targetValue: parsedTarget,
              currentValue: parsedCurrent,
              type,
            });
            setName("");
            setTargetValue("");
            setCurrentValue("");
            setType("reserva");
            setError("");
          }}
        >
          <label className="grid gap-2 text-sm text-virada-gray">
            Nome da meta
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-md border border-virada-line bg-white/5 px-4 py-3 text-white outline-none"
              placeholder="Ex.: Quitar cartão"
              required
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-virada-gray">
              Valor alvo
              <input
                value={targetValue}
                onChange={(event) => setTargetValue(event.target.value)}
                type="number"
                min="0.01"
                step="0.01"
                className="rounded-md border border-virada-line bg-white/5 px-4 py-3 text-white outline-none"
                required
              />
            </label>

            <label className="grid gap-2 text-sm text-virada-gray">
              Valor atual
              <input
                value={currentValue}
                onChange={(event) => setCurrentValue(event.target.value)}
                type="number"
                min="0"
                step="0.01"
                className="rounded-md border border-virada-line bg-white/5 px-4 py-3 text-white outline-none"
                required
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm text-virada-gray">
            Tipo
            <select
              value={type}
              onChange={(event) => setType(event.target.value as GoalType)}
              className="rounded-md border border-virada-line bg-white/5 px-4 py-3 text-white outline-none"
            >
              {goalTypes.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>

          {error ? (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="rounded-md bg-emerald-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            Salvar meta
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
        <h2 className="text-2xl font-semibold text-white">Metas cadastradas</h2>
        <p className="mt-2 text-sm leading-6 text-virada-gray">
          Atualize o valor atual e deixe o progresso visível.
        </p>

        <div className="mt-5 grid gap-4">
          {data.goals.length === 0 ? (
            <EmptyState
              title="Nenhuma meta criada"
              description="Uma meta simples já ajuda a dar direção ao mês."
            />
          ) : (
            data.goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onUpdate={data.updateGoalCurrentValue}
                onDelete={data.removeGoal}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
