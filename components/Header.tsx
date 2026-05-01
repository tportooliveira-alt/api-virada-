interface HeaderProps {
  title: string;
  subtitle: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="border-b border-virada-line pb-4">
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-virada-gold">
        Fluxo de caixa no celular
      </span>
      <h1 className="mt-1 text-2xl font-semibold text-white md:text-3xl">{title}</h1>
      <p className="mt-1 text-sm leading-6 text-virada-gray">{subtitle}</p>
    </header>
  );
}
