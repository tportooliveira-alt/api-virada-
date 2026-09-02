export function InstallGuide() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
        <h2 className="text-2xl font-semibold text-white">Android</h2>
        <ol className="mt-4 grid gap-3 text-sm leading-6 text-virada-gray">
          <li>1. Abra no Chrome.</li>
          <li>2. Toque nos três pontinhos.</li>
          <li>3. Toque em Adicionar à tela inicial ou Instalar app.</li>
          <li>4. Confirme.</li>
        </ol>
      </section>

      <section className="rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
        <h2 className="text-2xl font-semibold text-white">iPhone</h2>
        <ol className="mt-4 grid gap-3 text-sm leading-6 text-virada-gray">
          <li>1. Abra no Safari.</li>
          <li>2. Toque em compartilhar.</li>
          <li>3. Toque em Adicionar à Tela de Início.</li>
          <li>4. Confirme.</li>
        </ol>
      </section>
    </div>
  );
}
