import { ProgressBar } from "@/components/ProgressBar";

interface ViradaScoreCardProps {
  score: number;
  level: string;
  points: number;
}

export function ViradaScoreCard({ score, level, points }: ViradaScoreCardProps) {
  return (
    <section className="rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-virada-gold">
        Índice da Virada
      </p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <strong className="text-4xl font-semibold text-white">{score}</strong>
          <span className="ml-2 text-sm text-virada-gray">/100</span>
        </div>
        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-300">
          {level}
        </span>
      </div>
      <div className="mt-5">
        <ProgressBar value={score} label="Seu Índice da Virada não mede riqueza. Ele mede evolução." />
      </div>
      <p className="mt-4 text-sm text-virada-gray">{points} Pontos de Virada acumulados.</p>
    </section>
  );
}
