import { ExtraIncomeIdea } from "@/lib/types";

interface ExtraIncomeIdeaCardProps {
  idea: ExtraIncomeIdea;
}

export function ExtraIncomeIdeaCard({ idea }: ExtraIncomeIdeaCardProps) {
  return (
    <article className="rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-xl font-semibold text-white">{idea.title}</h3>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-virada-gray">
          {idea.category}
        </span>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-virada-gray">
        <p>Investimento inicial: {idea.initialInvestment}</p>
        <p>Dificuldade: {idea.difficulty}</p>
        <p>Tempo para começar: {idea.timeToStart}</p>
      </div>

      <div className="mt-5">
        <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-virada-gold">
          Passo a passo
        </h4>
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-virada-gray">
          {idea.steps.map((step) => (
            <li key={step} className="rounded-md bg-white/5 px-3 py-2">
              {step}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 rounded-lg border border-virada-line bg-slate-950/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-virada-gold">
          Mensagem pronta
        </p>
        <p className="mt-2 text-sm leading-6 text-virada-gray">{idea.message}</p>
      </div>
    </article>
  );
}
