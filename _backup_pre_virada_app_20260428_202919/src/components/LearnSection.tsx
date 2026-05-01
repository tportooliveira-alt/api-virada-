const aprendizados = [
  { icon: "🔍", title: "Como descobrir para onde seu dinheiro está indo" },
  { icon: "📋", title: "Como organizar contas mesmo ganhando pouco" },
  { icon: "🗓️", title: "Como montar um calendário financeiro simples" },
  { icon: "⚠️", title: "Como identificar dívidas perigosas" },
  { icon: "✂️", title: "Como cortar desperdícios sem sofrimento" },
  { icon: "💡", title: "Como começar renda extra com o que você já tem" },
  { icon: "🛡️", title: "Como montar sua primeira reserva" },
  { icon: "🧭", title: "Como criar direção para não voltar ao caos" },
];

export default function LearnSection() {
  return (
    <section className="section bg-bg-alt/50">
      <div className="container-narrow">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="h2">
            O que você vai{" "}
            <span className="text-brand-green">aprender</span>
          </h2>
          <p className="lead mt-4">
            Tudo prático, em ordem e em linguagem simples. Sem economês.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {aprendizados.map((a) => (
            <div key={a.title} className="card flex items-start gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-green/10 text-xl">
                {a.icon}
              </div>
              <div className="pt-1.5 text-base font-medium">{a.title}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
