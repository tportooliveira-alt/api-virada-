"use client";

import { useState } from "react";
import { Volume2 } from "lucide-react";
import { useVirada } from "@/providers/virada-provider";

interface AudioTipCardProps {
  text: string;
}

export function AudioTipCard({ text }: AudioTipCardProps) {
  const data = useVirada();
  const [message, setMessage] = useState("");

  function speak() {
    if (!("speechSynthesis" in window)) {
      setMessage("Seu navegador não permite leitura em voz alta.");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    window.speechSynthesis.speak(utterance);
    setMessage("Dica em áudio iniciada.");
    void data.addPoints(5, "ouvir dica do dia");
  }

  return (
    <section className="rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-virada-gold">
        Dica rápida
      </p>
      <p className="mt-3 text-sm leading-6 text-virada-gray">{text}</p>
      <button
        onClick={speak}
        className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-500 px-5 py-3 font-semibold text-slate-950"
      >
        <Volume2 className="h-5 w-5" />
        Ouvir dica
      </button>
      {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
    </section>
  );
}
