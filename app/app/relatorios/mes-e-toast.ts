/**
 * Duas contas puras da tela de Relatórios, fora do page.tsx porque o Next só aceita
 * `default` (e a configuração de rota) como export de uma página — sem um arquivo ao
 * lado, não dá pra testar essas regras sem abrir o navegador.
 */

// Só 01–12: ?mes=2026-13 caía em "Janeiro 2026" com tudo zerado.
const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Mês que a tela deve abrir, a partir do ?mes= da URL.
 * Aceita "tudo" e "AAAA-MM" com mês 01..12 e ano plausível (2000..2100) — "2026-13"
 * abria "Janeiro 2026" com tudo zerado e "0000-01" passava pelo regex. Qualquer outra
 * coisa cai no mês corrente e devolve `invalido` pra tela poder avisar, em vez de
 * mostrar um mês errado calada.
 */
export function mesDaUrl(param: string | null, mesAtual: string): { mes: string; tudo: boolean; invalido: boolean } {
  if (param === null) return { mes: mesAtual, tudo: false, invalido: false };
  if (param === "tudo") return { mes: mesAtual, tudo: true, invalido: false };
  const ano = Number(param.slice(0, 4));
  if (!MONTH_KEY.test(param) || ano < 2000 || ano > 2100) return { mes: mesAtual, tudo: false, invalido: true };
  return { mes: param, tudo: false, invalido: false };
}

/**
 * Texto do toast de parcela paga. Curto de propósito: "Parcela de R$ 450,00 registrada
 * em Cartão" não cabia em 360 px e era cortado com "…" bem em cima do nome da dívida.
 */
export function mensagemDaParcela(value: number, debtName: string, formatCurrency: (v: number) => string) {
  return `Parcela ${formatCurrency(value)} · ${debtName}`;
}
