/**
 * Construtor isomorfico da planilha — v3 (planilha "viva").
 * Depende do styles.ts v2 (STYLE.sparkCell / sparkHeader, COLOR.greenDeep, slate*).
 *
 * O que é FÓRMULA (recalcula dentro do Google Sheets) e o que é VALOR (colado
 * pelo sync) — mantenha esta lista em dia:
 *  - Dashboard A6/D6/G6/J6 (mês de referência em B3) e A8/D8/G8/J8: SOMASES/
 *    CONT.SES sobre a aba Lançamentos; B12:B21 (gasto por categoria): SOMASES;
 *    C12:C21 e K12:K21: SPARKLINE. G12:J21 (comparativo dos 10 últimos meses):
 *    VALOR — o mês ali é data (AAAA-MM-01) pro gráfico e não há TEXTO() seguro
 *    em pt_BR pra virar chave "AAAA-MM"; a fonte é o mesmo cálculo do Resumo.
 *  - Filtros B10:B14 e Bolsos C9:F11, B6: fórmulas; menus, listas, renda e fase: VALOR.
 *  - Dívidas "Em aberto", Metas "Faltando"/"Progresso", Fluxo e Resumo
 *    "Resultado"/"Saldo acumulado": fórmula por linha. Resumo Entradas/Saídas/
 *    Economia/Lançamentos: VALOR (Economia segue o savingsRate do app, com o
 *    arredondamento do JS — ARRED difere no meio-centavo).
 *  - Painéis laterais (O4:O7) de cada aba: VALOR (texto formatado).
 * Sintaxe obrigatória pt-BR (locale pt_BR + USER_ENTERED): nomes em português,
 * ";" entre argumentos, "\" entre colunas de matriz, nenhum literal decimal.
 * Prova offline: scripts/test-planilha-formulas.ts (mini-avaliador).
 *
 * Grade: cada aba de dados nasce com GRADE_INICIAL linhas, toda formatada
 * (zebra, filtro, proteção, R$/data). Quando os dados passam disso, o sync
 * cresce a grade (growDataSheetRequests, via sync-requests.growGridCall) e
 * formata só a faixa nova — appendDimension não herda nada.
 */

import {
  COLOR,
  FONT,
  FORMAT,
  STYLE,
  addBanding,
  condFormatPositiveNegative,
  condFormatProgressBands,
  condFormatTextEquals,
  dataValidationFromRange,
  freezeRows,
  hideColumns,
  hideGridlines,
  mergeCells,
  protectSheet,
  protectSheetExcept,
  repeatCell,
  setColumnCount,
  setColumnWidth,
  setRowHeight,
  showColumns,
} from "./styles";
import { debtPaid, debtRemaining, isOpenDebt, semEstornados, type BudgetPhase, type DebtStatus, type ExpenseCategory, type ExpenseNature, type ViradaData, type ViradaSettings } from "../types";
import { budgetPhaseOf, getPockets, pocketOf, savingsRate } from "../utils";
import { BUDGET_PHASES, BUDGET_PRESETS, POCKETS, POCKET_BY_CATEGORY, expenseCategories } from "../constants";

export type Row = Record<string, string | number | null | undefined>;

type TabKey = keyof typeof TAB;
export type DataTabKey = Exclude<TabKey, "dashboard" | "filtros" | "bolsos" | "ajuda">;
type ValueRange = { range: string; values: unknown[][] };

type PanelMeta = {
  title: string;
  hint: string;
  labels: [string, string, string, string];
  notes: [string, string, string, string];
};

export const TAB = {
  dashboard: "Dashboard",
  bolsos: "Bolsos",
  filtros: "Filtros",
  lancamentos: "Lançamentos",
  receitas: "Receitas",
  despesas: "Despesas",
  dividas: "Dívidas",
  metas: "Metas",
  fluxo: "Fluxo de Caixa",
  resumo: "Resumo Mensal",
  ajuda: "Como usar",
} as const;

export const TAB_ORDER: TabKey[] = [
  "dashboard",
  "bolsos",
  "filtros",
  "lancamentos",
  "receitas",
  "despesas",
  "dividas",
  "metas",
  "fluxo",
  "resumo",
  "ajuda",
];

// Lançamentos: Mês (AAAA-MM), Estornado (Sim/Não) e Bolso são colunas de
// CRITÉRIO — as fórmulas do Dashboard, Filtros e Bolsos filtram por elas.
// Toda coluna de critério é gravada SEMPRE com valor ("—" quando não se
// aplica): "*" no SOMASES não casa célula vazia.
export const HEADERS: Partial<Record<TabKey, string[]>> = {
  lancamentos: ["Data", "Tipo", "Descrição", "Categoria", "Valor", "Pagamento", "Natureza", "Escopo", "Origem", "Mês", "Estornado", "Bolso"],
  receitas: ["Data", "Descrição", "Categoria", "Valor", "Escopo", "Origem"],
  despesas: ["Data", "Descrição", "Categoria", "Valor", "Pagamento", "Natureza", "Escopo"],
  dividas: ["Nome", "Vencimento", "Prioridade", "Status", "Parcela", "Valor total", "Pago", "Em aberto"],
  metas: ["Meta", "Tipo", "Valor alvo", "Valor atual", "Faltando", "Progresso"],
  fluxo: ["Data", "Entradas", "Saídas", "Resultado do dia", "Saldo acumulado"],
  resumo: ["Mês", "Entradas", "Saídas", "Resultado", "Saldo acumulado", "Economia", "Lançamentos"],
};

/**
 * Versão do LAYOUT da planilha (visual: cores, fontes, alturas, gráficos,
 * fórmulas dos blocos fixos). Toda vez que o layout mudar, suba esta data —
 * o app compara com a versão gravada na planilha do usuário e, se estiver
 * atrasada, reaplica o visual sozinho no próximo "Atualizar agora".
 * Só valores mudam sem bump.
 */
export const LAYOUT_VERSION = "2026-09-12.1";

// Cores das barras de participação do Dashboard — mesma sequência da legenda
// da pizza no design (Planilha Virada - Redesign).
const SPARK_COLORS = ["#22C55E", "#F5C542", "#3B82F6", "#EF4444", "#A855F7", "#F97316", "#06B6D4", "#EC4899", "#84CC16", "#14B8A6"];

export const MAX_DATA_ROWS = 1000;
/** Linhas com que cada aba de dados nasce (e até onde o layout formata). */
export const GRADE_INICIAL = MAX_DATA_ROWS + 10;

const DATA_TABS: DataTabKey[] = ["lancamentos", "receitas", "despesas", "dividas", "metas", "fluxo", "resumo"];

// Aba de dados: A..última gerada | Anotações (livre) | (escondidas) | painel.
// O painel fica fixo em N (rótulo) e O:P (valor) em toda aba, depois da maior
// lista (Lançamentos, 12 colunas + Anotações em M). A coluna Anotações é a
// única que o usuário edita — e fica FORA de todo range que o sync limpa/escreve.
const NOTES_HEADER = "Anotações";
const PANEL_LABEL_COL = 13; // N
const PANEL_VALUE_COL = 14; // O (mesclada com P)
const DATA_COLUMN_COUNT = 16;
const PANEL_VALUES = `${colLetter(PANEL_VALUE_COL)}4:${colLetter(PANEL_VALUE_COL)}7`;

// Listas dos menus da aba Filtros (H:L, preenchidas pelo sync, escondidas).
const FILTRO_LISTA_COL = 7; // H
const FILTRO_LISTA_FIM = 200;
const FILTROS_ROWS = FILTRO_LISTA_FIM;

