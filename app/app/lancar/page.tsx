"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Car,
  Check,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Droplet,
  Gamepad2,
  Tag,
  Home,
  Inbox,
  Lightbulb,
  Mic,
  Pill,
  Plus,
  ShoppingCart,
  Utensils,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { Segmented } from "@/components/ui/Segmented";
import { parseFinancialInput } from "@/lib/parse-financial-input";
import type { Expense, Income, TransactionScope } from "@/lib/types";
import { isEstornado } from "@/lib/types";
import { formatCurrency, formatDateFull, toInputDate } from "@/lib/utils";
import { useVirada } from "@/providers/virada-provider";

type Tab = "gasto" | "entrada";
type Quando = "hoje" | "ontem" | "outra";

interface CategoryOption {
  key: string;
  icon: LucideIcon;
}

const EXPENSE_CATS: CategoryOption[] = [
  { key: "Mercado", icon: ShoppingCart },
  { key: "Energia", icon: Zap },
  { key: "Transporte", icon: Car },
  { key: "Aluguel", icon: Home },
  { key: "Saúde", icon: Pill },
  { key: "Delivery", icon: Utensils },
  { key: "Lazer", icon: Gamepad2 },
  { key: "Cartão", icon: CreditCard },
  { key: "Internet", icon: Wifi },
  { key: "Educação", icon: BookOpen },
  { key: "Água", icon: Droplet },
  { key: "Outros", icon: Plus },
];

const INCOME_CATS: CategoryOption[] = [
  { key: "Salário", icon: Briefcase },
  { key: "Venda", icon: Tag },
  { key: "Serviço", icon: Wrench },
  { key: "Renda extra", icon: Lightbulb },
  { key: "Recebimento", icon: Inbox },
  { key: "Comissão", icon: BarChart3 },
  { key: "Outros", icon: Plus },
];

const PAYMENTS: Expense["paymentMethod"][] = ["Pix", "Dinheiro", "Débito", "Crédito", "Boleto"];

const TOAST_MS = 7000;

// Reconhecimento de voz do navegador (Chrome/Edge/Safari). Sem ele, o botão nem aparece.
type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  start: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

function ontem() {
  const day = new Date();
  day.setDate(day.getDate() - 1);
  return toInputDate(day);
}

function resolveDate(quando: Quando, outraData: string) {
  if (quando === "outra") return outraData;
  return quando === "ontem" ? ontem() : toInputDate();
}

// Ano fora de [atual − 10, atual + 1] é quase sempre dedo errado (2016 no lugar de
// 2026) e sumiria do mês na tela. Recusa com o motivo, em vez de gravar calado.
function erroDaData(date: string): string | null {
  const anoAtual = new Date().getFullYear();
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!partes) return "Escolha a data.";
  const [ano, mes, dia] = partes.slice(1).map(Number);
  if (ano < anoAtual - 10 || ano > anoAtual + 1) {
    return `Essa data não parece certa: o ano precisa ficar entre ${anoAtual - 10} e ${anoAtual + 1}.`;
  }
  const real = new Date(ano, mes - 1, dia);
  if (real.getMonth() !== mes - 1 || real.getDate() !== dia) return "Essa data não existe. Confira o dia e o mês.";
  return null;
}

function SectionLabel({ children }: { children: string }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-500">{children}</p>;
}

