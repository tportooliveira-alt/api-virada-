import { CHECKOUT_URL, WHATSAPP_URL } from "@/config/site";
import BookMockup from "./BookMockup";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="container-narrow grid items-center gap-12 py-16 md:grid-cols-[1.1fr,1fr] md:py-24">
        <div className="animate-slide-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-green/30 bg-brand-green/10 px-4 py-1.5 text-xs font-medium text-brand-green">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-brand-green" />
            Educação financeira honesta para brasileiros reais
          </span>

          <h1 className="h1 mt-5">
            Pare de viver no aperto e comece sua{" "}
            <span className="bg-gradient-to-r from-brand-green to-brand-gold bg-clip-text text-transparent">
              virada financeira
            </span>{" "}
            com clareza, plano e direção
          </h1>

          <p className="lead mt-5 max-w-xl">
            Um guia prático para organizar seu dinheiro, entender suas dívidas,
            cortar desperdícios e encontrar ideias reais de renda extra
            começando do zero.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={CHECKOUT_URL}
              className="btn-primary"
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

          <p className="mt-4 text-xs text-ink-subtle">
            Não é promessa de dinheiro fácil. É um plano simples para sair do
            improviso financeiro.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-ink-subtle">
            <div className="flex items-center gap-2">
              <span className="text-brand-green">✓</span> Acesso imediato
            </div>
            <div className="flex items-center gap-2">
              <span className="text-brand-green">✓</span> Garantia de 7 dias
            </div>
            <div className="flex items-center gap-2">
              <span className="text-brand-green">✓</span> Linguagem simples
            </div>
          </div>
        </div>

        <div className="relative">
          <BookMockup />
        </div>
      </div>
    </section>
  );
}