function colLetter(index: number) {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function mainCols(key: DataTabKey) {
  return (HEADERS[key] ?? []).length;
}

/** Letra da coluna "Anotações" de uma aba de dados (a primeira depois das geradas). */
export function colunaAnotacoes(key: DataTabKey) {
  return colLetter(mainCols(key));
}

const PANEL_META: Record<DataTabKey, PanelMeta> = {
  lancamentos: {
    title: "Leitura rápida",
    hint: "Visão consolidada dos lançamentos que alimentam todas as outras abas.",
    labels: ["Total lançado", "Entradas", "Saídas", "Período"],
    notes: [
      "Esta aba é a linha do tempo geral do app.",
      "Mês, Estornado e Bolso são as colunas que as fórmulas usam.",
      "Escreva o que quiser na coluna Anotações — o app não mexe nela.",
      "Se algo estiver faltando, ajuste no app e sincronize de novo.",
    ],
  },
  receitas: {
    title: "Resumo de receitas",
    hint: "Entradas isoladas para acompanhar fôlego, frequência e maior fonte.",
    labels: ["Qtde de entradas", "Total recebido", "Maior entrada", "Última entrada"],
    notes: [
      "Receitas mostram só o que entrou, sem misturar despesas.",
      "Use para enxergar sazonalidade e renda extra.",
      "Quando precisar conferir um mês, filtre por data.",
      "O valor total desta aba alimenta o Dashboard.",
    ],
  },
  despesas: {
    title: "Resumo de despesas",
    hint: "Saídas com foco em controle, ticket médio e identificação de excesso.",
    labels: ["Qtde de saídas", "Total gasto", "Maior despesa", "Última saída"],
    notes: [
      "Aqui ficam só as saídas financeiras do período.",
      "Use pagamento e natureza para separar essencial de impulso.",
      "A categoria ajuda a enxergar para onde o dinheiro está indo.",
      "Toda atualização vem do app, não da planilha manual.",
    ],
  },
  dividas: {
    title: "Painel de dívidas",
    hint: "Dívidas em uma visão de prioridade, aberto e ritmo de negociação.",
    labels: ["Qtde de dívidas", "Total em aberto", "Quitadas", "Prioridade mais crítica"],
    notes: [
      "Comece pelas dívidas mais urgentes ou caras.",
      "Em aberto = valor total − pago (fórmula); quitada fica em zero.",
      "Quitadas continuam registradas para manter histórico.",
      "O gráfico do Dashboard usa esta base.",
    ],
  },
  metas: {
    title: "Painel de metas",
    hint: "Metas mostram direção financeira e progresso real acumulado.",
    labels: ["Qtde de metas", "Valor alvo", "Valor atual", "Melhor progresso"],
    notes: [
      "Metas ajudam a sair do modo só reação.",
      "Use para reserva, quitação, compras planejadas ou objetivo anual.",
      "Faltando e Progresso são fórmulas: mudam com o valor atual.",
      "Quanto mais perto de 100%, mais verde a célula fica.",
    ],
  },
  fluxo: {
    title: "Pulso do caixa",
    hint: "Mostra o comportamento diário do resultado e do saldo acumulado.",
    labels: ["Dias com movimento", "Melhor dia", "Pior dia", "Saldo final"],
    notes: [
      "O fluxo evidencia quando o caixa respirou e quando apertou.",
      "Resultado do dia é entrada menos saída naquela data.",
      "Saldo acumulado mostra tendência, não só evento isolado.",
      "É uma das abas mais úteis para tomada de decisão.",
    ],
  },
  resumo: {
    title: "Fechamento mensal",
    hint: "Consolidação mês a mês para comparar evolução e disciplina financeira.",
    labels: ["Meses no histórico", "Melhor mês", "Pior mês", "Economia média"],
    notes: [
      "Use esta aba para comparar meses, não só dias.",
      "Resultado positivo indica sobra; negativo indica aperto.",
      "Economia mede quanto sobrou em relação ao que entrou.",
      "Ela sustenta o comparativo mensal do Dashboard.",
    ],
  },
};

// Passos da aba "Como usar" — o layout e o conteúdo leem daqui.
const HELP_STEPS: Array<[string, string]> = [
  ["Sincronize pelo app sempre que lançar algo", "A planilha é o reflexo fiel do aplicativo. Edite no app e toque em Atualizar agora — as fórmulas recalculam sozinhas."],
  ["Comece pelo Dashboard", "Entradas, gastos, em caixa e lançamentos do mês são fórmulas (SOMASES) sobre a aba Lançamentos, filtrando o mês de referência (B3). Abaixo, o acumulado desde o início e o gasto por categoria."],
  ["Filtros: escolha nos menus e veja só o que quiser", "Mês, categoria, escopo, natureza e forma de pagamento. Deixe \"Todos\" para não filtrar. Entradas, gastos, saldo e impulso mudam na hora."],
  ["Bolsos: a regra dos três bolsos, viva", "Renda esperada e fase vêm do app (Conta); alvo, gasto e sobra de cada bolso são fórmulas. O mês é o escolhido em Filtros (ou o corrente)."],
  ["Anotações: a única coluna sua", "Em cada aba de dados, a coluna Anotações é livre — o app nunca limpa nem escreve nela. Ela fica na linha, não no lançamento: se a ordem mudar, confira."],
  ["Não quebre a estrutura manualmente", "As outras áreas ficam bloqueadas para proteger as fórmulas. Se a planilha ficar estranha, desconecte no app e conecte de novo: ela nasce inteira com o layout atual."],
];

export interface SyncInput {
  expenses: Array<{ id: string; description: string; value: number; category: string; date: string; paymentMethod?: string; nature?: string; scope?: string; source?: string; estornadoEm?: string }>;
  incomes: Array<{ id: string; description: string; value: number; category: string; date: string; scope?: string; source?: string; estornadoEm?: string }>;
  debts: Array<{ id: string; name: string; totalValue: number; installmentValue: number; dueDate: string; priority: string; status: string; paidValue?: number }>;
  goals: Array<{ id: string; name: string; targetValue: number; currentValue: number; type: string }>;
  /** Renda esperada e fase dos bolsos (data.settings do app). */
  settings?: ViradaSettings;
}

export function buildSheetSpecs() {
  return TAB_ORDER.map((key, index) => ({
    properties: {
      title: TAB[key],
      index,
      gridProperties: {
        rowCount: key === "dashboard" ? 70 : key === "ajuda" ? 40 : key === "filtros" ? FILTROS_ROWS : key === "bolsos" ? 40 : GRADE_INICIAL,
        columnCount: isDataTab(key) ? DATA_COLUMN_COUNT : 12,
      },
    },
  }));
}

function isDataTab(key: TabKey): key is DataTabKey {
  return (DATA_TABS as TabKey[]).includes(key);
}

/**
 * `rowCounts` (título → rowCount real, do GET) só importa no upgrade: uma aba
 * que já cresceu além de GRADE_INICIAL continua formatada/filtrada/livre até o
 * fim da grade dela — reaplicar o layout não pode encolher nada.
 */
export function buildLayoutRequests(ids: Record<string, number>, rowCounts: Record<string, number> = {}): unknown[] {
  const requests: unknown[] = [];

  buildDashboardLayout(requests, ids[TAB.dashboard]);
  buildBolsosLayout(requests, ids[TAB.bolsos]);
  buildFiltrosLayout(requests, ids[TAB.filtros]);
  DATA_TABS.forEach((key) => buildDataSheetLayout(requests, key, ids[TAB[key]], Math.max(GRADE_INICIAL, rowCounts[TAB[key]] ?? 0)));
  buildHelpLayout(requests, ids[TAB.ajuda]);
  applyNumberFormats(requests, ids);
  applyConditionals(requests, ids);

  return requests;
}

function buildDashboardLayout(requests: unknown[], sheetId: number) {
  requests.push(hideGridlines(sheetId));
  [132, 96, 96, 132, 96, 96, 132, 96, 96, 132, 96, 96].forEach((width, index) => {
    requests.push(setColumnWidth(sheetId, index, index + 1, width));
  });

  requests.push(setRowHeight(sheetId, 0, 1, 52));
  requests.push(setRowHeight(sheetId, 1, 2, 24));
  requests.push(mergeCells(sheetId, 0, 1, 0, 12));
  requests.push(mergeCells(sheetId, 1, 2, 0, 12));
  requests.push(repeatCell(sheetId, range(0, 1, 0, 12), STYLE.banner));
  requests.push(repeatCell(sheetId, range(1, 2, 0, 12), STYLE.bannerSub));

  // Linha 3: "Mês de referência" (A3) e a chave do mês (B3, ver mesChave) que
  // as fórmulas dos KPIs filtram — gravada pelo sync, visível pra ninguém achar
  // que o Dashboard "travou" num mês.
  requests.push(setRowHeight(sheetId, 2, 3, 22));
  requests.push(setRowHeight(sheetId, 3, 4, 12));
  requests.push(repeatCell(sheetId, range(2, 3, 0, 1), STYLE.refLabel));
  requests.push(repeatCell(sheetId, range(2, 3, 1, 2), STYLE.refValue));

  requests.push(setRowHeight(sheetId, 4, 5, 22));
  requests.push(setRowHeight(sheetId, 5, 6, 52));
  // Linhas 7–8 (eram separador) carregam o bloco "Desde o início" dentro do mesmo
  // cartão: o KPI grande é o mês corrente (igual ao Início do app) e o acumulado
  // do histórico fica logo abaixo, menor e rotulado — nenhum se passa pelo outro.
  requests.push(setRowHeight(sheetId, 6, 7, 18));
  requests.push(setRowHeight(sheetId, 7, 8, 30));
  [0, 3, 6, 9].forEach((startCol) => {
    const gold = startCol === 6;
    requests.push(mergeCells(sheetId, 4, 5, startCol, startCol + 3));
    requests.push(mergeCells(sheetId, 5, 6, startCol, startCol + 3));
    requests.push(mergeCells(sheetId, 6, 7, startCol, startCol + 3));
    requests.push(mergeCells(sheetId, 7, 8, startCol, startCol + 3));
    requests.push(repeatCell(sheetId, range(4, 5, startCol, startCol + 3), STYLE.kpiLabel));
    requests.push(repeatCell(sheetId, range(6, 7, startCol, startCol + 3), gold ? STYLE.kpiLabelSubGold : STYLE.kpiLabelSub));
    requests.push(repeatCell(sheetId, range(7, 8, startCol, startCol + 3), gold ? STYLE.kpiValueSubGold : STYLE.kpiValueSub));
  });
  requests.push(repeatCell(sheetId, range(5, 6, 0, 3), STYLE.kpiValue));
  requests.push(repeatCell(sheetId, range(5, 6, 3, 6), STYLE.kpiValue));
  requests.push(repeatCell(sheetId, range(5, 6, 6, 9), STYLE.kpiValueGold));
  requests.push(repeatCell(sheetId, range(5, 6, 9, 12), STYLE.kpiValueCount));

  // design: títulos 28/24px, cabeçalho da tabela 26px e linhas de dados 22px
  requests.push(setRowHeight(sheetId, 8, 9, 28));
  requests.push(setRowHeight(sheetId, 9, 10, 24));
  requests.push(setRowHeight(sheetId, 10, 11, 26));
  requests.push(setRowHeight(sheetId, 11, 21, 22));
  requests.push(setRowHeight(sheetId, 32, 33, 28));
  requests.push(setRowHeight(sheetId, 33, 34, 24));

  // v2: linha separadora fina (22)
  requests.push(setRowHeight(sheetId, 21, 22, 12));
  // v2: colunas C:E e K:L viram barras de participação (SPARKLINE) ao lado das tabelas
  for (let r = 11; r < 21; r++) {
    requests.push(mergeCells(sheetId, r, r + 1, 2, 5));
    requests.push(mergeCells(sheetId, r, r + 1, 10, 12));
    requests.push(repeatCell(sheetId, range(r, r + 1, 2, 5), STYLE.sparkCell));
    requests.push(repeatCell(sheetId, range(r, r + 1, 10, 12), STYLE.sparkCell));
  }
  requests.push(repeatCell(sheetId, range(10, 11, 2, 5), STYLE.sparkHeader));
  requests.push(repeatCell(sheetId, range(10, 11, 10, 12), STYLE.sparkHeader));

  addDashboardSummaryBlock(requests, sheetId, 8, 0, 5);
  addDashboardSummaryBlock(requests, sheetId, 8, 6, 12);
  requests.push(repeatCell(sheetId, range(10, 11, 0, 2), STYLE.tableHeader));
  requests.push(repeatCell(sheetId, range(10, 11, 6, 10), STYLE.tableHeader));
  requests.push(repeatCell(sheetId, range(10, 21, 0, 2), STYLE.dataCellBorder, "userEnteredFormat.borders"));
  requests.push(repeatCell(sheetId, range(10, 21, 6, 10), STYLE.dataCellBorder, "userEnteredFormat.borders"));
  requests.push(addBanding(sheetId, 10, 21, 0, 2));
  requests.push(addBanding(sheetId, 10, 21, 6, 10));

  requests.push(mergeCells(sheetId, 32, 33, 0, 12));
  requests.push(mergeCells(sheetId, 33, 34, 0, 12));
  requests.push(repeatCell(sheetId, range(32, 33, 0, 12), STYLE.sectionTitle));
  requests.push(repeatCell(sheetId, range(33, 34, 0, 12), STYLE.sectionHint));
  requests.push(protectSheet(sheetId, "Dashboard — gerado pelo app"));
}

function addDashboardSummaryBlock(requests: unknown[], sheetId: number, row: number, startCol: number, endCol: number) {
  requests.push(mergeCells(sheetId, row, row + 1, startCol, endCol));
  requests.push(mergeCells(sheetId, row + 1, row + 2, startCol, endCol));
  requests.push(repeatCell(sheetId, range(row, row + 1, startCol, endCol), STYLE.sectionTitle));
  requests.push(repeatCell(sheetId, range(row + 1, row + 2, startCol, endCol), STYLE.sectionHint));
}

/** Dica que aparece ao clicar no menu, ANTES de a pessoa digitar. */
const MENU_AVISO = "Use a setinha e escolha uma opção da lista. Valor digitado fora da lista não é aceito.";

/**
 * Menu da aba Filtros. O `dataValidationFromRange` do styles.ts monta a regra
 * genérica (frouxa); aqui ela vira **strict** de propósito.
 *
 * POR QUÊ: com `strict: false` o Google ACEITA qualquer coisa digitada e só marca
 * a célula com um triangulinho. Quem escreve "Mercadinho" no lugar de "Mercado",
 * ou "setembro" no lugar da chave do mês, passa a ver R$ 0,00 em TODOS os totais
 * — porque o SOMASES não erra, ele só não acha nada — e conclui que a planilha
 * quebrou. Com strict o Sheets recusa na hora e a célula continua com uma opção
 * válida, então os totais nunca zeram sem explicação.
 *
 * (Caixa alta/baixa não é o problema: o SOMASES ignora maiúscula. O que mata é o
 * valor que não existe na coluna.)
 */
function menuDeFiltro(sheetId: number, row: number, rangeFormula: string) {
  const base = dataValidationFromRange(sheetId, row, 1, rangeFormula);
  return {
    setDataValidation: {
      ...base.setDataValidation,
      rule: { ...base.setDataValidation.rule, strict: true, inputMessage: MENU_AVISO },
    },
  };
}

// Filtros: banner (1–2), menus (4–8: rótulo em A, menu em B, critério em D
// escondida), totais (10–14) e listas dos menus em H:L (escondidas).
function buildFiltrosLayout(requests: unknown[], sheetId: number) {
  requests.push(hideGridlines(sheetId));
  requests.push(setColumnWidth(sheetId, 0, 1, 190));
  requests.push(setColumnWidth(sheetId, 1, 2, 170));
  requests.push(setColumnWidth(sheetId, 2, 3, 300));
  requests.push(showColumns(sheetId, 0, 12));
  requests.push(hideColumns(sheetId, 3, 4));
  requests.push(hideColumns(sheetId, FILTRO_LISTA_COL, FILTRO_LISTA_COL + 5));

  requests.push(setRowHeight(sheetId, 0, 1, 52));
  requests.push(setRowHeight(sheetId, 1, 2, 24));
  requests.push(mergeCells(sheetId, 0, 1, 0, 6));
  requests.push(mergeCells(sheetId, 1, 2, 0, 6));
  requests.push(repeatCell(sheetId, range(0, 1, 0, 6), STYLE.banner));
  requests.push(repeatCell(sheetId, range(1, 2, 0, 6), STYLE.bannerSub));

  requests.push(setRowHeight(sheetId, 3, 8, 30));
  requests.push(repeatCell(sheetId, range(3, 8, 0, 1), STYLE.noteLabel));
  requests.push(repeatCell(sheetId, range(3, 8, 1, 2), STYLE.menuCell));
  requests.push(repeatCell(sheetId, range(3, 8, 2, 3), STYLE.sparkHeader));
  for (let r = 3; r < 8; r++) {
    const col = colLetter(FILTRO_LISTA_COL + r - 3);
    requests.push(menuDeFiltro(sheetId, r, `=${TAB.filtros}!$${col}$4:$${col}$${FILTRO_LISTA_FIM}`));
  }

  requests.push(setRowHeight(sheetId, 9, 14, 30));
  requests.push(repeatCell(sheetId, range(9, 14, 0, 1), STYLE.totalLabel));
  requests.push(repeatCell(sheetId, range(9, 14, 1, 2), STYLE.totalMoney));
  requests.push(repeatCell(sheetId, range(12, 13, 1, 2), STYLE.totalCount));
  requests.push(protectSheetExcept(sheetId, [{ startRow: 3, endRow: 8, startCol: 1, endCol: 2 }], `${TAB.filtros} — só os menus são editáveis`));
}

// Bolsos: banner (1–2), renda/fase/mês (4–6), tabela dos 3 bolsos (8–11) e a
// tabela categoria → bolso (13+).
function buildBolsosLayout(requests: unknown[], sheetId: number) {
  requests.push(hideGridlines(sheetId));
  requests.push(setColumnWidth(sheetId, 0, 1, 190));
  [116, 116, 116, 116, 130].forEach((w, i) => requests.push(setColumnWidth(sheetId, 1 + i, 2 + i, w)));

  requests.push(setRowHeight(sheetId, 0, 1, 52));
  requests.push(setRowHeight(sheetId, 1, 2, 24));
  requests.push(mergeCells(sheetId, 0, 1, 0, 6));
  requests.push(mergeCells(sheetId, 1, 2, 0, 6));
  requests.push(repeatCell(sheetId, range(0, 1, 0, 6), STYLE.banner));
  requests.push(repeatCell(sheetId, range(1, 2, 0, 6), STYLE.bannerSub));

  requests.push(setRowHeight(sheetId, 3, 6, 30));
  requests.push(repeatCell(sheetId, range(3, 6, 0, 1), STYLE.noteLabel));
  requests.push(repeatCell(sheetId, range(3, 6, 1, 2), STYLE.noteBody));
  for (let r = 3; r < 6; r++) requests.push(mergeCells(sheetId, r, r + 1, 2, 6));
  requests.push(repeatCell(sheetId, range(3, 6, 2, 6), STYLE.sectionHint));

  requests.push(setRowHeight(sheetId, 7, 8, 26));
  requests.push(setRowHeight(sheetId, 8, 11, 30));
  requests.push(repeatCell(sheetId, range(7, 8, 0, 6), STYLE.tableHeader));
  requests.push(repeatCell(sheetId, range(8, 11, 0, 6), STYLE.dataCellBorder, "userEnteredFormat.borders"));
  requests.push(repeatCell(sheetId, range(8, 11, 0, 1), STYLE.noteBody));
  requests.push(addBanding(sheetId, 7, 11, 0, 6));

  const categorias = expenseCategories.length;
  requests.push(mergeCells(sheetId, 12, 13, 0, 6));
  requests.push(repeatCell(sheetId, range(12, 13, 0, 6), STYLE.sectionTitle));
  requests.push(repeatCell(sheetId, range(13, 14, 0, 2), STYLE.tableHeader));
  requests.push(repeatCell(sheetId, range(14, 14 + categorias, 0, 2), STYLE.dataCellBorder, "userEnteredFormat.borders"));
  requests.push(addBanding(sheetId, 13, 14 + categorias, 0, 2));
  requests.push(protectSheet(sheetId, `${TAB.bolsos} — gerada pelo app`));
}

// `fim` = última linha formatada (exclusiva, 0-based) = rowCount da grade.
function buildDataSheetLayout(requests: unknown[], key: DataTabKey, sheetId: number, fim: number) {
  const headers = HEADERS[key] ?? [];
  const cols = headers.length;
  const notesCol = cols;

  // Planilha antiga tem 12 colunas e colunas escondidas noutra posição: acerta
  // a grade e mostra tudo antes de esconder só o vão entre Anotações e o painel.
  requests.push(setColumnCount(sheetId, DATA_COLUMN_COUNT));
  requests.push(showColumns(sheetId, 0, PANEL_LABEL_COL));

  requests.push(setRowHeight(sheetId, 0, 1, 38));
  requests.push(repeatCell(sheetId, range(0, 1, 0, notesCol + 1), STYLE.tableHeader));
  requests.push(freezeRows(sheetId, 1));
  requests.push(addBanding(sheetId, 0, fim, 0, cols));
  requests.push(repeatCell(sheetId, range(0, 1, 0, cols), STYLE.dataCellBorder, "userEnteredFormat.borders"));
  formatoDasLinhas(requests, key, sheetId, 1, fim);

  getColumnWidths(key).forEach((width, index) => requests.push(setColumnWidth(sheetId, index, index + 1, width)));
  requests.push(setColumnWidth(sheetId, notesCol, notesCol + 1, 220));
  if (notesCol + 1 < PANEL_LABEL_COL) requests.push(hideColumns(sheetId, notesCol + 1, PANEL_LABEL_COL));

  const p = PANEL_LABEL_COL;
  const v = PANEL_VALUE_COL;
  requests.push(setColumnWidth(sheetId, p, p + 1, 124));
  requests.push(setColumnWidth(sheetId, v, v + 2, 146));
  requests.push(mergeCells(sheetId, 0, 1, p, v + 2));
  requests.push(mergeCells(sheetId, 1, 2, p, v + 2));
  requests.push(repeatCell(sheetId, range(0, 1, p, v + 2), STYLE.subHeader));
  requests.push(repeatCell(sheetId, range(1, 2, p, v + 2), STYLE.sectionHint));

  requests.push(repeatCell(sheetId, range(3, 7, p, p + 1), STYLE.noteLabel));
  for (let rowIndex = 3; rowIndex < 7; rowIndex++) requests.push(mergeCells(sheetId, rowIndex, rowIndex + 1, v, v + 2));
  requests.push(repeatCell(sheetId, range(3, 7, v, v + 2), STYLE.noteBody));

  requests.push(mergeCells(sheetId, 9, 10, p, v + 2));
  requests.push(repeatCell(sheetId, range(9, 10, p, v + 2), STYLE.subHeader));
  for (let rowIndex = 10; rowIndex < 14; rowIndex++) requests.push(mergeCells(sheetId, rowIndex, rowIndex + 1, p, v + 2));
  requests.push(repeatCell(sheetId, range(10, 14, p, v + 2), STYLE.noteBody));

  requests.push(filtroBasico(sheetId, cols, fim));
  // Só Anotações (linhas 2+) é livre; o resto — dados, fórmulas, painel — é do app.
  requests.push(protectSheetExcept(
    sheetId,
    [anotacoesLivres(sheetId, notesCol, fim)],
    `${TAB[key]} — gerada pelo app (Anotações é sua)`,
  ));
}

function filtroBasico(sheetId: number, cols: number, fim: number) {
  return { setBasicFilter: { filter: { range: { sheetId, startRowIndex: 0, endRowIndex: fim, startColumnIndex: 0, endColumnIndex: cols } } } };
}

function anotacoesLivres(sheetId: number, notesCol: number, fim: number) {
  return { sheetId, startRow: 1, endRow: fim, startCol: notesCol, endCol: notesCol + 1 };
}

// Linhas de dados (de..ate, 0-based, fim exclusivo): altura, bordas, estilo de
// Anotações e formato de cada coluna. A criação chama com 1..fim da grade; o
// crescimento, só com a faixa nova.
function formatoDasLinhas(requests: unknown[], key: DataTabKey, sheetId: number, de: number, ate: number) {
  const cols = mainCols(key);
  requests.push(setRowHeight(sheetId, de, ate, 24)); // design: linhas de dados 24px
  requests.push(repeatCell(sheetId, range(de, ate, 0, cols), STYLE.dataCellBorder, "userEnteredFormat.borders"));
  requests.push(repeatCell(sheetId, range(de, ate, cols, cols + 1), STYLE.notesCell));
  requests.push(...formatoDasColunas(sheetId, key, de, ate));
}

/**
 * Cresce a grade de uma aba de dados de `atual` pra `novo` linhas e leva junto
 * o que a criação dá às linhas: altura, bordas, R$/data, estilo de Anotações,
 * filtro básico, zebra e a faixa livre da proteção. Sem os ids (GET antigo,
 * sem protectedRanges/bandedRanges) proteção e zebra ficam como estão.
 * Regras de cor (condicionais) das abas de dados não têm fim de linha — já
 * valem pra grade inteira.
 */
export function growDataSheetRequests(key: DataTabKey, sheetId: number, atual: number, novo: number, ids: { protectedRangeId?: number; bandedRangeId?: number } = {}): unknown[] {
  const cols = mainCols(key);
  const requests: unknown[] = [{ appendDimension: { sheetId, dimension: "ROWS", length: novo - atual } }];
  formatoDasLinhas(requests, key, sheetId, atual, novo);
  requests.push(filtroBasico(sheetId, cols, novo));
  if (ids.protectedRangeId !== undefined) {
    const livre = anotacoesLivres(sheetId, cols, novo);
    requests.push({
      updateProtectedRange: {
        protectedRange: {
          protectedRangeId: ids.protectedRangeId,
          unprotectedRanges: [{ sheetId, startRowIndex: livre.startRow, endRowIndex: livre.endRow, startColumnIndex: livre.startCol, endColumnIndex: livre.endCol }],
        },
        fields: "unprotectedRanges",
      },
    });
  }
  if (ids.bandedRangeId !== undefined) {
    requests.push({
      updateBanding: {
        bandedRange: { bandedRangeId: ids.bandedRangeId, range: { sheetId, startRowIndex: 0, endRowIndex: novo, startColumnIndex: 0, endColumnIndex: cols } },
        fields: "range",
      },
    });
  }
  return requests;
}

function buildHelpLayout(requests: unknown[], sheetId: number) {
  requests.push(hideGridlines(sheetId));
  requests.push(setColumnWidth(sheetId, 0, 1, 56));
  requests.push(setColumnWidth(sheetId, 1, 2, 640));
  requests.push(hideColumns(sheetId, 2, 12));
  requests.push(setRowHeight(sheetId, 0, 1, 80));
  requests.push(mergeCells(sheetId, 0, 1, 0, 2));
  requests.push(repeatCell(sheetId, range(0, 1, 0, 2), STYLE.helpHero));

  for (let index = 0; index < HELP_STEPS.length; index++) {
    const rowIndex = 2 + index * 2;
    requests.push(setRowHeight(sheetId, rowIndex, rowIndex + 1, 28));
    requests.push(setRowHeight(sheetId, rowIndex + 1, rowIndex + 2, 62));
    requests.push(mergeCells(sheetId, rowIndex, rowIndex + 2, 0, 1));
    requests.push(repeatCell(sheetId, range(rowIndex, rowIndex + 2, 0, 1), STYLE.helpStepNum));
    requests.push(repeatCell(sheetId, range(rowIndex, rowIndex + 1, 1, 2), STYLE.helpStepTitle));
    requests.push(repeatCell(sheetId, range(rowIndex + 1, rowIndex + 2, 1, 2), STYLE.helpStepBody));
  }

  requests.push(protectSheet(sheetId, "Como usar — gerada pelo app"));
}

function getColumnWidths(key: DataTabKey): number[] {
  const widths: Record<DataTabKey, number[]> = {
    lancamentos: [96, 88, 198, 132, 108, 108, 108, 98, 92, 84, 90, 130],
    receitas: [96, 198, 132, 108, 98, 92],
    despesas: [96, 198, 132, 108, 108, 108, 98],
    dividas: [194, 98, 98, 98, 98, 108, 108, 108],
    metas: [194, 108, 108, 108, 108, 98],
    fluxo: [96, 108, 108, 116, 116],
    resumo: [96, 108, 108, 116, 116, 92, 98],
  };
  return widths[key];
}

function cellFmt(sheetId: number, r: ReturnType<typeof range>, numberFormat: { type: string; pattern: string }, size: number, color: { red: number; green: number; blue: number }, bold = true) {
  return repeatCell(sheetId, r, {
    numberFormat,
    horizontalAlignment: "CENTER",
    verticalAlignment: "MIDDLE",
    textFormat: { fontFamily: FONT, fontSize: size, bold, foregroundColor: color },
  }, "userEnteredFormat(numberFormat,horizontalAlignment,verticalAlignment,textFormat)");
}

// Formato de cada coluna das abas de dados (índice 0-based → tipo).
type ColunaFormato = "money" | "date" | "month" | "pct" | "count";
const DATA_FORMATS: Record<DataTabKey, Array<[number, ColunaFormato]>> = {
  lancamentos: [[0, "date"], [4, "money"]],
  receitas: [[0, "date"], [3, "money"]],
  despesas: [[0, "date"], [3, "money"]],
  dividas: [[1, "date"], [4, "money"], [5, "money"], [6, "money"], [7, "money"]],
  metas: [[2, "money"], [3, "money"], [4, "money"], [5, "pct"]],
  fluxo: [[0, "date"], [1, "money"], [2, "money"], [3, "money"], [4, "money"]],
  resumo: [[0, "month"], [1, "money"], [2, "money"], [3, "money"], [4, "money"], [5, "pct"], [6, "count"]],
};

function formatoDasColunas(sheetId: number, key: DataTabKey, de: number, ate: number): unknown[] {
  const fmt: Record<ColunaFormato, (r: ReturnType<typeof range>) => unknown> = {
    money: (r) => cellFmt(sheetId, r, { type: "CURRENCY", pattern: FORMAT.brlPlain }, 11, COLOR.brandDeep),
    date: (r) => cellFmt(sheetId, r, { type: "DATE", pattern: FORMAT.date }, 10, COLOR.text, false),
    month: (r) => cellFmt(sheetId, r, { type: "DATE", pattern: FORMAT.monthYear }, 10, COLOR.brandDeep),
    pct: (r) => cellFmt(sheetId, r, { type: "PERCENT", pattern: FORMAT.percent }, 11, COLOR.brandDeep),
    count: (r) => cellFmt(sheetId, r, { type: "NUMBER", pattern: FORMAT.intCount }, 10, COLOR.slate700, false),
  };
  return DATA_FORMATS[key].map(([col, kind]) => fmt[kind](range(de, ate, col, col + 1)));
}

// Dashboard, Filtros e Bolsos (blocos fixos). As abas de dados são formatadas
// por formatoDasLinhas, dentro do layout de cada uma.
function applyNumberFormats(requests: unknown[], ids: Record<string, number>) {
  const dashboardNumber = (
    rowStart: number,
    rowEnd: number,
    colStart: number,
    colEnd: number,
    format: { type: string; pattern: string },
    // design: valor dos KPIs colado no rótulo (esquerda); nas tabelas, à direita
    align: "LEFT" | "RIGHT" = "RIGHT",
  ) => repeatCell(
    ids[TAB.dashboard],
    range(rowStart, rowEnd, colStart, colEnd),
    { numberFormat: format, horizontalAlignment: align },
    "userEnteredFormat(numberFormat,horizontalAlignment)",
  );

  // Dashboard: aplica apenas numberFormat nos blocos com valores para nao apagar o contraste dos cards.
  requests.push(dashboardNumber(5, 6, 0, 1, { type: "CURRENCY", pattern: FORMAT.brlPlain }, "LEFT"));
  requests.push(dashboardNumber(5, 6, 3, 4, { type: "CURRENCY", pattern: FORMAT.brlPlain }, "LEFT"));
  requests.push(dashboardNumber(5, 6, 6, 7, { type: "CURRENCY", pattern: FORMAT.brlPlain }, "LEFT"));
  requests.push(dashboardNumber(5, 6, 9, 10, { type: "NUMBER", pattern: FORMAT.intCount }, "LEFT"));
  requests.push(dashboardNumber(7, 8, 0, 1, { type: "CURRENCY", pattern: FORMAT.brlPlain }, "LEFT"));
  requests.push(dashboardNumber(7, 8, 3, 4, { type: "CURRENCY", pattern: FORMAT.brlPlain }, "LEFT"));
  requests.push(dashboardNumber(7, 8, 6, 7, { type: "CURRENCY", pattern: FORMAT.brlPlain }, "LEFT"));
  requests.push(dashboardNumber(7, 8, 9, 10, { type: "NUMBER", pattern: FORMAT.intCount }, "LEFT"));

  // Mês do comparativo entra como data (AAAA-MM-01), igual à aba Resumo: texto
  // "08/2026" o Sheets pode ler como 01/08/2026 e mostrar diferente em cada aba.
  requests.push(dashboardNumber(11, 21, 6, 7, { type: "DATE", pattern: FORMAT.monthYear }, "LEFT"));
  requests.push(dashboardNumber(11, 21, 1, 2, { type: "CURRENCY", pattern: FORMAT.brlPlain }));
  requests.push(dashboardNumber(11, 21, 7, 8, { type: "CURRENCY", pattern: FORMAT.brlPlain }));
  requests.push(dashboardNumber(11, 21, 8, 9, { type: "CURRENCY", pattern: FORMAT.brlPlain }));
  requests.push(dashboardNumber(11, 21, 9, 10, { type: "CURRENCY", pattern: FORMAT.brlPlain }));

  // Filtros: totais em B10:B14 (B13 é contagem)
  const brl = { type: "CURRENCY", pattern: FORMAT.brlPlain };
  const filtros = ids[TAB.filtros];
  requests.push(cellFmt(filtros, range(9, 12, 1, 2), brl, 12, COLOR.greenDeep));
  requests.push(cellFmt(filtros, range(12, 13, 1, 2), { type: "NUMBER", pattern: FORMAT.intCount }, 12, COLOR.slate700));
  requests.push(cellFmt(filtros, range(13, 14, 1, 2), brl, 12, COLOR.greenDeep));

  // Bolsos: renda (B4), percentual (B9:B11), alvo/gasto/sobra (C9:E11)
  const bolsos = ids[TAB.bolsos];
  requests.push(cellFmt(bolsos, range(3, 4, 1, 2), brl, 12, COLOR.brandDeep));
  requests.push(cellFmt(bolsos, range(8, 11, 1, 2), { type: "PERCENT", pattern: "0%" }, 11, COLOR.slate700, false));
  requests.push(cellFmt(bolsos, range(8, 11, 2, 5), brl, 11, COLOR.brandDeep));
}

// Nas abas de dados a regra vai da linha 2 até o FIM da coluna (endRow null):
// assim vale também pras linhas que o crescimento da grade acrescentar.
function applyConditionals(requests: unknown[], ids: Record<string, number>) {
  const ateOFim = null;
  requests.push(...condFormatPositiveNegative(ids[TAB.dashboard], 5, 6, 6, 7));
  requests.push(...condFormatPositiveNegative(ids[TAB.dashboard], 7, 8, 6, 7));
  requests.push(...condFormatPositiveNegative(ids[TAB.fluxo], 1, ateOFim, 3, 5));
  requests.push(...condFormatPositiveNegative(ids[TAB.resumo], 1, ateOFim, 3, 5));
  requests.push(...condFormatPositiveNegative(ids[TAB.filtros], 11, 12, 1, 2));
  requests.push(...condFormatPositiveNegative(ids[TAB.bolsos], 8, 11, 4, 5));
  requests.push(...condFormatProgressBands(ids[TAB.metas], 1, ateOFim, 5, 6));
  requests.push(condFormatTextEquals(ids[TAB.dividas], 1, ateOFim, 3, 4, "aberta", COLOR.redSoft, COLOR.red, 0));
  requests.push(condFormatTextEquals(ids[TAB.dividas], 1, ateOFim, 3, 4, "negociando", COLOR.goldSoft, COLOR.orange, 1));
  requests.push(condFormatTextEquals(ids[TAB.dividas], 1, ateOFim, 3, 4, "quitada", COLOR.greenSoft, COLOR.brandDeep, 2));
  requests.push(condFormatTextEquals(ids[TAB.lancamentos], 1, ateOFim, 1, 2, "Entrada", COLOR.greenSoft, COLOR.greenDeep, 0));
  requests.push(condFormatTextEquals(ids[TAB.lancamentos], 1, ateOFim, 1, 2, "Saída", COLOR.slate100, COLOR.slate700, 1));
  requests.push(condFormatTextEquals(ids[TAB.lancamentos], 1, ateOFim, 10, 11, "Sim", COLOR.redSoft, COLOR.red, 2));
  requests.push(condFormatTextEquals(ids[TAB.bolsos], 8, 11, 5, 6, "Passou", COLOR.redSoft, COLOR.red, 0));
  requests.push(condFormatTextEquals(ids[TAB.bolsos], 8, 11, 5, 6, "Dentro", COLOR.greenSoft, COLOR.greenDeep, 1));
}

// ─── Fórmulas ────────────────────────────────────────────────────────────────
// Toda referência à aba Lançamentos vai entre aspas simples (tem "ç") e como
// coluna aberta ($E$2:$E): cresce com a grade (ver growGridCall).

const L = `'${TAB.lancamentos}'`;
const lanc = (col: string) => `${L}!$${col}$2:$${col}`;
// Colunas de Lançamentos usadas nos critérios
const LC = { tipo: "B", categoria: "D", valor: "E", pagamento: "F", natureza: "G", escopo: "H", mes: "J", estornado: "K", bolso: "L" } as const;
const VALIDOS = `${lanc(LC.estornado)};"Não"`;

// SOMASES(valor; Tipo; …; Estornado="Não"; critérios extras…)
function somaLancamentos(tipo: "Entrada" | "Saída", extras = "") {
  return `SOMASES(${lanc(LC.valor)};${lanc(LC.tipo)};"${tipo}";${VALIDOS}${extras})`;
}

function kpiFormulas() {
  const mes = `;${lanc(LC.mes)};$B$3`;
  return {
    A6: `=${somaLancamentos("Entrada", mes)}`,
    D6: `=${somaLancamentos("Saída", mes)}`,
    G6: "=A6-D6",
    J6: `=CONT.SES(${VALIDOS}${mes})`,
    A8: `=${somaLancamentos("Entrada")}`,
    D8: `=${somaLancamentos("Saída")}`,
    G8: "=A8-D8",
    J8: `=CONT.SE(${VALIDOS})`,
  };
}

// Gasto da categoria escrita em A{r} (o sync grava o nome; a soma é da planilha).
function categoriaFormula(row: number) {
  return `=SE(A${row}="";"";${somaLancamentos("Saída", `;${lanc(LC.categoria)};A${row}`)})`;
}

// Filtros: D4:D8 traduz o menu ("Todos" → "*", que casa qualquer texto — por
// isso toda coluna de critério é gravada com valor, nunca vazia).
// Célula APAGADA (tecla Delete) também vira "*": a validação strict impede
// digitar fora da lista, mas não impede esvaziar a célula, e critério vazio
// casaria só célula vazia — ou seja, zeraria os cinco totais sem explicação.
function filtroCriterios() {
  return `;${lanc(LC.mes)};$D$4;${lanc(LC.categoria)};$D$5;${lanc(LC.escopo)};$D$6;${lanc(LC.natureza)};$D$7;${lanc(LC.pagamento)};$D$8`;
}

function filtrosFormulas() {
  const crit = filtroCriterios();
  return {
    D4: '=SE(OU(B4="";B4="Todos");"*";B4)',
    D5: '=SE(OU(B5="";B5="Todos");"*";B5)',
    D6: '=SE(OU(B6="";B6="Todos");"*";B6)',
    D7: '=SE(OU(B7="";B7="Todos");"*";B7)',
    D8: '=SE(OU(B8="";B8="Todos");"*";B8)',
    B10: `=${somaLancamentos("Entrada", crit)}`,
    B11: `=${somaLancamentos("Saída", crit)}`,
    B12: "=B10-B11",
    B13: `=CONT.SES(${VALIDOS}${crit})`,
    // natureza "impulso" E o menu de natureza: com "essencial" escolhido dá 0, como deve
    B14: `=${somaLancamentos("Saída", `;${lanc(LC.natureza)};"impulso"${crit}`)}`,
  };
}

// Bolsos: só gastos de Casa, não estornados, do mês de referência, por bolso.
// Alvo = ARRED(renda × %; 2), igual ao roundMoney do app; "Passou" compara em
// centavos (ARRED) pra 0,10 + 0,20 não passar de 0,30.
function bolsosFormulas() {
  const out: Record<string, string> = {
    B6: `=SE(${TAB.filtros}!$B$4="Todos";${TAB.dashboard}!$B$3;${TAB.filtros}!$B$4)`,
  };
  POCKETS.forEach((_, i) => {
    const r = 9 + i;
    out[`C${r}`] = `=ARRED($B$4*B${r};2)`;
    out[`D${r}`] = `=${somaLancamentos("Saída", `;${lanc(LC.escopo)};"Casa";${lanc(LC.mes)};$B$6;${lanc(LC.bolso)};A${r}`)}`;
    out[`E${r}`] = `=C${r}-D${r}`;
    out[`F${r}`] = `=SE(C${r}<=0;"Sem alvo";SE(ARRED(D${r};2)>ARRED(C${r};2);"Passou";"Dentro"))`;
  });
  return out;
}

const bolsoLabel = (key: string) => POCKETS.find((p) => p.key === key)?.label ?? key;

function categoriaBolsoRows() {
  return expenseCategories.map((categoria) => {
    const regra = POCKET_BY_CATEGORY[categoria];
    return [categoria, regra === "por_natureza" ? `Por natureza: impulso → ${bolsoLabel("vida")}, essencial → ${bolsoLabel("contas")}` : bolsoLabel(regra)];
  });
}

export function buildStaticValues() {
  const data: ValueRange[] = [];
  const kpi = kpiFormulas();

  DATA_TABS.forEach((key) => data.push({ range: `${TAB[key]}!A1`, values: [[...(HEADERS[key] ?? []), NOTES_HEADER]] }));
  data.push(
    { range: `${TAB.dashboard}!A1`, values: [["CÓDIGO DA VIRADA • BASE FINANCEIRA CLARA E ESTRUTURADA"]] },
    { range: `${TAB.dashboard}!A2`, values: [[`Atualizado em ${new Date().toLocaleString("pt-BR")}`]] },
    { range: `${TAB.dashboard}!A3`, values: [["Mês de referência", mesChave(localMonthKey())]] },
    // Mesmos rótulos da tela Início do app — o comprador compara os dois.
    { range: `${TAB.dashboard}!A5`, values: [["Entradas neste mês", "", "", "Gastos neste mês", "", "", "Em caixa neste mês", "", "", "Lançamentos no mês", "", ""]] },
    { range: `${TAB.dashboard}!A6`, values: [[kpi.A6, "", "", kpi.D6, "", "", kpi.G6, "", "", kpi.J6, "", ""]] },
    { range: `${TAB.dashboard}!A7`, values: [["Desde o início · Entradas", "", "", "Desde o início · Gastos", "", "", "Desde o início · Em caixa", "", "", "Desde o início · Lançamentos", "", ""]] },
    { range: `${TAB.dashboard}!A8`, values: [[kpi.A8, "", "", kpi.D8, "", "", kpi.G8, "", "", kpi.J8, "", ""]] },
    { range: `${TAB.dashboard}!A9`, values: [["Top categorias de gasto"], ["As dez categorias com maior saída; o valor é fórmula sobre a aba Lançamentos."]] },
    { range: `${TAB.dashboard}!G9`, values: [["Comparativo mensal"], ["Leitura mensal de entradas, saídas e resultado para enxergar tendência."]] },
    { range: `${TAB.dashboard}!A11`, values: [["Categoria", "Total"]] },
    { range: `${TAB.dashboard}!G11`, values: [["Mês", "Entradas", "Saídas", "Resultado"]] },
    { range: `${TAB.dashboard}!A12:A21`, values: padRows(10, [""]) },
    { range: `${TAB.dashboard}!B12:B21`, values: Array.from({ length: 10 }, (_, i) => [categoriaFormula(12 + i)]) },
    { range: `${TAB.dashboard}!G12:J21`, values: padRows(10, ["", "", "", ""]) },
    { range: `${TAB.dashboard}!A33`, values: [["Dívidas em aberto e pressão de caixa"], ["Gráfico de barras para visualizar rapidamente onde está o maior peso financeiro."]] },
    { range: `${TAB.dashboard}!C11`, values: [["participação"]] },
    { range: `${TAB.dashboard}!K11`, values: [["resultado do mês"]] },
    { range: `${TAB.dashboard}!C12:C21`, values: Array.from({ length: 10 }, (_, i) => [sparkBar(`B${12 + i}`, "$B$12:$B$21", SPARK_COLORS[i])]) },
    { range: `${TAB.dashboard}!K12:K21`, values: Array.from({ length: 10 }, (_, i) => [sparkBar(`J${12 + i}`, "$J$12:$J$21")]) },
  );

  const f = filtrosFormulas();
  data.push(
    { range: `${TAB.filtros}!A1`, values: [["FILTROS • VEJA SÓ O QUE QUISER"]] },
    { range: `${TAB.filtros}!A2`, values: [["Escolha nos menus. Os totais mudam na hora. Deixe \"Todos\" para não filtrar."]] },
    // A lista de cada menu nasce só com "Todos" e o sync preenche o resto. Isto
    // vem ANTES do A4:D8 de propósito: o menu é strict, então a opção que o app
    // grava em B4:B8 precisa já existir na lista da planilha recém-criada.
    { range: `${TAB.filtros}!${colLetter(FILTRO_LISTA_COL)}4:${colLetter(FILTRO_LISTA_COL + 4)}4`, values: [Array.from({ length: 5 }, () => "Todos")] },
    { range: `${TAB.filtros}!A4:D8`, values: [
      ["Mês", "Todos", "Todos = qualquer mês", f.D4],
      ["Categoria", "Todos", "", f.D5],
      ["Escopo", "Todos", "Casa ou Empresa", f.D6],
      ["Natureza", "Todos", "essencial ou impulso (só gastos)", f.D7],
      ["Forma de pagamento", "Todos", "", f.D8],
    ] },
    { range: `${TAB.filtros}!A10:B14`, values: [
      ["Entradas", f.B10],
      ["Gastos", f.B11],
      ["Saldo", f.B12],
      ["Nº de lançamentos", f.B13],
      ["Por impulso", f.B14],
    ] },
    { range: `${TAB.filtros}!${colLetter(FILTRO_LISTA_COL)}3`, values: [["Meses", "Categorias", "Escopos", "Naturezas", "Pagamentos"]] },
  );

  const b = bolsosFormulas();
  data.push(
    { range: `${TAB.bolsos}!A1`, values: [["SEUS 3 BOLSOS • A REGRA QUE O E-BOOK ENSINA"]] },
    { range: `${TAB.bolsos}!A2`, values: [["Renda e fase vêm do app (Conta). Alvo, gasto e sobra são fórmulas sobre a aba Lançamentos."]] },
    { range: `${TAB.bolsos}!A4:A6`, values: [["Renda esperada por mês"], ["Fase"], ["Mês de referência"]] },
    { range: `${TAB.bolsos}!B6:C6`, values: [[b.B6, "Muda com o menu Mês da aba Filtros; \"Todos\" = mês corrente."]] },
    { range: `${TAB.bolsos}!A8:F8`, values: [["Bolso", "% da renda", "Alvo", "Gasto", "Sobra", "Situação"]] },
    ...POCKETS.map((pocket, i) => ({ range: `${TAB.bolsos}!A${9 + i}`, values: [[pocket.label, "", b[`C${9 + i}`], b[`D${9 + i}`], b[`E${9 + i}`], b[`F${9 + i}`]]] })),
    { range: `${TAB.bolsos}!A13`, values: [["Qual categoria cai em qual bolso"], ["Categoria", "Bolso"], ...categoriaBolsoRows()] },
  );

  DATA_TABS.forEach((key) => {
    const panel = PANEL_META[key];
    const p = colLetter(PANEL_LABEL_COL);
    data.push(
      { range: `${TAB[key]}!${p}1`, values: [[`${panel.title} • Código da Virada`]] },
      { range: `${TAB[key]}!${p}2`, values: [[panel.hint]] },
      { range: `${TAB[key]}!${p}4:${p}7`, values: panel.labels.map((label) => [label]) },
      { range: `${TAB[key]}!${PANEL_VALUES}`, values: padRows(4, ["Aguardando sync"]) },
      { range: `${TAB[key]}!${p}10`, values: [["Como ler esta aba"]] },
      { range: `${TAB[key]}!${p}11:${p}14`, values: panel.notes.map((line) => [line]) },
    );
  });

  data.push({ range: `${TAB.ajuda}!A1`, values: [["CÓDIGO DA VIRADA • COMO USAR ESTA PLANILHA", ""]] });
  HELP_STEPS.forEach(([title, body], index) => {
    const row = 3 + index * 2;
    data.push({ range: `${TAB.ajuda}!A${row}`, values: [[index + 1, title]] });
    data.push({ range: `${TAB.ajuda}!B${row + 1}`, values: [[body]] });
  });

  return data;
}

export function buildChartRequests(ids: Record<string, number>): unknown[] {
  const dashboard = ids[TAB.dashboard];
  const fluxo = ids[TAB.fluxo];
  const dividas = ids[TAB.dividas];

  return [
    pieChart(dashboard, 22, 0, 552, 220),
    monthlyChart(dashboard, 22, 6, 648, 220),
    lineChart(dashboard, fluxo, 35, 0, 552, 220),
    debtChart(dashboard, dividas, 35, 6, 648, 220),
  ];
}

export function buildSyncBatch(input: SyncInput) {
  const incomes = input.incomes ?? [];
  const expenses = input.expenses ?? [];
  const debts = input.debts ?? [];
  const goals = input.goals ?? [];
  // Contrato de estorno (lib/types.ts): as listas mostram o histórico inteiro
  // (com selo), mas todo total — KPI, fluxo, resumo, categorias, painéis — só
  // enxerga os válidos. Filtra ANTES de agregar, nunca depois. As fórmulas da
  // planilha fazem o mesmo pela coluna Estornado = "Não".
  const validIncomes = semEstornados(incomes);
  const validExpenses = semEstornados(expenses);
  const historico = buildLedgerRows(incomes, expenses);
  const validos = buildLedgerRows(validIncomes, validExpenses);

  const lancamentos = historico.map((row) => [
    formatDate(row.date),
    row.type === "income" ? "Entrada" : "Saída",
    texto(descricaoComSelo(row.description, row.estornadoEm)),
    criterio(row.category),
    Number(row.amount) || 0,
    criterio(row.paymentMethod),
    criterio(row.nature),
    escopoTexto(row.scope),
    texto(row.source ?? ""),
    mesChave(String(row.date).slice(0, 7)),
    row.estornadoEm ? "Sim" : "Não",
    row.type === "income" ? "—" : bolsoLabel(pocketOf({ category: String(row.category) as ExpenseCategory, nature: row.nature as ExpenseNature })),
  ]);

  const receitas = sortByDate(incomes).map((row) => [formatDate(row.date), texto(descricaoComSelo(row.description, row.estornadoEm)), texto(row.category), row.value, escopoTexto(row.scope), texto(row.source ?? "app")]);
  const despesas = sortByDate(expenses).map((row) => [formatDate(row.date), texto(descricaoComSelo(row.description, row.estornadoEm)), texto(row.category), row.value, texto(row.paymentMethod ?? ""), texto(row.nature ?? ""), escopoTexto(row.scope)]);
  const dividas = sortDebts(debts).map((debt, i) => [texto(debt.name), formatDate(debt.dueDate), texto(debt.priority), texto(debt.status), debt.installmentValue, debt.totalValue, debtPaid(debt), emAbertoFormula(i + 2)]);
  const metas = goals.map((goal, i) => [texto(goal.name), texto(goal.type), goal.targetValue, goal.currentValue, `=MÁXIMO(0;C${i + 2}-D${i + 2})`, `=SE(C${i + 2}<=0;0;MÍNIMO(1;MÁXIMO(0;D${i + 2}/C${i + 2})))`]);

  const mes = localMonthKey();
  const fluxo = buildDailyCashFlow(validos);
  const porMes = aggregateByMonth(validos);
  const resumo = buildMonthlySummary(porMes, mes);
  const totals = buildTotals(validIncomes, validExpenses, debts, goals, validos, fluxo, resumo, buildDashboardMonthRows(porMes, mes));
  const listas = buildFilterLists(historico);
  const bolsos = buildBolsosValues(input);

  return {
    clearRanges: buildClearRanges(),
    valueRanges: buildValueRanges({ lancamentos, receitas, despesas, dividas, metas, fluxo: comAcumulado(fluxo), resumo: comAcumulado(resumo), totals, listas, bolsos, mes }),
    /** Linhas de dados por aba — pra crescer a grade antes de gravar (sync-requests). */
    linhas: { lancamentos: lancamentos.length, receitas: receitas.length, despesas: despesas.length, dividas: dividas.length, metas: metas.length, fluxo: fluxo.length, resumo: resumo.length } as Record<DataTabKey, number>,
  };
}

// Em aberto = SE(quitada; 0; MÁXIMO(0; Total − Pago)) — o debtRemaining de lib/types.ts em fórmula.
function emAbertoFormula(row: number) {
  return `=SE(D${row}="quitada";0;MÁXIMO(0;F${row}-G${row}))`;
}

// Fluxo e Resumo: colunas D (Resultado) e E (Saldo acumulado) viram fórmula na
// planilha; os números ficam no JS pros painéis e pro comparativo.
function comAcumulado(rows: unknown[][]) {
  return rows.map((row, i) => {
    const r = i + 2;
    const out = [...row];
    out[3] = `=B${r}-C${r}`;
    out[4] = i === 0 ? "=D2" : `=E${r - 1}+D${r}`;
    return out;
  });
}

function buildLedgerRows(incomes: SyncInput["incomes"], expenses: SyncInput["expenses"]): Row[] {
  return [
    ...incomes.map((income) => ({
      id: income.id,
      type: "income",
      description: income.description,
      amount: income.value,
      category: income.category,
      date: income.date,
      scope: income.scope ?? null,
      source: income.source ?? "app",
      estornadoEm: income.estornadoEm ?? null,
    })),
    ...expenses.map((expense) => ({
      id: expense.id,
      type: "expense",
      description: expense.description,
      amount: expense.value,
      category: expense.category,
      date: expense.date,
      paymentMethod: expense.paymentMethod ?? null,
      nature: expense.nature ?? null,
      scope: expense.scope ?? null,
      source: expense.source ?? "app",
      estornadoEm: expense.estornadoEm ?? null,
    })),
  ].sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function buildDailyCashFlow(rows: Row[]) {
  const byDate = new Map<string, { income: number; expense: number }>();
  rows.forEach((row) => {
    const date = String(row.date).split("T")[0];
    const current = byDate.get(date) ?? { income: 0, expense: 0 };
    const value = Number(row.amount) || 0;
    if (row.type === "income") current.income = roundMoney(current.income + value);
    else current.expense = roundMoney(current.expense + value);
    byDate.set(date, current);
  });

  let running = 0;
  // Sem lançamentos a aba fica vazia — uma linha [hoje, 0, 0, 0, 0] seria dado inventado.
  return [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, values]) => {
    const result = roundMoney(values.income - values.expense);
    running = roundMoney(running + result);
    return [formatDate(date), values.income, values.expense, result, running];
  });
}

