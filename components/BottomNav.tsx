"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gauge, PenLine, GraduationCap, Settings, Table } from "lucide-react";

const navItems = [
  { href: "/app/inicio", label: "Início", icon: Gauge },
  { href: "/app/lancar", label: "Lançar", icon: PenLine },
  { href: "/app/aprendizado", label: "Aprender", icon: GraduationCap },
  { href: "/app/evolucao", label: "Planilha", icon: Table },
  { href: "/app/conta", label: "Conta", icon: Settings },
];

export function BottomNav() {
  const rawPath = usePathname();
  const pathname = rawPath.replace(/\/$/, "") || "/";

  return (
    <nav className="fixed bottom-3 left-1/2 z-40 grid w-[calc(100%-1rem)] max-w-md -translate-x-1/2 grid-cols-5 gap-1 rounded-lg border border-virada-line bg-slate-950/95 p-2 shadow-glow backdrop-blur lg:hidden">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`grid min-h-14 place-items-center gap-1 rounded-md px-1 py-2 text-[11px] transition ${
              active ? "bg-emerald-500 font-semibold text-slate-950" : "text-virada-gray"
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
