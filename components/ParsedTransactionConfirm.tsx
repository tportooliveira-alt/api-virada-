"use client";

import { useState } from "react";
import { ParsedFinancialInput, ParsedFinancialType } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface ParsedTransactionConfirmProps {
  parsed: ParsedFinancialInput;
  onConfirm: (parsed: ParsedFinancialInput) => Promise<void>;
  onCancel: () => void;
}

const typeLabels: Record<ParsedFinancialType, string> = {
  expense: "Gasto",
  income: "Entrada",
  debt_payment: "Pagamento de dívida",
  saving: "Reserva",
};

export function ParsedTransactionConfirm({ parsed, onConfirm, onCancel }: ParsedTransactionConfirmProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(parsed);
  const [isSaving, setIsSaving] = useState(false);

  async function confirm() {
    setIsSaving(true);
    await onConfirm(draft);
    setIsSaving(false);
  }

  return (
    <section className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-5 shadow-panel">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
        Encontramos isso
      </p>

      {isEditing ? (
        <div className="mt-4 grid gap-3">
          <label className="grid gap-2 text-sm text-virada-gray">
            Tipo
            <select
              value={draft.type}
              onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as ParsedFinancialType }))}
              className="rounded-md border border-virada-line bg-slate-950 px-4 py-3 text-white outline-none"
            >
              {Object.entries(typeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm text-virada-gray">
            Valor
            <input
              value={draft.amount}
              onChange={(event) => setDraft((current) => ({ ...current, amount: Number(event.target.value) }))}
              type="number"
              min="0"
              step="0.01"
              className="rounded-md border border-virada-line bg-slate-950 px-4 py-3 text-white outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-virada-gray">
            Categoria
            <input
              value={draft.category}
              onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
              className="rounded-md border border-virada-line bg-slate-950 px-4 py-3 text-white outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-virada-gray">
            Descrição
            <input
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              className="rounded-md border border-virada-line bg-slate-950 px-4 py-3 text-white outline-none"
            />
          </label>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 text-sm text-virada-gray">
          <p>Tipo: <span className="font-semibold text-white">{typeLabels[draft.type]}</span></p>
          <p>Valor: <span className="font-semibold text-white">{formatCurrency(draft.amount)}</span></p>
          <p>Categoria: <span className="font-semibold text-white">{draft.category}</span></p>
          <p>Descrição: <span className="font-semibold text-white">{draft.description}</span></p>
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <button
          onClick={confirm}
          disabled={isSaving}
          className="min-h-12 rounded-md bg-emerald-500 px-5 py-3 font-semibold text-slate-950 disabled:opacity-60"
        >
          {isSaving ? "Salvando..." : "Confirmar"}
        </button>
        <button
          onClick={() => setIsEditing((current) => !current)}
          className="min-h-12 rounded-md border border-virada-line px-5 py-3 font-semibold text-white"
        >
          {isEditing ? "Ver resumo" : "Editar"}
        </button>
        <button
          onClick={onCancel}
          className="min-h-12 rounded-md border border-virada-line px-5 py-3 font-semibold text-virada-gray"
        >
          Cancelar
        </button>
      </div>
    </section>
  );
}
