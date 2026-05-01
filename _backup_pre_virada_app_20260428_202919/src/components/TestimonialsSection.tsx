const depoimentos = [
  {
    nome: "Maria S.",
    cidade: "São Paulo / SP",
    texto:
      "Eu tinha vergonha de abrir o app do banco. Em duas semanas seguindo o método, fiz a primeira negociação e cortei 40% das minhas assinaturas zumbis. Pela primeira vez em anos sinto que estou no controle.",
    iniciais: "MS",
  },
  {
    nome: "Roberto P.",
    cidade: "Curitiba / PR",
    texto:
      "Sou autônomo, sempre achei que ganhar mais era a única solução. Esse e-book me mostrou que primeiro eu precisava organizar o que já entrava. Hoje tenho reserva e durmo tranquilo.",
    iniciais: "RP",
  },
  {
    nome: "Camila L.",
    cidade: "Recife / PE",
    texto:
      "Comecei o plano de 7 dias num domingo. Na sexta-feira já tinha gerado R$ 380 com desapego. Não é mágica, é método. Recomendo.",
    iniciais: "CL",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="section">
      <div className="container-narrow">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-green">
            Quem aplicou, conta
          </p>
          <h2 className="h2 mt-3">
            Histórias reais de quem decidiu{" "}
            <span className="text-brand-green">começar</span>
          </h2>
          <p className="lead mt-4">
            Resultado depende da aplicação. A gente compartilha histórias
            verdadeiras, não promessas.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {depoimentos.map((d) => (
            <figure key={d.nome} className="card flex flex-col">
              <div className="text-2xl text-brand-gold">&ldquo;</div>
              <blockquote className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
                {d.texto}
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3 border-t border-bg-border pt-4">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-green/15 text-sm font-semibold text-brand-green">
                  {d.iniciais}
                </div>
                <div>
                  <div className="text-sm font-semibold">{d.nome}</div>
                  <div className="text-xs text-ink-subtle">{d.cidade}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-ink-subtle">
          ⚠️ Depoimentos individuais. Os resultados variam conforme a aplicação
          e contexto de cada pessoa.
        </p>
      </div>
    </section>
  );
}
