import { Mission } from "@/lib/types";

interface MissionCardProps {
  mission: Mission;
  done: boolean;
  onToggle: (id: string) => void;
}

export function MissionCard({ mission, done, onToggle }: MissionCardProps) {
  return (
    <article
      className={`rounded-lg border p-5 shadow-card ${
        done ? "border-green-500/40 bg-green-500/10" : "border-virada-line bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-virada-gold">
            Dia {mission.day}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-ink-900">{mission.title}</h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs ${
            done ? "bg-green-500 text-green-900" : "bg-ink-100 text-virada-gray"
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
            ? "border border-virada-line text-virada-gray hover:text-ink-900"
            : "bg-green-500 text-green-900 hover:bg-green-400"
        }`}
      >
        {done ? "Desmarcar" : "Marcar como feita"}
      </button>
    </article>
  );
}