type MonthTotals = { income: number; expense: number; count: number };
const MES_VAZIO: MonthTotals = { income: 0, expense: 0, count: 0 };

function aggregateByMonth(rows: Row[]) {
  const byMonth = new Map<string, MonthTotals>();
  rows.forEach((row) => {
    const month = String(row.date).slice(0, 7);
    const current = byMonth.get(month) ?? { ...MES_VAZIO };
    const value = Number(row.amount) || 0;
    if (row.type === "income") current.income = roundMoney(current.income + value);
    else current.expense = roundMoney(current.expense + value);
    current.count += 1;
    byMonth.set(month, current);
  });
  return byMonth;
}

function buildMonthlySummary(byMonth: Map<string, MonthTotals>, mesCorrente: string) {
  let running = 0;
  return fillMonthGaps([...byMonth.keys()], mesCorrente).map((month) => {
    const values = byMonth.get(month) ?? MES_VAZIO;
    const result = roundMoney(values.income - values.expense);
    running = roundMoney(running + result);
    return [`${month}-01`, values.income, values.expense, result, running, economia(values), values.count];
  });
}

// Coluna Economia = savingsRate do app (lib/utils.ts, % inteiro) em fração, porque
// a coluna tem formato PERCENT. Sem entradas não existe taxa: "—" (0,0% mentiria
// num mês só com gasto). Negativo é informação real — não trava em zero.
function economia(values: MonthTotals) {
  const taxa = savingsRate(values.income, values.expense);
  return taxa === null ? "—" : taxa / 100;
}

