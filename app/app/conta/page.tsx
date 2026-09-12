"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, CalendarCheck, HandCoins, ListChecks, LogOut, Smartphone, Trash2 } from "lucide-react";
import { GoogleSyncButton } from "@/components/GoogleSyncButton";
import { getLocalUser, logOut } from "@/components/AuthGate";
import { Sheet, SheetAction } from "@/components/ui/Sheet";
import { BUDGET_PHASES } from "@/lib/constants";
import { budgetPhaseOf, formatCurrency, sugerirFaseVirada, timeAgo } from "@/lib/utils";
import { useVirada } from "@/providers/virada-provider";

// Estado da sincronização automática em português de gente. "Desligado" não é
// defeito: quase sempre é só a autorização do Google que venceu, e o caminho é
// o botão logo acima.
function textoAutoSync({ estado, ultimoEnvio }: { estado: string; ultimoEnvio: string | null }) {
  if (estado === "sincronizando") return "Salvando na sua planilha…";
  if (estado === "em dia") {
    return ultimoEnvio
      ? `Atualiza sozinha. Último envio ${timeAgo(ultimoEnvio)}.`
      : "Atualiza sozinha alguns segundos depois de cada mudança.";
  }
  return ultimoEnvio
    ? `Atualização automática parada. Último envio ${timeAgo(ultimoEnvio)} — toque em Atualizar agora para religar.`
    : "Atualização automática parada. Toque em Atualizar agora para religar.";
}

