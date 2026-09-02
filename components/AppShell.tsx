"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PropsWithChildren } from "react";
import { ArrowUpRight, HardDrive } from "lucide-react";
import { BottomNav, mainNavItems } from "@/components/BottomNav";
import { Header } from "@/components/Header";

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  "/app/inicio": {
    title: "Resumo financeiro",
    subtitle: "Caixa, gastos, resultado e últimos lançamentos.",
  },
  "/app/lancar": {
    title: "Lançar",
    subtitle: "Registre compras, gastos e entradas em poucos segundos.",
  },
  "/app/evolucao": {
    title: "Planilha",
    subtitle: "A base completa do fluxo de caixa fica organizada aqui.",
  },
  "/app/aprender": {
    title: "Conta",
    subtitle: "Sincronização com Google Planilhas e configurações.",
  },
  "/app/planilha-demo": {
    title: "Prévia da Planilha",
    subtitle: "Veja como seus dados ficam no Google Planilhas.",
  },
  "/app/instalar": {
    title: "Instalar no celular",
    subtitle: "Use o app como PWA na tela inicial do seu celular.",
  },
};

export function AppShell({ children }: PropsWithChildren) {
  const rawPath = usePathname();
  // Remove barra final para normalizar: /app/lancar/ → /app/lancar
  const pathname = rawPath.replace(/\/$/, "") || "/";
  const meta = pageMeta[pathname] ?? pageMeta["/app/inicio"];

  return (
    <div className="app-shell virada-light mx-auto flex min-h-screen w-full max-w-[1440px] flex-col overflow-x-hidden px-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-3 sm:px-5 md:pt-5 lg:flex-row lg:gap-8 lg:px-7 lg:pb-7">

      {/* Sidebar desktop */}
      <aside className="app-sidebar relative sticky top-7 hidden h-[calc(100vh-3.5rem)] w-[17rem] shrink-0 flex-col overflow-hidden rounded-[1.75rem] p-5 lg:flex">
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#CBEA6B] text-sm font-black text-[#133335] shadow-[0_8px_22px_rgba(203,234,107,0.2)]">
              CV
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#CBEA6B]">Código da</p>
              <h2 className="font-display text-lg font-semibold tracking-tight text-[#F6FAF8]">Virada</h2>
            </div>
          </div>
          <p className="mt-5 max-w-[13rem] text-sm leading-6 text-[#B8CBC6]">
            Clareza para decidir melhor, um lançamento de cada vez.
          </p>
        </div>

        <nav className="relative z-10 mt-8 grid gap-1.5" aria-label="Navegação principal">
          {mainNavItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-[#CBEA6B] text-[#133335] shadow-[0_8px_24px_rgba(203,234,107,0.14)]"
                    : "text-[#B8CBC6] hover:bg-white/10 hover:text-[#F6FAF8]"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/app/instalar"
            className="mt-1 flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#B8CBC6] transition hover:bg-white/10 hover:text-[#F6FAF8]"
          >
            Instalar app <ArrowUpRight className="h-4 w-4" />
          </Link>
        </nav>

        <div className="relative z-10 mt-auto rounded-2xl border border-[#FFFFFF1A] bg-[#FFFFFF12] p-4">
          <div className="flex items-center gap-2 text-[#CBEA6B]">
            <HardDrive className="h-4 w-4" />
            <p className="text-xs font-bold uppercase tracking-[0.12em]">Dados protegidos</p>
          </div>
          <p className="mt-2 text-xs leading-5 text-[#B8CBC6]">
            Seus registros ficam neste dispositivo até você sincronizar.
          </p>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <div className="w-full min-w-0 flex-1 space-y-4 lg:pt-1">
        <Header title={meta.title} subtitle={meta.subtitle} />
        <main className="w-full min-w-0 pb-2">{children}</main>
      </div>

      <BottomNav />
      <div className="pointer-events-none fixed -right-16 top-24 -z-10 hidden h-64 w-64 rounded-full bg-[#CBEA6B]/20 blur-3xl xl:block" aria-hidden />
    </div>
  );
}
