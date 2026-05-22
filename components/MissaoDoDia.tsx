"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Target } from "lucide-react";
import { Mission } from "@/lib/types";

interface MissaoDoDiaProps {
  mission: Mission;
  done: boolean;
  onToggle: (id: string) => void;
}

export function MissaoDoDia({ mission, done, onToggle }: MissaoDoDiaProps) {
  return (
    <section
      className={`rounded-lg border p-5 shadow-panel transition-colors ${
        done
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-virada-gold/30 bg-white/[0.045]"
      }`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 shrink-0 text-virada-gold" />
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-virada-gold">
            Missão do dia
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            done
              ? "bg-emerald-500 text-slate-950"
              : "bg-virada-gold/15 text-virada-gold"
          }`}
        >
          {done ? "Concluída" : `Dia ${mission.day} de 30`}
        </span>
      </div>

      {/* Mission content */}
      <h2 className="mt-3 text-xl font-semibold text-white">{mission.title}</h2>
      <p className="mt-2 text-sm leading-6 text-virada-gray">{mission.description}</p>

      {/* Actions */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {done ? (
          <>
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Missão concluída hoje
            </div>
            <Link
              href="/app/missoes"
              className="flex items-center gap-1 text-sm text-virada-gray hover:text-white"
            >
              Ver todas as missões <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </>
        ) : (
          <>
            <button
              onClick={() => onToggle(mission.id)}
              className="animate-pulse rounded-md bg-virada-gold px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 hover:animate-none focus:outline-none focus:ring-2 focus:ring-virada-gold focus:ring-offset-2 focus:ring-offset-virada-bg"
            >
              Marcar como feita
            </button>
            <Link
              href="/app/missoes"
              className="flex items-center gap-1 text-sm text-virada-gray hover:text-white"
            >
              Ver mais missões <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