function Lancar() {
  const data = useVirada();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tipoParam = searchParams.get("tipo");
  const editarId = searchParams.get("editar");

  const [tab, setTab] = useState<Tab>(tipoParam === "entrada" ? "entrada" : "gasto");
  const [scope, setScope] = useState<TransactionScope>("casa");
  const [cents, setCents] = useState(0);
  const [descricao, setDescricao] = useState("");
  const [quando, setQuando] = useState<Quando>("hoje");
  const [outraData, setOutraData] = useState("");
  const [categoria, setCategoria] = useState("");
  const [pagamento, setPagamento] = useState<Expense["paymentMethod"]>("Pix");
  const [natureza, setNatureza] = useState<Expense["nature"]>("essencial");
  const [detalhes, setDetalhes] = useState(false);
  const [erro, setErro] = useState("");
  const [toast, setToast] = useState<{ id: string; type: Tab; message: string } | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const valorRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  // id já carregado no formulário (não recarregar a cada mudança dos dados)
  const carregado = useRef<string | null>(null);

  const editando = Boolean(editarId);
  const alvoGasto = editarId ? data.expenses.find((item) => item.id === editarId) : undefined;
  const alvoEntrada = editarId ? data.incomes.find((item) => item.id === editarId) : undefined;
  const alvo: Expense | Income | undefined = alvoGasto ?? alvoEntrada;
  const alvoEstornado = alvo ? isEstornado(alvo) : false;
  const usaEmpresa = data.expenses.some((item) => item.scope === "empresa") || data.incomes.some((item) => item.scope === "empresa");
  const semEntradas = data.incomes.length === 0;

  useEffect(() => {
    setVoiceSupported(Boolean(getSpeechRecognition()));
    return () => clearTimeout(toastTimer.current);
  }, []);

  // Modo edição: carrega o lançamento uma vez; ao sair da edição, limpa o formulário
  // (senão "Lançar" no menu confirmaria uma cópia do que estava sendo editado).
  useEffect(() => {
    if (!data.isReady) return;
    if (!editarId) {
      if (carregado.current) {
        carregado.current = null;
        setTab(tipoParam === "entrada" ? "entrada" : "gasto");
        setCents(0);
        setDescricao("");
        setCategoria("");
        setQuando("hoje");
        setOutraData("");
        setScope("casa");
        setPagamento("Pix");
        setNatureza("essencial");
        setDetalhes(usaEmpresa);
        setErro("");
      }
      return;
    }
    if (carregado.current === editarId || !alvo) return;
    carregado.current = editarId;
    setTab(alvoGasto ? "gasto" : "entrada");
    setCents(Math.round(alvo.value * 100));
    setDescricao(alvo.description === alvo.category ? "" : alvo.description);
    setCategoria(alvo.category);
    setScope(alvo.scope ?? "casa");
    if (alvoGasto) {
      setPagamento(alvoGasto.paymentMethod);
      setNatureza(alvoGasto.nature);
    }
    if (alvo.date === toInputDate()) setQuando("hoje");
    else if (alvo.date === ontem()) setQuando("ontem");
    else {
      setQuando("outra");
      setOutraData(alvo.date);
    }
    setDetalhes(alvo.date !== toInputDate() || alvo.scope === "empresa" || (alvoGasto !== undefined && alvoGasto.paymentMethod !== "Pix"));
    setErro("");
  }, [data.isReady, editarId, alvo, alvoGasto, tipoParam, usaEmpresa]);

  // Quem já lança pela empresa não deve caçar Casa/Empresa escondido.
  useEffect(() => {
    if (data.isReady && usaEmpresa) setDetalhes(true);
  }, [data.isReady, usaEmpresa]);

  // Primeira entrada de quase todo mundo é o salário: já vem marcado.
  useEffect(() => {
    if (data.isReady && !editando && tab === "entrada" && semEntradas && !categoria) setCategoria("Salário");
  }, [data.isReady, editando, tab, semEntradas, categoria]);

  const isGasto = tab === "gasto";
  const cats = isGasto ? EXPENSE_CATS : INCOME_CATS;
  const anoAtual = new Date().getFullYear();

  function switchTab(next: Tab) {
    setTab(next);
    setCategoria("");
    setErro("");
  }

  function showToast(next: { id: string; type: Tab; message: string }) {
    clearTimeout(toastTimer.current);
    setToast(next);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }

  function desfazer() {
    if (!toast) return;
    if (toast.type === "gasto") data.removeExpense(toast.id);
    else data.removeIncome(toast.id);
    clearTimeout(toastTimer.current);
    setToast(null);
  }

  function ouvir() {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition || listening) return;
    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setErro("Não consegui ouvir com clareza. Tente de novo ou digite o valor.");
    };
    recognition.onresult = (event) => aplicarFala(event.results[0]?.[0]?.transcript ?? "");
    recognition.start();
  }

  function aplicarFala(text: string) {
    const parsed = parseFinancialInput(text);
    if (!parsed) {
      setErro('Não entendi o valor. Tente falar assim: "Mercado 35 e 90".');
      return;
    }
    const nextTab: Tab = parsed.type === "income" ? "entrada" : "gasto";
    const nextCats = nextTab === "gasto" ? EXPENSE_CATS : INCOME_CATS;
    const knownCategory = nextCats.some((item) => item.key === parsed.category);
    setTab(nextTab);
    setCents(Math.round(parsed.amount * 100));
    setCategoria(knownCategory ? parsed.category : "");
    // Se a fala virou categoria ("Mercado"), a descrição fica livre pra pessoa completar
    setDescricao(parsed.description === "lançamento" || parsed.description === parsed.category ? "" : parsed.description);
    setErro("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (cents <= 0) {
      setErro("Digite o valor. Exemplo: 3590 vira R$ 35,90.");
      valorRef.current?.focus();
      return;
    }
    if (!categoria) return setErro("Escolha uma categoria.");
    if (categoria === "Outros" && !descricao.trim()) {
      return setErro('Para "Outros", escreva o que foi (ex.: presente, conserto, feira).');
    }
    if (quando === "outra") {
      const problema = erroDaData(outraData);
      if (problema) return setErro(problema);
    }

    const value = cents / 100;
    const date = resolveDate(quando, outraData);
    const description = descricao.trim() || categoria;

    if (editando) {
      const salvou = alvoGasto
        ? data.updateExpense(alvoGasto.id, {
            description,
            value,
            category: categoria as Expense["category"],
            date,
            paymentMethod: pagamento,
            nature: natureza,
            scope,
          })
        : alvoEntrada
          ? data.updateIncome(alvoEntrada.id, { description, value, category: categoria as Income["category"], date, scope })
          : false;
      if (!salvou) return setErro("Não deu pra salvar: esse lançamento foi estornado ou não existe mais.");
      router.push(`/app/relatorios?aba=lancamentos&mes=${date.slice(0, 7)}`);
      return;
    }

    const id = isGasto
      ? data.addExpense({
          description,
          value,
          category: categoria as Expense["category"],
          date,
          paymentMethod: pagamento,
          nature: natureza,
          scope,
          source: "app",
        })
      : data.addIncome({
          description,
          value,
          category: categoria as Income["category"],
          date,
          scope,
          source: "app",
        });

    showToast({
      id,
      type: tab,
      message: `${isGasto ? "Gasto" : "Entrada"} de ${formatCurrency(value)} registrad${isGasto ? "o" : "a"} em ${categoria}.`,
    });
    setCents(0);
    setDescricao("");
    setCategoria("");
    setErro("");
    valorRef.current?.focus();
  }

  // Edição sem alvo válido: diz o motivo e oferece o próximo toque.
  if (editando && data.isReady && (!alvo || alvoEstornado)) {
    return (
      <section className="surface-card mx-auto flex w-full max-w-[640px] flex-col gap-4 p-5 sm:p-[22px]">
        <h2 className="text-lg font-bold tracking-[-0.01em] text-ink-900">
          {alvo ? "Esse lançamento foi estornado" : "Esse lançamento não existe mais"}
        </h2>
        <p role="alert" className="text-sm leading-[1.5] text-ink-600">
          {alvo
            ? "Ele continua no histórico, mas já está fora dos totais — por isso não dá pra editar. Se precisar, lance um novo."
            : "Pode ter sido apagado. Se precisar, lance um novo."}
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href="/app/relatorios?aba=lancamentos"
            className="flex min-h-[44px] items-center justify-center rounded-xl border border-ink-200 bg-white text-sm font-bold text-ink-900 transition-colors duration-150 hover:bg-ink-50"
          >
            Ver lançamentos
          </Link>
          <Link
            href="/app/lancar"
            className="flex min-h-[44px] items-center justify-center rounded-xl bg-green-500 text-sm font-bold text-green-900 transition-colors duration-150 hover:bg-green-400"
          >
            Lançar um novo
          </Link>
        </div>
      </section>
    );
  }

  const tituloEdicao = alvoGasto ? "Editando gasto" : "Editando entrada";
  const quandoLabel = quando === "hoje" ? "Hoje" : quando === "ontem" ? "Ontem" : /^\d{4}-\d{2}-\d{2}$/.test(outraData) ? formatDateFull(outraData) : "Outra data";
  const resumoDetalhes = `${scope === "empresa" ? "Empresa" : "Casa"}${isGasto ? ` · ${pagamento}` : ""} · ${quandoLabel}`;

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-full max-w-[640px]">
        <section className="surface-card flex flex-col gap-2.5 p-3 sm:gap-5 sm:p-[22px]">
          {editando ? (
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold tracking-[-0.01em] text-ink-900">{tituloEdicao}</h2>
              <Link href="/app/relatorios?aba=lancamentos" className="text-[13px] font-semibold text-ink-500 hover:text-ink-900">
                Cancelar
              </Link>
            </div>
          ) : (
            <Segmented<Tab>
              label="Tipo de lançamento"
              value={tab}
              onChange={switchTab}
              options={[
                { value: "gasto", label: "Gasto" },
                { value: "entrada", label: "Entrada" },
              ]}
            />
          )}

          {/* 1. Valor em centavos: a pessoa digita só os números */}
          <label
            className={`block rounded-xl border bg-white px-4 py-2.5 transition-colors duration-150 focus-within:border-green-500 sm:py-3 ${
              erro && cents <= 0 ? "border-red-300" : "border-ink-200"
            }`}
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-500">Valor</span>
              {/* Dica curta de propósito: em 360 px a frase inteira era cortada bem no fim,
                  onde estava a informação ("a vírgula entra sozinha"). */}
              <span className="text-xs text-ink-400">{listening ? 'Ouvindo… diga "Mercado 35 e 90"' : "a vírgula entra sozinha"}</span>
            </span>
            <span className="mt-0.5 flex items-center gap-2">
              <input
                ref={valorRef}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                aria-label="Valor em reais"
                value={formatCurrency(cents / 100)}
                onChange={(event) => setCents(Number(event.target.value.replace(/\D/g, "").slice(0, 12)))}
                className={`money min-w-0 flex-1 bg-transparent font-display text-[32px] font-extrabold leading-none tracking-[-0.03em] outline-none focus-visible:shadow-none ${
                  cents > 0 ? "text-ink-900" : "text-ink-400"
                }`}
              />
              {voiceSupported && !editando && (
                <button
                  type="button"
                  onClick={ouvir}
                  aria-pressed={listening}
                  aria-label="Falar em vez de digitar"
                  title="Falar em vez de digitar"
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border transition-colors duration-150 ${
                    listening ? "border-green-500 bg-green-100 text-green-700" : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
                  }`}
                >
                  <Mic className="h-5 w-5" />
                </button>
              )}
            </span>
          </label>

          {/* 2. Onde foi */}
          <input
            type="text"
            value={descricao}
            onChange={(event) => setDescricao(event.target.value)}
            aria-label={isGasto ? "Onde foi" : "De onde veio"}
            placeholder={isGasto ? "Onde foi? Ex.: Mercado (opcional)" : "De onde veio? Ex.: Salário (opcional)"}
            className="input-base rounded-xl px-3.5 py-3 text-[15px] placeholder:text-ink-400"
          />

          {/* 3. Categoria */}
          <div className="flex flex-col gap-2">
            <SectionLabel>Categoria</SectionLabel>
            {/* 4 por linha a partir de 360 px: o rótulo mais largo ("Recebimento", 11
                letras) só cabe encolhendo pra 10px no celular e tirando a folga lateral
                do chip — a partir de sm volta aos 12px. Abaixo de 360 px (celular antigo
                de 320) nem isso cabe, e aí são 3 por linha. Nada de `truncate` aqui:
                "Transpo…" era o nome errado com cara de nome certo. */}
            <div className="grid grid-cols-3 gap-1 min-[360px]:grid-cols-4 sm:gap-2">
              {cats.map(({ key, icon: Icon }) => {
                const active = categoria === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCategoria(key)}
                    className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl border px-0 py-1 font-semibold transition-colors duration-150 sm:min-h-[56px] sm:gap-1 sm:px-0.5 ${
                      active ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="max-w-full whitespace-nowrap text-[10px] tracking-[-0.02em] sm:text-xs sm:tracking-normal">{key}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Essencial / Por impulso */}
          {isGasto && (
            <div className="flex flex-col gap-2">
              <SectionLabel>Tipo de gasto</SectionLabel>
              <div className="flex gap-2">
                <Chip wide active={natureza === "essencial"} onClick={() => setNatureza("essencial")}>
                  Essencial
                </Chip>
                <Chip wide active={natureza === "impulso"} onClick={() => setNatureza("impulso")}>
                  Por impulso
                </Chip>
              </div>
            </div>
          )}

          {/* 5. Mais detalhes (Quando, Casa/Empresa, forma de pagamento) — recolhido; os padrões
              (Hoje · Casa · Pix) valem sem abrir. Quando fica aqui pra Confirmar caber na tela. */}
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              aria-expanded={detalhes}
              onClick={() => setDetalhes((v) => !v)}
              className="flex min-h-[40px] items-center justify-between gap-2 rounded-xl px-1 text-sm font-semibold text-ink-600 transition-colors duration-150 hover:text-ink-900"
            >
              <span>
                Mais detalhes <span className="font-normal text-ink-400">· {resumoDetalhes}</span>
              </span>
              {detalhes ? <ChevronUp className="h-[18px] w-[18px]" /> : <ChevronDown className="h-[18px] w-[18px]" />}
            </button>
            {detalhes && (
              <div className="flex flex-col gap-3.5 rounded-xl bg-ink-50 p-3.5">
                <div className="flex flex-col gap-2">
                  <SectionLabel>Quando?</SectionLabel>
                  <Segmented<Quando>
                    label="Data do lançamento"
                    value={quando}
                    onChange={setQuando}
                    options={[
                      { value: "hoje", label: "Hoje" },
                      { value: "ontem", label: "Ontem" },
                      { value: "outra", label: "Outra data" },
                    ]}
                  />
                  {quando === "outra" && (
                    <input
                      type="date"
                      aria-label="Data"
                      value={outraData}
                      min={`${anoAtual - 10}-01-01`}
                      max={`${anoAtual + 1}-12-31`}
                      onChange={(event) => setOutraData(event.target.value)}
                      className="input-base rounded-xl px-3.5 py-[11px] text-[15px]"
                    />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <SectionLabel>Casa ou empresa?</SectionLabel>
                  <div className="flex gap-2">
                    <Chip wide active={scope === "casa"} onClick={() => setScope("casa")}>
                      Casa
                    </Chip>
                    <Chip wide active={scope === "empresa"} onClick={() => setScope("empresa")}>
                      Empresa
                    </Chip>
                  </div>
                </div>
                {isGasto && (
                  <div className="flex flex-col gap-2">
                    <SectionLabel>Forma de pagamento</SectionLabel>
                    <div className="flex flex-wrap gap-2">
                      {PAYMENTS.map((item) => (
                        <Chip key={item} active={pagamento === item} onClick={() => setPagamento(item)}>
                          {item}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Confirmar gruda logo acima do menu de baixo (76px = 10px de margem + 66px do BottomNav):
              em 360×640 a pessoa confirma sem rolar. No desktop não há menu, volta ao fluxo. */}
          <div className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] z-10 -mx-3 -mb-3 flex flex-col gap-3 rounded-b-2xl bg-white px-3 pb-3 sm:-mx-[22px] sm:-mb-[22px] sm:px-[22px] sm:pb-[22px] lg:static lg:m-0 lg:p-0">
            {erro && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
                {erro}
              </p>
            )}
            <button
              type="submit"
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-green-500 px-4 text-[15px] font-bold text-green-900 transition-colors duration-150 hover:bg-green-400"
            >
              <Check className="h-[18px] w-[18px]" />
              {editando ? "Salvar alteração" : isGasto ? "Confirmar gasto" : "Confirmar entrada"}
            </button>
          </div>
        </section>
      </form>

      {toast && (
        <div
          role="status"
          className="fixed inset-x-3.5 bottom-[calc(88px+env(safe-area-inset-bottom))] z-[45] mx-auto flex max-w-[560px] flex-col gap-2.5 rounded-[14px] bg-ink-900 px-4 py-3.5 text-white shadow-float lg:bottom-6"
        >
          <p className="text-sm font-semibold">{toast.message}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={desfazer}
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-white/[0.18] text-[13px] font-bold transition-colors duration-150 hover:bg-white/[0.06]"
            >
              Desfazer
            </button>
            <Link
              href="/app/inicio"
              className="inline-flex h-10 flex-1 items-center justify-center rounded-[10px] bg-green-500 text-[13px] font-bold text-green-900 transition-colors duration-150 hover:bg-green-400"
            >
              Ver no Início
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

// useSearchParams (?tipo=, ?editar=) exige Suspense no App Router
export default function LancarPage() {
  return (
    <Suspense fallback={<div className="surface-card mx-auto h-[420px] w-full max-w-[640px] animate-pulse" />}>
      <Lancar />
    </Suspense>
  );
}
