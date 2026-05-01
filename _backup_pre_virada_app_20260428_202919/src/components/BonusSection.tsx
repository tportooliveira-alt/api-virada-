const bonus = [
  {
    n: "01",
    title: "Planilha de Controle Financeiro",
    desc: "Para anotar entradas, gastos, dívidas e metas.",
  },
  {
    n: "02",
    title: "Lista com 50 Ideias de Renda Extra",
    desc: "Ideias simples para começar com pouco ou nenhum dinheiro.",
  },
  {
    n: "03",
    title: "Roteiro para Negociar Dívidas",
    desc: "Mensagens prontas para falar com bancos, lojas e empresas.",
  },
  {
    n: "04",
    title: "Plano de 7 Dias",
    desc: "Um passo a passo para começar sua virada em uma semana.",
  },
  {
    n: "05",
    title: "Checklist Mensal",
    desc: "Para revisar sua vida financeira todo mês.",
  },
];

export default function BonusSection() {
  return (
    <section id="bonus" className="section">
      <div className="container-narrow">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-gold">
            Bônus inclusos
          </p>
          <h2 className="h2 mt-3">
            Além do e-book, você também{" "}
            <span className="text-brand-gold">recebe</span>
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3 lg:grid-cols-5">
          {bonus.map((b) => (
            <div
              key={b.title}
              className="card relative overflow-hidden hover:shadow-gold"
            >
              <div className="absolute right-3 top-3 font-display text-xs font-bold tracking-widest text-brand-gold/60">
                #{b.n}
              </div>
              <div className="text-3xl">🎁</div>
              <h3 className="mt-3 text-base font-semibold leading-tight">
                {b.title}
              </h3>
              <p className="mt-2 text-sm text-ink-muted">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
