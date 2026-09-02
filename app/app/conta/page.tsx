"use client";

import Link from "next/link";
import { useState } from "react";
import { LogOut, Smartphone, Trash2 } from "lucide-react";
import { GoogleSyncButton } from "@/components/GoogleSyncButton";
import { getLocalUser, logOut } from "@/components/AuthGate";
import { Sheet, SheetAction } from "@/components/ui/Sheet";
import { useVirada } from "@/providers/virada-provider";

export default function ContaPage() {
  const data = useVirada();
  const user = getLocalUser();
  const [askReset, setAskReset] = useState(false);

  const totalLancamentos = data.expenses.length + data.incomes.length;
  const name = user?.name?.trim() || "Sua conta";
  const initial = (user?.name || user?.email || "V").trim().charAt(0).toUpperCase();

  function confirmReset() {
    data.resetLocalData();
    setAskReset(false);
  }

  return (
    // No celular é uma coluna (usuário, planilha, instalar, sair, perigo — via order-*);
    // no desktop os dois wrappers viram colunas e a planilha + zona de perigo ficam à direita.
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <div className="contents lg:flex lg:flex-col lg:gap-4">
        {/* Usuário */}
        <section className="surface-card order-1 flex flex-col gap-3.5 p-[18px] lg:order-none">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink-900 text-base font-bold text-white">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-ink-900">{name}</p>
              {user?.email && <p className="mt-0.5 truncate text-[13px] text-ink-500">{user.email}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-ink-50 px-3.5 py-3">
            <Smartphone className="h-[18px] w-[18px] shrink-0 text-ink-600" />
            <div>
              <p className="text-sm font-semibold text-ink-900">Dados no seu celular</p>
              <p className="mt-0.5 text-xs text-ink-500">
                {totalLancamentos} lançamentos · {data.debts.length} dívidas · {data.goals.length} metas
              </p>
            </div>
          </div>
        </section>

        {/* Instalar */}
        <section className="surface-card order-3 flex items-center justify-between gap-3 p-[18px] lg:order-none">
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-ink-900">Instalar no celular</p>
            <p className="mt-1 text-[13px] leading-[1.4] text-ink-500">Abre em tela cheia, sem o navegador, como um app de verdade.</p>
          </div>
          <Link
            href="/app/instalar"
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-[10px] border border-ink-200 bg-white px-3.5 text-sm font-bold text-ink-900 transition-colors duration-150 hover:bg-ink-50"
          >
            Ver como
          </Link>
        </section>

        <button
          type="button"
          onClick={logOut}
          className="order-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white text-sm font-bold text-ink-600 transition-colors duration-150 hover:bg-ink-50 lg:order-none"
        >
          <LogOut className="h-4 w-4" />
          Sair da conta
        </button>
      </div>

      <div className="contents lg:flex lg:flex-col lg:gap-4">
        {/* Planilha Google — único lugar do app que fala com o Google */}
        <section className="order-2 flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-[18px] lg:order-none">
          <p className="eyebrow">Planilha Google</p>
          <GoogleSyncButton
            expenses={data.expenses}
            incomes={data.incomes}
            debts={data.debts}
            goals={data.goals}
            userEmail={user?.email ?? "usuario"}
          />
        </section>

        {/* Zona de perigo */}
        <section className="order-5 flex flex-col gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-[18px] lg:order-none">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700">Zona de perigo</p>
          <p className="text-[15px] font-bold text-ink-900">Apagar todos os dados deste celular</p>
          <p className="text-[13px] leading-[1.5] text-red-700">
            Remove lançamentos, dívidas e metas do aparelho. Sincronize com a planilha antes para não perder nada.
          </p>
          <button
            type="button"
            onClick={() => setAskReset(true)}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] border border-red-200 bg-white text-sm font-bold text-red-700 transition-colors duration-150 hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" />
            Apagar todos os dados
          </button>
        </section>
      </div>

      <Sheet open={askReset} onClose={() => setAskReset(false)} title="Apagar tudo deste celular?">
        <p className="-mt-2 text-sm leading-[1.5] text-ink-600">
          {data.sheet.sheetUrl
            ? "Sua planilha Google continua intacta. Só os dados guardados neste aparelho serão removidos."
            : "Você ainda não conectou a planilha Google — sem ela, não há como recuperar esses dados depois."}
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <SheetAction onClick={() => setAskReset(false)}>Cancelar</SheetAction>
          {/* Vermelho cheio só aqui: ação irreversível */}
          <button
            type="button"
            onClick={confirmReset}
            className="min-h-[44px] rounded-xl bg-red-500 text-sm font-bold text-white transition-colors duration-150 hover:bg-red-600"
          >
            Apagar tudo
          </button>
        </div>
      </Sheet>
    </div>
  );
}
