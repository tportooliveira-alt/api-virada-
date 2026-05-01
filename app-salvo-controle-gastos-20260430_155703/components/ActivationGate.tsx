"use client";

import { PropsWithChildren, useEffect, useState } from "react";
import { isValidCode, getActivationState, saveActivation } from "@/lib/activation-codes";

export function ActivationGate({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<"loading" | "locked" | "unlocked">("loading");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const state = getActivationState();
    setStatus(state.activated ? "unlocked" : "locked");
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
    setError("");

    setTimeout(() => {
      if (isValidCode(code)) {
        saveActivation(code.trim().toUpperCase());
        setStatus("unlocked");
      } else {
        setError("Código inválido. Verifique o cartão que veio no produto.");
        setShaking(true);
        setTimeout(() => setShaking(false), 600);
        setCode("");
      }
      setChecking(false);
    }, 800); // pequena pausa para dar sensação de verificação
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    // Auto-formatar: VR-XXXX-XXXX
    let formatted = v.replace(/-/g, "");
    if (formatted.length > 2) formatted = formatted.slice(0, 2) + "-" + formatted.slice(2);
    if (formatted.length > 7) formatted = formatted.slice(0, 7) + "-" + formatted.slice(7);
    setCode(formatted.slice(0, 11));
    setError("");
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (status === "unlocked") {
    return <>{children}</>;
  }

  // Tela de ativação
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6">

      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 shadow-[0_0_40px_rgba(34,197,94,0.4)]">
          <span className="text-3xl">💰</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Virada App</h1>
        <p className="text-sm text-slate-400">Fluxo de caixa no celular</p>
      </div>

      {/* Card de ativação */}
      <div
        className={`w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl transition-transform ${
          shaking ? "animate-[shake_0.4s_ease-in-out]" : ""
        }`}
        style={shaking ? { animation: "shake 0.4s ease-in-out" } : {}}
      >
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
          Ativação necessária
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">
          Digite o código do produto
        </h2>
        <p className="mt-1.5 text-sm text-slate-400">
          O código está no cartão que veio na embalagem.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <input
              type="text"
              value={code}
              onChange={handleChange}
              placeholder="VR-XXXX-XXXX"
              maxLength={11}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              className={`w-full rounded-xl border px-4 py-4 text-center text-xl font-bold tracking-[0.3em] text-white outline-none transition ${
                error
                  ? "border-red-500/60 bg-red-500/10 placeholder-red-400/40"
                  : "border-white/[0.08] bg-white/5 placeholder-slate-600 focus:border-emerald-500/50 focus:bg-emerald-500/5"
              }`}
            />
            {error && (
              <p className="mt-2 text-center text-xs text-red-400">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={code.length < 11 || checking}
            className="flex w-full min-h-14 items-center justify-center gap-2 rounded-xl bg-emerald-500 text-base font-bold text-slate-950 shadow-[0_0_30px_rgba(34,197,94,0.3)] transition hover:bg-emerald-400 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed"
          >
            {checking ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                Verificando...
              </>
            ) : (
              "Ativar app"
            )}
          </button>
        </form>
      </div>

      {/* Rodapé */}
      <p className="mt-8 text-center text-xs text-slate-600">
        Produto adquirido no Hortimart · Suporte via WhatsApp
      </p>

      {/* Animação de shake via style global inline */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}
