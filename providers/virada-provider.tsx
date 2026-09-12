"use client";

/**
 * ViradaProvider — dados financeiros 100% no aparelho do cliente.
 * Fonte da verdade: IndexedDB (lib/db/virada-store). O localStorage antigo
 * continua como backup e é migrado uma única vez, na 1ª abertura desta versão.
 * O servidor só guarda a lista de quem comprou (SQLite) — nunca os lançamentos.
 */

import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  Debt,
  DebtPayment,
  DebtStatus,
  Expense,
  Goal,
  ImpulseCheckPayload,
  Income,
  Profile,
  ViradaData,
  ViradaSettings,
} from "@/lib/types";
import { debtPaid, findDebtPayment, isEstornado, isOpenDebt } from "@/lib/types";
import { addMonths, createId, roundMoney, storageKey, toInputDate } from "@/lib/utils";
import { missions } from "@/lib/constants";
import { loadData, saveData, clearData } from "@/lib/db/virada-store";

// ─── Tipos públicos ───────────────────────────────────────────────────────────

interface ViradaContextValue extends ViradaData {
  isReady: boolean;
  saveError: boolean;
  profile: Pick<Profile, "fullName" | "email" | "role" | "plan" | "accessStatus"> | null;
  isAdmin: boolean;
  addExpense: (payload: Omit<Expense, "id">) => string;
  /** false = não achou ou é gasto de parcela (só some via undoDebtPayment). */
  removeExpense: (id: string) => boolean;
  /** false = não achou, está estornado ou é gasto de parcela (nada muda). */
  updateExpense: (id: string, patch: ExpensePatch) => boolean;
  /** "Desfazer" de Excluir: volta com o MESMO id; se o id já existe, não duplica. */
  restoreExpense: (expense: Expense) => void;
  addIncome: (payload: Omit<Income, "id">) => string;
  removeIncome: (id: string) => void;
  updateIncome: (id: string, patch: IncomePatch) => boolean;
  restoreIncome: (income: Income) => void;
  addDebt: (payload: Omit<Debt, "id">) => void;
  removeDebt: (id: string) => void;
  updateDebtStatus: (id: string, status: DebtStatus) => void;
  /** "Paguei a parcela": null = dívida não achada/quitada ou valor inválido. */
  payDebtInstallment: (debtId: string, value?: number) => { paymentId: string; expenseId: string } | null;
  undoDebtPayment: (paymentId: string) => void;
  settings: ViradaSettings | undefined;
  setSettings: (patch: Partial<ViradaSettings>) => void;
  addGoal: (payload: Omit<Goal, "id">) => void;
  removeGoal: (id: string) => void;
  updateGoalCurrentValue: (id: string, value: number) => void;
  toggleMission: (id: string) => void;
  /** false = não achou ou é gasto de parcela (nada muda). */
  estornar: (tx: EstornoTarget) => boolean;
  addPoints: (points: number, reason: string) => void;
  saveImpulseCheck: (payload: ImpulseCheckPayload) => void;
  resetLocalData: () => void;
  // Compatibilidade com GoogleSyncButton e planilha
  user: { id: string; email: string; fullName: string | null } | null;
  sheet: { sheetUrl: string | null; lastSync: string | null };
}

// ─── Estado inicial ───────────────────────────────────────────────────────────

const initialData: ViradaData = {
  expenses: [],
  incomes: [],
  debts: [],
  goals: [],
  missionStatus: {},
};

const accountKey = "virada-account-v1";
const sheetMetaKey = "virada_sheet_meta";

interface LocalAccount {
  name?: string;
  email?: string;
}

interface LocalSheetMeta {
  spreadsheetUrl?: string;
  lastSync?: string;
}

const noSheet = { sheetUrl: null, lastSync: null };

function readSheetMeta(): { sheetUrl: string | null; lastSync: string | null } {
  try {
    const raw = localStorage.getItem(sheetMetaKey);
    if (!raw) return noSheet;
    const meta = JSON.parse(raw) as LocalSheetMeta;
    return { sheetUrl: meta.spreadsheetUrl ?? null, lastSync: meta.lastSync ?? null };
  } catch {
    return noSheet;
  }
}

