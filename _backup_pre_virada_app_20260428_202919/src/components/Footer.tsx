import Link from "next/link";
import { SELLER_DOC, SELLER_NAME, SUPPORT_EMAIL } from "@/config/site";

export default function Footer() {
  const ano = new Date().getFullYear();
  return (
    <footer className="border-t border-bg-border bg-bg-alt">
      <div className="container-narrow py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="font-display text-lg font-bold">
              Código da{" "}
              <span className="text-brand-green">Virada</span> Financeira
            </div>
            <p className="mt-3 text-sm text-ink-muted">
              Educação financeira honesta para brasileiros que decidiram parar
              de viver no improviso.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold uppercase tracking-widest text-ink-muted">
              Institucional
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link
                  href="/politica-de-reembolso"
                  className="text-ink-muted hover:text-ink"
                >
                  Política de Reembolso
                </Link>
              </li>
              <li>
                <Link href="/termos" className="text-ink-muted hover:text-ink">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link
                  href="/privacidade"
                  className="text-ink-muted hover:text-ink"
                >
                  Política de Privacidade
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold uppercase tracking-widest text-ink-muted">
              Contato
            </div>
            <ul className="mt-3 space-y-2 text-sm text-ink-muted">
              <li>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="hover:text-ink"
                >
                  {SUPPORT_EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-bg-border pt-6 text-xs text-ink-subtle">
          <p>
            © {ano} {SELLER_NAME}. {SELLER_DOC}. Todos os direitos reservados.
          </p>
          <p className="mt-2 max-w-3xl">
            <strong>Aviso:</strong> este material é informativo e educacional.
            Não constitui recomendação de investimento, consultoria financeira
            ou jurídica. Resultados variam conforme aplicação individual e
            contexto de cada pessoa.
          </p>
        </div>
      </div>
    </footer>
  );
}
