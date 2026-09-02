"use client";

import { ReactNode } from "react";

// Chip de seleção (pílula): ativo = Ink 900 com texto branco; inativo = borda Ink 200.
interface ChipProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  wide?: boolean;
}

export function Chip({ active, onClick, children, wide }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold transition-colors duration-150 ${
        wide ? "flex-1" : ""
      } ${active ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50"}`}
    >
      {children}
    </button>
  );
}
