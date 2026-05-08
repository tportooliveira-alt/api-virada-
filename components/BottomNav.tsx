"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gauge, PenLine, Settings, Table } from "lucide-react";

const navItems = [
  { href: "/app/inicio", label: "Início", icon: Gauge },
  { href: "/app/lancar", label: "Lançar", icon: PenLine },
  { href: "/app/evolucao", label: "Planilha", icon: Table },
  { href: "/app/aprender", label: "Conta", icon: Settings },
];

export function BottomNav() {
  const rawPath = usePathname();
  const pathname = rawPath.replace(/\/$/, "") || "/";

  return (
    <nav className="fixed bottom-2 left-1/2 z-40 grid w-[calc(100%-0.75rem)] max-w-md -translate-x-1/2 grid-cols-4 gap-1.5 rounded-lg border border-virada-line bg-white/95 p-1.5 shadow-glow backdrop-blur lg:hidden">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`grid min-h-12 place-items-center gap-1 rounded-md px-1.5 py-1.5 text-[11px] transition ${
              active ? "bg-emerald-500 font-semibold text-slate-950" : "text-slate-600"
            }`}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export const mainNavItems = navItems;
