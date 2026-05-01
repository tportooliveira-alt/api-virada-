"use client";

import { useState } from "react";
import { ParsedTransactionConfirm } from "@/components/ParsedTransactionConfirm";
import { VoiceOrTextInput } from "@/components/VoiceOrTextInput";
import { Expense, Income, ParsedFinancialInput, TransactionScope } from "@/lib/types";
import { useVirada } from "@/providers/virada-provider";

export default function LancarPage() {
  const data = useVirada();
  const [parsed, setParsed] = useState<ParsedFinancialInput | null>(null);
  const [success, setSuccess] = useState("");
  const [scope, setScope] = useState<TransactionScope>("casa");

  async function confirm(input: ParsedFinancialInput) {
    if (input.type === "income") {
      await data.addIncome({
        description: input.description,
        value: input.amount,
        category: input.category as Income["category"],
        date: input.date,
        scope,
        source: "app",
      });
    }

    if (input.type === "expense" || input.type === "debt_payment") {
      await data.addExpense({
        description: input.description,
        value: input.amount,
        category: input.category as Expense["category"],
        date: input.date,
        paymentMethod: "Outro",
        nature: "essencial",
        scope,
        source: "app",
      });
      if (input.type === "debt_payment") {
        await data.addPoints(10, "revisar dívida");
      }
    }

    if (input.type === "saving") {
      const reserve = data.goals.find((goal) => goal.type === "reserva");
      if (reserve) {
        await data.updateGoalCurrentValue(reserve.id, reserve.currentValue + input.amount);
      } else {
        await data.addGoal({
          name: "Reserva",
          targetValue: Math.max(1000, input.amount),
          currentValue: input.amount,
          type: "reserva",
        });
      }
      await data.addPoints(15, "guardar dinheiro");
    }

    setParsed(null);
    setSuccess("Registrado com sucesso na base financeira.");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-virada-line bg-white/[0.045] p-4 shadow-panel">
        <p className="text-sm font-semibold text-white">Onde esse lançamento entra?</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(["casa", "empresa"] as TransactionScope[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setScope(item)}
              className={`min-h-12 rounded-md border px-4 py-3 text-sm font-semibold capitalize ${
                scope === item
                  ? "border-emerald-500 bg-emerald-500 text-slate-950"
                  : "border-virada-line bg-white/5 text-virada-gray"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </section>
      <VoiceOrTextInput
        onParsed={(value) => {
          setSuccess("");
          setParsed(value);
        }}
      />
      {parsed ? (
        <ParsedTransactionConfirm
          parsed={parsed}
          onConfirm={confirm}
          onCancel={() => setParsed(null)}
        />
      ) : null}
      {success ? (
        <section className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-5 text-sm font-semibold text-emerald-200">
          {success}
        </section>
      ) : null}
    </div>
  );
}
