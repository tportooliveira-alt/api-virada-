import Link from "next/link";

export default function IaPage() {
  return (
    <section className="rounded-lg border border-amber-300/25 bg-amber-300/10 p-5 shadow-panel">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200">
        Guardado para depois
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-white">Orientador IA em preparação</h1>
      <p className="mt-3 text-sm leading-6 text-virada-gray">
        A base técnica de IA premium está preservada, mas o recurso não será lançado agora.
      </p>
      <Link
        href="/app/aprender"
        className="mt-5 inline-flex min-h-12 items-center rounded-md bg-emerald-500 px-5 py-3 font-semibold text-slate-950"
      >
        Voltar para aprender
      </Link>
    </section>
  );
}
