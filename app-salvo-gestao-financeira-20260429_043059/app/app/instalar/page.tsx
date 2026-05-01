import { InstallGuide } from "@/components/InstallGuide";

export default function InstalarPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-5 shadow-panel">
        <h2 className="text-2xl font-semibold text-white">Instale o Virada App</h2>
        <p className="mt-3 text-sm leading-6 text-virada-gray">
          O app pode ficar na tela inicial do celular com aparência de aplicativo. Use para lançar gastos rápido.
        </p>
      </section>
      <InstallGuide />
    </div>
  );
}
