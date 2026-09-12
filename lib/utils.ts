import { BudgetPhase, Debt, Expense, Goal, Income, Mission, PocketKey, ViradaData } from "@/lib/types";
import { debtRemaining, isOpenDebt, semEstornados } from "@/lib/types";
import { BUDGET_PRESETS, missions, POCKET_BY_CATEGORY, POCKETS } from "@/lib/constants";

export const storageKey = "virada-app:v1";

export function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Dinheiro sempre em centavos inteiros antes de comparar sinal ou formatar:
// 201,23 − 100,00 − 101,23 dá −2.8e-14 em ponto flutuante, e o Intl imprime
// "-R$ 0,00" pra isso (e pra −0). O `|| 0` troca −0 por +0.
export function roundMoney(value: number) {
  return Math.round(value * 100) / 100 || 0;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(roundMoney(value));
}

export function parseCurrencyInput(value: string) {
  const cleaned = value.trim().replace(/[^\d,.-]/g, "");
  if (!cleaned) return NaN;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  let normalized = cleaned;

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const thousandSeparator = decimalSeparator === "," ? "." : ",";
    normalized = cleaned
      .replace(new RegExp(`\\${thousandSeparator}`, "g"), "")
      .replace(decimalSeparator, ".");
  } else if (hasComma) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    const parts = cleaned.split(".");
    normalized =
      parts.length > 2
        ? `${parts.slice(0, -1).join("")}.${parts[parts.length - 1]}`
        : cleaned;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

// Vencimento de dívida: o design mostra o ano (10/07/2026), diferente do
// formato curto usado em lançamentos ("10 de jul.").
export function formatDateFull(date: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${date}T00:00:00`));
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${date}T00:00:00`));
}

export function toInputDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

// Soma dias a uma data "AAAA-MM-DD" no calendário LOCAL. Nada de
// new Date("AAAA-MM-DD"): isso é UTC e, no Brasil, o dia 1º cai no mês anterior.
function shiftDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  return toInputDate(new Date(year, month - 1, day + days));
}

// Janela "últimos N dias" = hoje e os N−1 anteriores ("7 dias" = hoje + 6;
// "30 dias" = hoje + 29). Data futura fica fora. Comparação por texto: datas
// "AAAA-MM-DD" ordenam certo e não passam por fuso horário.
export function isWithinLastDays(date: string, days: number, today = toInputDate()) {
  return date >= shiftDays(today, -(days - 1)) && date <= today;
}

export type Period = "mes" | "30d" | "7d" | "ano" | "all";

// Filtro de período único das telas (Início/prévia via ExpenseChart, Relatórios).
export function inPeriod(date: string, period: Period, today = toInputDate()) {
  if (period === "all") return true;
  if (period === "mes") return date.slice(0, 7) === today.slice(0, 7);
  if (period === "ano") return date.slice(0, 4) === today.slice(0, 4);
  return isWithinLastDays(date, period === "7d" ? 7 : 30, today);
}

// Soma meses a uma data "AAAA-MM-DD" mantendo o dia; se o mês de destino não
// tem esse dia, cai no último (31/01 → 28/02, ou 29/02 em bissexto). Sem
// new Date("AAAA-MM-DD") (é UTC) e sem setMonth (31/01 + 1 mês viraria 03/03).
export function addMonths(date: string, months: number) {
  const [year, month, day] = date.split("-").map(Number);
  const first = new Date(year, month - 1 + months, 1);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return toInputDate(new Date(first.getFullYear(), first.getMonth(), Math.min(day, lastDay)));
}

