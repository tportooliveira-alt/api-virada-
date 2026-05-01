"use client";

import { useEffect, useState } from "react";
import { COUNTDOWN_HOURS } from "@/config/site";

function getDeadline() {
  if (typeof window === "undefined") return Date.now();
  const KEY = "cv_deadline_v1";
  const saved = window.localStorage.getItem(KEY);
  if (saved) {
    const t = parseInt(saved, 10);
    if (!Number.isNaN(t) && t > Date.now()) return t;
  }
  const t = Date.now() + COUNTDOWN_HOURS * 60 * 60 * 1000;
  window.localStorage.setItem(KEY, String(t));
  return t;
}

export default function Countdown() {
  const [now, setNow] = useState(Date.now());
  const [deadline, setDeadline] = useState<number>(0);

  useEffect(() => {
    setDeadline(getDeadline());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!deadline) return null;
  const ms = Math.max(deadline - now, 0);
  const h = Math.floor(ms / 3.6e6);
  const m = Math.floor((ms % 3.6e6) / 6e4);
  const s = Math.floor((ms % 6e4) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="inline-flex items-center gap-3 rounded-xl border border-brand-gold/30 bg-brand-gold/10 px-4 py-2 font-mono text-sm text-brand-gold">
      <span className="text-xs uppercase tracking-widest opacity-80">
        Oferta termina em
      </span>
      <span className="text-base font-bold">
        {pad(h)}:{pad(m)}:{pad(s)}
      </span>
    </div>
  );
}