export default function ContaPage() {
  const data = useVirada();
  const user = getLocalUser();
  const [askReset, setAskReset] = useState(false);

  const totalLancamentos = data.expenses.length + data.incomes.length;
  // Renda esperada em centavos, direto do provider: cada dígito já salva (sem botão).
  const rendaCents = Math.round((data.settings?.expectedIncome ?? 0) * 100);
  const fase = budgetPhaseOf(data);
  const sugerir = sugerirFaseVirada(data);
  const name = user?.name?.trim() || "Sua conta";
  const initial = (user?.name || user?.email || "V").trim().charAt(0).toUpperCase();

  function confirmReset() {
    data.resetLocalData();
    setAskReset(false);
  }

  return (
    // No celular é uma coluna (usuário, bolsos, planilha, o que veio junto, instalar, sair, perigo — via order-*);
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
            <Smartphone className="h-[18px] w-[18px] shrink-0 text-green-700" />
            <div>
              <p className="text-sm font-semibold text-ink-900">Dados no seu celular</p>
              <p className="mt-0.5 text-xs text-ink-500">
                {totalLancamentos} lançamentos · {data.debts.length} dívidas · {data.goals.length} metas
              </p>
            </div>
          </div>
        </section>

        {/* Seus 3 bolsos: renda esperada + fase (o app sugere, quem troca é a pessoa) */}
        <section className="surface-card order-2 flex flex-col gap-3.5 p-[18px] lg:order-none">
          <p className="eyebrow">Seus 3 bolsos</p>
          <label className="block rounded-xl border border-ink-200 bg-white px-3.5 py-3 transition-colors duration-150 focus-within:border-green-500">
            <span className="text-sm font-semibold text-ink-900">Quanto entra por mês, mais ou menos?</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              aria-label="Renda por mês"
              value={formatCurrency(rendaCents / 100)}
              onChange={(event) => {
                const cents = Number(event.target.value.replace(/\D/g, "").slice(0, 12));
                data.setSettings({ expectedIncome: cents > 0 ? cents / 100 : undefined });
              }}
              className={`money mt-1 w-full bg-transparent font-display text-2xl font-extrabold tracking-[-0.02em] outline-none focus-visible:shadow-none ${
                rendaCents > 0 ? "text-ink-900" : "text-ink-400"
              }`}
            />
            <span className="mt-1 block text-xs text-ink-500">
              {rendaCents > 0 ? "Salvo. Os bolsos do Início usam esse valor." : "Sem esse valor, o app usa o que entrou nos últimos meses."}
            </span>
          </label>

          <div className="flex flex-col gap-2">
            {BUDGET_PHASES.map((item) => {
              const ativa = fase === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={ativa}
                  onClick={() => data.setSettings({ budgetPhase: item.key })}
                  className={`flex flex-col items-start gap-0.5 rounded-xl border px-3.5 py-3 text-left transition-colors duration-150 ${
                    ativa ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white text-ink-900 hover:bg-ink-50"
                  }`}
                >
                  <span className="text-sm font-bold">{`${item.label} (${item.split})`}</span>
                  <span className={`text-xs leading-[1.4] ${ativa ? "text-ink-300" : "text-ink-500"}`}>{item.hint}</span>
                </button>
              );
            })}
          </div>

          {sugerir && (
            <div className="flex flex-col gap-2 rounded-xl bg-amber-50 px-3.5 py-3 text-[13px] leading-[1.5] text-amber-800">
              <span>
                <b className="font-semibold">Sugestão:</b> você tem dívida em aberto. A Fase de virada manda 40% pra quitar mais
                rápido. Só muda se você quiser.
              </span>
              <button
                type="button"
                onClick={() => data.setSettings({ budgetPhase: "virada" })}
                className="inline-flex min-h-[40px] items-center justify-center rounded-[10px] border border-amber-300 bg-white px-3.5 text-[13px] font-bold text-amber-800 transition-colors duration-150 hover:bg-amber-100"
              >
                Ativar Fase de virada
              </button>
            </div>
          )}
        </section>

        {/* O que veio junto — no celular é por aqui que se chega às ferramentas */}
        <section className="surface-card order-4 flex flex-col gap-3 p-[18px] lg:order-none">
          <p className="eyebrow">O que veio junto</p>
          {[
            { href: "/biblioteca/negociacao/index.html", Icon: HandCoins, titulo: "Negociar dívida", desc: "Calcula o desconto, escreve os scripts e gera a carta pro banco." },
            { href: "/downloads/ebook-codigo-da-virada.pdf", Icon: BookOpen, titulo: "E-book", desc: "O método completo, em 5 capítulos." },
            { href: "/biblioteca/plano-7-dias/index.html", Icon: ListChecks, titulo: "Plano de 7 dias", desc: "Uma ação por dia pra sair do lugar." },
            { href: "/biblioteca/checklist/index.html", Icon: CalendarCheck, titulo: "Checklist mensal", desc: "A revisão de todo fim de mês, em 15 minutos." },
          ].map(({ href, Icon, titulo, desc }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-xl border border-ink-200 bg-white px-3.5 py-3 transition-colors duration-150 hover:bg-ink-50"
            >
              <Icon className="h-[18px] w-[18px] shrink-0 text-green-700" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-ink-900">{titulo}</span>
                <span className="mt-0.5 block text-xs leading-[1.4] text-ink-500">{desc}</span>
              </span>
            </a>
          ))}
        </section>

        {/* Instalar */}
        <section className="surface-card order-5 flex items-center justify-between gap-3 p-[18px] lg:order-none">
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
          className="order-6 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white text-sm font-bold text-ink-600 transition-colors duration-150 hover:bg-ink-50 lg:order-none"
        >
          <LogOut className="h-4 w-4" />
          Sair da conta
        </button>
      </div>

      <div className="contents lg:flex lg:flex-col lg:gap-4">
        {/* Planilha Google — único lugar do app que fala com o Google */}
        <section className="order-3 flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-[18px] lg:order-none">
          <p className="eyebrow">Planilha Google</p>
          <GoogleSyncButton
            expenses={data.expenses}
            incomes={data.incomes}
            debts={data.debts}
            goals={data.goals}
            userEmail={user?.email ?? "usuario"}
          />
          {/* Sem isto, a pessoa não tem como saber que a planilha anda sozinha —
              e fica apertando "Atualizar agora" achando que precisa. */}
          {data.sheet.sheetUrl && (
            <p className="text-[13px] leading-[1.45] text-amber-800">{textoAutoSync(data.autoSync)}</p>
          )}
        </section>

        {/* Zona de perigo */}
        <section className="order-7 flex flex-col gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-[18px] lg:order-none">
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
        {/* Promessa que o código cumpre (ver PulaUmaRodada no provider e
            apagariaAPlanilha no motor): apagar aqui não manda nada pra planilha.
            A segunda frase é a parte honesta — a planilha espelha este aparelho,
            então quando a pessoa voltar a lançar ela passa a mostrar o que é novo. */}
        <p className="-mt-2 text-sm leading-[1.5] text-ink-600">
          {data.sheet.sheetUrl
            ? "Sua planilha Google não é apagada: ela continua com tudo o que já foi enviado. Some só o que está guardado neste aparelho — e, se você voltar a lançar aqui, a planilha passa a mostrar os lançamentos novos."
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
