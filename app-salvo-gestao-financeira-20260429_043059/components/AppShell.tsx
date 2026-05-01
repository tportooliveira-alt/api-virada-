"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PropsWithChildren, useEffect } from "react";
import { Flag, LogOut } from "lucide-react";
import { BottomNav, mainNavItems } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { LocalStorageNotice } from "@/components/LocalStorageNotice";
import { useVirada } from "@/providers/virada-provider";

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
    subtitle: "Cadastro, WhatsApp e sincronização com planilha.",
  },
  "/app/instalar": {
    title: "Instalar no celular",
    subtitle: "Use o Virada App como PWA na tela inicial do aparelho.",
  },
};

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const data = useVirada();
  const meta = pageMeta[pathname] ?? pageMeta["/app/inicio"];

  useEffect(() => {
    if (data.isReady && !data.user) {
      router.replace("/login");
    }
  }, [data.isReady, data.user, router]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1280px] overflow-x-hidden px-4 pb-24 pt-4 md:gap-6 md:px-6 md:pb-6">
      <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-72 flex-col rounded-lg border border-virada-line bg-slate-950/45 p-4 shadow-glow backdrop-blur lg:flex">
        <div>
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500 text-slate-950">
            <Flag className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-white">Virada App</h2>
          <p className="mt-2 text-sm leading-6 text-virada-gray">
            Fluxo de caixa simples, com planilha estruturada por trás.
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

        <div className="mt-auto space-y-3 rounded-lg border border-amber-300/20 bg-amber-300/10 p-4">
          <p className="text-sm font-semibold text-amber-200">Base de dados</p>
          <p className="text-sm leading-6 text-virada-gray">
            {data.sheet.url ? "Planilha conectada para consulta completa." : "Dados salvos em planilhas CSV locais."}
          </p>
          <button
            onClick={() => void data.signOut()}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-virada-line px-3 py-2 text-sm text-virada-gray transition hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      <div className="w-full min-w-0 flex-1 space-y-6 overflow-hidden">
        <Header title={meta.title} subtitle={meta.subtitle} />
        <LocalStorageNotice />
        <main className="w-full min-w-0 overflow-hidden">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}
