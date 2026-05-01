import {
  CHECKOUT_URL,
  ORDER_BUMP,
  PRICE_FROM,
  PRICE_FULL,
  PRICE_NOW,
  PRICE_PARCELADO,
} from "@/config/site";
import Countdown from "./Countdown";

export default function OfferSection() {
  return (
    <section id="oferta" className="section">
      <div className="container-narrow">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-green">
            Oferta de lançamento
          </p>
          <h2 className="h2 mt-3">
            Comece sua virada{" "}
            <span className="text-brand-green">hoje</span>
          </h2>
          <div className="mt-6 flex justify-center">
            <Countdown />
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-3xl">
          <div className="card relative overflow-hidden p-8 md:p-10">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-green/15 blur-3xl" />
            <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-brand-gold/10 blur-3xl" />

            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="text-sm text-ink-subtle">
                  De{" "}
                  <span className="line-through decoration-red-500/70">
                    {PRICE_FROM}
                  </span>{" "}
                  por
                </div>
                <div className="mt-2 font-display text-6xl font-extrabold text-brand-green md:text-7xl">
                  {PRICE_NOW}
                </div>
                <div className="mt-2 text-sm text-ink-muted">
                  {PRICE_PARCELADO}
                </div>
                <div className="mt-1 text-xs text-ink-subtle">
                  Preço cheio: {PRICE_FULL} • Preço especial de lançamento
                </div>
              </div>

              <ul className="mt-8 space-y-3 text-sm">
                {[
                  "E-book completo: O Código da Virada Financeira",
                  "Bônus 1 — Planilha de Controle Financeiro",
                  "Bônus 2 — Lista com 50 Ideias de Renda Extra",
                  "Bônus 3 — Roteiro para Negociar Dívidas",
                  "Bônus 4 — Plano de 7 Dias",
                  "Bônus 5 — Checklist Mensal",
                  "Acesso imediato após confirmação",
                  "Garantia incondicional de 7 dias",
                ].map((it) => (
                  <li key={it} className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-green/15 text-xs text-brand-green"
                    >
                      ✓
                    </span>
                    <span className="text-ink-muted">{it}</span>
                  </li>
                ))}
              </ul>

              {ORDER_BUMP.enabled && (
                <div className="mt-8 rounded-xl border border-brand-gold/30 bg-brand-gold/5 p-5">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-2xl">🎯</div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold uppercase tracking-widest text-brand-gold">
                        Adicione no checkout (opcional)
                      </div>
                      <div className="mt-1 text-base font-semibold text-ink">
                        {ORDER_BUMP.title}
                      </div>
                      <p className="mt-1 text-sm text-ink-muted">
                        {ORDER_BUMP.desc}
                      </p>
                      <div className="mt-2 text-sm">
                        <span className="text-ink-subtle line-through">
                          {ORDER_BUMP.priceFrom}
                        </span>{" "}
                        <span className="font-bold text-brand-gold">
                          por +{ORDER_BUMP.priceNow}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <a
                href={CHECKOUT_URL}
                className="btn-primary mt-8 w-full !py-5 !text-lg"
                aria-label="Quero acessar agora"
              >
                Quero acessar agora →
              </a>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-ink-subtle">
                <span>🔒 Compra 100% segura</span>
                <span>•</span>
                <span>Pix • Cartão • Boleto</span>
                <span>•</span>
                <span>Acesso imediato</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
