export function LocalStorageNotice() {
  return (
    <section className="rounded-lg border border-amber-300/25 bg-amber-300/[0.08] p-4 shadow-panel">
      <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
            Base em planilha
          </p>
          <p className="mt-2 max-w-[calc(100vw-4rem)] break-words text-sm leading-6 text-virada-gray md:max-w-3xl">
            O app mostra no celular só o essencial: caixa, gastos, resultado e últimos lançamentos.
            A base completa fica estruturada em planilhas por trás.
          </p>
        </div>
        <div className="rounded-md bg-slate-950/40 px-4 py-3 text-sm text-virada-gray">
          Google Planilhas preparado para sincronização no servidor.
        </div>
      </div>
    </section>
  );
}
