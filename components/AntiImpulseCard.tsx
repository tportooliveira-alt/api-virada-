"use client";

import { useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useVirada } from "@/providers/virada-provider";

type CheckItem = [string, boolean, (value: boolean) => void];

function getDecision(needNow: boolean, fitsBudget: boolean, canWait24h: boolean, emotionalPurchase: boolean) {
  if (needNow && fitsBudget && !emotionalPurchase) return "Compra consciente";
  if (canWait24h || emotionalPurchase) return "Espere 24 horas";
  return "Evite essa compra agora";
}

export function AntiImpulseCard() {
  const data = useVirada();
  const [itemName, setItemName] = useState("");
  const [amount, setAmount] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [monthlyHours, setMonthlyHours] = useState("");
  const [needNow, setNeedNow] = useState(false);
  const [fitsBudget, setFitsBudget] = useState(false);
  const [canWait24h, setCanWait24h] = useState(true);
  const [emotionalPurchase, setEmotionalPurchase] = useState(false);
  const [saved, setSaved] = useState(false);

  const workHours = useMemo(() => {
    const value = Number(amount);
    const income = Number(monthlyIncome);
    const hours = Number(monthlyHours);
    if (value <= 0 || income <= 0 || hours <= 0) return null;
    return value / (income / hours);
  }, [amount, monthlyHours, monthlyIncome]);

  const decision = getDecision(needNow, fitsBudget, canWait24h, emotionalPurchase);

  return (
    <section className="rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/15 text-emerald-300">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-virada-gold">
            Modo anti-impulso
          </p>
          <h2 className="text-xl font-semibold text-white">Decida antes de comprar</h2>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <input
          value={itemName}
          onChange={(event) => setItemName(event.target.value)}
          placeholder="O que você quer comprar?"
          className="rounded-md border border-virada-line bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500"
        />
        <input
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          type="number"
          min="0"
          step="0.01"
          placeholder="Valor da compra"
          className="rounded-md border border-virada-line bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500"
        />
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={monthlyIncome}
            onChange={(event) => setMonthlyIncome(event.target.value)}
            type="number"
            min="0"
            step="0.01"
            placeholder="Renda mensal"
            className="rounded-md border border-virada-line bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500"
          />
          <input
            value={monthlyHours}
            onChange={(event) => setMonthlyHours(event.target.value)}
            type="number"
            min="0"
            step="1"
            placeholder="Horas trabalhadas por mês"
            className="rounded-md border border-virada-line bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-virada-gray">
        {([
          ["Preciso disso agora?", needNow, setNeedNow],
          ["Cabe no orçamento?", fitsBudget, setFitsBudget],
          ["Posso esperar 24 horas?", canWait24h, setCanWait24h],
          ["É compra emocional?", emotionalPurchase, setEmotionalPurchase],
        ] as CheckItem[]).map(([label, checked, setter]) => (
          <label key={String(label)} className="flex items-center gap-3 rounded-md bg-white/5 p-3">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => setter(event.target.checked)}
              className="h-4 w-4 accent-emerald-500"
            />
            {label}
          </label>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-virada-line bg-slate-950/35 p-4">
        <p className="text-sm text-virada-gray">
          Isso aproxima ou afasta minha meta?
        </p>
        {workHours ? (
          <p className="mt-2 text-lg font-semibold text-white">
            Essa compra custa aproximadamente {workHours.toFixed(1)} horas do seu trabalho.
          </p>
        ) : (
          <p className="mt-2 text-sm text-virada-slate">
            Informe renda mensal e horas trabalhadas para calcular o custo em horas.
          </p>
        )}
        <p className="mt-3 text-xl font-semibold text-emerald-300">{decision}</p>
      </div>

      <button
        onClick={() => {
          setSaved(true);
          void data.saveImpulseCheck({
            itemName,
            amount: Number(amount),
            needNow,
            fitsBudget,
            canWait24h,
            emotionalPurchase,
            decision,
          });
        }}
        className="mt-5 min-h-12 w-full rounded-md bg-emerald-500 px-5 py-3 font-semibold text-slate-950"
      >
        Registrar decisão
      </button>
      {saved ? <p className="mt-3 text-sm text-emerald-300">Decisão registrada.</p> : null}
    </section>
  );
}
