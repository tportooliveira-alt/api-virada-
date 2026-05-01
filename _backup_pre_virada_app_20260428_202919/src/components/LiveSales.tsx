"use client";

import { useEffect, useState } from "react";
import { LIVE_SALES } from "@/config/site";

export default function LiveSales() {
  const [msg, setMsg] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!LIVE_SALES.enabled) return;

    let i = 0;
    let timer: ReturnType<typeof setTimeout>;

    function loop() {
      const text = LIVE_SALES.pool[i % LIVE_SALES.pool.length];
      const minutes = Math.floor(Math.random() * 12) + 1;
      setMsg(`${text} • há ${minutes} min`);
      setVisible(true);
      timer = setTimeout(() => {
        setVisible(false);
        timer = setTimeout(() => {
          i += 1;
          loop();
        }, 4000);
      }, 5500);
    }

    const start = setTimeout(loop, 6000);
    return () => {
      clearTimeout(start);
      clearTimeout(timer);
    };
  }, []);

  if (!LIVE_SALES.enabled || !msg) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-5 left-5 z-40 max-w-[calc(100vw-2.5rem)] transition-all duration-500 sm:max-w-sm ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <div className="flex items-center gap-3 rounded-xl border border-bg-border bg-bg-card/95 px-4 py-3 shadow-2xl backdrop-blur">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-green/15 text-brand-green">
          ✓
        </div>
        <div>
          <div className="text-xs font-semibold text-ink">{msg}</div>
          <div className="text-[11px] text-ink-subtle">
            O Código da Virada Financeira
          </div>
        </div>
      </div>
    </div>
  );
}
