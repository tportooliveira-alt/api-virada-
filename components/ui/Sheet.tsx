"use client";

import { ButtonHTMLAttributes, ReactNode, useEffect, useId } from "react";

// Folha inferior do design system: no lugar do window.confirm.
// No celular sobe do rodapé; no desktop centraliza. Fecha no fundo escuro ou com Esc.
interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Sheet({ open, onClose, title, children }: SheetProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/45 p-3 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="flex w-full max-w-[480px] flex-col gap-3.5 rounded-2xl bg-white p-5 shadow-float"
      >
        <h2 id={titleId} className="text-[17px] font-bold tracking-[-0.01em] text-ink-900">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

// Botão de ação da folha: neutro, perigo (só em ação irreversível) ou discreto (cancelar).
interface SheetActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: "default" | "danger" | "ghost";
}

const toneClass = {
  default: "border-ink-200 text-ink-900 hover:bg-ink-50",
  danger: "border-red-200 text-red-700 hover:bg-red-50",
  ghost: "border-transparent text-ink-500 hover:bg-ink-50",
};

export function SheetAction({ tone = "default", className = "", ...props }: SheetActionProps) {
  return (
    <button
      type="button"
      {...props}
      className={`flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border bg-white text-sm font-bold transition-colors duration-150 ${toneClass[tone]} ${className}`}
    />
  );
}