// "AAAA-MM" ± n meses, só aritmética — serve pra navegar por mês nas telas.
export function shiftMonth(monthKey: string, months: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const index = year * 12 + (month - 1) + months;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

// Dias de `hoje` até `date` (negativo = já passou), no calendário local.
// Pra "vence em N dias" / "venceu há N dias".
export function diasAte(date: string, hoje = toInputDate()) {
  const [y1, m1, d1] = hoje.split("-").map(Number);
  const [y2, m2, d2] = date.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

export function isFromCurrentMonth(date: string) {
  const current = new Date();
  const target = new Date(`${date}T00:00:00`);

  return (
    current.getFullYear() === target.getFullYear() &&
    current.getMonth() === target.getMonth()
  );
}

export function sumValues<T>(items: T[], selector: (item: T) => number) {
  return items.reduce((total, item) => total + selector(item), 0);
}

// Inteiros que somam exatamente 100 (método do maior resto): 3 fatias iguais
// dão 34+33+33, e não 33+33+33 = 99. Total zero → tudo 0.
export function roundPercentages(values: number[]) {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return values.map(() => 0);
  const exact = values.map((value) => (value / total) * 100);
  const result = exact.map(Math.floor);
  let missing = 100 - result.reduce((sum, value) => sum + value, 0);
  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const { index } of byRemainder) {
    if (missing <= 0) break;
    result[index] += 1;
    missing -= 1;
  }
  return result;
}

// Gastos por categoria pro donut: as `top` maiores, com o que sobrou agregado em
// "Outros" — assim as fatias exibidas somam o total (360°) e os % somam 100.
// Uma categoria real "Outros" entra na mesma fatia, que fica sempre por último.
export function groupTopCategories(items: { category: string; value: number }[], top = 8) {
  const map = new Map<string, number>();
  items.forEach((item) => map.set(item.category, (map.get(item.category) ?? 0) + item.value));
  const sorted = [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const outros = sorted.find((c) => c.name === "Outros");
  const named = sorted.filter((c) => c.name !== "Outros");

  let groups = sorted;
  if (sorted.length > top) {
    const rest = named.slice(top - 1).reduce((sum, c) => sum + c.value, 0) + (outros?.value ?? 0);
    groups = [...named.slice(0, top - 1), { name: "Outros", value: rest }];
  }

  const pcts = roundPercentages(groups.map((c) => c.value));
  return groups.map((c, i) => ({ ...c, pct: pcts[i] }));
}

// "Sobrou do que entrou": saldo ÷ entradas, em % inteiro. Negativo é informação
// real (gastou mais do que entrou) — não trava em 0. Sem entradas não há taxa (null).
export function savingsRate(entradas: number, gastos: number): number | null {
  if (entradas <= 0) return null;
  return Math.round(((entradas - gastos) / entradas) * 100) || 0;
}

// "Meta alcançada" só quando o valor chegou lá de fato — 99,5% não é 100%.
export function isGoalReached(goal: Goal) {
  return goal.targetValue > 0 && roundMoney(goal.currentValue) >= roundMoney(goal.targetValue);
}

// Progresso exibido em [0, 100], com floor: 99,5% mostra 99 (arredondar pra
// cima dizia "Meta alcançada" faltando R$ 49). Valor atual negativo não vira −5%.
// Conta em INTEIROS de centavos: Math.floor(0.29 * 100) dá 28 (0.29*100 =
// 28.999999999999996 em ponto flutuante) — R$ 29 de R$ 100 aparecia como 28%.
export function getGoalProgress(goal: Goal) {
  const targetCents = Math.round(goal.targetValue * 100);
  if (targetCents <= 0) {
    return 0;
  }

  const currentCents = Math.round(goal.currentValue * 100);
  return Math.min(100, Math.max(0, Math.floor((currentCents * 100) / targetCents)));
}

export function getDashboardMetrics(data: ViradaData) {
  // Contratos de lib/types.ts: estornado fica fora de todo total; "em aberto" = aberta ou negociando.
  const monthIncomes = semEstornados(data.incomes).filter((item) => isFromCurrentMonth(item.date));
  const monthExpenses = semEstornados(data.expenses).filter((item) => isFromCurrentMonth(item.date));
  const openDebts = data.debts.filter(isOpenDebt);
  const reserveGoal = data.goals.find((item) => item.type === "reserva");

  const incomeMonth = roundMoney(sumValues(monthIncomes, (item) => item.value));
  const expenseMonth = roundMoney(sumValues(monthExpenses, (item) => item.value));
  const balanceMonth = roundMoney(incomeMonth - expenseMonth);
  // "Em aberto" = o que ainda falta pagar (total − pago), igual ao painel da planilha.
  const openDebtsTotal = roundMoney(sumValues(openDebts, debtRemaining));
  const estimatedEconomy = roundMoney(
    sumValues(
      monthExpenses.filter((item) => item.nature === "impulso"),
      (item) => item.value,
    ),
  );
  const reserveProgress = reserveGoal ? getGoalProgress(reserveGoal) : 0;
  const reserveCurrent = reserveGoal?.currentValue ?? 0;
  // Só missões que existem contam (chave órfã no missionStatus não passa de 100%).
  const missionsDone = missions.filter((mission) => data.missionStatus[mission.id]).length;
  const missionProgress = missions.length > 0 ? Math.round((missionsDone / missions.length) * 100) : 0;

  return {
    incomeMonth,
    expenseMonth,
    balanceMonth,
    openDebtsTotal,
    estimatedEconomy,
    reserveProgress,
    reserveCurrent,
    monthIncomes,
    monthExpenses,
    openDebts,
    missionProgress,
  };
}

// ─── Três bolsos ─────────────────────────────────────────────────────────────
// Só gastos de casa (scope "casa" ou ausente) e não estornados entram. Meta
// (depósito em reserva) NÃO entra em bolso nenhum: não tem data, só currentValue.

export type RendaOrigem = "informada" | "media3m" | "mes" | "nenhuma";
export type PocketEstado = "verde" | "vermelho" | "sem_alvo";

export interface Pocket {
  key: PocketKey;
  label: string;
  alvo: number;
  gasto: number;
  /** alvo − gasto; negativo = "passou R$ X" */
  sobra: number;
  estado: PocketEstado;
}

export interface PocketsResult {
  fase: BudgetPhase;
  renda: { valor: number; origem: RendaOrigem };
  bolsos: Pocket[];
}

const isCasa = (tx: { scope?: string }) => tx.scope !== "empresa";

// Categoria manda; "Compra" e "Outros" (e categoria desconhecida de dado antigo)
// decidem pela natureza: impulso → vida, essencial → contas.
export function pocketOf(expense: Pick<Expense, "category" | "nature">): PocketKey {
  const fixo = POCKET_BY_CATEGORY[expense.category] ?? "por_natureza";
  if (fixo !== "por_natureza") return fixo;
  return expense.nature === "impulso" ? "vida" : "contas";
}

export function budgetPhaseOf(data: Pick<ViradaData, "settings">): BudgetPhase {
  return data.settings?.budgetPhase ?? "organizando";
}

// Renda do mês: informada em Conta; senão média dos 3 meses ANTERIORES que
// tiveram entrada (mês sem entrada não conta como zero); senão o que entrou no
// próprio mês; senão "nenhuma" — a tela avisa, nunca R$ 0 silencioso.
function rendaDoMes(data: ViradaData, monthKey: string): PocketsResult["renda"] {
  const informada = data.settings?.expectedIncome;
  if (typeof informada === "number" && informada > 0) return { valor: roundMoney(informada), origem: "informada" };

  const entradas = semEstornados(data.incomes).filter(isCasa);
  const somaMes = (key: string) => roundMoney(sumValues(entradas.filter((i) => i.date.slice(0, 7) === key), (i) => i.value));

  const anteriores = [1, 2, 3].map((k) => somaMes(shiftMonth(monthKey, -k))).filter((v) => v > 0);
  if (anteriores.length > 0) {
    return { valor: roundMoney(anteriores.reduce((s, v) => s + v, 0) / anteriores.length), origem: "media3m" };
  }
  const mes = somaMes(monthKey);
  if (mes > 0) return { valor: mes, origem: "mes" };
  return { valor: 0, origem: "nenhuma" };
}

export function getPockets(data: ViradaData, monthKey?: string, hoje = toInputDate()): PocketsResult {
  const key = monthKey ?? hoje.slice(0, 7);
  const fase = budgetPhaseOf(data);
  const renda = rendaDoMes(data, key);
  const pct = BUDGET_PRESETS[fase];

  const gastos = semEstornados(data.expenses).filter((e) => isCasa(e) && e.date.slice(0, 7) === key);
  const bolsos = POCKETS.map(({ key: pocket, label }) => {
    const alvo = roundMoney(renda.valor * pct[pocket]);
    const gasto = roundMoney(sumValues(gastos.filter((e) => pocketOf(e) === pocket), (e) => e.value));
    const sobra = roundMoney(alvo - gasto);
    // Comparação em centavos: 0,10 + 0,20 não pode ficar "vermelho" contra 0,30.
    const estado: PocketEstado = alvo <= 0 ? "sem_alvo" : Math.round(gasto * 100) > Math.round(alvo * 100) ? "vermelho" : "verde";
    return { key: pocket, label, alvo, gasto, sobra, estado };
  });

  return { fase, renda, bolsos };
}

// Sugestão, nunca troca sozinha: quem decide a fase é a pessoa (em Conta).
export function sugerirFaseVirada(data: ViradaData) {
  return budgetPhaseOf(data) === "organizando" && data.debts.some((d) => isOpenDebt(d) && d.totalValue > 0);
}

// O que vence de cada dívida em aberto: a parcela (ou o que falta, se for menor
// ou se a dívida não tem parcela). Depósitos em meta ficam fora: não têm data.
function parcelaDevida(debt: Debt) {
  const restante = debtRemaining(debt);
  return debt.installmentValue > 0 ? Math.min(debt.installmentValue, restante) : restante;
}

function somaParcelas(debts: Debt[]) {
  return { total: roundMoney(sumValues(debts, parcelaDevida)), quantidade: debts.length };
}

// Duas linhas que não se sobrepõem: "vencidas" = já passou da data (qualquer mês);
// "vencendo" = ainda vai vencer dentro do mês escolhido (vence hoje conta aqui).
// Uma dívida que venceu dia 5 deste mês só aparece em "vencidas" — nunca duas vezes.
export function avisosDeDivida(debts: Debt[], mes: string, hoje = toInputDate()) {
  const abertas = debts.filter(isOpenDebt);
  return {
    vencidas: somaParcelas(abertas.filter((d) => d.dueDate < hoje)),
    vencendo: somaParcelas(abertas.filter((d) => d.dueDate >= hoje && d.dueDate.slice(0, 7) === mes)),
  };
}

// Dia 31 fica na última missão (o `%` mandava de volta pra missão 1).
export function getMissionOfDay(missions: Mission[], today = new Date().getDate()) {
  return missions[Math.min(Math.max(today, 1), missions.length) - 1];
}

// `percentage` é a fatia de cada barra no total movimentado no mês (somam 100).
// Antes era relativo à maior barra e as três somavam 140%.
export function getMonthlyChart(expenses: Expense[], incomes: Income[]) {
  const monthExpenses = semEstornados(expenses).filter((item) => isFromCurrentMonth(item.date));
  const incomeMonth = sumValues(semEstornados(incomes).filter((item) => isFromCurrentMonth(item.date)), (item) => item.value);
  const essentialMonth = sumValues(monthExpenses.filter((item) => item.nature === "essencial"), (item) => item.value);
  const impulseMonth = sumValues(monthExpenses.filter((item) => item.nature === "impulso"), (item) => item.value);

  const [incomePct, essentialPct, impulsePct] = roundPercentages([incomeMonth, essentialMonth, impulseMonth]);

  return [
    { label: "Entradas", value: incomeMonth, percentage: incomePct, tone: "bg-emerald-500" },
    { label: "Essenciais", value: essentialMonth, percentage: essentialPct, tone: "bg-sky-500" },
    { label: "Impulso", value: impulseMonth, percentage: impulsePct, tone: "bg-amber-400" },
  ];
}

// Fluxo "dia a dia": resultado do dia e acumulado, em ordem crescente de data,
// ambos passados por roundMoney a cada passo — 201,23 − (100 + 101,23) dava
// −2.8e-14 e a tela mostrava "resultado −R$ 0,00" em vermelho.
export function dailyFlow(incomes: Income[], expenses: Expense[]) {
  const map = new Map<string, { inc: number; exp: number }>();
  incomes.forEach((item) => {
    const day = map.get(item.date) ?? { inc: 0, exp: 0 };
    map.set(item.date, { ...day, inc: day.inc + item.value });
  });
  expenses.forEach((item) => {
    const day = map.get(item.date) ?? { inc: 0, exp: 0 };
    map.set(item.date, { ...day, exp: day.exp + item.value });
  });
  let acc = 0;
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, day]) => {
      const inc = roundMoney(day.inc);
      const exp = roundMoney(day.exp);
      const result = roundMoney(inc - exp);
      acc = roundMoney(acc + result);
      return { date, inc, exp, result, acc };
    });
}

