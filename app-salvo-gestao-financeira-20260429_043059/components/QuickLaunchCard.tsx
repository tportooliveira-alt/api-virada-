import Link from "next/link";
import { Mic, PenLine } from "lucide-react";

export function QuickLaunchCard() {
  return (
    <section className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-5 shadow-panel">
      <p className="text-sm font-semibold text-emerald-200">
        Lançamento rápido
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-white">Registre uma compra ou entrada</h2>
      <p className="mt-2 text-sm leading-6 text-virada-gray">
        O celular mostra o essencial. A planilha completa fica organizada por trás.
      </p>
      <Link
        href="/app/lancar"
        className="mt-5 flex min-h-14 items-center justify-center gap-3 rounded-md bg-emerald-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
      >
        <Mic className="h-5 w-5" />
        Lançar agora
        <PenLine className="h-5 w-5" />
      </Link>
    </section>
  );
}
