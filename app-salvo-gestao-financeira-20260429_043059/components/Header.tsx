interface HeaderProps {
  title: string;
  subtitle: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="border-b border-virada-line pb-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-virada-gold">
            Fluxo de caixa no celular
          </span>
          <h1 className="text-2xl font-semibold text-white md:text-3xl">{title}</h1>
          <p className="max-w-[calc(100vw-2rem)] break-words text-sm leading-6 text-virada-gray md:max-w-2xl">
            {subtitle}
          </p>
        </div>
        <p className="rounded-lg border border-virada-line bg-white/[0.04] px-4 py-3 text-sm text-virada-slate">
          Casa ou empresa. Lançou, o caixa aparece.
        </p>
      </div>
    </header>
  );
}
