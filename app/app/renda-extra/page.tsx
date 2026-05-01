import { ExtraIncomeIdeaCard } from "@/components/ExtraIncomeIdeaCard";
import { extraIncomeIdeas } from "@/lib/constants";

export default function ExtraIncomePage() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
        <h2 className="text-2xl font-semibold text-white">Ideias práticas para começar</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-virada-gray">
          Aqui não tem promessa de enriquecimento. Tem caminho possível, simples e com ação curta para testar.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {extraIncomeIdeas.map((idea) => (
          <ExtraIncomeIdeaCard key={idea.id} idea={idea} />
        ))}
      </section>
    </div>
  );
}
