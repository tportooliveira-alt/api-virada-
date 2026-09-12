/**
 * Motor de Inteligência Financeira e Diagnóstico Patrimonial
 * Código da Virada — Transforma dados brutos em diagnóstico de alto valor percebido.
 */

export interface FinancialIntelligence {
  score: {
    total: number; // 0 a 100
    label: "Crítico" | "Em Alerta" | "Equilibrado" | "Virada Consolidada";
    color: string;
    description: string;
  };
  runway: {
    months: number;
    days: number;
    label: string;
    status: "perigo" | "atencao" | "seguro" | "excelente";
  };
  rule503020: {
    essentials: { value: number; pct: number; targetPct: 50; isOver: boolean };
    lifestyle: { value: number; pct: number; targetPct: 30; isOver: boolean };
    future: { value: number; pct: number; targetPct: 20; isUnder: boolean };
  };
  savingsRate: {
    pct: number;
    value: number;
    isPositive: boolean;
  };
  debtStrategy: {
    totalDebt: number;
    hasDebt: boolean;
    snowballOrder: { name: string; value: number; share: number }[];
    estimatedMonthsToFreedom: number;
    congratulationsMessage?: string;
  };
  categoryPareto: {
    category: string;
    value: number;
    pct: number;
    accumulatedPct: number;
  }[];
}

