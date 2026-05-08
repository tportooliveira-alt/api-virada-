interface HeaderProps {
  title: string;
  subtitle: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="border-b border-virada-line pb-3 md:pb-4">
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-virada-gold">
        Fluxo de caixa no celular
      </span>
      <h1 className="mt-1 text-[1.65rem] font-semibold leading-tight text-white md:text-3xl">{title}</h1>
      <p className="mt-1 text-[13px] leading-5 text-virada-gray md:text-sm md:leading-6">{subtitle}</p>
    </header>
  );
}
