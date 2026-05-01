const promessas = [
  {
    n: "01",
    title: "Clareza",
    desc: "Para entender para onde seu dinheiro está indo e parar de viver no escuro.",
  },
  {
    n: "02",
    title: "Organização",
    desc: "Para colocar suas contas em ordem e dar função para cada parte do seu dinheiro.",
  },
  {
    n: "03",
    title: "Plano simples",
    desc: "Para atacar dívidas, reduzir juros e cortar desperdícios sem cortar sua dignidade.",
  },
  {
    n: "04",
    title: "Ideias práticas",
    desc: "Para encontrar caminhos reais de renda extra começando do zero.",
  },
  {
    n: "05",
    title: "Direção",
    desc: "Para construir uma vida financeira mais segura, com reserva, controle e próximos passos.",
  },
];

export default function PromiseSection() {
  return (
    <>
      <section className="section">
        <div className="container-narrow">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-green">
              A verdade
            </p>
            <h2 className="h2 mt-3">
              O problema não é falta de esforço.{" "}
              <span className="text-brand-gold">É falta de método.</span>
            </h2>
            <p className="lead mt-5">
              Muita gente trabalha muito, mas nunca aprendeu a organizar
              dinheiro, atacar dívidas e criar uma renda extra com o que já
              tem. Este material foi criado para transformar confusão em
              direção.
            </p>
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="container-narrow">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="h2">
              O que este método entrega{" "}
              <span className="text-brand-green">de verdade</span>
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {promessas.map((p) => (
              <div
                key={p.title}
                className="card flex flex-col gap-3 hover:shadow-glow"
              >
                <div className="font-display text-3xl font-bold text-brand-green">
                  {p.n}
                </div>
                <h3 className="h3">{p.title}</h3>
                <p className="text-sm text-ink-muted">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
