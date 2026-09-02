import { ShieldCheck } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="flex items-end justify-between gap-4 border-b border-[#133335]/10 px-1 pb-4 pt-1 md:pb-5">
      <div>
        <span className="eyebrow">Seu dinheiro, sem ruído</span>
        <h1 className="mt-1.5 text-[1.7rem] font-semibold leading-tight text-[#133335] md:text-[2rem]">{title}</h1>
        <p className="mt-1 max-w-2xl text-[13px] leading-5 text-[#647875] md:text-sm md:leading-6">{subtitle}</p>
      </div>
      <div className="hidden shrink-0 items-center gap-2 rounded-full border border-[#133335]/10 bg-white/80 px-3 py-2 text-xs font-semibold text-[#3C5552] shadow-sm sm:flex">
        <ShieldCheck className="h-4 w-4 text-[#0EA978]" />
        Dados locais
      </div>
    </header>
  );
}
