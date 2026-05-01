import Link from "next/link";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { SUPPORT_EMAIL, WHATSAPP_URL } from "@/config/site";

export const metadata = {
  title: "Obrigado pela compra — Código da Virada Financeira",
  robots: { index: false, follow: false },
};

export default function ObrigadoPage() {
  return (
    <>
      <Header />
      <main className="section">
        <div className="container-narrow">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-brand-green/15 text-4xl">
              ✓
            </div>
            <h1 className="h1 mt-6">Obrigado pela sua decisão!</h1>
            <p className="lead mt-4">
              Sua compra foi confirmada. Você acaba de dar o primeiro passo da
              sua virada financeira.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-2xl space-y-5">
            <div className="card">
              <div className="text-sm font-semibold uppercase tracking-widest text-brand-green">
                Passo 1
              </div>
              <h2 className="mt-2 font-display text-xl font-bold">
                Verifique seu e-mail
              </h2>
              <p className="mt-2 text-sm text-ink-muted">
                Em poucos minutos você recebe um e-mail com o link de acesso ao
                e-book e a todos os bônus. Confira a caixa de spam ou promoções
                se não encontrar.
              </p>
            </div>

            <div className="card">
              <div className="text-sm font-semibold uppercase tracking-widest text-brand-green">
                Passo 2
              </div>
              <h2 className="mt-2 font-display text-xl font-bold">
                Baixe e salve em mais de um lugar
              </h2>
              <p className="mt-2 text-sm text-ink-muted">
                Os arquivos são em PDF. Salve no celular, no computador e
                idealmente também na nuvem (Google Drive ou Dropbox). Assim
                você não perde acesso.
              </p>
            </div>

            <div className="card">
              <div className="text-sm font-semibold uppercase tracking-widest text-brand-green">
                Passo 3
              </div>
              <h2 className="mt-2 font-display text-xl font-bold">
                Comece pelo Plano de 7 Dias
              </h2>
              <p className="mt-2 text-sm text-ink-muted">
                Antes de ler tudo, vá direto no bônus do Plano de 7 Dias. É a
                forma mais rápida de sentir progresso prático na primeira
                semana.
              </p>
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-bg-border bg-bg-card/70 p-6 text-center">
            <p className="text-sm text-ink-muted">
              Não recebeu o e-mail em até 30 minutos? Fala com a gente:
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="btn-secondary"
                aria-label="Enviar e-mail para o suporte"
              >
                ✉️ {SUPPORT_EMAIL}
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                aria-label="Falar pelo WhatsApp"
              >
                💬 WhatsApp
              </a>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link href="/" className="text-sm text-ink-subtle hover:text-ink">
              ← Voltar para a página inicial
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
