"use client";

/**
 * PocketsCard — "Seus 3 bolsos" (Contas / Dívidas e reserva / Vida).
 * Toda a conta vem de getPockets (lib/utils.ts); aqui só se mostra.
 * Renda sem ser informada não vira R$ 0 silencioso: o card diz de onde o
 * número saiu ("baseado no que entrou até agora") ou convida a informar.
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BUDGET_PHASES } from "@/lib/constants";
import type { ViradaData } from "@/lib/types";
import { avisosDeDivida, formatCurrency, getPockets, sugerirFaseVirada, toInputDate } from "@/lib/utils";
import type { Pocket } from "@/lib/utils";

interface Props {
  data: ViradaData;
  /** "AAAA-MM"; padrão = mês de hoje. */
  mes?: string;
  /** "AAAA-MM-DD"; padrão = hoje (local). Separa "vencida" de "ainda vai vencer". */
  hoje?: string;
}

// Cada string de valor é UM texto só (template) — o SSR do React separa
// expressões vizinhas com "<!-- -->", e os testes leem o texto corrido.
function linhaDoBolso(bolso: Pocket) {
  if (bolso.estado === "sem_alvo") return bolso.gasto > 0 ? `${formatCurrency(bolso.gasto)} gastos` : "nada gasto ainda";
  if (bolso.estado === "vermelho") return `${formatCurrency(bolso.gasto)} de ${formatCurrency(bolso.alvo)} · passou ${formatCurrency(-bolso.sobra)}`;
  return `${formatCurrency(bolso.gasto)} de ${formatCurrency(bolso.alvo)} · sobra ${formatCurrency(bolso.sobra)}`;
}

function larguraDaBarra(bolso: Pocket) {
  if (bolso.alvo <= 0) return 0;
  return Math.min(100, Math.round((bolso.gasto / bolso.alvo) * 100));
}

const linkClass = "inline-flex items-center gap-1 font-semibold text-[#047857] hover:text-green-800";

export function PocketsCard({ data, mes, hoje = toInputDate() }: Props) {
  const key = mes ?? hoje.slice(0, 7);
  const { fase, renda, bolsos } = getPockets(data, key, hoje);
  const faseInfo = BUDGET_PHASES.find((item) => item.key === fase) ?? BUDGET_PHASES[0];
  const sugerir = sugerirFaseVirada(data);
  const { vencidas, vencendo } = avisosDeDivida(data.debts, key, hoje);

  return (
    <section className="surface-card flex min-w-0 flex-col gap-4 p-5 sm:p-[22px]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="eyebrow">Seus 3 bolsos</p>
          <h2 className="mt-1 text-lg font-bold tracking-[-0.01em] text-ink-900">Quanto cabe em cada um</h2>
        </div>
        <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-600">
          {`${faseInfo.label} · ${faseInfo.split}`}
        </span>
      </div>

      {renda.origem === "nenhuma" ? (
        <p className="rounded-xl border border-dashed border-ink-300 px-4 py-3 text-sm leading-[1.5] text-ink-600">
          Quanto entra por mês, mais ou menos? Informe em Conta e cada bolso ganha um alvo.{" "}
          <Link href="/app/conta" className={linkClass}>
            Informar renda <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </p>
      ) : (
        <p className="text-[13px] text-ink-500">
          {renda.origem === "informada"
            ? `Renda ${formatCurrency(renda.valor)} por mês.`
            : `Renda ${formatCurrency(renda.valor)}, baseado no que entrou até agora.`}{" "}
          <Link href="/app/conta" className={linkClass}>
            {renda.origem === "informada" ? "Ajustar" : "Informar renda"}
          </Link>
        </p>
      )}

      <div className="flex flex-col gap-3.5">
        {bolsos.map((bolso) => {
          const vermelho = bolso.estado === "vermelho";
          return (
            <div key={bolso.key} data-estado={bolso.estado} className="min-w-0">
              {/* Rótulo não quebra; a linha de valor pode quebrar no " · " em tela estreita
                  (sem a classe .money, que é nowrap — o R$ já vem colado ao número por NBSP) */}
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-ink-900">{bolso.label}</span>
                <span className={`min-w-0 text-right text-[13px] tabular-nums ${vermelho ? "font-semibold text-red-700" : "text-ink-600"}`}>
                  {linhaDoBolso(bolso)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                <div
                  className={`h-full rounded-full ${vermelho ? "bg-red-500" : "bg-green-500"}`}
                  style={{ width: `${larguraDaBarra(bolso)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {vencidas.quantidade > 0 && (
        <Link
          href="/app/relatorios?aba=dividas"
          className="flex items-center justify-between gap-3 rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-800 transition-colors duration-150 hover:bg-red-100"
        >
          <span className="money">{`Dívidas vencidas: ${formatCurrency(vencidas.total)} (${vencidas.quantidade})`}</span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>
      )}

      {vencendo.quantidade > 0 && (
        <Link
          href={`/app/relatorios?aba=dividas&mes=${key}`}
          className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-800 transition-colors duration-150 hover:bg-amber-100"
        >
          <span className="money">{`Dívidas vencendo neste mês: ${formatCurrency(vencendo.total)} (${vencendo.quantidade})`}</span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>
      )}

      {sugerir && (
        <div className="rounded-xl border border-ink-200 bg-ink-50 px-3.5 py-3 text-[13px] leading-[1.5] text-ink-700">
          <b className="font-semibold text-ink-900">Sugestão:</b> você tem dívida em aberto. Na Fase de virada (50/40/10) vai mais
          dinheiro pra quitar.{" "}
          <Link href="/app/conta" className={linkClass}>
            Ativar em Conta <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </section>
  );
}
