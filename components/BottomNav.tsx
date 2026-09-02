"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CircleUserRound, Plus, Sheet } from "lucide-react";

const navItems = [
  { href: "/app/inicio", label: "Resumo", icon: BarChart3 },
  { href: "/app/lancar", label: "Lançar", icon: Plus },
  { href: "/app/evolucao", label: "Planilha", icon: Sheet },
  { href: "/app/aprender", label: "Conta", icon: CircleUserRound },
];

export function BottomNav() {
  const rawPath = usePathname();
  const pathname = rawPath.replace(/\/$/, "") || "/";

  return (
    <nav className="app-bottom-nav fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-40 grid w-[calc(100%-1.25rem)] max-w-md -translate-x-1/2 grid-cols-4 gap-1 rounded-[1.35rem] border border-[#133335]/10 bg-white/95 p-1.5 backdrop-blur-xl lg:hidden" aria-label="Navegação principal">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`grid min-h-[3.35rem] place-items-center gap-0.5 rounded-2xl px-1.5 py-1.5 text-[10px] font-bold transition ${
              active ? "bg-[#133335] text-[#F6FAF8] shadow-md" : "text-[#647875] hover:bg-[#E8F0EC]"
            }`}
          >
            <Icon className={`h-[1.15rem] w-[1.15rem] ${item.href === "/app/lancar" && active ? "text-[#CBEA6B]" : ""}`} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export const mainNavItems = navItems;
