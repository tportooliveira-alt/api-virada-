"use client";

import { FormEvent, useState } from "react";
import {
  BanknoteArrowDown,
  BanknoteArrowUp,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Car,
  ChartNoAxesCombined,
  Check,
  CreditCard,
  Droplets,
  Ellipsis,
  Gamepad2,
  Handshake,
  HeartPulse,
  House,
  Lightbulb,
  ReceiptText,
  ShoppingBasket,
  UtensilsCrossed,
  WalletCards,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Expense, Income, TransactionScope } from "@/lib/types";
import { useVirada } from "@/providers/virada-provider";
import { formatCurrency, parseCurrencyInput } from "@/lib/utils";

interface CategoryOption {
  key: string;
  label: string;
  icon: LucideIcon;
}

const EXPENSE_CATS: CategoryOption[] = [
  { key: "Mercado", icon: ShoppingBasket, label: "Mercado" },
  { key: "Energia", icon: Zap, label: "Energia" },
  { key: "Transporte", icon: Car, label: "Transporte" },
  { key: "Aluguel", icon: House, label: "Aluguel" },
  { key: "Saúde", icon: HeartPulse, label: "Saúde" },
  { key: "Delivery", icon: UtensilsCrossed, label: "Delivery" },
  { key: "Lazer", icon: Gamepad2, label: "Lazer" },
  { key: "Cartão", icon: CreditCard, label: "Cartão" },
  { key: "Internet", icon: Wifi, label: "Internet" },
  { key: "Educação", icon: BookOpen, label: "Educação" },
  { key: "Água", icon: Droplets, label: "Água" },
  { key: "Outros", icon: Ellipsis, label: "Outros" },
];

const INCOME_CATS: CategoryOption[] = [
  { key: "Salário", icon: BriefcaseBusiness, label: "Salário" },
  { key: "Venda", icon: Handshake, label: "Venda" },
  { key: "Serviço", icon: Wrench, label: "Serviço" },
  { key: "Renda extra", icon: Lightbulb, label: "Renda extra" },
  { key: "Recebimento", icon: WalletCards, label: "Recebimento" },
  { key: "Comissão", icon: ChartNoAxesCombined, label: "Comissão" },
  { key: "Outros", icon: Ellipsis, label: "Outros" },
];

const PAYMENTS = ["Pix", "Dinheiro", "Débito", "Crédito", "Boleto"] as const;

type Tab = "gasto" | "entrada";

function formatBRL(raw: string) {
  const value = parseCurrencyInput(raw);
  return Number.isFinite(value) && value > 0 ? formatCurrency(value) : "R$ 0,00";
}