export function sortByDateDesc<T extends { date?: string; dueDate?: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const first = a.date ?? a.dueDate ?? "";
    const second = b.date ?? b.dueDate ?? "";
    return new Date(second).getTime() - new Date(first).getTime();
  });
}

export function getDebtStatusLabel(status: Debt["status"]) {
  if (status === "aberta") return "Aberta";
  if (status === "negociando") return "Negociando";
  return "Quitada";
}

export function getPriorityClasses(priority: Debt["priority"]) {
  if (priority === "alta") return "border-rose-500/60 bg-rose-500/10";
  if (priority === "média") return "border-amber-400/50 bg-amber-400/10";
  return "border-slate-700 bg-slate-800/40";
}

export function getSummaryMessage(metrics: ReturnType<typeof getDashboardMetrics>) {
  if (metrics.balanceMonth < 0) {
    return "Seu dinheiro não some. Ele vai para algum lugar. Hoje o foco é enxergar os vazamentos e agir neles.";
  }

  if (metrics.estimatedEconomy > 0) {
    return "Existe espaço claro para corte inteligente. Não é dinheiro fácil. É direção.";
  }

  return "Você já começou a organizar a virada. Continue pequeno, mas continue hoje.";
}

export function getViradaLevel(score: number) {
  if (score <= 20) return "Começando a Virada";
  if (score <= 40) return "Saindo do Caos";
  if (score <= 60) return "Organizando a Vida";
  if (score <= 80) return "Controlando o Dinheiro";
  return "Mente Financeira Forte";
}