function newId(prefix: string) {
  return createId(prefix);
}

// ─── Estorno (função pura, testável fora do React) ────────────────────────────
// Contrato em lib/types.ts (isEstornado / semEstornados): estornar NÃO cria
// lançamento contrário — marca o original com `estornadoEm`. Ele segue no
// histórico e todo total o ignora. Idempotente: estornar de novo não re-marca.

export interface EstornoTarget {
  id: string;
  type: "expense" | "income";
}

function marcarEstorno<T extends { id: string; estornadoEm?: string }>(items: T[], id: string, hoje: string): T[] {
  return items.map((item) => (item.id === id && !item.estornadoEm ? { ...item, estornadoEm: hoje } : item));
}

export function applyEstorno(prev: ViradaData, tx: EstornoTarget, hoje = toInputDate()): ViradaData {
  if (tx.type === "expense") {
    if (!prev.expenses.some((e) => e.id === tx.id) || findDebtPayment(prev.debts, tx.id)) return prev;
    return { ...prev, expenses: marcarEstorno(prev.expenses, tx.id, hoje) };
  }
  if (!prev.incomes.some((i) => i.id === tx.id)) return prev;
  return { ...prev, incomes: marcarEstorno(prev.incomes, tx.id, hoje) };
}

// ─── Migração de estornos ANTIGOS (função pura, testável fora do React) ───────
// Antes do contrato acima, estornar criava um contra-lançamento de tipo oposto
// com descrição `ESTORNO — ${descrição do original}`, mesmo valor e mesma data.
// Quem estornou naquela época tem esses pares no IndexedDB: "Entradas" infladas
// e categoria de despesa dentro de receita. Aqui cada par vira o contrato novo:
// o original recebe `estornadoEm` (data do contra-lançamento) e o contra-lançamento
// sai. Sem par (órfão) nada é apagado. Determinística e idempotente — roda a cada
// carga sem efeito na 2ª vez, porque não sobra "ESTORNO — " com par.

const PREFIXO_ESTORNO_ANTIGO = "ESTORNO — ";

type Lancamento = { id: string; description: string; value: number; date: string; estornadoEm?: string };

const cents = (value: number) => Math.round(value * 100);