// Quantos meses, contando o corrente, o Resumo preenche com zeros entre o
// primeiro e o último mês com movimento.
const JANELA_PREENCHIMENTO = 24;

// Meses sem movimento entre o primeiro e o último entram zerados: jan, mar, mai
// viravam três barras contíguas no comparativo, escondendo os dois meses parados.
//
// A janela é limitada por construção — a tela aceita qualquer data válida, e um
// ano digitado errado ("1026-09-05", "2206-01-05") preenchia mais de mil meses:
// a aba tem MAX_DATA_ROWS linhas, e como o values.batchUpdate é um só, a API
// recusava TUDO e nada sincronizava. Regra:
//  - só preenche entre o primeiro e o último mês com movimento, e só dentro dos
//    últimos JANELA_PREENCHIMENTO meses até o mês corrente (nunca pro futuro);
//  - mês fora de [ano corrente − 10, ano corrente + 1] é dado suspeito: fica na
//    lista como está (o usuário precisa vê-lo pra corrigir), mas não puxa a
//    janela até ele.
// Assim o Resumo tem no máximo (meses com movimento + 24) linhas; o corte final
// em MAX_DATA_ROWS é só cinto de segurança.
function fillMonthGaps(months: string[], mesCorrente: string): string[] {
  const all = new Set(months);
  const anoCorrente = Number(mesCorrente.slice(0, 4));
  const sadios = months
    .filter((month) => /^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    .filter((month) => Number(month.slice(0, 4)) >= anoCorrente - 10 && Number(month.slice(0, 4)) <= anoCorrente + 1)
    .sort();
  if (sadios.length) {
    const inicioJanela = shiftMonth(mesCorrente, -(JANELA_PREENCHIMENTO - 1));
    const de = sadios[0] > inicioJanela ? sadios[0] : inicioJanela;
    const ate = sadios[sadios.length - 1] < mesCorrente ? sadios[sadios.length - 1] : mesCorrente;
    for (let key = de; key <= ate; key = shiftMonth(key, 1)) all.add(key);
  }
  return [...all].sort().slice(-MAX_DATA_ROWS);
}

// "AAAA-MM" deslocado n meses (n negativo volta no tempo).
function shiftMonth(key: string, n: number) {
  const [year, month] = key.split("-").map(Number);
  return localMonthKey(new Date(year, month - 1 + n, 1));
}

// Mesma regra do app (getGoalProgress): entre 0 e 100%. Sem teto, 2.500 numa
// meta de 1.000 virava 250% na planilha; sem piso, valor atual negativo dava −10%
// enquanto o app mostrava 0%.
function goalProgress(goal: { targetValue: number; currentValue: number }) {
  return goal.targetValue > 0 ? Math.min(1, Math.max(0, goal.currentValue / goal.targetValue)) : 0;
}

function goalReached(goal: { targetValue: number; currentValue: number }) {
  return goal.targetValue > 0 && roundMoney(goal.currentValue) >= roundMoney(goal.targetValue);
}

// Mês corrente em data LOCAL: toISOString() é UTC e, à noite no Brasil, já
// está no dia (ou mês) seguinte — o KPI mudaria de mês antes do app.
function localMonthKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function buildTotals(
  incomes: SyncInput["incomes"],
  expenses: SyncInput["expenses"],
  debts: SyncInput["debts"],
  goals: SyncInput["goals"],
  allRows: Row[],
  fluxo: unknown[][],
  resumo: unknown[][],
  resumoDashboardRows: unknown[][],
) {
  const totalEntradas = roundMoney(incomes.reduce((sum, item) => sum + item.value, 0));
  const totalSaidas = roundMoney(expenses.reduce((sum, item) => sum + item.value, 0));

  const orderedIncomes = sortByDate(incomes);
  const orderedExpenses = sortByDate(expenses);
  const openDebts = debts.filter(debtIsOpen);
  // Mesmo número da coluna "Em aberto": o que ainda falta pagar das abertas.
  const debtOpenTotal = roundMoney(openDebts.reduce((sum, item) => sum + debtRemaining(item), 0));
  const quitadas = debts.filter((item) => item.status === "quitada").length;
  const bestMeta = goals
    .map((goal) => ({ name: goal.name, progress: goalProgress(goal), reached: goalReached(goal) }))
    .sort((a, b) => b.progress - a.progress)[0];
  // Painel do Resumo só enxerga meses COM movimento: as linhas zeradas ficam na
  // aba (série do gráfico), mas jan +500 e mar +300 não podem dar "Pior mês:
  // fev (R$ 0,00)" nem "3 meses no histórico".
  const mesesComMovimento = resumo.filter((row) => Number(row[6]) > 0);
  const bestMonth = mesesComMovimento.length ? mesesComMovimento.reduce((best, row) => (Number(row[3]) > Number(best[3]) ? row : best), mesesComMovimento[0]) : null;
  const worstMonth = mesesComMovimento.length ? mesesComMovimento.reduce((best, row) => (Number(row[3]) < Number(best[3]) ? row : best), mesesComMovimento[0]) : null;
  const taxas = mesesComMovimento.map((row) => row[5]).filter((value): value is number => typeof value === "number");
  const economiaMedia = taxas.length ? formatPercent(taxas.reduce((sum, value) => sum + value, 0) / taxas.length) : "—";
  // Com um dia só, melhor e pior dia são o mesmo — rotula em vez de parecer bug.
  const diaUnico = fluxo.length === 1 ? " (dia único)" : "";

  const panel = {
    lancamentos: [[String(allRows.length)], [formatMoney(totalEntradas)], [formatMoney(totalSaidas)], [formatPeriodText(allRows)]],
    receitas: [[String(incomes.length)], [formatMoney(totalEntradas)], [formatMoney(maxValue(incomes))], [orderedIncomes.length ? formatDate(orderedIncomes[orderedIncomes.length - 1].date) : "—"]],
    despesas: [[String(expenses.length)], [formatMoney(totalSaidas)], [formatMoney(maxValue(expenses))], [orderedExpenses.length ? formatDate(orderedExpenses[orderedExpenses.length - 1].date) : "—"]],
    dividas: [[String(debts.length)], [formatMoney(debtOpenTotal)], [String(quitadas)], [highestPriority(openDebts)]],
    metas: [[String(goals.length)], [formatMoney(goals.reduce((sum, item) => sum + item.targetValue, 0))], [formatMoney(goals.reduce((sum, item) => sum + item.currentValue, 0))], [bestMeta ? `${bestMeta.name} (${formatPercent(bestMeta.progress)})${bestMeta.reached ? " · meta batida" : ""}` : "—"]],
    fluxo: [[String(fluxo.length)], [fluxo.length ? formatMoney(maxColumn(fluxo, 3)) + diaUnico : "—"], [fluxo.length ? formatMoney(minColumn(fluxo, 3)) + diaUnico : "—"], [formatMoney(Number(fluxo[fluxo.length - 1]?.[4]) || 0)]],
    resumo: [[String(mesesComMovimento.length)], [bestMonth ? `${formatMonth(bestMonth[0])} (${formatMoney(Number(bestMonth[3]) || 0)})` : "—"], [worstMonth ? `${formatMonth(worstMonth[0])} (${formatMoney(Number(worstMonth[3]) || 0)})` : "—"], [economiaMedia]],
  };

  return {
    topCategorias: buildTopCategoryRows(expenses),
    resumoDashboardRows,
    // Painel é sempre texto (moeda formatada, "—", nome de meta): passa pelo mesmo
    // apóstrofo das listas — "-R$ 800,33" e um nome de meta com "=" iriam pro parser.
    panel: Object.fromEntries(Object.entries(panel).map(([key, rows]) => [key, rows.map((row) => [texto(row[0])])])) as Record<keyof typeof panel, string[][]>,
  };
}

// Listas dos menus da aba Filtros: "Todos" + o que existe no histórico (inclui
// estornados: a pessoa pode querer achar a categoria de um lançamento estornado).
function buildFilterLists(historico: Row[]) {
  const unicos = (values: unknown[]) => ["Todos", ...[...new Set(values.filter((v) => v != null).map((v) => String(v)).filter((v) => v && v !== "—"))].sort((a, b) => a.localeCompare(b, "pt-BR"))];
  return {
    meses: unicos(historico.map((r) => String(r.date).slice(0, 7))).map((m, i) => [i === 0 ? m : mesChave(m)]),
    categorias: unicos(historico.map((r) => r.category)).map((c) => [texto(c)]),
    escopos: unicos(historico.map((r) => escopoTexto(r.scope))).map((e) => [e]),
    naturezas: unicos(historico.map((r) => r.nature)).map((n) => [texto(n)]),
    pagamentos: unicos(historico.map((r) => r.paymentMethod)).map((p) => [texto(p)]),
  };
}

// Renda e fase da aba Bolsos = o que o card "Seus 3 bolsos" do app mostra no
// mês corrente (getPockets). A renda por média/entradas é um retrato deste mês;
// só a informada em Conta vale pra qualquer mês — a nota em C4 diz qual é.
function buildBolsosValues(input: SyncInput) {
  const data = {
    incomes: input.incomes ?? [],
    expenses: input.expenses ?? [],
    debts: [],
    goals: [],
    missionStatus: {},
    settings: input.settings,
  } as unknown as ViradaData;
  const pockets = getPockets(data);
  const fase: BudgetPhase = budgetPhaseOf(data);
  const faseMeta = BUDGET_PHASES.find((p) => p.key === fase) ?? BUDGET_PHASES[0];
  const origem: Record<typeof pockets.renda.origem, string> = {
    informada: "Informada por você no app (Conta).",
    media3m: "Média dos últimos 3 meses com entrada. Pra fixar um valor, informe a renda no app (Conta).",
    mes: "O que entrou neste mês. Pra fixar um valor, informe a renda no app (Conta).",
    nenhuma: "Ainda sem renda: informe no app (Conta) pra ter alvo em cada bolso.",
  };
  return {
    renda: pockets.renda.valor,
    origem: origem[pockets.renda.origem],
    fase: `${faseMeta.label} (${faseMeta.split})`,
    faseHint: faseMeta.hint,
    percentuais: POCKETS.map((p) => [BUDGET_PRESETS[fase][p.key]]),
  };
}

// Aberto em A1 sem linha final ("A2:I") limpa até o fim da coluna: com "A2:I1000"
// a linha 1001 (o 1000º lançamento) nunca era apagada e virava fantasma.
// Para na última coluna GERADA: Anotações (a seguinte) é do usuário.
export function dataClearRange(key: DataTabKey) {
  return `${TAB[key]}!A2:${colLetter(mainCols(key) - 1)}`;
}

function buildClearRanges() {
  return [
    ...DATA_TABS.map(dataClearRange),
    `${TAB.dashboard}!A12:A21`,
    `${TAB.dashboard}!G12:J21`,
    `${TAB.filtros}!${colLetter(FILTRO_LISTA_COL)}4:${colLetter(FILTRO_LISTA_COL + 4)}`,
  ];
}

function buildValueRanges(input: {
  lancamentos: unknown[][];
  receitas: unknown[][];
  despesas: unknown[][];
  dividas: unknown[][];
  metas: unknown[][];
  fluxo: unknown[][];
  resumo: unknown[][];
  totals: ReturnType<typeof buildTotals>;
  listas: ReturnType<typeof buildFilterLists>;
  bolsos: ReturnType<typeof buildBolsosValues>;
  mes: string;
}): ValueRange[] {
  const { lancamentos, receitas, despesas, dividas, metas, fluxo, resumo, totals, listas, bolsos, mes } = input;
  const lista = (offset: number, rows: unknown[][]) => ({ range: `${TAB.filtros}!${colLetter(FILTRO_LISTA_COL + offset)}4`, values: rows });
  return [
    ...(lancamentos.length ? [{ range: `${TAB.lancamentos}!A2`, values: lancamentos }] : []),
    ...(receitas.length ? [{ range: `${TAB.receitas}!A2`, values: receitas }] : []),
    ...(despesas.length ? [{ range: `${TAB.despesas}!A2`, values: despesas }] : []),
    ...(dividas.length ? [{ range: `${TAB.dividas}!A2`, values: dividas }] : []),
    ...(metas.length ? [{ range: `${TAB.metas}!A2`, values: metas }] : []),
    ...(fluxo.length ? [{ range: `${TAB.fluxo}!A2`, values: fluxo }] : []),
    ...(resumo.length ? [{ range: `${TAB.resumo}!A2`, values: resumo }] : []),
    { range: `${TAB.dashboard}!A2`, values: [[`Atualizado em ${new Date().toLocaleString("pt-BR")}`]] },
    { range: `${TAB.dashboard}!B3`, values: [[mesChave(mes)]] },
    { range: `${TAB.dashboard}!A12:A21`, values: totals.topCategorias },
    { range: `${TAB.dashboard}!G12:J21`, values: totals.resumoDashboardRows },
    lista(0, listas.meses),
    lista(1, listas.categorias),
    lista(2, listas.escopos),
    lista(3, listas.naturezas),
    lista(4, listas.pagamentos),
    { range: `${TAB.bolsos}!B4:C4`, values: [[bolsos.renda, bolsos.origem]] },
    { range: `${TAB.bolsos}!B5:C5`, values: [[bolsos.fase, bolsos.faseHint]] },
    { range: `${TAB.bolsos}!B9:B11`, values: bolsos.percentuais },
    { range: `${TAB.lancamentos}!${PANEL_VALUES}`, values: totals.panel.lancamentos },
    { range: `${TAB.receitas}!${PANEL_VALUES}`, values: totals.panel.receitas },
    { range: `${TAB.despesas}!${PANEL_VALUES}`, values: totals.panel.despesas },
    { range: `${TAB.dividas}!${PANEL_VALUES}`, values: totals.panel.dividas },
    { range: `${TAB.metas}!${PANEL_VALUES}`, values: totals.panel.metas },
    { range: `${TAB.fluxo}!${PANEL_VALUES}`, values: totals.panel.fluxo },
    { range: `${TAB.resumo}!${PANEL_VALUES}`, values: totals.panel.resumo },
  ];
}

// Só os NOMES das 10 maiores categorias (ordem decidida aqui); o valor de cada
// uma é SOMASES em B12:B21, gravado uma vez em buildStaticValues.
function buildTopCategoryRows(expenses: SyncInput["expenses"]) {
  const byCategory = new Map<string, number>();
  expenses.forEach((expense) => byCategory.set(expense.category, roundMoney((byCategory.get(expense.category) || 0) + expense.value)));
  const rows = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([category]) => [texto(category)]);
  // Sem categoria nenhuma, a grade fica em branco: escrever "Sem dados" numa
  // linha com barra colorida parece produto inacabado, não planilha vazia.
  return padRows(10, [""], rows);
}

