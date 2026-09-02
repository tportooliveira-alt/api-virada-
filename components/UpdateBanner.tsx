"use client";

import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";

// Aparece só quando o servidor já tem uma versão nova do app (build diferente
// da que está rodando). Confere ao abrir, quando o app volta pro primeiro plano
// e a cada 10 min. Sem versão nova, não renderiza nada.
const CHECK_MS = 10 * 60 * 1000;
const CURRENT = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

export function UpdateBanner() {
  const [available, setAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const { buildId } = (await res.json()) as { buildId?: string };
        if (!cancelled && buildId && buildId !== CURRENT) setAvailable(true);
      } catch {
        // offline ou servidor fora: tenta na próxima
      }
    }

    function onVisibility() {
      if (document.visibilityState !== "visible") return;
      setDismissed(false); // "Depois" vale até o app ser reaberto
      check();
    }

    check();
    const timer = setInterval(check, CHECK_MS);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  if (!available || dismissed) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-3.5 bottom-[calc(88px+env(safe-area-inset-bottom))] z-[45] mx-auto flex max-w-[560px] items-center gap-3 rounded-[14px] bg-ink-900 px-4 py-3 text-white shadow-float lg:bottom-6"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Nova versão do app</p>
        <p className="text-xs text-white/70">Leva um segundo e seus dados continuam aqui.</p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="h-10 rounded-[10px] px-3 text-[13px] font-semibold text-white/80 transition-colors duration-150 hover:bg-white/[0.06]"
      >
        Depois
      </button>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-green-500 px-3.5 text-[13px] font-bold text-green-900 transition-colors duration-150 hover:bg-green-400"
      >
        <RefreshCcw className="h-[15px] w-[15px]" /> Atualizar
      </button>
    </div>
  );
}
