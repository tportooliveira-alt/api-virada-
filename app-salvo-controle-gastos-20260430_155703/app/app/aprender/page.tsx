"use client";

import { LogOut, Smartphone, Table, Trash2 } from "lucide-react";
import { GoogleSyncButton } from "@/components/GoogleSyncButton";
import { logOut, getLocalUser } from "@/components/AuthGate";
import { useVirada } from "@/providers/virada-provider";
import Link from "next/link";

export default function ContaPage() {
  const data = useVirada();
  const user = getLocalUser();
  const totalLancamentos = data.expenses.length + data.incomes.length;

  function handleReset() {
    if (window.confirm("Apagar todos os dados do app? Esta ação não pode ser desfeita.")) {
      data.resetLocalData();
    }
  }

  return (
    <div className="space-y-5">

      {/* Info do app */}
      <section className="rounded-xl border border-virada-line bg-white/[0.045] p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-virada-gold">
          Sua conta
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          {user?.name ?? "Olá!"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{user?.email}</p>
        <p className="mt-2 text-sm leading-6 text-virada-gray">
          Seus dados ficam guardados aqui no celular.
          Sincronize com Google Planilhas para ter backup e acesso pelo computador.
        </p>

        <div className="mt-4 grid gap-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-4">
            <Smartphone className="h-5 w-5 shrink-0 text-emerald-300" />
            <div>
              <p className="text-sm font-semibold text-white">Dados no dispositivo</p>
              <p className="mt-0.5 text-xs text-virada-gray">
                {totalLancamentos} lançamentos · {data.debts.length} dívidas · {data.goals.length} metas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-4">
            <Table className="h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <p className="text-sm font-semibold text-white">Planilha Google</p>
              <p className="mt-0.5 text-xs text-virada-gray">
                Sincronize abaixo para criar ou atualizar sua planilha no Google Drive
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Google Sync */}
      <section className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
          Google Planilhas
        </p>
        <h2 className="mt-1 text-xl font-semibold text-white">
          Sincronizar com 1 clique
        </h2>
        <p className="mt-1.5 mb-4 text-sm text-slate-400">
          Conecte sua conta Google e todos os seus dados vão para uma planilha completa no seu Drive —
          receitas, gastos, dívidas, metas e fluxo de caixa organizado por abas.
        </p>
        <GoogleSyncButton
          expenses={data.expenses}
          incomes={data.incomes}
          debts={data.debts}
          goals={data.goals}
          userEmail="local@virada.app"
        />
      </section>

      {/* Instalar como app */}
      <section className="rounded-xl border border-virada-line bg-white/[0.045] p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
          Instalar no celular
        </p>
        <h2 className="mt-1 text-xl font-semibold text-white">Usar como app nativo</h2>
        <p className="mt-1.5 mb-4 text-sm text-slate-400">
          Adicione à tela inicial do celular para abrir sem precisar do navegador,
          em tela cheia, como um app de verdade.
        </p>
        <Link
          href="/app/instalar"
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-5 py-3 text-sm font-semibold text-blue-300 transition hover:bg-blue-500/20"
        >
          Ver como instalar →
        </Link>
      </section>

      {/* Sair */}
      <button
        onClick={logOut}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-semibold text-slate-400 transition hover:text-white"
      >
        <LogOut className="h-4 w-4" />
        Sair da conta
      </button>

      {/* Zona de perigo */}
      <section className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-red-400">
          Zona de perigo
        </p>
        <h2 className="mt-1 text-xl font-semibold text-white">Apagar todos os dados</h2>
        <p className="mt-1.5 mb-4 text-sm text-slate-400">
          Remove todos os lançamentos, dívidas e metas do dispositivo. Faça a sincronização
          com Google Planilhas antes para não perder nada.
        </p>
        <button
          onClick={handleReset}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500/20"
        >
          <Trash2 className="h-4 w-4" />
          Apagar todos os dados
        </button>
      </section>

    </div>
  );
}
