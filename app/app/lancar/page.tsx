"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { Expense, Income, TransactionScope } from "@/lib/types";
import { useVirada } from "@/providers/virada-provider";
import { formatCurrency, parseCurrencyInput } from "@/lib/utils";

// ─── Categorias rápidas ──────────────────────────────────────────────────────

const EXPENSE_CATS = [
  { key: "Mercado",     emoji: "🛒", label: "Mercado"   },
  { key: "Energia",     emoji: "⚡", label: "Energia"   },
  { key: "Transporte",  emoji: "🚗", label: "Transporte"},
  { key: "Aluguel",     emoji: "🏠", label: "Aluguel"   },
  { key: "Saúde",       emoji: "💊", label: "Saúde"     },
  { key: "Delivery",    emoji: "🍔", label: "Delivery"  },
  { key: "Lazer",       emoji: "🎮", label: "Lazer"     },
  { key: "Cartão",      emoji: "💳", label: "Cartão"    },
  { key: "Internet",    emoji: "📶", label: "Internet"  },
  { key: "Educação",    emoji: "📚", label: "Educação"  },
  { key: "Água",        emoji: "💧", label: "Água"      },
  { key: "Outros",      emoji: "➕", label: "Outros"    },
];

const INCOME_CATS = [
  { key: "Salário",     emoji: "💼", label: "Salário"   },
  { key: "Venda",       emoji: "🤝", label: "Venda"     },
  { key: "Serviço",     emoji: "🔧", label: "Serviço"   },
  { key: "Renda extra", emoji: "💡", label: "Renda extra"},
  { key: "Recebimento", emoji: "📩", label: "Recebimento"},
  { key: "Comissão",    emoji: "📊", label: "Comissão"  },
  { key: "Outros",      emoji: "➕", label: "Outros"    },
];

const PAYMENTS = ["Pix", "Dinheiro", "Débito", "Crédito", "Boleto"] as const;

type Tab = "gasto" | "entrada";

function formatBRL(raw: string) {
  const n = parseCurrencyInput(raw);
  if (!Number.isFinite(n)) return "";
  return formatCurrency(n);
}