// Original de um contra-lançamento: mesma descrição (sem o prefixo), mesmo valor,
// data até a do estorno, ainda não estornado. Empate → o mais recente; entre datas
// iguais, a ordem da lista (o app põe o mais novo primeiro).
function acharOriginal<T extends Lancamento>(candidatos: T[], contra: Lancamento): T | undefined {
  const descricao = contra.description.slice(PREFIXO_ESTORNO_ANTIGO.length);
  return candidatos
    .filter(
      (item) =>
        !item.estornadoEm &&
        item.description === descricao &&
        cents(item.value) === cents(contra.value) &&
        item.date <= contra.date,
    )
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

function migrarPares<O extends Lancamento, C extends Lancamento>(originais: O[], contras: C[]) {
  let migrados = 0;
  let listaOriginais = originais;
  const listaContras = contras.filter((contra) => {
    if (!contra.description.startsWith(PREFIXO_ESTORNO_ANTIGO)) return true;
    const original = acharOriginal(listaOriginais, contra);
    if (!original) return true; // órfão: fica como está
    listaOriginais = listaOriginais.map((item) => (item === original ? { ...item, estornadoEm: contra.date } : item));
    migrados += 1;
    return false;
  });
  return { originais: listaOriginais, contras: listaContras, migrados };
}

export function migrarEstornosAntigos(data: ViradaData): { data: ViradaData; migrados: number } {
  // despesa estornada → contra-lançamento em receitas; receita estornada → em despesas
  const deDespesas = migrarPares(data.expenses, data.incomes);
  const deReceitas = migrarPares(deDespesas.contras, deDespesas.originais);
  const migrados = deDespesas.migrados + deReceitas.migrados;
  if (migrados === 0) return { data, migrados };
  return { data: { ...data, expenses: deReceitas.contras, incomes: deReceitas.originais }, migrados };
}

// ─── Editar / excluir / restaurar lançamento (funções puras, sem React) ───────
// Patch NUNCA troca o id nem mexe em `estornadoEm` (estornar é o applyEstorno).
// Item estornado não edita: devolve o mesmo estado (a tela avisa antes).
// Gasto de parcela (findDebtPayment) não edita, não exclui nem estorna: contrato
// em lib/types.ts — o caminho é applyUndoDebtPayment, que também apaga o gasto.

export type ExpensePatch = Partial<Omit<Expense, "id" | "estornadoEm">>;
export type IncomePatch = Partial<Omit<Income, "id" | "estornadoEm">>;

function aplicarPatch<T extends { id: string; estornadoEm?: string }>(items: T[], id: string, patch: Partial<T>): T[] | null {
  const alvo = items.find((item) => item.id === id);
  if (!alvo || isEstornado(alvo)) return null;
  const resto: Partial<T> = { ...patch };
  delete resto.id;
  delete resto.estornadoEm;
  return items.map((item) => (item.id === id ? { ...item, ...resto } : item));
}

export function applyUpdateExpense(prev: ViradaData, id: string, patch: ExpensePatch): ViradaData {
  if (findDebtPayment(prev.debts, id)) return prev;
  const expenses = aplicarPatch(prev.expenses, id, patch as Partial<Expense>);
  return expenses ? { ...prev, expenses } : prev;
}

export function applyRemoveExpense(prev: ViradaData, id: string): ViradaData {
  if (!prev.expenses.some((e) => e.id === id) || findDebtPayment(prev.debts, id)) return prev;
  return { ...prev, expenses: prev.expenses.filter((e) => e.id !== id) };
}

export function applyUpdateIncome(prev: ViradaData, id: string, patch: IncomePatch): ViradaData {
  const incomes = aplicarPatch(prev.incomes, id, patch as Partial<Income>);
  return incomes ? { ...prev, incomes } : prev;
}

export function applyRestoreExpense(prev: ViradaData, expense: Expense): ViradaData {
  if (prev.expenses.some((e) => e.id === expense.id)) return prev;
  return { ...prev, expenses: [expense, ...prev.expenses] };
}

export function applyRestoreIncome(prev: ViradaData, income: Income): ViradaData {
  if (prev.incomes.some((i) => i.id === income.id)) return prev;
  return { ...prev, incomes: [income, ...prev.incomes] };
}

export function applySetSettings(prev: ViradaData, patch: Partial<ViradaSettings>): ViradaData {
  return { ...prev, settings: { ...prev.settings, ...patch } };
}

// ─── "Paguei a parcela" (funções puras, testáveis fora do React) ──────────────
// Cria um gasto "Dívida" de hoje ligado à dívida (debtId), soma em paidValue,
// avança o vencimento 1 mês e quita sozinho quando paidValue >= totalValue.
// O payment guarda o vencimento/status/pago anteriores pro Desfazer devolver o
// estado EXATO (31/01 → 28/02 não tem volta por conta; chave ausente fica ausente).

export interface DebtPaymentResult {
  data: ViradaData;
  paymentId: string;
  expenseId: string;
}

// Forma de pagamento do gasto mais recente (por data; empate = ordem da lista,
// que já é do mais novo pro mais velho). Sem gasto: Pix.
function ultimaFormaDePagamento(expenses: Expense[]): Expense["paymentMethod"] {
  let recente: Expense | undefined;
  for (const e of expenses) if (!recente || e.date > recente.date) recente = e;
  return recente?.paymentMethod ?? "Pix";
}

export function applyDebtPayment(
  prev: ViradaData,
  debtId: string,
  opts: { value?: number; hoje?: string; paymentId?: string; expenseId?: string } = {},
): DebtPaymentResult | null {
  const debt = prev.debts.find((d) => d.id === debtId);
  if (!debt || !isOpenDebt(debt)) return null;
  const value = roundMoney(opts.value ?? debt.installmentValue);
  if (!(value > 0)) return null;

  const hoje = opts.hoje ?? toInputDate();
  const paymentId = opts.paymentId ?? createId("payment");
  const expenseId = opts.expenseId ?? createId("expense");
  const pago = roundMoney(debtPaid(debt) + value);

  const payment: DebtPayment = {
    id: paymentId,
    date: hoje,
    value,
    expenseId,
    prevDueDate: debt.dueDate,
    prevStatus: debt.status,
    ...(debt.paidValue !== undefined ? { prevPaidValue: debt.paidValue } : {}),
  };
  const expense: Expense = {
    id: expenseId,
    description: debt.name,
    value,
    category: "Dívida",
    date: hoje,
    paymentMethod: ultimaFormaDePagamento(prev.expenses),
    nature: "essencial",
    scope: "casa",
    source: "app",
    debtId,
  };
  const atualizada: Debt = {
    ...debt,
    paidValue: pago,
    payments: [...(debt.payments ?? []), payment],
    dueDate: addMonths(debt.dueDate, 1),
    status: Math.round(pago * 100) >= Math.round(debt.totalValue * 100) ? "quitada" : debt.status,
  };

  return {
    data: {
      ...prev,
      debts: prev.debts.map((d) => (d.id === debtId ? atualizada : d)),
      expenses: [expense, ...prev.expenses],
    },
    paymentId,
    expenseId,
  };
}

export function applyUndoDebtPayment(prev: ViradaData, paymentId: string): ViradaData {
  const debt = prev.debts.find((d) => d.payments?.some((p) => p.id === paymentId));
  const payment = debt?.payments?.find((p) => p.id === paymentId);
  if (!debt || !payment) return prev;

  const semHistorico: Debt = { ...debt };
  delete semHistorico.paidValue;
  delete semHistorico.payments;
  const restantes = (debt.payments ?? []).filter((p) => p.id !== paymentId);
  const pago = roundMoney(debtPaid(debt) - payment.value);
  const revertida: Debt = {
    ...semHistorico,
    dueDate: payment.prevDueDate ?? addMonths(debt.dueDate, -1),
    status: payment.prevStatus ?? (isOpenDebt(debt) ? debt.status : "aberta"),
  };
  // Dívida antiga não tinha essas chaves: se o desfazer as zera, elas somem de novo
  // (`payments` só existe enquanto há pelo menos um pagamento).
  if (restantes.length > 0) revertida.payments = restantes;
  if (payment.prevPaidValue !== undefined || restantes.length > 0 || pago !== 0) revertida.paidValue = pago;

  return {
    ...prev,
    debts: prev.debts.map((d) => (d.id === debt.id ? revertida : d)),
    expenses: prev.expenses.filter((e) => e.id !== payment.expenseId),
  };
}

// ─── Migração do localStorage antigo (função pura, testável fora do React) ────
// `settings` (renda esperada e fase) vem junto: sem isso /seed-test e qualquer
// import futuro perdiam a renda e o Início voltava ao convite. A chave só entra
// quando existe — dado antigo continua sem `settings`.
export function parseLegacy(raw: string | null): ViradaData | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ViradaData>;
    return {
      expenses: parsed.expenses ?? [],
      incomes: parsed.incomes ?? [],
      debts: parsed.debts ?? [],
      goals: parsed.goals ?? [],
      missionStatus: parsed.missionStatus ?? {},
      ...(parsed.settings ? { settings: parsed.settings } : {}),
    };
  } catch {
    return null;
  }
}

