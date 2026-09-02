import { ReactNode } from "react";

interface HeaderProps {
  title: string;
  subtitle: string;
  aside?: ReactNode;
}

export function Header({ title, subtitle, aside }: HeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">Fluxo de caixa no celular</p>
        <h1 className="mt-1.5 text-2xl font-bold leading-[1.15] tracking-[-0.02em] text-ink-900">{title}</h1>
        <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>
      </div>
      {aside}
    </header>
  );
}
