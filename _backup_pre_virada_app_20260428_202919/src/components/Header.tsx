import Link from "next/link";
import { CHECKOUT_URL } from "@/config/site";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-bg-border/60 bg-bg/80 backdrop-blur">
      <div className="container-narrow flex h-16 items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-lg font-bold tracking-tight"
          aria-label="Página inicial — Código da Virada Financeira"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-green/15 text-brand-green">
            ◆
          </span>
          <span className="hidden sm:inline">
            Código da <span className="text-brand-green">Virada</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-ink-muted md:flex">
          <a href="#produto" className="hover:text-ink">
            O método
          </a>
          <a href="#bonus" className="hover:text-ink">
            Bônus
          </a>
          <a href="#oferta" className="hover:text-ink">
            Oferta
          </a>
          <a href="#faq" className="hover:text-ink">
            FAQ
          </a>
        </nav>

        <a
          href={CHECKOUT_URL}
          className="btn-primary !px-5 !py-2.5 !text-sm"
          aria-label="Comprar agora"
        >
          Quero o meu
        </a>
      </div>
    </header>
  );
}
