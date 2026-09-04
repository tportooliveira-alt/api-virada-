"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PropsWithChildren } from "react";
import { BookOpen, CalendarDays, HandCoins, Smartphone } from "lucide-react";
import { BottomNav, isActivePath, mainNavItems } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { UpdateBanner } from "@/components/UpdateBanner";

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  "/app/inicio": {
    title: "Resumo financeiro",
    subtitle: "Caixa, gastos, resultado e últimos lançamentos.",
  },
  "/app/lancar": {
    title: "Lançar",
    subtitle: "Registre compras, gastos e entradas em poucos segundos.",
  },
  "/app/relatorios": {
    title: "Relatórios",
    subtitle: "Histórico completo: lançamentos, dívidas, metas e evolução por mês.",
  },
  "/app/conta": {
    title: "Conta",
    subtitle: "Sua conta, sua planilha e onde ficam seus dados.",
  },
  "/app/planilha-demo": {
    title: "Prévia da planilha",
    subtitle: "Veja como seus dados ficam no Google Planilhas.",
  },
  "/app/instalar": {
    title: "Instalar no celular",
    subtitle: "Use o app na tela inicial do seu celular, como um aplicativo.",
  },
};

// Ferramentas e e-book são HTML/PDF estáticos fora do app (public/), por isso abrem
// em aba nova e não entram no BottomNav — o menu de baixo segue com as 4 telas do design.
// Vão direto no menu, sem passar por uma tela de "biblioteca": um clique a menos.
const sidebarItems = [
  ...mainNavItems,
  { href: "/biblioteca/negociacao/index.html", label: "Negociar dívida", icon: HandCoins, externo: true },
  { href: "/downloads/ebook-codigo-da-virada.pdf", label: "E-book", icon: BookOpen, externo: true },
  { href: "/app/instalar", label: "Instalar app", icon: Smartphone },
];

function MonthChip() {
  const month = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date());
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-ink-200 bg-ink-50 px-3.5 py-2 text-[13px] font-medium text-ink-700">
      <CalendarDays className="h-[15px] w-[15px]" />
      {month.charAt(0).toUpperCase() + month.slice(1)}
    </span>
  );
}

export function AppShell({ children }: PropsWithChildren) {
  const rawPath = usePathname();
  // Remove barra final para normalizar: /app/lancar/ → /app/lancar
  const pathname = rawPath.replace(/\/$/, "") || "/";
  const meta = pageMeta[pathname] ?? pageMeta["/app/inicio"];

  return (
    <div className="app-shell mx-auto flex w-full max-w-[1240px] flex-col gap-4 px-4 pb-[calc(100px+env(safe-area-inset-bottom))] pt-4 lg:flex-row lg:items-start lg:gap-7 lg:px-6 lg:pb-10 lg:pt-5">

      {/* Sidebar desktop (≥1024px) */}
      <aside className="sticky top-5 hidden min-h-[calc(100vh-40px)] w-[248px] shrink-0 flex-col rounded-2xl border border-ink-200 bg-ink-50 p-5 lg:flex">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" className="h-[38px] w-[38px] rounded-[10px]" />
          <div>
            <p className="text-[15px] font-bold text-ink-900">Virada App</p>
            <p className="mt-0.5 text-xs text-ink-500">Fluxo de caixa no celular</p>
          </div>
        </div>

        <nav className="mt-7 grid gap-1" aria-label="Navegação principal">
          {sidebarItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                {...("externo" in item && item.externo ? { target: "_blank", rel: "noopener" } : {})}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm transition-colors duration-150 ${
                  active
                    ? "bg-green-100 font-semibold text-green-800"
                    : "font-medium text-ink-600 hover:bg-ink-200 hover:text-ink-900"
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-xl border border-ink-200 bg-white p-3.5">
          <p className="text-[13px] font-semibold text-ink-900">Dados no seu celular</p>
          <p className="mt-1 text-xs leading-[18px] text-ink-500">
            Seus lançamentos ficam guardados aqui. Sincronize com Google Planilhas quando quiser.
          </p>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <div className="flex w-full min-w-0 flex-1 flex-col gap-5">
        <Header title={meta.title} subtitle={meta.subtitle} aside={pathname === "/app/inicio" ? <MonthChip /> : null} />
        <main className="w-full min-w-0">{children}</main>
      </div>

      <BottomNav />
      <UpdateBanner />
    </div>
  );
}