export function computeFinancialIntelligence(params: {
  incomeMonth: number;
  expenseMonth: number;
  balanceMonth: number;
  totalCash: number;
  expenses: Array<{ category: string; value: number; nature?: string | null }>;
  debts: Array<{ name: string; totalValue: number; interestRate?: number }>;
  goals: Array<{ current: number; target: number }>;
}): FinancialIntelligence {
  const { incomeMonth, expenseMonth, totalCash, expenses, debts, goals } = params;

  // 1. Taxa de Poupança / Sobra Real
  const savingsValue = Math.max(0, incomeMonth - expenseMonth);
  const savingsRatePct = incomeMonth > 0 ? (savingsValue / incomeMonth) * 100 : 0;
  const isPositive = incomeMonth >= expenseMonth;

  // 2. Runway / Dias de Respiro Financeiro
  const avgMonthlyBurn = expenseMonth > 0 ? expenseMonth : 1500;
  const reserveTotal = goals.reduce((acc, g) => acc + (Number(g.current) || 0), 0);
  const availableLiquidity = Math.max(0, totalCash + reserveTotal);
  const runwayMonths = avgMonthlyBurn > 0 ? availableLiquidity / avgMonthlyBurn : 0;
  const runwayDays = Math.round(runwayMonths * 30);

  let runwayStatus: FinancialIntelligence["runway"]["status"] = "perigo";
  let runwayLabel = `${runwayDays} dias de cobertura`;
  if (runwayMonths >= 6) {
    runwayStatus = "excelente";
    runwayLabel = `${runwayMonths.toFixed(1)} meses (Reserva Blindada)`;
  } else if (runwayMonths >= 3) {
    runwayStatus = "seguro";
    runwayLabel = `${runwayMonths.toFixed(1)} meses de respiro`;
  } else if (runwayMonths >= 1) {
    runwayStatus = "atencao";
    runwayLabel = `${runwayMonths.toFixed(1)} mês de cobertura`;
  }

  // 3. Regra 50/30/20 Automática
  let essentialsValue = 0;
  let lifestyleValue = 0;

  for (const exp of expenses) {
    const val = Math.abs(exp.value);
    if (exp.nature === "impulso") {
      lifestyleValue += val;
    } else {
      essentialsValue += val;
    }
  }

  const totalSpent = essentialsValue + lifestyleValue;
  const effectiveBase = incomeMonth > 0 ? incomeMonth : totalSpent;
  const essentialsPct = effectiveBase > 0 ? (essentialsValue / effectiveBase) * 100 : 0;
  const lifestylePct = effectiveBase > 0 ? (lifestyleValue / effectiveBase) * 100 : 0;
  const futurePct = Math.max(0, 100 - essentialsPct - lifestylePct);

  // 4. Score da Virada (0 a 100)
  let scorePoints = 0;

  // Pilar 1: Sobra no Mês (até 40 pts)
  if (isPositive && savingsRatePct >= 20) scorePoints += 40;
  else if (isPositive && savingsRatePct >= 10) scorePoints += 30;
  else if (isPositive && savingsRatePct > 0) scorePoints += 20;
  else if (incomeMonth === expenseMonth) scorePoints += 10;

  // Pilar 2: Dívidas (até 30 pts)
  const totalDebt = debts.reduce((acc, d) => acc + (Number(d.totalValue) || 0), 0);
  if (totalDebt === 0) {
    scorePoints += 30;
  } else if (totalDebt < incomeMonth) {
    scorePoints += 20;
  } else if (totalDebt < incomeMonth * 3) {
    scorePoints += 10;
  }

  // Pilar 3: Reserva / Runway (até 30 pts)
  if (runwayMonths >= 6) scorePoints += 30;
  else if (runwayMonths >= 3) scorePoints += 20;
  else if (runwayMonths >= 1) scorePoints += 10;
  else if (runwayDays > 10) scorePoints += 5;

  let scoreLabel: FinancialIntelligence["score"]["label"] = "Crítico";
  let scoreColor = "#EF4444";
  let scoreDescription = "O caixa está sob pressão imediata. Hora de estancar sangrias e priorizar essenciais.";

  if (scorePoints >= 80) {
    scoreLabel = "Virada Consolidada";
    scoreColor = "#15803D";
    scoreDescription = "Controle exemplar! Caixa com sobra consistente e patrimônio em construção.";
  } else if (scorePoints >= 60) {
    scoreLabel = "Equilibrado";
    scoreColor = "#3B82F6";
    scoreDescription = "Bases sólidas. O próximo passo é acelerar o investimento da reserva de emergência.";
  } else if (scorePoints >= 40) {
    scoreLabel = "Em Alerta";
    scoreColor = "#F59E0B";
    scoreDescription = "Você está quase virando o jogo, mas pequenos vazamentos no estilo de vida exigem atenção.";
  }

  // 5. Estratégia de Dívidas (Bola de Neve)
  const sortedDebts = [...debts]
    .map((d) => ({ name: d.name, value: Number(d.totalValue) || 0 }))
    .sort((a, b) => a.value - b.value);

  const debtWithShare = sortedDebts.map((d) => ({
    name: d.name,
    value: d.value,
    share: totalDebt > 0 ? (d.value / totalDebt) * 100 : 0,
  }));

  const estimatedMonthsToFreedom = savingsValue > 0 && totalDebt > 0
    ? Math.ceil(totalDebt / savingsValue)
    : totalDebt > 0 ? 36 : 0;

  // 6. Ranking de Categorias (Pareto - Barras Horizontais)
  const catMap: Record<string, number> = {};
  for (const exp of expenses) {
    const c = exp.category || "Outros";
    catMap[c] = (catMap[c] || 0) + Math.abs(exp.value);
  }

  const sortedCats = Object.entries(catMap)
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value);

  let runSum = 0;
  const categoryPareto = sortedCats.map((item) => {
    runSum += item.value;
    return {
      category: item.category,
      value: item.value,
      pct: totalSpent > 0 ? (item.value / totalSpent) * 100 : 0,
      accumulatedPct: totalSpent > 0 ? (runSum / totalSpent) * 100 : 0,
    };
  });

  return {
    score: {
      total: scorePoints,
      label: scoreLabel,
      color: scoreColor,
      description: scoreDescription,
    },
    runway: {
      months: runwayMonths,
      days: runwayDays,
      label: runwayLabel,
      status: runwayStatus,
    },
    rule503020: {
      essentials: {
        value: essentialsValue,
        pct: essentialsPct,
        targetPct: 50,
        isOver: essentialsPct > 55,
      },
      lifestyle: {
        value: lifestyleValue,
        pct: lifestylePct,
        targetPct: 30,
        isOver: lifestylePct > 35,
      },
      future: {
        value: savingsValue,
        pct: futurePct,
        targetPct: 20,
        isUnder: futurePct < 15,
      },
    },
    savingsRate: {
      pct: savingsRatePct,
      value: savingsValue,
      isPositive,
    },
    debtStrategy: {
      totalDebt,
      hasDebt: totalDebt > 0,
      snowballOrder: debtWithShare,
      estimatedMonthsToFreedom,
      congratulationsMessage:
        totalDebt === 0
          ? "Parabéns! Zero dívidas ativas. Seu foco agora é acelerar a Reserva de Emergência e Liberdade Financeira."
          : undefined,
    },
    categoryPareto,
  };
}