// Comparativo do Dashboard = os 10 últimos meses do CALENDÁRIO até o corrente,
// zerando os sem movimento. Eram "as 10 últimas linhas do Resumo": com um ano
// digitado errado ("2062-01") o comparativo mostrava 2061-04..2062-01 zerados e
// os meses reais sumiam.
function buildDashboardMonthRows(byMonth: Map<string, MonthTotals>, mesCorrente: string) {
  return Array.from({ length: 10 }, (_, i) => {
    const month = shiftMonth(mesCorrente, i - 9);
    const values = byMonth.get(month) ?? MES_VAZIO;
    return [`${month}-01`, values.income, values.expense, roundMoney(values.income - values.expense)];
  });
}

function pieChart(dashboard: number, rowIndex: number, columnIndex: number, widthPixels: number, heightPixels: number) {
  return {
    addChart: {
      chart: {
        spec: {
          title: "",
          fontName: FONT,
          backgroundColorStyle: { rgbColor: COLOR.white },
          pieChart: {
            legendPosition: "RIGHT_LEGEND",
            threeDimensional: false,
            domain: { sourceRange: { sources: [source(dashboard, 11, 21, 0, 1)] } },
            series: { sourceRange: { sources: [source(dashboard, 11, 21, 1, 2)] } },
          },
        },
        position: { overlayPosition: { anchorCell: { sheetId: dashboard, rowIndex, columnIndex }, widthPixels, heightPixels } },
      },
    },
  };
}

