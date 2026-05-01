"use client";

import { useState } from "react";

export default function LeadCapture() {
  const [nome, setNome] = useState("");
  const [whats, setWhats] = useState("");
  const [enviado, setEnviado] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: integrar com backend / RD Station / ActiveCampaign / Mailchimp
    // Enquanto não integra, persiste localmente para não perder o lead
    try {
      const list = JSON.parse(localStorage.getItem("cv_leads") || "[]");
      list.push({ nome, whats, ts: Date.now() });
      localStorage.setItem("cv_leads", JSON.stringify(list));
    } catch {
      // ignore storage errors
    }
    setEnviado(true);
  }

  return (
    <section className="section">
      <div className="container-narrow">
        <div className="mx-auto max-w-2xl rounded-2xl border border-bg-border bg-bg-card/70 p-8 text-center md:p-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-green">
            Conteúdos gratuitos
          </p>
          <h2 className="mt-3 font-display text-2xl font-bold md:text-3xl">
            Receba dicas práticas no seu WhatsApp
          </h2>
          <p className="mt-3 text-sm text-ink-muted">
            Sem spam. Você decide quando sair.
          </p>

          {enviado ? (
            <div className="mt-6 rounded-xl border border-brand-green/40 bg-brand-green/10 p-6 text-brand-green">
              ✓ Pronto! Em breve você recebe novidades.
            </div>
          ) : (
            <form
              onSubmit={onSubmit}
              className="mt-6 grid gap-3 sm:grid-cols-[1fr,1fr,auto]"
            >
              <input
                type="text"
                required
                placeholder="Seu nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                aria-label="Seu nome"
                className="rounded-xl border border-bg-border bg-bg px-4 py-3 text-sm outline-none focus:border-brand-green"
              />
              <input
                type="tel"
                required
                placeholder="WhatsApp (DDD + número)"
                value={whats}
                onChange={(e) => setWhats(e.target.value)}
                aria-label="Seu WhatsApp"
                className="rounded-xl border border-bg-border bg-bg px-4 py-3 text-sm outline-none focus:border-brand-green"
              />
              <button type="submit" className="btn-primary">
                Quero receber novidades
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
