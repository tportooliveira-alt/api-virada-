"use client";

import { useState } from "react";

const faq = [
  {
    q: "Esse material promete dinheiro fácil?",
    a: "Não. Ele entrega clareza, organização, plano, ideias práticas e direção. Resultado depende da aplicação.",
  },
  {
    q: "Serve para quem está começando do zero?",
    a: "Sim. O conteúdo foi pensado para quem precisa começar com passos simples.",
  },
  {
    q: "Preciso entender de investimentos?",
    a: "Não. O foco inicial é organizar, atacar dívidas, cortar desperdícios e criar renda extra.",
  },
  {
    q: "Recebo o quê?",
    a: "Você recebe o e-book principal e os bônus: planilha, lista de renda extra, roteiro de negociação, plano de 7 dias e checklist mensal.",
  },
  {
    q: "Como acesso?",
    a: "Após a compra pela plataforma, você recebe as instruções de acesso ao material.",
  },
];

export default function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="section bg-bg-alt/50">
      <div className="container-narrow">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-gold">
              Tirando dúvidas
            </p>
            <h2 className="h2 mt-3">Perguntas frequentes</h2>
          </div>

          <div className="mt-10 space-y-3">
            {faq.map((item, i) => {
              const isOpen = open === i;
              return (
                <div
                  key={item.q}
                  className="rounded-xl border border-bg-border bg-bg-card/70 transition hover:border-brand-green/40"
                >
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-${i}`}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  >
                    <span className="text-base font-semibold">{item.q}</span>
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-green/15 text-brand-green transition ${
                        isOpen ? "rotate-45" : ""
                      }`}
                      aria-hidden
                    >
                      +
                    </span>
                  </button>
                  {isOpen && (
                    <div
                      id={`faq-${i}`}
                      className="border-t border-bg-border px-6 py-5 text-sm leading-relaxed text-ink-muted"
                    >
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
