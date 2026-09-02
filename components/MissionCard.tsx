import { Mission } from "@/lib/types";

interface MissionCardProps {
  mission: Mission;
  done: boolean;
  onToggle: (id: string) => void;
}

export function MissionCard({ mission, done, onToggle }: MissionCardProps) {
  return (
    <article
      className={`rounded-lg border p-5 shadow-panel ${
        done ? "border-emerald-500/40 bg-emerald-500/10" : "border-virada-line bg-white/5"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-virada-gold">
            Dia {mission.day}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">{mission.title}</h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs ${
            done ? "bg-emerald-500 text-slate-950" : "bg-white/10 text-virada-gray"
          }`}
        >
          {done ? "Feita" : "Pendente"}
        </span>
      </div>

      <p className="mt-4 text-sm leading-6 text-virada-gray">{mission.description}</p>

      <button
        onClick={() => onToggle(mission.id)}
        className={`mt-5 rounded-md px-4 py-3 text-sm font-semibold transition ${
          done
            ? "border border-virada-line text-virada-gray hover:text-white"
            : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
        }`}
      >
        {done ? "Desmarcar" : "Marcar como feita"}
      </button>
    </article>
  );
}
