"use client";

import { useEffect, useState } from "react";
import { CHECKOUT_URL, EXIT_POPUP } from "@/config/site";

export default function ExitPopup() {
  const [show, setShow] = useState(false);
  const [armed, setArmed] = useState(true);

  useEffect(() => {
    if (!EXIT_POPUP.enabled) return;
    if (typeof window === "undefined") return;
    const seen = sessionStorage.getItem("cv_exit_seen");
    if (seen) return;

    function onLeave(e: MouseEvent) {
      if (!armed) return;
      if (e.clientY <= 0) {
        setShow(true);
        setArmed(false);
        sessionStorage.setItem("cv_exit_seen", "1");
      }
    }
    document.addEventListener("mouseleave", onLeave);
    return () => document.removeEventListener("mouseleave", onLeave);
  }, [armed]);

  if (!EXIT_POPUP.enabled || !show) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-popup-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-brand-gold/40 bg-bg-card p-8 shadow-gold">
        <button
          type="button"
          onClick={() => setShow(false)}
          aria-label="Fechar"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-bg text-ink-muted hover:text-ink"
        >
          ×
        </button>
        <div className="text-center">
          <div className="text-4xl">👋</div>
          <h2
            id="exit-popup-title"
            className="mt-4 font-display text-2xl font-bold"
          >
            {EXIT_POPUP.headline}
          </h2>
          <p className="mt-3 text-sm text-ink-muted">{EXIT_POPUP.subhead}</p>
          <div className="mt-5 rounded-xl border border-brand-gold/40 bg-brand-gold/10 px-4 py-3 font-mono text-lg font-bold tracking-widest text-brand-gold">
            {EXIT_POPUP.coupon}
          </div>
          <a
            href={CHECKOUT_URL}
            className="btn-primary mt-6 w-full"
            aria-label="Aplicar desconto agora"
          >
            Aplicar desconto agora →
          </a>
          <button
            type="button"
            onClick={() => setShow(false)}
            className="mt-3 text-xs text-ink-subtle hover:text-ink"
          >
            Não, obrigado
          </button>
        </div>
      </div>
    </div>
  );
}
