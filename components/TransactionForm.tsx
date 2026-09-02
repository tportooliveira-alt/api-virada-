"use client";

import { useState } from "react";
import { expenseCategories, incomeCategories, paymentMethods } from "@/lib/constants";
import { Expense, ExpenseNature, Income, PaymentMethod, TransactionScope } from "@/lib/types";
import { parseCurrencyInput, toInputDate } from "@/lib/utils";

interface ExpenseFormProps {
  type: "expense";
  onSubmit: (payload: Omit<Expense, "id">) => void;
}

interface IncomeFormProps {
  type: "income";
  onSubmit: (payload: Omit<Income, "id">) => void;
}

type TransactionFormProps = ExpenseFormProps | IncomeFormProps;

export function TransactionForm(props: TransactionFormProps) {
  const [date, setDate] = useState(toInputDate());
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [category, setCategory] = useState<string>(
    props.type === "expense" ? expenseCategories[0] : incomeCategories[0],
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Pix");
  const [nature, setNature] = useState<ExpenseNature>("essencial");
  const [scope, setScope] = useState<TransactionScope>("casa");
  const [error, setError] = useState("");

  const isExpense = props.type === "expense";

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const parsedValue = parseCurrencyInput(value);
        if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
          setError("Informe um valor válido.");
          return;
        }

        if (isExpense) {
          props.onSubmit({
            description,
            value: parsedValue,
            category: category as Expense["category"],
            date,
            paymentMethod,
            nature,
            scope,
            source: "app",
          });
        } else {
          props.onSubmit({
            description,
            value: parsedValue,
            category: category as Income["category"],
            date,
            scope,
            source: "app",
          });
        }

        setDescription("");
        setValue("");
        setDate(toInputDate());
        setCategory(isExpense ? expenseCategories[0] : incomeCategories[0]);
        setPaymentMethod("Pix");
        setNature("essencial");
        setScope("casa");
        setError("");
      }}
    >
      <label className="grid gap-2 text-sm text-virada-gray">
        Descrição
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={isExpense ? "Ex.: Mercado da semana" : "Ex.: Salário do mês"}
          className="rounded-md border border-virada-line bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500"
          required
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm text-virada-gray">
          Valor
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            type="number"
            min="0.01"
            step="0.01"
            className="rounded-md border border-virada-line bg-white/5 px-4 py-3 text-white outline-none"
            required
          />
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
        </label>

        <label className="grid gap-2 text-sm text-virada-gray">
          Data
          <input
            value={date}
            onChange={(event) => setDate(event.target.value)}
            type="date"
            className="rounded-md border border-virada-line bg-white/5 px-4 py-3 text-white outline-none"
            required
          />
        </label>
      </div>

      <label className="grid gap-2 text-sm text-virada-gray">
        Categoria
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="rounded-md border border-virada-line bg-white/5 px-4 py-3 text-white outline-none"
        >
          {(isExpense ? expenseCategories : incomeCategories).map((item) => (
            <option key={item} value={item} className="bg-slate-950">
              {item}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2 text-sm text-virada-gray">
        Uso
        <select
          value={scope}
          onChange={(event) => setScope(event.target.value as TransactionScope)}
          className="rounded-md border border-virada-line bg-white/5 px-4 py-3 text-white outline-none"
        >
          <option value="casa" className="bg-slate-950">
            Casa
          </option>
          <option value="empresa" className="bg-slate-950">
            Empresa
          </option>
        </select>
      </label>

      {isExpense ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-virada-gray">
            Forma de pagamento
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
              className="rounded-md border border-virada-line bg-white/5 px-4 py-3 text-white outline-none"
            >
              {paymentMethods.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm text-virada-gray">
            Tipo do gasto
            <select
              value={nature}
              onChange={(event) => setNature(event.target.value as ExpenseNature)}
              className="rounded-md border border-virada-line bg-white/5 px-4 py-3 text-white outline-none"
            >
              <option value="essencial" className="bg-slate-950">
                Essencial
              </option>
              <option value="impulso" className="bg-slate-950">
                Impulso
              </option>
            </select>
          </label>
        </div>
      ) : null}

      <button
        type="submit"
        className="rounded-md bg-emerald-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
      >
        Salvar
      </button>
    </form>
  );
}