const ViradaContext = createContext<ViradaContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ViradaProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<ViradaData>(initialData);
  const [profile, setProfile] = useState<ViradaContextValue["profile"]>(null);
  const [sheet, setSheet] = useState<ViradaContextValue["sheet"]>(noSheet);
  const [isReady, setIsReady] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const skipSave = useRef(false);

  // Carregar na montagem: IndexedDB é a fonte da verdade dos dados financeiros,
  // com migração única do localStorage antigo (que fica intacto como backup).
  useEffect(() => {
    let cancelled = false;

    function readLegacy(): ViradaData | null {
      try {
        return parseLegacy(localStorage.getItem(storageKey));
      } catch {
        return null; // localStorage indisponível
      }
    }

    void (async () => {
      // Conta e URL da planilha continuam no localStorage (dados pequenos, não financeiros)
      try {
        const accountRaw = localStorage.getItem(accountKey);
        if (accountRaw) {
          const account = JSON.parse(accountRaw) as LocalAccount;
          setProfile({
            fullName: account.name ?? null,
            email: account.email ?? null,
            role: account.email === "admin@local.dev" ? "admin" : "customer",
            plan: "basic",
            accessStatus: "active",
          });
        }
        setSheet(readSheetMeta());
      } catch {
        // localStorage indisponível — segue
      }

      // Dados financeiros: tenta IndexedDB; se vazio, migra 1x do localStorage.
      let loaded = await loadData();
      if (!loaded) {
        const legacy = readLegacy();
        if (legacy) {
          loaded = legacy;
          try {
            await saveData(legacy);
          } catch {
            // migra em memória mesmo se a 1ª escrita falhar
          }
        }
      }

      // Pares "ESTORNO — X" do formato antigo viram o contrato novo (uma vez; depois é no-op).
      if (loaded) {
        const migracao = migrarEstornosAntigos(loaded);
        if (migracao.migrados > 0) {
          loaded = migracao.data;
          try {
            await saveData(loaded);
          } catch {
            // segue em memória; a próxima gravação persiste
          }
        }
      }

      if (!cancelled && loaded) {
        skipSave.current = true; // não regravar logo após carregar
        setData(loaded);
      }
      if (!cancelled) setIsReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function refreshSheetUrl() {
      setSheet(readSheetMeta());
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === sheetMetaKey) refreshSheetUrl();
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener("virada-sheet-meta-changed", refreshSheetUrl);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("virada-sheet-meta-changed", refreshSheetUrl);
    };
  }, []);

  // Salvar no IndexedDB sempre que os dados mudarem — avisando se falhar
  useEffect(() => {
    if (!isReady || skipSave.current) { skipSave.current = false; return; }
    let active = true;
    void (async () => {
      try {
        await saveData(data);
        if (active) setSaveError(false);
      } catch {
        // Não engole mais em silêncio: sinaliza que o salvamento falhou
        if (active) setSaveError(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [data, isReady]);

  // Updater tipado
  const update = useCallback((updater: (prev: ViradaData) => ViradaData) => {
    setData(updater);
  }, []);

  const value = useMemo<ViradaContextValue>(() => ({
    ...data,
    isReady,
    saveError,
    profile,
    isAdmin: profile?.role === "admin",

    // ── Usuário fictício (sem login) ──────────────────────────────────────
    user: { id: "local", email: profile?.email ?? "local@virada.app", fullName: profile?.fullName ?? null },
    sheet,

    // ── Gastos ────────────────────────────────────────────────────────────
    addExpense: (payload) => {
      const id = newId("expense");
      update((prev) => ({
        ...prev,
        expenses: [{ id, ...payload }, ...prev.expenses],
      }));
      return id; // quem lançou pode desfazer (removeExpense)
    },
    removeExpense: (id) => {
      if (applyRemoveExpense(data, id) === data) return false;
      update((prev) => applyRemoveExpense(prev, id));
      return true;
    },
    updateExpense: (id, patch) => {
      const alvo = data.expenses.find((e) => e.id === id);
      if (!alvo || isEstornado(alvo) || findDebtPayment(data.debts, id)) return false;
      update((prev) => applyUpdateExpense(prev, id, patch));
      return true;
    },
    restoreExpense: (expense) => {
      update((prev) => applyRestoreExpense(prev, expense));
    },

    // ── Receitas ──────────────────────────────────────────────────────────
    addIncome: (payload) => {
      const id = newId("income");
      update((prev) => ({
        ...prev,
        incomes: [{ id, ...payload }, ...prev.incomes],
      }));
      return id;
    },
    removeIncome: (id) => {
      update((prev) => ({ ...prev, incomes: prev.incomes.filter((i) => i.id !== id) }));
    },
    updateIncome: (id, patch) => {
      const alvo = data.incomes.find((i) => i.id === id);
      if (!alvo || isEstornado(alvo)) return false;
      update((prev) => applyUpdateIncome(prev, id, patch));
      return true;
    },
    restoreIncome: (income) => {
      update((prev) => applyRestoreIncome(prev, income));
    },

    // ── Dívidas ───────────────────────────────────────────────────────────
    addDebt: (payload) => {
      update((prev) => ({
        ...prev,
        debts: [{ id: newId("debt"), ...payload }, ...prev.debts],
      }));
    },
    removeDebt: (id) => {
      update((prev) => ({ ...prev, debts: prev.debts.filter((d) => d.id !== id) }));
    },
    updateDebtStatus: (id, status) => {
      update((prev) => ({
        ...prev,
        debts: prev.debts.map((d) => (d.id === id ? { ...d, status } : d)),
      }));
    },
    payDebtInstallment: (debtId, value) => {
      // Ids gerados aqui (fora do updater) pra devolver ao chamador — o toast "Desfazer" precisa deles.
      const ids = { paymentId: newId("payment"), expenseId: newId("expense") };
      const teste = applyDebtPayment(data, debtId, { value, ...ids });
      if (!teste) return null;
      update((prev) => applyDebtPayment(prev, debtId, { value, ...ids })?.data ?? prev);
      return ids;
    },
    undoDebtPayment: (paymentId) => {
      update((prev) => applyUndoDebtPayment(prev, paymentId));
    },

    // ── Preferências (renda esperada, fase) ───────────────────────────────
    settings: data.settings,
    setSettings: (patch) => {
      update((prev) => applySetSettings(prev, patch));
    },

    // ── Metas ─────────────────────────────────────────────────────────────
    addGoal: (payload) => {
      update((prev) => ({
        ...prev,
        goals: [{ id: newId("goal"), ...payload }, ...prev.goals],
      }));
    },
    removeGoal: (id) => {
      update((prev) => ({ ...prev, goals: prev.goals.filter((g) => g.id !== id) }));
    },
    updateGoalCurrentValue: (id, currentValue) => {
      update((prev) => ({
        ...prev,
        goals: prev.goals.map((g) => (g.id === id ? { ...g, currentValue } : g)),
      }));
    },

    // ── Missões ───────────────────────────────────────────────────────────
    toggleMission: (id) => {
      update((prev) => ({
        ...prev,
        missionStatus: { ...prev.missionStatus, [id]: !prev.missionStatus[id] },
      }));
    },

    // ── Estorno ───────────────────────────────────────────────────────────
    estornar: (tx) => {
      if (applyEstorno(data, tx) === data) return false;
      update((prev) => applyEstorno(prev, tx));
      return true;
    },

    // ── Impulso ───────────────────────────────────────────────────────────
    addPoints: () => { /* pontos locais ainda não exibidos no app */ },
    saveImpulseCheck: () => { /* sem servidor — apenas local */ },

    // ── Reset ─────────────────────────────────────────────────────────────
    resetLocalData: () => {
      localStorage.removeItem(storageKey);
      void clearData();
      skipSave.current = true;
      setData(initialData);
    },
  }), [data, isReady, saveError, profile, sheet, update]);

  return <ViradaContext.Provider value={value}>{children}</ViradaContext.Provider>;
}

export function useVirada(): ViradaContextValue {
  const ctx = useContext(ViradaContext);
  if (!ctx) throw new Error("useVirada deve ser usado dentro de ViradaProvider");
  return ctx;
}
