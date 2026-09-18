"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PropsWithChildren } from "react";
import { BookOpen, CalendarDays, FileSpreadsheet, HandCoins, Smartphone } from "lucide-react";
import { BottomNav, isActivePath, mainNavItems } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { AutoPlanilha } from "@/components/AutoPlanilha";
import { UpdateBanner } from "@/components/UpdateBanner";
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
  "/app/relatorios": {
    title: "Relatórios",
    subtitle: "Histórico completo: lançamentos, dívidas, metas e evolução por mês.",
  },
  "/app/conta": {
    title: "Conta",
    subtitle: "Sua conta, sua planilha e onde ficam seus dados.",
  },
  "/app/planilha-demo": {
    title: "Planilha Executiva Google Sheets",
    subtitle: "Visão em tempo real com 9 abas consolidadas e inteligência patrimonial.",
  },
  "/app/instalar": {
    title: "Instalar no celular",
    subtitle: "Use o app na tela inicial do seu celular, como um aplicativo.",
  },
};

const sidebarItems = [
  ...mainNavItems,
  // Esta tela é uma PRÉVIA desenhada dentro do app, não a planilha do Drive.
  // Chamá-la de "Planilha Inteligente" fazia o comprador achar que a planilha dele
  // não funcionava. A de verdade se abre pelo banner do Início e pela tela Conta.
  { href: "/app/planilha-demo", label: "Prévia da planilha", icon: FileSpreadsheet },
  { href: "/api/material/biblioteca/negociacao/index.html", label: "Negociar dívida", icon: HandCoins, externo: true },
  { href: "/api/material/downloads/ebook-codigo-da-virada.pdf", label: "E-book", icon: BookOpen, externo: true },
  { href: "/app/instalar", label: "Instalar app", icon: Smartphone },
];

/**
 * Estado real da planilha no rodapé da barra lateral.
 *
 * Antes era texto fixo dizendo "Planilha Conectada" — aparecia igual para quem
 * nunca tinha conectado nada. Um estado falso cravado no HTML: o comprador lia
 * que tinha cópia de segurança quando não tinha.
 */
function EstadoDaPlanilha() {
  const { sheet, isReady } = useVirada();
  if (!isReady) return null;

  return (
    <div className="mt-auto rounded-xl border border-ink-200 bg-white p-3.5">
      {sheet.sheetUrl ? (
        <>
          <p className="text-[13px] font-semibold text-ink-900">Planilha conectada</p>
          <p className="mt-1 text-xs leading-[18px] text-ink-500">
            Seus lançamentos viram uma planilha no seu Google Drive quando você toca em
            &ldquo;Atualizar agora&rdquo;, na tela Conta.
          </p>
          <a
            href={sheet.sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs font-semibold text-emerald-700 hover:underline"
          >
            Abrir no Google Drive
          </a>
        </>
      ) : (
        <>
          <p className="text-[13px] font-semibold text-ink-900">Planilha ainda não criada</p>
          <p className="mt-1 text-xs leading-[18px] text-ink-500">
            Seus dados estão só neste aparelho. A planilha no seu Google Drive é a cópia
            de segurança deles.
          </p>
          <Link
            href="/app/conta"
            className="mt-2 inline-block text-xs font-semibold text-emerald-700 hover:underline"
          >
            Criar minha planilha
          </Link>
        </>
      )}
    </div>
  );
}

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

        <EstadoDaPlanilha />
      </aside>

      {/* Conteúdo principal */}
      <div className="flex w-full min-w-0 flex-1 flex-col gap-5">
        <Header title={meta.title} subtitle={meta.subtitle} aside={pathname === "/app/inicio" ? <MonthChip /> : null} />
        <main className="w-full min-w-0">{children}</main>
      </div>

      <BottomNav />
      <UpdateBanner />
      {/* Sem UI: cria a planilha do comprador no primeiro acesso, se ainda nao existir. */}
      <AutoPlanilha />
    </div>
  );
}
