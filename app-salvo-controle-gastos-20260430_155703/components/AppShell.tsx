"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PropsWithChildren } from "react";
import { Flag } from "lucide-react";
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
    <div className="mx-auto flex min-h-screen w-full max-w-[1280px] overflow-x-hidden px-4 pb-24 pt-4 md:gap-6 md:px-6 md:pb-6">

      {/* Sidebar desktop */}
      <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-72 flex-col rounded-lg border border-virada-line bg-slate-950/45 p-4 shadow-glow backdrop-blur lg:flex">
        <div>
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500 text-slate-950">
            <Flag className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-white">Virada App</h2>
          <p className="mt-2 text-sm leading-6 text-virada-gray">
            Fluxo de caixa no celular. Dados seus, planilha sua.
          </p>
        </div>

        <nav className="mt-7 grid gap-1.5">
          {mainNavItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-emerald-500 text-slate-950"
                    : "text-virada-gray hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/app/instalar"
            className="rounded-md px-3 py-2.5 text-sm text-virada-gray transition hover:bg-white/5 hover:text-white"
          >
            Instalar app
          </Link>
        </nav>

        <div className="mt-auto rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-sm font-semibold text-emerald-300">Dados no seu celular</p>
          <p className="mt-1 text-xs leading-5 text-virada-gray">
            Seus lançamentos ficam guardados aqui. Sincronize com Google Planilhas quando quiser.
          </p>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <div className="w-full min-w-0 flex-1 space-y-4">
        <Header title={meta.title} subtitle={meta.subtitle} />
        <main className="w-full min-w-0">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}