function monthlyChart(dashboard: number, rowIndex: number, columnIndex: number, widthPixels: number, heightPixels: number) {
  return basicChart(dashboard, dashboard, rowIndex, columnIndex, widthPixels, heightPixels, "COLUMN", "BOTTOM_LEGEND", source(dashboard, 10, 21, 6, 7), [
    { range: source(dashboard, 10, 21, 7, 8), color: COLOR.green },
    { range: source(dashboard, 10, 21, 8, 9), color: COLOR.red },
  ]);
}

function lineChart(dashboard: number, fluxo: number, rowIndex: number, columnIndex: number, widthPixels: number, heightPixels: number) {
  return basicChart(dashboard, fluxo, rowIndex, columnIndex, widthPixels, heightPixels, "LINE", "NO_LEGEND", source(fluxo, 0, MAX_DATA_ROWS + 1, 0, 1), [
    { range: source(fluxo, 0, MAX_DATA_ROWS + 1, 4, 5), color: COLOR.blue },
  ]);
}

function debtChart(dashboard: number, dividas: number, rowIndex: number, columnIndex: number, widthPixels: number, heightPixels: number) {
  const emAberto = (HEADERS.dividas ?? []).indexOf("Em aberto");
  return basicChart(dashboard, dividas, rowIndex, columnIndex, widthPixels, heightPixels, "BAR", "NO_LEGEND", source(dividas, 0, MAX_DATA_ROWS + 1, 0, 1), [
    { range: source(dividas, 0, MAX_DATA_ROWS + 1, emAberto, emAberto + 1), color: COLOR.red },
  ]);
}

