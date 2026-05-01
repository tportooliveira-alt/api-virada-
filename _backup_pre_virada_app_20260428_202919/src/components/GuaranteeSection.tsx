export default function GuaranteeSection() {
  return (
    <section className="section">
      <div className="container-narrow">
        <div className="mx-auto max-w-3xl">
          <div className="card flex flex-col items-center gap-6 p-8 text-center md:flex-row md:p-10 md:text-left">
            <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-2 border-brand-green/40 bg-brand-green/10">
              <span className="text-5xl">🛡️</span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-green">
                Risco zero
              </p>
              <h2 className="h2 mt-2">Garantia de 7 dias</h2>
              <p className="lead mt-3">
                Você pode acessar o material e, se perceber que ele não é
                para você, solicitar reembolso dentro do prazo da plataforma
                utilizada. Sem perguntas, sem burocracia.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
