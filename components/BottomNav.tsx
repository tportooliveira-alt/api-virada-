"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gauge, PenLine, Settings, Table } from "lucide-react";

export const mainNavItems = [
  { href: "/app/inicio", label: "Início", icon: Gauge },
  { href: "/app/lancar", label: "Lançar", icon: PenLine },
  { href: "/app/relatorios", label: "Relatórios", icon: Table },
  { href: "/app/conta", label: "Conta", icon: Settings },
];

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Menu inferior flutuante (<1024px). Único lugar com blur na interface.
export function BottomNav() {
  const rawPath = usePathname();
  const pathname = rawPath.replace(/\/$/, "") || "/";

  return (
    <nav
      className="fixed bottom-[max(10px,env(safe-area-inset-bottom))] left-1/2 z-40 grid w-[calc(100%-20px)] max-w-[440px] -translate-x-1/2 grid-cols-4 gap-1 rounded-2xl border border-ink-200 bg-white/95 p-1.5 shadow-float backdrop-blur-[10px] lg:hidden"
      aria-label="Navegação principal"
    >
      {mainNavItems.map((item) => {
        const active = isActivePath(pathname, item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`grid min-h-[52px] place-items-center gap-0.5 rounded-[11px] p-1.5 text-xs transition-colors duration-150 ${
              active ? "bg-green-100 font-bold text-green-800" : "font-medium text-ink-500 hover:bg-ink-100"
            }`}
          >
            <Icon className="h-[18px] w-[18px]" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