function basicChart(
  dashboard: number,
  dataSheet: number,
  rowIndex: number,
  columnIndex: number,
  widthPixels: number,
  heightPixels: number,
  chartType: string,
  legendPosition: string,
  domain: ReturnType<typeof source>,
  series: Array<{ range: ReturnType<typeof source>; color: { red: number; green: number; blue: number } }>,
) {
  return {
    addChart: {
      chart: {
        spec: {
          title: "",
          fontName: FONT,
          backgroundColorStyle: { rgbColor: COLOR.white },
          basicChart: {
            chartType,
            legendPosition,
            headerCount: 1,
            domains: [{ domain: { sourceRange: { sources: [domain] } } }],
            series: series.map((item) => ({
              series: { sourceRange: { sources: [item.range] } },
              targetAxis: chartType === "BAR" ? "BOTTOM_AXIS" : "LEFT_AXIS",
              colorStyle: { rgbColor: item.color },
            })),
          },
        },
        position: { overlayPosition: { anchorCell: { sheetId: dashboard, rowIndex, columnIndex }, widthPixels, heightPixels } },
      },
    },
  };
}

function range(startRowIndex: number, endRowIndex: number, startColumnIndex: number, endColumnIndex: number) {
  return { startRowIndex, endRowIndex, startColumnIndex, endColumnIndex };
}

