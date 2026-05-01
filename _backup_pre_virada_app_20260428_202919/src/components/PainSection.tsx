const dores = [
  { icon: "📵", title: "Medo de abrir o aplicativo do banco" },
  { icon: "💳", title: "Cartão sempre alto" },
  { icon: "📨", title: "Boletos acumulados" },
  { icon: "😮‍💨", title: "Sensação de trabalhar só para sobreviver" },
  { icon: "🪫", title: "Falta de reserva" },
  { icon: "📅", title: "Dependência do próximo salário" },
];

export default function PainSection() {
  return (
    <section className="section">
      <div className="container-narrow">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="h2">
            Você trabalha, recebe… e mesmo assim o dinheiro{" "}
            <span className="text-brand-gold">desaparece</span>?
          </h2>
          <p className="lead mt-5">
            O salário cai na conta, mas já vem cheio de destino: aluguel,
            mercado, conta de luz, cartão, boleto, parcela e dívida. Quando
            você percebe, o mês ainda nem acabou e o dinheiro já foi embora.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dores.map((d) => (
            <div key={d.title} className="card flex items-center gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-bg text-2xl">
                {d.icon}
              </div>
              <div className="text-sm font-medium text-ink">{d.title}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
