"use client";

import { LogOut, RefreshCcw, Smartphone, Table } from "lucide-react";
import { useVirada } from "@/providers/virada-provider";

export default function ContaPage() {
  const data = useVirada();

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-virada-gold">
          Conta
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          {data.profile?.fullName || "Usuário"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-virada-gray">{data.profile?.email}</p>

        <div className="mt-5 grid gap-3">
          <div className="flex items-center gap-3 rounded-md bg-white/5 p-4">
            <Smartphone className="h-5 w-5 text-emerald-300" />
            <div>
              <p className="text-sm font-semibold text-white">WhatsApp</p>
              <p className="mt-1 text-sm text-virada-gray">{data.profile?.whatsapp || "Não informado"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-md bg-white/5 p-4">
            <Table className="h-5 w-5 text-amber-200" />
            <div>
              <p className="text-sm font-semibold text-white">Base financeira</p>
              <p className="mt-1 text-sm text-virada-gray">
                {data.sheet.provider === "excel" ? "Excel / CSV" : "Google Planilhas"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
        <h2 className="text-xl font-semibold text-white">Sincronização</h2>
        <p className="mt-2 text-sm leading-6 text-virada-gray">
          A estrutura já está separada em abas de gestão financeira. A conexão direta com Google Planilhas fica no servidor, com credencial segura.
        </p>

        <div className="mt-4 rounded-md bg-white/5 p-4 text-sm text-virada-gray">
          Status: {data.sheet.url ? "planilha conectada" : "CSV local pronto para importar"}
        </div>

        <button
          type="button"
          onClick={() => void data.syncSheet()}
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-500 px-5 py-3 font-semibold text-slate-950"
        >
          <RefreshCcw className="h-5 w-5" />
          Preparar sincronização
        </button>
      </section>

      <button
        type="button"
        onClick={() => void data.signOut()}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-virada-line px-5 py-3 font-semibold text-virada-gray"
      >
        <LogOut className="h-5 w-5" />
        Sair
      </button>
    </div>
  );
}