export default function LancarPage() {
  const data = useVirada();
  const [tab, setTab] = useState<Tab>("gasto");
  const [scope, setScope] = useState<TransactionScope>("casa");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [pagamento, setPagamento] = useState<string>("Pix");
  const [natureza, setNatureza] = useState<"essencial" | "impulso">("essencial");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const cats = tab === "gasto" ? EXPENSE_CATS : INCOME_CATS;
  const isExpense = tab === "gasto";

  function reset() {
    setValor("");
    setDescricao("");
    setCategoria("");
    setPagamento("Pix");
    setNatureza("essencial");
    setError("");
  }

  function switchTab(nextTab: Tab) {
    setTab(nextTab);
    setCategoria("");
    setError("");
    setSuccess("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedValue = parseCurrencyInput(valor);

    if (!valor || Number.isNaN(parsedValue) || parsedValue <= 0) {
      setError("Informe um valor maior que zero.");
      return;
    }
    if (!categoria) {
      setError("Escolha uma categoria para continuar.");
      return;
    }
    if (!descricao.trim() && categoria === "Outros") {
      setError("Descreva o lançamento quando escolher a categoria Outros.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      if (isExpense) {
        await data.addExpense({
          description: descricao || categoria,
          value: parsedValue,
          category: categoria as Expense["category"],
          date: new Date().toISOString().split("T")[0],
          paymentMethod: pagamento as Expense["paymentMethod"],
          nature: natureza,
          scope,
          source: "app",
        });
        setSuccess(`Gasto de ${formatCurrency(parsedValue)} registrado.`);
      } else {
        await data.addIncome({
          description: descricao || categoria,
          value: parsedValue,
          category: categoria as Income["category"],
          date: new Date().toISOString().split("T")[0],
          scope,
          source: "app",
        });
        setSuccess(`Entrada de ${formatCurrency(parsedValue)} registrada.`);
      }
      reset();
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(20rem,0.88fr)]" onSubmit={handleSubmit}>
      <div className="space-y-4">
        <section className="surface-card p-2" aria-label="Tipo de lançamento">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => switchTab("gasto")}
              aria-pressed={isExpense}
              className={`flex min-h-14 items-center justify-center gap-2 rounded-2xl text-sm font-extrabold transition ${
                isExpense ? "bg-[#E6674F] text-[#FFFCFB] shadow-md" : "text-[#647875] hover:bg-[#F4F7F5]"
              }`}
            >
              <BanknoteArrowUp className="h-5 w-5" /> Registrar gasto
            </button>
            <button
              type="button"
              onClick={() => switchTab("entrada")}
              aria-pressed={!isExpense}
              className={`flex min-h-14 items-center justify-center gap-2 rounded-2xl text-sm font-extrabold transition ${
                !isExpense ? "bg-[#0EA978] text-[#F6FAF8] shadow-md" : "text-[#647875] hover:bg-[#F4F7F5]"
              }`}
            >
              <BanknoteArrowDown className="h-5 w-5" /> Registrar entrada
            </button>
          </div>
        </section>

        <section className="surface-card p-5 sm:p-6">
          <p className="eyebrow">1. Valor e identificação</p>
          <label className="mt-5 block">
            <span className="text-xs font-bold text-[#647875]">Valor</span>
            <div className="mt-2 flex items-center rounded-2xl border border-[#133335]/15 bg-[#F8FAF9] px-4 focus-within:border-[#0EA978] focus-within:ring-4 focus-within:ring-[#0EA978]/10">
              <span className="mr-2 text-lg font-bold text-[#647875]">R$</span>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0,00"
                value={valor}
                onChange={(event) => setValor(event.target.value)}
                className="min-h-[4.25rem] w-full bg-transparent font-display text-3xl font-semibold tracking-tight text-[#133335] outline-none placeholder:text-[#B7C5C1]"
                aria-label="Valor do lançamento"
              />
            </div>
          </label>

          <label className="mt-5 block">
            <span className="text-xs font-bold text-[#647875]">Descrição</span>
            <input
              type="text"
              placeholder={isExpense ? "Ex.: mercado da semana" : "Ex.: pagamento do cliente"}
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
              className="input-base mt-2 px-4 py-3.5 text-sm placeholder:text-[#94A6A1]"
            />
            <span className="mt-2 block text-xs leading-5 text-[#7B8D89]">Use um nome que você reconheça quando consultar a planilha.</span>
          </label>
        </section>

        <section className="surface-card p-5 sm:p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow">2. Categoria</p>
              <h2 className="mt-1.5 text-lg font-semibold text-[#133335]">Onde esse valor se encaixa?</h2>
            </div>
            {categoria ? <span className="rounded-full bg-[#E8F0EC] px-3 py-1 text-xs font-bold text-[#3C5552]">{categoria}</span> : null}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {cats.map((category) => {
              const Icon = category.icon;
              const active = categoria === category.key;
              return (
                <button
                  type="button"
                  key={category.key}
                  onClick={() => setCategoria(category.key)}
                  aria-pressed={active}
                  className={`relative flex min-h-[5.25rem] flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-xs font-bold transition ${
                    active
                      ? isExpense
                        ? "border-[#E6674F] bg-[#FFF0EC] text-[#B63F2D] shadow-sm"
                        : "border-[#0EA978] bg-[#EBF8F3] text-[#08785A] shadow-sm"
                      : "border-[#133335]/10 bg-[#F8FAF9] text-[#647875] hover:-translate-y-0.5 hover:border-[#133335]/25 hover:bg-white"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="leading-tight">{category.label}</span>
                  {active ? <Check className="absolute right-2 top-2 h-3.5 w-3.5" /> : null}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <div className="space-y-4 xl:sticky xl:top-7">
        <section className="surface-card p-5 sm:p-6">
          <p className="eyebrow">3. Detalhes</p>

          <fieldset className="mt-5">
            <legend className="text-xs font-bold text-[#647875]">Esse dinheiro é de onde?</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["casa", "empresa"] as TransactionScope[]).map((item) => {
                const active = scope === item;
                const Icon = item === "casa" ? House : Building2;
                return (
                  <button
                    type="button"
                    key={item}
                    onClick={() => setScope(item)}
                    aria-pressed={active}
                    className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border text-sm font-bold capitalize transition ${
                      active ? "border-[#133335] bg-[#133335] text-[#F6FAF8]" : "border-[#133335]/10 bg-white text-[#647875] hover:bg-[#F4F7F5]"
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {item}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {isExpense ? (
            <>
              <fieldset className="mt-5">
                <legend className="text-xs font-bold text-[#647875]">Forma de pagamento</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PAYMENTS.map((item) => (
                    <button
                      type="button"
                      key={item}
                      onClick={() => setPagamento(item)}
                      aria-pressed={pagamento === item}
                      className={`rounded-full border px-3.5 py-2 text-xs font-bold transition ${
                        pagamento === item
                          ? "border-[#DDAF2B] bg-[#FFF8E8] text-[#76520C]"
                          : "border-[#133335]/10 bg-white text-[#647875] hover:border-[#133335]/25"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="mt-5">
                <legend className="text-xs font-bold text-[#647875]">Esse gasto era necessário?</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["essencial", "impulso"] as const).map((item) => (
                    <button
                      type="button"
                      key={item}
                      onClick={() => setNatureza(item)}
                      aria-pressed={natureza === item}
                      className={`min-h-12 rounded-xl border text-sm font-bold transition ${
                        natureza === item
                          ? item === "essencial"
                            ? "border-[#0EA978] bg-[#EBF8F3] text-[#08785A]"
                            : "border-[#E6674F] bg-[#FFF0EC] text-[#B63F2D]"
                          : "border-[#133335]/10 bg-white text-[#647875] hover:bg-[#F4F7F5]"
                      }`}
                    >
                      {item === "essencial" ? "Essencial" : "Por impulso"}
                    </button>
                  ))}
                </div>
              </fieldset>
            </>
          ) : null}
        </section>

        <section className={`rounded-[1.35rem] p-5 text-[#F6FAF8] shadow-[0_18px_44px_rgba(19,51,53,0.16)] ${isExpense ? "bg-[#7A3028]" : "bg-[#133335]"}`}>
          <div className="flex items-center gap-2 text-ink-900/70">
            <ReceiptText className="h-4 w-4" />
            <span className="text-xs font-extrabold uppercase tracking-[0.13em]">Resumo do lançamento</span>
          </div>
          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs text-ink-900/65">{isExpense ? "Gasto" : "Entrada"} em {scope}</p>
              <strong className="mt-1 block font-display text-2xl font-semibold text-[#F6FAF8]">{formatBRL(valor)}</strong>
            </div>
            <span className="max-w-[9rem] truncate rounded-full bg-ink-100 px-3 py-1.5 text-xs font-bold text-[#F6FAF8]">
              {categoria || "Sem categoria"}
            </span>
          </div>

          <div className="mt-4" aria-live="polite">
            {error ? <p className="rounded-xl bg-ink-100 px-3 py-2.5 text-sm text-[#F6FAF8]">{error}</p> : null}
            {success ? <p className="rounded-xl bg-[#CBEA6B] px-3 py-2.5 text-sm font-bold text-[#133335]">{success}</p> : null}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={`mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-extrabold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${
              isExpense ? "bg-[#FFD4C9] text-[#7A3028] hover:bg-white" : "bg-[#CBEA6B] text-[#133335] hover:bg-white"
            }`}
          >
            <Check className="h-5 w-5" />
            {submitting ? "Salvando…" : isExpense ? "Confirmar gasto" : "Confirmar entrada"}
          </button>
        </section>
      </div>
    </form>
  );
}
