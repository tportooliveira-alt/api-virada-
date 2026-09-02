"use client";

import { useState } from "react";
import { DebtCard } from "@/components/DebtCard";
import { EmptyState } from "@/components/EmptyState";
import { debtPriorities } from "@/lib/constants";
import { DebtPriority, DebtStatus } from "@/lib/types";
import { parseCurrencyInput, toInputDate } from "@/lib/utils";
import { useVirada } from "@/providers/virada-provider";

export default function DebtsPage() {
  const data = useVirada();
  const [name, setName] = useState("");
  const [totalValue, setTotalValue] = useState("");
  const [installmentValue, setInstallmentValue] = useState("");
  const [dueDate, setDueDate] = useState(toInputDate());
  const [priority, setPriority] = useState<DebtPriority>("média");
  const [status, setStatus] = useState<DebtStatus>("aberta");
  const [error, setError] = useState("");

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-lg border border-virada-line bg-white p-5 shadow-card">
        <h2 className="text-2xl font-semibold text-ink-900">Cadastrar dívida</h2>
        <p className="mt-2 text-sm leading-6 text-virada-gray">
          Coloque a dívida no mapa. Ela pesa menos quando está organizada.
        </p>

        <form
          className="mt-5 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const parsedTotal = parseCurrencyInput(totalValue);
            const parsedInstallment = parseCurrencyInput(installmentValue);
            if (!Number.isFinite(parsedTotal) || parsedTotal <= 0 || !Number.isFinite(parsedInstallment) || parsedInstallment <= 0) {
              setError("Informe valores válidos para total e parcela.");
              return;
            }
            data.addDebt({
              name,
              totalValue: parsedTotal,
              installmentValue: parsedInstallment,
              dueDate,
              priority,
              status,
            });
            setName("");
            setTotalValue("");
            setInstallmentValue("");
            setDueDate(toInputDate());
            setPriority("média");
            setStatus("aberta");
            setError("");
          }}
        >
          <label className="grid gap-2 text-sm text-virada-gray">
            Nome da dívida
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-md border border-virada-line bg-white px-4 py-3 text-ink-900 outline-none"
              placeholder="Ex.: Cartão Nubank"
              required
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-virada-gray">
              Valor total
              <input
                value={totalValue}
                onChange={(event) => setTotalValue(event.target.value)}
                type="number"
                min="0.01"
                step="0.01"
                className="rounded-md border border-virada-line bg-white px-4 py-3 text-ink-900 outline-none"
                required
              />
            </label>

            <label className="grid gap-2 text-sm text-virada-gray">
              Valor da parcela
              <input
                value={installmentValue}
                onChange={(event) => setInstallmentValue(event.target.value)}
                type="number"
                min="0.01"
                step="0.01"
                className="rounded-md border border-virada-line bg-white px-4 py-3 text-ink-900 outline-none"
                required
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-2 text-sm text-virada-gray">
              Vencimento
              <input
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                type="date"
                className="rounded-md border border-virada-line bg-white px-4 py-3 text-ink-900 outline-none"
                required
              />
            </label>

            <label className="grid gap-2 text-sm text-virada-gray">
              Prioridade
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as DebtPriority)}
                className="rounded-md border border-virada-line bg-white px-4 py-3 text-ink-900 outline-none"
              >
                {debtPriorities.map((item) => (
                  <option key={item} value={item} className="bg-white">
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm text-virada-gray">
              Status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as DebtStatus)}
                className="rounded-md border border-virada-line bg-white px-4 py-3 text-ink-900 outline-none"
              >
                <option value="aberta" className="bg-white">
                  aberta
                </option>
                <option value="negociando" className="bg-white">
                  negociando
                </option>
                <option value="quitada" className="bg-white">
                  quitada
                </option>
              </select>
            </label>
          </div>

          {error ? (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="rounded-md bg-green-500 px-5 py-3 font-semibold text-green-900 transition hover:bg-green-400"
          >
            Salvar dívida
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-virada-line bg-white p-5 shadow-card">
        <h2 className="text-2xl font-semibold text-ink-900">Dívidas cadastradas</h2>
        <p className="mt-2 text-sm leading-6 text-virada-gray">
          Dívidas de prioridade alta aparecem com destaque para facilitar foco.
        </p>

        <div className="mt-5 grid gap-4">
          {data.debts.length === 0 ? (
            <EmptyState
              title="Nenhuma dívida registrada"
              description="Comece pela lista completa. A clareza reduz o peso mental."
            />
          ) : (
            data.debts.map((debt) => (
              <DebtCard
                key={debt.id}
                debt={debt}
                onStatusChange={data.updateDebtStatus}
                onDelete={data.removeDebt}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