export default function LancarPage() {
  const data = useVirada();

  const [tab, setTab]               = useState<Tab>("gasto");
  const [scope, setScope]           = useState<TransactionScope>("casa");
  const [valor, setValor]           = useState("");
  const [descricao, setDescricao]   = useState("");
  const [categoria, setCategoria]   = useState("");
  const [pagamento, setPagamento]   = useState<string>("Pix");
  const [natureza, setNatureza]     = useState<"essencial" | "impulso">("essencial");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState("");
  const [error, setError]           = useState("");

  const cats = tab === "gasto" ? EXPENSE_CATS : INCOME_CATS;

  function reset() {
    setValor(""); setDescricao(""); setCategoria("");
    setPagamento("Pix"); setNatureza("essencial");
    setError("");
  }

  function switchTab(t: Tab) {
    setTab(t); setCategoria(""); setError("");
  }

  async function handleSubmit() {
    const v = parseCurrencyInput(valor);
    if (!valor || isNaN(v) || v <= 0) { setError("Informe um valor válido."); return; }
    if (!categoria) { setError("Selecione uma categoria."); return; }
    // Descrição obrigatória pra "Outros" OU sempre que quiser identificar na planilha
    if (!descricao.trim() && categoria === "Outros") {
      setError("Para categoria 'Outros', descreva o que foi (ex: presente, conserto, feira).");
      return;
    }

    setSubmitting(true); setError(""); setSuccess("");
    try {
      if (tab === "gasto") {
        await data.addExpense({
          description: descricao || categoria,
          value: v,
          category: categoria as Expense["category"],
          date: new Date().toISOString().split("T")[0],
          paymentMethod: pagamento as Expense["paymentMethod"],
          nature: natureza,
          scope,
          source: "app",
        });
        setSuccess(`✓ Gasto de ${formatBRL(valor)} registrado!`);
      } else {
        await data.addIncome({
          description: descricao || categoria,
          value: v,
          category: categoria as Income["category"],
          date: new Date().toISOString().split("T")[0],
          scope,
          source: "app",
        });
        setSuccess(`✓ Entrada de ${formatBRL(valor)} registrada!`);
      }
      reset();
    } catch {
      setError("Erro ao salvar. Tente novamente.");
    }
    setSubmitting(false);
  }

  return (
    <div className="space-y-4">

      {/* ── Tabs Gasto / Entrada ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => switchTab("gasto")}
          className={`flex min-h-14 items-center justify-center gap-2 rounded-xl text-base font-bold transition
            ${tab === "gasto"
              ? "bg-red-500/90 text-white shadow-lg shadow-red-500/30"
              : "border border-white/10 bg-white/5 text-slate-400"}`}
        >
          <span className="text-xl">📤</span> Gasto
        </button>
        <button
          onClick={() => switchTab("entrada")}
          className={`flex min-h-14 items-center justify-center gap-2 rounded-xl text-base font-bold transition
            ${tab === "entrada"
              ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30"
              : "border border-white/10 bg-white/5 text-slate-400"}`}
        >
          <span className="text-xl">📥</span> Entrada
        </button>
      </div>

      {/* ── Casa / Empresa ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">
        {(["casa", "empresa"] as TransactionScope[]).map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={`min-h-10 rounded-lg border text-sm font-semibold capitalize transition
              ${scope === s
                ? "border-amber-400 bg-amber-400/15 text-amber-300"
                : "border-white/10 bg-white/5 text-slate-500"}`}
          >
            {s === "casa" ? "🏠" : "🏢"} {s}
          </button>
        ))}
      </div>

      {/* ── Valor ────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
        <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400">
          Valor (R$)
        </label>
        <input
          type="number"
          inputMode="decimal"
          placeholder="0,00"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="mt-2 w-full bg-transparent text-3xl font-bold text-white outline-none placeholder:text-slate-600"
        />
      </div>

      {/* ── Descrição ────────────────────────────────────────────────────── */}
      <div>
        <input
          type="text"
          placeholder={
            tab === "gasto"
              ? "De onde veio o gasto? (ex: Supermercado Extra, Uber, iFood)"
              : "De onde veio a entrada? (ex: Salário Empresa X, Freela, Venda)"
          }
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-white/25"
        />
        <p className="mt-1 px-1 text-[11px] text-slate-600">
          Quanto mais específico, mais detalhada fica sua planilha
        </p>
      </div>

      {/* ── Categorias ───────────────────────────────────────────────────── */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Categoria
        </p>
        <div className="grid grid-cols-4 gap-2">
          {cats.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategoria(c.key)}
              className={`flex flex-col items-center gap-1 rounded-xl border py-3 text-xs font-medium transition
                ${categoria === c.key
                  ? tab === "gasto"
                    ? "border-red-400 bg-red-500/20 text-red-300"
                    : "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                  : "border-white/8 bg-white/[0.04] text-slate-400 hover:border-white/20"}`}
            >
              <span className="text-2xl">{c.emoji}</span>
              <span className="leading-tight text-center">{c.label}</span>
              {categoria === c.key && (
                <Check className="h-3 w-3" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Pagamento (só gasto) ─────────────────────────────────────────── */}
      {tab === "gasto" && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Forma de pagamento
          </p>
          <div className="flex flex-wrap gap-2">
            {PAYMENTS.map((p) => (
              <button
                key={p}
                onClick={() => setPagamento(p)}
                className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition
                  ${pagamento === p
                    ? "border-amber-400 bg-amber-400/15 text-amber-300"
                    : "border-white/10 bg-white/5 text-slate-400"}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Natureza (só gasto) ──────────────────────────────────────────── */}
      {tab === "gasto" && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setNatureza("essencial")}
            className={`rounded-xl border py-3 text-sm font-semibold transition
              ${natureza === "essencial"
                ? "border-blue-400 bg-blue-500/15 text-blue-300"
                : "border-white/10 bg-white/5 text-slate-400"}`}
          >
            ✅ Essencial
          </button>
          <button
            onClick={() => setNatureza("impulso")}
            className={`rounded-xl border py-3 text-sm font-semibold transition
              ${natureza === "impulso"
                ? "border-orange-400 bg-orange-500/15 text-orange-300"
                : "border-white/10 bg-white/5 text-slate-400"}`}
          >
            ⚡ Por impulso
          </button>
        </div>
      )}

      {/* ── Erro ────────────────────────────────────────────────────────── */}
      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* ── Sucesso ──────────────────────────────────────────────────────── */}
      {success && (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
          {success}
        </p>
      )}

      {/* ── Botão confirmar ──────────────────────────────────────────────── */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className={`w-full min-h-14 rounded-xl text-base font-bold transition disabled:opacity-50
          ${tab === "gasto"
            ? "bg-red-500 text-white hover:bg-red-400"
            : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"}`}
      >
        {submitting
          ? "Salvando…"
          : tab === "gasto"
          ? "📤 Confirmar gasto"
          : "📥 Confirmar entrada"}
      </button>

    </div>
  );
}
