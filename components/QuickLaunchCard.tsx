import Link from "next/link";
import { ArrowUpRight, Plus, ReceiptText } from "lucide-react";

export function QuickLaunchCard() {
  return (
    <section className="relative overflow-hidden rounded-[1.35rem] bg-[#133335] p-5 text-[#F6FAF8] shadow-[0_20px_50px_rgba(19,51,53,0.18)] sm:p-6">
      <div className="absolute -right-9 -top-9 h-28 w-28 rounded-full border-[18px] border-[#CBEA6B]/20" aria-hidden />
      <div className="relative">
        <div className="flex items-center gap-2 text-[#CBEA6B]">
          <ReceiptText className="h-4 w-4" />
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em]">Lançamento rápido</p>
        </div>
        <h2 className="mt-3 max-w-sm text-2xl font-semibold leading-tight text-[#F6FAF8]">Registre agora. Entenda melhor depois.</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-[#B8CBC6]">
          Em poucos toques, um gasto ou entrada já entra no seu resumo e na planilha.
        </p>
      </div>
      <Link
        href="/app/lancar"
        className="relative mt-5 flex min-h-[3.25rem] items-center justify-between gap-3 rounded-2xl bg-[#CBEA6B] px-4 py-3.5 font-bold text-[#133335] transition hover:-translate-y-0.5 hover:bg-[#D8F383]"
      >
        <span className="flex items-center gap-2"><Plus className="h-5 w-5" /> Novo lançamento</span>
        <ArrowUpRight className="h-5 w-5" />
      </Link>
    </section>
  );
}
