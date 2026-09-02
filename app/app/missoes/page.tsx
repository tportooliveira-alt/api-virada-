"use client";

import { MissionCard } from "@/components/MissionCard";
import { ProgressBar } from "@/components/ProgressBar";
import { missions } from "@/lib/constants";
import { useVirada } from "@/providers/virada-provider";

export default function MissionsPage() {
  const data = useVirada();
  const doneCount = missions.filter((mission) => data.missionStatus[mission.id]).length;
  const progress = Math.round((doneCount / missions.length) * 100);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-virada-gold">
              Progresso geral
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              {doneCount} de {missions.length} missões concluídas
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-virada-gray">
              A virada acontece por repetição. Cada missão feita é menos desordem e mais direção.
            </p>
          </div>
          <div className="w-full max-w-sm">
            <ProgressBar value={progress} label="Barra de progresso geral" tone="green" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {missions.map((mission) => (
          <MissionCard
            key={mission.id}
            mission={mission}
            done={Boolean(data.missionStatus[mission.id])}
            onToggle={data.toggleMission}
          />
        ))}
      </section>
    </div>
  );
}
