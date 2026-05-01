import Link from "next/link";

interface PremiumGateProps {
  isPremium: boolean;
  children: React.ReactNode;
}

export function PremiumGate({ isPremium, children }: PremiumGateProps) {
  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <section className="rounded-lg border border-amber-300/30 bg-amber-300/10 p-5 shadow-panel">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200">
        Premium
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-white">Este recurso faz parte do plano Premium.</h2>
      <p className="mt-2 text-sm leading-6 text-virada-gray">
        A IA personalizada fica reservada ao Premium para manter orientação individual, análise de gastos e recomendações automáticas.
      </p>
      <Link
        href="/app/evolucao"
        className="mt-5 inline-flex rounded-md bg-emerald-500 px-5 py-3 font-semibold text-slate-950"
      >
        Voltar para evolução
      </Link>
    </section>
  );
}
