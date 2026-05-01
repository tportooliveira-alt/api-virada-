import { CHECKOUT_URL, WHATSAPP_URL } from "@/config/site";

export default function FinalCTA() {
  return (
    <section className="section">
      <div className="container-narrow">
        <div className="relative overflow-hidden rounded-3xl border border-brand-green/30 bg-gradient-to-br from-bg-card via-bg-alt to-bg-card p-10 text-center md:p-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,197,94,0.18),transparent_60%)]" />
          <div className="relative">
            <h2 className="h2 mx-auto max-w-3xl">
              Você não precisa resolver sua vida inteira hoje.{" "}
              <span className="text-brand-green">
                Só precisa dar o primeiro passo.
              </span>
            </h2>
            <p className="lead mx-auto mt-5 max-w-2xl">
              A virada financeira começa quando você para de fugir dos números
              e decide agir com direção.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={CHECKOUT_URL}
                className="btn-primary !px-8 !py-5 !text-lg"
                aria-label="Quero começar minha virada"
              >
                Quero começar minha virada →
              </a>
              <a
                href={WHATSAPP_URL}
                className="btn-secondary"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Falar pelo WhatsApp"
              >
                💬 Falar pelo WhatsApp
              </a>
            </div>

            <p className="mt-5 text-xs text-ink-subtle">
              Garantia de 7 dias • Acesso imediato • Compra 100% segura
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
