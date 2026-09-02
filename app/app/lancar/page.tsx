"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Car,
  Check,
  CreditCard,
  Droplets,
  Gamepad2,
  Handshake,
  Home,
  Inbox,
  Lightbulb,
  Mic,
  Pill,
  Plus,
  RotateCcw,
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
import { formatCurrency, toInputDate } from "@/lib/utils";
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
  { key: "Água", icon: Droplets },
  { key: "Outros", icon: Plus },
];

const INCOME_CATS: CategoryOption[] = [
  { key: "Salário", icon: Briefcase },
  { key: "Venda", icon: Handshake },
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

function resolveDate(quando: Quando, outraData: string) {
  if (quando === "outra") return outraData;
  const day = new Date();
  if (quando === "ontem") day.setDate(day.getDate() - 1);
  return toInputDate(day);
}

function SectionLabel({ children }: { children: string }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-500">{children}</p>;
}

export default function LancarPage() {
  const data = useVirada();
  const [tab, setTab] = useState<Tab>("gasto");
  const [scope, setScope] = useState<TransactionScope>("casa");
  const [cents, setCents] = useState(0);
  const [descricao, setDescricao] = useState("");
  const [quando, setQuando] = useState<Quando>("hoje");
  const [outraData, setOutraData] = useState("");
  const [categoria, setCategoria] = useState("");
  const [pagamento, setPagamento] = useState<Expense["paymentMethod"]>("Pix");
  const [natureza, setNatureza] = useState<Expense["nature"]>("essencial");
  const [erro, setErro] = useState("");
  const [toast, setToast] = useState<{ id: string; type: Tab; message: string } | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const valorRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setVoiceSupported(Boolean(getSpeechRecognition()));
    return () => clearTimeout(toastTimer.current);
  }, []);

  const isGasto = tab === "gasto";
  const cats = isGasto ? EXPENSE_CATS : INCOME_CATS;

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
    if (quando === "outra" && !outraData) return setErro("Escolha a data.");

    const value = cents / 100;
    const date = resolveDate(quando, outraData);
    const description = descricao.trim() || categoria;

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

  return (
    <>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
      >
        {/* O que foi */}
        <section className="surface-card flex flex-col gap-5 p-5 sm:p-[22px]">
          <Segmented<Tab>
            label="Tipo de lançamento"
            value={tab}
            onChange={switchTab}
            options={[
              { value: "gasto", label: "Gasto" },
              { value: "entrada", label: "Entrada" },
            ]}
          />

          <div className="flex gap-2">
            <Chip wide active={scope === "casa"} onClick={() => setScope("casa")}>
              Casa
            </Chip>
            <Chip wide active={scope === "empresa"} onClick={() => setScope("empresa")}>
              Empresa
            </Chip>
          </div>

          {voiceSupported && (
            <button
              type="button"
              onClick={ouvir}
              aria-pressed={listening}
              className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition-colors duration-150 ${
                listening
                  ? "border-green-500 bg-green-100 text-green-700"
                  : "border-ink-200 bg-white text-ink-900 hover:bg-ink-50"
              }`}
            >
              <Mic className="h-[18px] w-[18px] shrink-0" />
              {listening ? 'Ouvindo… diga "Mercado 35 e 90"' : "Falar em vez de digitar"}
            </button>
          )}

          {/* Valor em centavos: a pessoa digita só os números */}
          <label
            className={`block rounded-xl border bg-white px-4 py-3.5 transition-colors duration-150 focus-within:border-green-500 ${
              erro && cents <= 0 ? "border-red-300" : "border-ink-200"
            }`}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-500">Valor</span>
            <input
              ref={valorRef}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              aria-label="Valor em reais"
              value={formatCurrency(cents / 100)}
              onChange={(event) => setCents(Number(event.target.value.replace(/\D/g, "").slice(0, 12)))}
              className={`money mt-1 w-full bg-transparent font-display text-[40px] font-extrabold leading-none tracking-[-0.03em] outline-none focus-visible:shadow-none ${
                cents > 0 ? "text-ink-900" : "text-ink-400"
              }`}
            />
            <span className="mt-1.5 block text-xs text-ink-400">Digite só os números — a vírgula entra sozinha.</span>
          </label>

          <input
            type="text"
            value={descricao}
            onChange={(event) => setDescricao(event.target.value)}
            placeholder={
              isGasto
                ? "Onde foi? (ex.: Supermercado Extra, Uber) — opcional"
                : "De onde veio? (ex.: Salário, Freela) — opcional"
            }
            className="input-base rounded-xl px-3.5 py-[13px] text-[15px] placeholder:text-ink-400"
          />

          <div className="flex flex-col gap-2.5">
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
                value={outraData}
                max={toInputDate()}
                onChange={(event) => setOutraData(event.target.value)}
                className="input-base rounded-xl px-3.5 py-[11px] text-[15px]"
              />
            )}
          </div>
        </section>

        {/* Detalhes + confirmar */}
        <section className="surface-card flex flex-col gap-5 p-5 sm:p-[22px]">
          <div className="flex flex-col gap-2.5">
            <SectionLabel>Categoria</SectionLabel>
            <div className="grid grid-cols-4 gap-2">
              {cats.map(({ key, icon: Icon }) => {
                const active = categoria === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCategoria(key)}
                    className={`flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl border px-0.5 py-2 text-xs font-semibold transition-colors duration-150 ${
                      active ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="max-w-full truncate">{key}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {isGasto && (
            <>
              <div className="flex flex-col gap-2.5">
                <SectionLabel>Forma de pagamento</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {PAYMENTS.map((item) => (
                    <Chip key={item} active={pagamento === item} onClick={() => setPagamento(item)}>
                      {item}
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
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
            </>
          )}

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
            {isGasto ? "Confirmar gasto" : "Confirmar entrada"}
          </button>
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
              <RotateCcw className="h-[15px] w-[15px]" /> Desfazer
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
