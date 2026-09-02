"use client";

import Link from "next/link";
import { ArrowRight, HardDrive, LogOut, ShieldCheck, Smartphone, Table, Trash2, UserRound } from "lucide-react";
import { GoogleSyncButton } from "@/components/GoogleSyncButton";
import { getLocalUser, logOut } from "@/components/AuthGate";
import { useVirada } from "@/providers/virada-provider";

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
    <div className="grid items-start gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-4">
        <section className="surface-card overflow-hidden">
          <div className="bg-[#133335] p-5 text-[#F6FAF8] sm:p-6">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#CBEA6B] text-[#133335]">
                <UserRound className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#CBEA6B]">Sua conta</p>
                <h2 className="mt-1 truncate text-2xl font-semibold text-[#F6FAF8]">{user?.name ?? "Olá!"}</h2>
                <p className="mt-1 truncate text-sm text-[#B8CBC6]">{user?.email}</p>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-xs text-[#DCE8E4]">
              <ShieldCheck className="h-4 w-4 text-[#CBEA6B]" />
              Seus registros financeiros ficam neste dispositivo.
            </div>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-1 2xl:grid-cols-2">
            <div className="rounded-2xl bg-[#F4F7F5] p-4">
              <HardDrive className="h-5 w-5 text-[#0EA978]" />
              <p className="mt-3 text-sm font-bold text-[#133335]">Dados no dispositivo</p>
              <p className="mt-1 text-xs leading-5 text-[#647875]">{totalLancamentos} lançamentos · {data.debts.length} dívidas · {data.goals.length} metas</p>
            </div>
            <div className="rounded-2xl bg-[#FFF8E8] p-4">
              <Table className="h-5 w-5 text-[#9A6810]" />
              <p className="mt-3 text-sm font-bold text-[#133335]">Google Planilhas</p>
              <p className="mt-1 text-xs leading-5 text-[#647875]">Seu backup organizado e acessível no computador.</p>
            </div>
          </div>
        </section>

        <section className="surface-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEF4FA] text-[#28629E]">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <p className="eyebrow">Acesso rápido</p>
              <h2 className="mt-1.5 text-lg font-semibold text-[#133335]">Instale como aplicativo</h2>
              <p className="mt-1 text-sm leading-6 text-[#647875]">Abra pela tela inicial, em tela cheia, sem procurar o site no navegador.</p>
            </div>
          </div>
          <Link
            href="/app/instalar"
            className="mt-4 flex min-h-12 w-full items-center justify-between rounded-2xl border border-[#133335]/10 bg-[#F8FAF9] px-4 text-sm font-bold text-[#133335] transition hover:border-[#0EA978]/40 hover:bg-[#EBF8F3]"
          >
            Ver como instalar <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <button
          type="button"
          onClick={logOut}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#133335]/10 bg-white px-5 text-sm font-bold text-[#3C5552] transition hover:bg-[#F4F7F5]"
        >
          <LogOut className="h-4 w-4" /> Sair da conta
        </button>
      </div>

      <div className="space-y-4">
        <section className="surface-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EBF8F3] text-[#08785A]">
              <Table className="h-5 w-5" />
            </div>
            <div>
              <p className="eyebrow">Backup e análise</p>
              <h2 className="mt-1.5 text-xl font-semibold text-[#133335]">Sincronize com o Google Planilhas</h2>
              <p className="mt-1.5 text-sm leading-6 text-[#647875]">Crie ou atualize uma planilha completa com receitas, gastos, dívidas, metas e fluxo de caixa.</p>
            </div>
          </div>
          <div className="mt-5">
            <GoogleSyncButton
              expenses={data.expenses}
              incomes={data.incomes}
              debts={data.debts}
              goals={data.goals}
              userEmail={user?.email ?? "usuario"}
            />
          </div>
        </section>

        <section className="rounded-[1.35rem] border border-[#E6674F]/20 bg-[#FFF7F4] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FFE5DE] text-[#B63F2D]">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#B63F2D]">Zona de cuidado</p>
              <h2 className="mt-1.5 text-lg font-semibold text-[#133335]">Apagar todos os dados</h2>
              <p className="mt-1 text-sm leading-6 text-[#647875]">Remove lançamentos, dívidas e metas deste dispositivo. Sincronize antes para manter uma cópia.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#E6674F]/30 bg-white px-5 text-sm font-bold text-[#B63F2D] transition hover:bg-[#FFE5DE]"
          >
            <Trash2 className="h-4 w-4" /> Apagar dados do dispositivo
          </button>
        </section>
      </div>
    </div>
  );
}
