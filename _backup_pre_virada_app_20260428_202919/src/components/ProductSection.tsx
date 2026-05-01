import BookMockup from "./BookMockup";

export default function ProductSection() {
  return (
    <section id="produto" className="section">
      <div className="container-narrow grid items-center gap-12 md:grid-cols-2">
        <div className="order-2 md:order-1">
          <BookMockup />
        </div>
        <div className="order-1 md:order-2">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-gold">
            O produto
          </p>
          <h2 className="h2 mt-3">
            Conheça{" "}
            <span className="text-brand-green">
              O Código da Virada Financeira
            </span>
          </h2>
          <p className="lead mt-5">
            Um guia direto ao ponto para quem quer parar de fugir dos números
            e começar uma mudança financeira real.
          </p>
          <p className="mt-4 text-sm text-ink-subtle">
            Escrito em linguagem simples, com exercícios práticos no final de
            cada capítulo. Funciona pra quem está começando do zero, pra quem
            ganha pouco e pra quem quer parar de depender só do salário.
          </p>
        </div>
      </div>
    </section>
  );
}