function source(sheetId: number, startRowIndex: number, endRowIndex: number, startColumnIndex: number, endColumnIndex: number) {
  return { sheetId, startRowIndex, endRowIndex, startColumnIndex, endColumnIndex };
}

// Barra horizontal proporcional ao maior módulo da coluna. Sintaxe pt_BR (locale
// definido em createSpreadsheet): SE/MÁXIMO/MÍNIMO, ";" entre argumentos e "\"
// entre colunas do literal de matriz. Mês negativo entra em vermelho com a barra
// do valor absoluto — com "N(x)>0" o mês de −2.000 (o que mais importa) sumia.
// A escala é MÁXIMO(MÁXIMO;-MÍNIMO) porque MÁXIMO(ABS(intervalo)) exigiria ARRAYFORMULA.
function sparkBar(cell: string, maxRange: string, color = "#22C55E") {
  const escala = `MÁXIMO(MÁXIMO(${maxRange});-MÍNIMO(${maxRange}))`;
  return `=SE(N(${cell})=0;"";SPARKLINE(ABS(${cell});{"charttype"\\"bar";"max"\\${escala};"color1"\\SE(N(${cell})<0;"#EF4444";"${color}")}))`;
}

// Com USER_ENTERED a célula é lida como se digitada: "=almoço" vira fórmula
// (#NOME?), "- 50 do mercado" tenta virar número (#ERROR!), "@x" vira menção e o
// apóstrofo inicial some. Apóstrofo na frente é o jeito do Sheets de dizer "isto é
// texto" — e ele não aparece na célula. Números e datas não passam por aqui.
function texto(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /^[=+\-@'\t\r]/.test(s) ? `'${s}` : s;
}

// Coluna de critério nunca fica vazia ("*" não casa vazio): sem valor vira "—".
function criterio(value: unknown): string {
  const s = value == null ? "" : String(value);
  return s ? texto(s) : "—";
}

// Escopo ausente é "Casa" (mesma regra do app: só "empresa" sai dos bolsos).
function escopoTexto(scope: unknown) {
  return scope === "empresa" ? "Empresa" : "Casa";
}

// Chave de mês das colunas de critério (Lançamentos!J, Dashboard!B3, menu Mês
// de Filtros, Bolsos!B6). "2026-09" — mesmo gravado como texto, com apóstrofo —
// TEM CARA DE DATA: o SOMASES pode ler o critério como data (set/2026) e devolver
// 0 sem ninguém ver (não há credencial Google aqui). Com o nome do mês entre
// parênteses nenhum parser de data engole, e AAAA-MM na frente mantém a ordem
// cronológica das listas. Sempre a MESMA função nos dois lados do critério.
const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export function mesChave(key: string) {
  return `${key} (${MESES_ABREV[Number(key.slice(5, 7)) - 1] ?? "?"})`;
}

// Selo do estorno na lista: o lançamento continua no histórico, mas quem lê a
// aba precisa ver por que ele não entra nos totais.
function descricaoComSelo(description: unknown, estornadoEm: unknown) {
  const base = description == null ? "" : String(description);
  return estornadoEm ? `${base} (ESTORNADO em ${formatDate(estornadoEm)})` : base;
}

// SyncInput carrega status como string (vem do wrapper server-side também);
// o contrato é o mesmo isOpenDebt de lib/types.ts.
function debtIsOpen(debt: { status: string }) {
  return isOpenDebt({ status: debt.status as DebtStatus });
}

function padRows(length: number, filler: unknown[], rows: unknown[][] = []) {
  const padded = [...rows];
  while (padded.length < length) padded.push([...filler]);
  return padded.slice(0, length);
}

function sortByDate<T extends { date: string }>(rows: T[]) {
  return [...rows].sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

// Abertas primeiro (prioridade, depois maior valor); quitadas por último — uma
// quitada de R$ 0 não pode aparecer entre abertas de R$ 5.000.
function sortDebts(debts: SyncInput["debts"]) {
  return [...debts].sort((a, b) =>
    Number(!debtIsOpen(a)) - Number(!debtIsOpen(b)) || priorityOrder(a, b) || b.totalValue - a.totalValue,
  );
}

function maxValue(rows: Array<{ value: number }>) {
  return rows.length ? Math.max(...rows.map((item) => item.value)) : 0;
}

function maxColumn(rows: unknown[][], column: number) {
  return rows.length ? Math.max(...rows.map((row) => Number(row[column]) || 0)) : 0;
}

function minColumn(rows: unknown[][], column: number) {
  return rows.length ? Math.min(...rows.map((row) => Number(row[column]) || 0)) : 0;
}

function formatDate(date: unknown): string {
  if (!date) return "";
  const raw = String(date).split("T")[0];
  const [year, month, day] = raw.split("-");
  if (!year || !month || !day) return raw;
  return `${day}/${month}/${year}`;
}

function formatMonth(date: unknown): string {
  const raw = String(date).slice(0, 10);
  const [year, month] = raw.split("-");
  if (!year || !month) return String(date);
  return `${month}/${year}`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value || 0);
}

function formatPeriodText(rows: Row[]) {
  if (!rows.length) return "—";
  return `${formatDate(rows[0].date)} até ${formatDate(rows[rows.length - 1].date)}`;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// Recebe só as dívidas EM ABERTO: com tudo quitado dizia "Prioridade mais crítica: Alta".
function highestPriority(openDebts: SyncInput["debts"]) {
  if (!openDebts.length) return "—";
  const priority = sortDebts(openDebts)[0].priority;
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function priorityOrder(a: { priority: string }, b: { priority: string }) {
  const weight = (priority: string) => (priority === "alta" ? 0 : priority === "média" ? 1 : 2);
  return weight(a.priority) - weight(b.priority);
}
