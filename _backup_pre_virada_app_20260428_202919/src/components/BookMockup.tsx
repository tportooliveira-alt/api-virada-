export default function BookMockup({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative mx-auto aspect-[3/4] w-full max-w-sm select-none ${className}`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 rounded-[18px] bg-gradient-to-br from-brand-green/30 via-transparent to-brand-gold/20 blur-3xl" />
      <div className="relative h-full w-full rotate-[-3deg] rounded-[14px] border border-bg-border bg-gradient-to-br from-[#0d1a30] via-[#0a1426] to-[#070d1a] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
        <div className="absolute left-0 top-0 h-full w-2 rounded-l-[14px] bg-gradient-to-b from-brand-gold/60 via-brand-green/30 to-brand-gold/60" />
        <div className="flex h-full flex-col justify-between">
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-[0.3em] text-brand-gold/80">
              E-book
            </div>
            <div className="font-display text-[26px] font-extrabold leading-[1.1] text-white">
              O Código da{" "}
              <span className="bg-gradient-to-r from-brand-green to-brand-gold bg-clip-text text-transparent">
                Virada
              </span>{" "}
              Financeira
            </div>
            <div className="mt-3 h-px bg-gradient-to-r from-brand-green/60 to-transparent" />
            <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">
              Como organizar seu dinheiro, sair do aperto e criar renda extra
              começando do zero — com clareza, plano e direção.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] text-ink-subtle">
              <span className="h-1 w-1 rounded-full bg-brand-green" /> Clareza
            </div>
            <div className="flex items-center gap-2 text-[10px] text-ink-subtle">
              <span className="h-1 w-1 rounded-full bg-brand-green" /> Plano
            </div>
            <div className="flex items-center gap-2 text-[10px] text-ink-subtle">
              <span className="h-1 w-1 rounded-full bg-brand-green" /> Direção
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