export function calculateViradaScore(data: ViradaData, totalPoints: number, activeDays = 0) {
  const hasExpense = data.expenses.length > 0 ? 10 : 0;
  const hasIncome = data.incomes.length > 0 ? 10 : 0;
  const hasMission = Object.values(data.missionStatus).some(Boolean) ? 10 : 0;
  const hasGoal = data.goals.length > 0 ? 10 : 0;
  const hasSaving = data.goals.some((goal) => goal.type === "reserva" && goal.currentValue > 0) ? 15 : 0;
  // Quem não tem dívida nenhuma não deve perder os pontos de "revisou as dívidas".
  const hasDebtReview = data.debts.length === 0 || data.debts.some((debt) => debt.status !== "aberta") ? 10 : 0;
  const hasExtraIncome = data.incomes.some((income) => income.category !== "Salário") ? 10 : 0;
  // Piso 0: pontos/dias negativos não podem puxar o score abaixo de zero.
  const pointsScore = Math.max(0, Math.min(15, Math.floor(totalPoints / 20)));
  const activityScore = Math.max(0, Math.min(10, activeDays * 2));

  return Math.min(
    100,
    hasExpense +
      hasIncome +
      hasMission +
      hasGoal +
      hasSaving +
      hasDebtReview +
      hasExtraIncome +
      pointsScore +
      activityScore,
  );
}

// "agora" · "há 5 min" · "há 2 h" · "há 3 dias" — pra "Planilha atualizada há …"
export function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  return `há ${days} dia${days > 1 ? "s" : ""}`;
}
