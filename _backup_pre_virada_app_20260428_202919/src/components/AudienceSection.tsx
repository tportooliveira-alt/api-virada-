const paraQuemE = [
  { icon: "💸", title: "Quem vive no aperto" },
  { icon: "💳", title: "Quem está endividado" },
  { icon: "🚀", title: "Quem quer renda extra" },
  { icon: "📊", title: "Quem quer organizar o dinheiro" },
  { icon: "🔓", title: "Quem quer parar de depender só do salário" },
  { icon: "🌱", title: "Quem quer começar do zero com um plano simples" },
];

export default function AudienceSection() {
  return (
    <section className="section bg-bg-alt/50">
      <div className="container-narrow">
        <div className="grid gap-12 lg:grid-cols-[1.4fr,1fr]">
          <div>
            <h2 className="h2">
              Para quem este material{" "}
              <span className="text-brand-green">é feito</span>
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {paraQuemE.map((p) => (
                <div key={p.title} className="card flex items-center gap-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-green/10 text-xl">
                    {p.icon}
                  </div>
                  <div className="text-sm font-medium">{p.title}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6">
            <div className="flex items-center gap-2 text-red-400">
              <span className="text-2xl">⚠️</span>
              <span className="font-semibold uppercase tracking-wide">
                Para quem NÃO é
              </span>
            </div>
            <p className="mt-4 text-base leading-relaxed text-ink-muted">
              Este material{" "}
              <span className="font-semibold text-ink">não é para quem</span>{" "}
              procura dinheiro fácil, resultado garantido, fórmula mágica ou
              enriquecimento sem esforço.
            </p>
            <p className="mt-3 text-sm text-ink-subtle">
              Se é isso que você busca, melhor não comprar. A gente não
              promete o que não pode entregar.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
